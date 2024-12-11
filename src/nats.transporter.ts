import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from "@nestjs/microservices";
import { NatsClient } from "./nats.client";
import { ConnectionOptions } from "nats";
import { SubscribeBaseOpts, SubscribeJsOpts } from "./interface";

export class NatsTransporter extends Server implements CustomTransportStrategy {
  protected natsClient: NatsClient;

  constructor(protected options: ConnectionOptions) {
    super();
  }

  public async listen(callback: () => void): Promise<void> {
    this.natsClient = new NatsClient();
    await this.natsClient.connect(this.options);

    for (const [_, handler] of this.messageHandlers) {
      const meta = handler.extras.meta as SubscribeBaseOpts;
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
    meta: SubscribeBaseOpts,
    originalMethod: MessageHandler,
  ): Promise<void> {
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
      const patchedMethod = this.getPatchSubscribeJsMethod({
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

  private getPatchSubscribeJsMethod(params: {
    meta: SubscribeJsOpts;
    originalMethod: MessageHandler;
    returnSubject?: string;
  }): (...data: unknown[]) => Promise<void> {
    const { meta, originalMethod, returnSubject } = params;
    return async (...args: unknown[]): Promise<void> => {
      const res = await originalMethod(args[0], args[1]);
      if (meta.isReturned) {
        this.natsClient.publish(returnSubject, res);
      }
    };
  }
}
