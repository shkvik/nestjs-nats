import { EventPattern } from "@nestjs/microservices";
import { SubscribeJsOpts } from "src/interface";

export const SubscribeJs = (options: SubscribeJsOpts): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    const meta: SubscribeJsOpts = {
      subject: options.subject,
      isReturned: options.isReturned ?? true,
      returnSubject: options.returnSubject ?? `${options.subject}.result`,
      stream: options.stream,
      returnPolicy: options.returnPolicy ?? "ackAck",
    };
    Object.setPrototypeOf(meta, SubscribeJsOpts.prototype);
    Reflect.defineMetadata("nats:meta", meta, descriptor.value);
    EventPattern(options.subject, { meta })(target, propertyKey, descriptor);
  };
};
