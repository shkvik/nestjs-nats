import { NatsController, SubscribeJs } from 'src/index';
import { TEST_QUEUE_STREAM, TEST_QUEUE_SUBJECT } from './constant';
import { Payload } from '@nestjs/microservices';
import { AckPolicy, RetentionPolicy, StorageType } from 'nats';

@NatsController({ 
  stream: TEST_QUEUE_STREAM,
  consumerCfg: {
    durable_name: "justfun",
    ack_policy: AckPolicy.Explicit,
    deliver_group: ''
  },
  streamCfg: {
    retention: RetentionPolicy.Workqueue,
    storage: StorageType.File,
  },
})
export class ExampleController {

  @SubscribeJs({ 
    subject: TEST_QUEUE_SUBJECT, 
    returnPolicy: 'ackAck'
  })
  public async handleQueue(@Payload() dto: unknown) {
    return dto;
  }
}
