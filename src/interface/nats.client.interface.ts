import { ConnectionOptions, JsMsg } from "nats";

export interface NatsClientOptions extends ConnectionOptions {
  test?: boolean;
}

export interface CallBackSubscribeJsParams {
  msg: JsMsg;
  callback: (...data: unknown[]) => Promise<void>;
  returnPolicy: "ackAck" | "ack";
  errorPolicy: "term" | "nak";
}