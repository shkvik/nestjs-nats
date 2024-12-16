import { INestApplication } from "@nestjs/common";
import { StreamInfo } from "nats";
import { lastValueFrom } from "rxjs";
import { NatsClientProxy, NatsTransporter } from "src/index";
import { TEST_QUEUE_STREAM, TEST_QUEUE_SUBJECT } from "./constant";

export class ExampleCase {

  private readonly natsClientProxy: NatsClientProxy;
  private readonly natsTransporter: NatsTransporter;

  constructor(app: INestApplication) {
    this.natsClientProxy = app.get('NATS_CLIENT');
    this.natsTransporter = app.getMicroservices()[0]['server'];
  }

  public async handleQueue() {
    const dtos = Array.from({ length: 20 }, (_, idx) => idx);

    const natsClient = this.natsTransporter.getClient();
    const connection = natsClient.getConnection();
    const jsm = await connection.jetstreamManager();

    const info1 = await jsm.streams.info(`test-${TEST_QUEUE_STREAM}`);

    expect(info1.state.messages).toEqual(0);

    for (const dto of dtos) {
      await lastValueFrom(
        this.natsClientProxy.emit(`test.${TEST_QUEUE_SUBJECT}`, { msg: dto })
      );
    }
    const info2 = await jsm.streams.info(`test-${TEST_QUEUE_STREAM}`);
    
    expect(info2.state.messages).toEqual(dtos.length);

    console.log('start timer')
  }

  public async handleQueueGood() {
    const dtos = Array.from({ length: 20 }, (_, idx) => idx);

    for (const dto of dtos) {
      await lastValueFrom(
        this.natsClientProxy.emit(TEST_QUEUE_SUBJECT, { msg: dto })
      );
    }
  }

  //@ts-ignore
  private async getStreamSubjectMsgs(
    stream: string,
  ): Promise<StreamInfo> {
    const natsClient = this.natsClientProxy.getClient();
    const connection = natsClient.getConnection();
    const jsm = await connection.jetstreamManager();
    return jsm.streams.info(stream);
  }
}
