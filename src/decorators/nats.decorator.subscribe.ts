import { EventPattern } from "@nestjs/microservices";
import { SubscribeOpts } from "../interface";

export const Subscribe = (options: SubscribeOpts): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    const meta: SubscribeOpts = {
      subject: options.subject,
      isReturned: options.isReturned ?? true,
      returnSubject: options.returnSubject ?? `${options.subject}.result`,
    };
    Object.setPrototypeOf(meta, SubscribeOpts.prototype);
    Reflect.defineMetadata("nats:meta", meta, descriptor.value);
    EventPattern(options.subject, { meta })(target, propertyKey, descriptor);
  };
};
