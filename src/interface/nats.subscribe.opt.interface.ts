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

export class SubscribeJsOpts extends SubBaseOpts {
  stream?: string;
  returnPolicy?: "ackAck" | "ack";
  errorPolicy?: "term" | "nak";
}

export class RequestOpts extends SubBaseOpts {}
