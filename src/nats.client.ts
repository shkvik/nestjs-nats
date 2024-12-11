import { Logger } from "@nestjs/common";
import {
  AckPolicy,
  Codec,
  connect,
  ConnectionOptions,
  JetStreamClient,
  JetStreamManager,
  JsMsg,
  JSONCodec,
  Msg,
  NatsConnection,
  NatsError,
  PublishOptions,
  RequestOptions,
} from "nats";

export class NatsClient {
  private connection: NatsConnection;
  private jc: Codec<unknown>;
  private js: JetStreamClient;
  private jsm: JetStreamManager;
  private jStreamSubjects: Map<string, Set<string>>;
  private logger = new Logger(NatsClient.name);

  public async connect(options: ConnectionOptions): Promise<void> {
    this.connection = await connect(options);
    this.jc = JSONCodec();
    this.js = this.connection.jetstream();
    this.jsm = await this.connection.jetstreamManager();

    this.jStreamSubjects = new Map();
    for await (const page of this.jsm.streams.list()) {
      const subjectSet = new Set(page.config.subjects);
      this.jStreamSubjects.set(page.config.name, subjectSet);
    }
  }

  public async send<TResult>(
    subject: string,
    data: unknown,
    options?: RequestOptions,
  ): Promise<TResult> {
    try {
      const encodedData = this.jc.encode(data);
      const response = await this.connection.request(
        subject,
        encodedData,
        options,
      );
      return this.jc.decode(response.data) as TResult;
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(err.message);
      }
      return undefined;
    }
  }

  public publish(
    subject: string,
    data: unknown,
    options?: PublishOptions,
  ): void {
    try {
      const encodedData = this.jc.encode(data);
      this.connection.publish(subject, encodedData, options);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.error(err.message);
      }
    }
  }

  public subscribeRpc(
    eventName: string,
    callback: (...data: unknown[]) => Promise<void>,
  ): void {
    const cb: (err: NatsError | null, msg: Msg) => void = async (err, msg) => {
      try {
        if (err) {
          throw err;
        }
        const data = this.jc.decode(msg.data);
        const result = await callback(data, msg);
        const encodedData = this.jc.encode(result);
        if (msg.reply) {
          msg.respond(encodedData);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(err.message);
        }
      }
    };
    this.connection.subscribe(eventName, {
      callback: cb,
    });
  }

  public subscribe(
    eventName: string,
    callback: (...data: unknown[]) => Promise<void>,
  ): void {
    const cb: (err: NatsError | null, msg: Msg) => void = async (err, msg) => {
      try {
        if (err) {
          throw err;
        }
        const data = this.jc.decode(msg.data);
        await callback(data, msg);
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.error(err.message);
        }
      }
    };
    this.connection.subscribe(eventName, {
      callback: cb,
    });
  }

  private callBackSubscribeJs = async (params: {
    msg: JsMsg;
    callback: (...data: unknown[]) => Promise<void>;
    returnPolicy: "ackAck" | "ack";
    errorPolicy: "term" | "nak";
  }): Promise<void> => {
    const { msg, callback, returnPolicy, errorPolicy } = params;
    try {
      const data = this.jc.decode(msg.data);
      await callback(data, msg);
      await msg[returnPolicy]();
    } catch (err: unknown) {
      if (err instanceof NatsError) {
        this.logger.error(err.message);
        await msg[errorPolicy]();
      } else {
        throw err;
      }
    }
  };

  public async subscribeJs(params: {
    stream: string;
    subject: string;
    returnPolicy: "ackAck" | "ack";
    errorPolicy: "term" | "nak";
    callback: (...data: unknown[]) => Promise<void>;
  }): Promise<void> {
    const { stream, subject, ...etc } = params;
    const ci = await this.jsm.consumers.add(stream, {
      ack_policy: AckPolicy.Explicit,
      filter_subject: subject,
    });
    const consumer = await this.js.consumers.get(stream, ci.name);
    const iterator = await consumer.consume();
    for await (const message of iterator) {
      await this.callBackSubscribeJs({ msg: message, ...etc });
    }
  }

  public async addStream(stream: string, subjects: string[]): Promise<void> {
    if (this.jStreamSubjects.has(stream)) {
      const subjectSet = this.jStreamSubjects.get(stream);
      const filteredSubjects = subjects.filter((sub) => !subjectSet.has(sub));

      const streamInfo = await this.jsm.streams.info(stream);
      streamInfo.config.subjects.push(...filteredSubjects);

      await this.jsm.streams.update(stream, streamInfo.config);
      filteredSubjects.forEach((sub) => subjectSet.add(sub));
    } else {
      const subjectSet = new Set(subjects);
      this.jStreamSubjects.set(stream, subjectSet);

      await this.jsm.streams.add({
        name: stream,
        subjects: subjects,
      });
    }
  }

  public getStreamSubjects(stream: string): Set<string> {
    return this.jStreamSubjects.has(stream)
      ? this.jStreamSubjects.get(stream)
      : undefined;
  }

  public async disconnect(): Promise<void> {
    await this.connection.close();
  }

  public isConnected(): boolean {
    return Boolean(this.connection) && this.connection.isClosed();
  }
}
