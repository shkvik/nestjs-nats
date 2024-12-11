import { EventPattern } from "@nestjs/microservices";
import { RequestOpts } from "../interface";

export const Request = (options: RequestOpts): MethodDecorator => {
  return (target, propertyKey, descriptor) => {
    const meta: RequestOpts = {
      subject: options.subject,
    };
    Object.setPrototypeOf(meta, RequestOpts.prototype);
    Reflect.defineMetadata("nats:meta", meta, descriptor.value);
    EventPattern(options.subject, { meta })(target, propertyKey, descriptor);
  };
};
