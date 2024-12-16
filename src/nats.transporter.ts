import { NatsClient } from "./nats.client";
import { AckPolicy } from "nats";
import {
  CustomTransportStrategy,
  MessageHandler,
  Server,
} from "@nestjs/microservices";
import {
  NatsClientOptions,
  RequestOpts,
  SubBaseOpts,
  SubscribeJsOpts,
  SubscribeOpts,
} from "./interface";

export class NatsTransporter extends Server implements CustomTransportStrategy {
  protected natsClient: NatsClient;

  constructor(protected options: NatsClientOptions) {
    super();
  }

  public getClient(): NatsClient {
    return this.natsClient;
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

  public async close(): Promise<void> {
    await this.natsClient.disconnect();
  }

  public isConnected(): boolean {
    return this.natsClient.isConnected();
  }

  private async setSubscriber(
    meta: SubBaseOpts,
    handler: MessageHandler,
  ): Promise<void> {
    if (this.options?.test) {
      meta.subject = `test.${meta.subject}`;
      meta.returnSubject &&= `test.${meta.returnSubject}`;
    }
    if (meta instanceof RequestOpts) {
      const patchedMethod = this.getPatchedRequestMethod(handler);
      this.natsClient.subscribeRequest(meta.subject, patchedMethod);
    }
    if (meta instanceof SubscribeOpts) {
      const patchedMethod = this.getPatchedSubscribeMethod(meta, handler);
      this.natsClient.subscribe(meta.subject, patchedMethod);
    }
    if (meta instanceof SubscribeJsOpts) {
      if (this.options?.test) {
        meta.stream = `test-${meta.stream}`;
      }
      const subjects =
        this.natsClient.getStreamSubjects(meta.stream) || new Set();

      if (!subjects.has(meta.subject)) {
        await this.natsClient.addStream(meta.stream, [meta.subject], meta.streamCfg);
      }
      const patchedMethod = this.getPatchedSubscribeMethod(meta, handler);
      this.natsClient.subscribeJs({
        callback: patchedMethod,
        stream: meta.stream,
        subject: meta.subject,
        returnPolicy: meta.returnPolicy ?? "ackAck",
        errorPolicy: meta.errorPolicy ?? "term",
        consumerCfg: meta.consumerCfg ?? {
          ack_policy: AckPolicy.Explicit,
        },
      });
    }
  }

  private getPatchedRequestMethod(
    handler: MessageHandler,
  ): (...data: unknown[]) => Promise<unknown> {
    return async (...args) => {
      return await handler(args[0], args[1]);
    };
  }

  private getPatchedSubscribeMethod(
    meta: SubscribeOpts,
    handler: MessageHandler
  ): (...data: unknown[]) => Promise<void> {
    return async (...args) => {
      const res = await handler(args[0], args[1]);
      if (meta?.isReturned) {
        meta.returnSubject ??= `${meta.subject}.result`;
        this.natsClient.publish(meta.returnSubject, res);
      }
    };
  }
}
