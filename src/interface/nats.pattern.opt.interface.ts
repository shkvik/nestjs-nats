export class SubscribeBaseOpts {
  subject: string;
  /**
   * If disabled, method will not publish any messages.
   * @default true
   */
  isReturned?: boolean;
  returnSubject?: string;
}

export class SubscribeOpts extends SubscribeBaseOpts {}

export class SubscribeJsOpts extends SubscribeBaseOpts {
  stream?: string;
  returnPolicy?: "ackAck" | "ack";
  errorPolicy?: "term" | "nak";
}
