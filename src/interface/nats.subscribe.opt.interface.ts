import { ConsumerConfig, StreamConfig } from "nats";

export type StreamCfg = Partial<Omit<StreamConfig, "name" | "subjects">>;
export type ConsumerCfg = Partial<Omit<ConsumerConfig, "filter_subjects" | "filter_subject">>;

export interface JetStreamMeta {
  stream?: string;
  streamCfg?: StreamCfg;
  consumerCfg?: ConsumerCfg;
}

export class SubBaseOpts {
  subject: string;
  /**
   * If disabled, method will not publish any messages.
   * @default true
   */
  isReturned?: boolean;
  returnSubject?: string;
}

export class SubscribeOpts extends SubBaseOpts {}

export class SubscribeJsOpts extends SubBaseOpts implements JetStreamMeta {
  stream?: string;
  streamCfg?: StreamCfg;
  consumerCfg?: ConsumerCfg;
  returnPolicy?: "ackAck" | "ack";
  errorPolicy?: "term" | "nak";
}

export class RequestOpts extends SubBaseOpts {}
