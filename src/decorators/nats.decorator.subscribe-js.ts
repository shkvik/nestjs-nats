import { EventPattern } from "@nestjs/microservices";
import { SubscribeJsOpts } from "../interface";

export const SubscribeJs = (options: SubscribeJsOpts): MethodDecorator => {
  return (target, propertyKey, descriptor) => {

    const isReturned = options.isReturned ?? false;
    let returnSubject: string;

    if (isReturned) {
      returnSubject = options.returnSubject || `${options.subject}.result`;
    }
    const meta: SubscribeJsOpts = {
      subject: options.subject,
      isReturned: isReturned,
      returnSubject: returnSubject,
      streamCfg: options.streamCfg,
      consumerCfg: options.consumerCfg,
      stream: options.stream,
      returnPolicy: options.returnPolicy ?? "ackAck",
    };
    Object.setPrototypeOf(meta, SubscribeJsOpts.prototype);
    Reflect.defineMetadata("nats:meta", meta, descriptor.value);
    EventPattern(options.subject, { meta })(target, propertyKey, descriptor);
  };
};
