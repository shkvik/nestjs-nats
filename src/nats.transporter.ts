import { NatsClient } from "./nats.client";
import { ConnectionOptions } from "nats";
import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from "@nestjs/microservices";
import {
  RequestOpts,
  SubBaseOpts,
  SubscribeJsOpts,
  SubscribeOpts,
} from "./interface";

export class NatsTransporter extends Server implements CustomTransportStrategy {
  protected natsClient: NatsClient;

  constructor(protected options: ConnectionOptions) {
    super();
  }

  public async listen(callback: () => void): Promise<void> {
    this.natsClient = new NatsClient();
    await this.natsClient.connect(this.options);

    for (const [_, handler] of this.messageHandlers) {
      const meta = handler.extras.meta as SubBaseOpts;
      await this.setSubscriber(meta, handler);
    }

    const message = Array.isArray(this.options.servers)
      ? `${this.options.servers.join(",")}`
      : `${this.options.servers}`;

    this.logger.log(`Transporter connected to ${message}`);
    callback();
  }

  public async close(): Promise<void> {}

  public isConnected(): boolean {
    return this.natsClient.isConnected();
  }

  private async setSubscriber(
    meta: SubBaseOpts,
    originalMethod: MessageHandler,
  ): Promise<void> {
    if (meta instanceof RequestOpts) {
      const patchedMethod = this.getPatchedRequestMethod(originalMethod);
      this.natsClient.subscribeRequest(meta.subject, patchedMethod);
    }
    if (meta instanceof SubscribeOpts) {
      const patchedMethod = this.getPatchedSubscribeMethod({
        returnSubject: meta.isReturned ? meta.returnSubject : "",
        originalMethod,
        meta,
      });
      this.natsClient.subscribe(meta.subject, patchedMethod);
    }
    if (meta instanceof SubscribeJsOpts) {
      const subjects =
        this.natsClient.getStreamSubjects(meta.stream) || new Set();

      const newSubjects: string[] = [];
      if (!subjects.has(meta.subject)) {
        newSubjects.push(meta.subject);
      }
      if (!subjects.has(meta.returnSubject) && meta.isReturned) {
        newSubjects.push(meta.returnSubject);
      }
      if (newSubjects.length) {
        await this.natsClient.addStream(meta.stream, newSubjects);
      }
      const patchedMethod = this.getPatchedSubscribeMethod({
        returnSubject: meta.isReturned ? meta.returnSubject : "",
        originalMethod,
        meta,
      });
      this.natsClient.subscribeJs({
        callback: patchedMethod,
        stream: meta.stream,
        subject: meta.subject,
        errorPolicy: meta.errorPolicy ?? "term",
        returnPolicy: meta.returnPolicy ?? "ackAck",
      });
    }
  }

  private getPatchedRequestMethod(
    originalMethod: MessageHandler,
  ): (...data: unknown[]) => Promise<unknown> {
    return async (...args) => {
      return await originalMethod(args[0], args[1]);
    };
  }

  private getPatchedSubscribeMethod(params: {
    meta: SubscribeOpts;
    originalMethod: MessageHandler;
    returnSubject?: string;
  }): (...data: unknown[]) => Promise<void> {
    const { meta, originalMethod, returnSubject } = params;
    return async (...args) => {
      const res = await originalMethod(args[0], args[1]);
      if (meta.isReturned) {
        this.natsClient.publish(returnSubject, res);
      }
    };
  }
}
