import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientProxy, ReadPacket, WritePacket } from "@nestjs/microservices";
import { NatsClient } from "./nats.client";
import { ConnectionOptions, PublishOptions, RequestOptions } from "nats";
import { Observable, from } from "rxjs";

@Injectable()
export class NatsClientProxy extends ClientProxy implements OnModuleInit {
  private readonly logger = new Logger(NatsClientProxy.name);

  protected natsClient: NatsClient;

  constructor(private readonly options: ConnectionOptions) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  public override emit<TResult = void, TInput = unknown>(
    subject: string,
    data: TInput,
    options?: PublishOptions,
  ): Observable<TResult> {
    return new Observable<TResult>((observer) => {
      this.natsClient.publish(subject, data, options);
      observer.next()
      observer.complete();
    });
  }

  public override send<TResult = unknown, TInput = unknown>(
    subject: string,
    data: TInput,
    options?: RequestOptions,
  ): Observable<TResult> {
    return from(this.natsClient.send<TResult>(subject, data, options));
  }

  public async connect(): Promise<void> {
    this.natsClient = new NatsClient();
    await this.natsClient.connect(this.options);

    const message = Array.isArray(this.options.servers)
      ? `${this.options.servers.join(",")}`
      : `${this.options.servers}`;

    this.logger.log(`Proxy Connected to ${message}`);
  }

  protected override async dispatchEvent(_: ReadPacket<any>): Promise<any> {}

  protected override publish(
    _: ReadPacket,
    __: (packet: WritePacket) => void,
  ): () => void {
    throw new Error("Method not implemented.");
  }

  public getClient(): NatsClient {
    if (!this.natsClient) {
      throw new ReferenceError();
    }
    return this.natsClient;
  }

  public async close(): Promise<void> {
    await this.natsClient.disconnect();
  }
}
