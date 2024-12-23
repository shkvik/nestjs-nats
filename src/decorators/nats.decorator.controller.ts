import { Controller } from "@nestjs/common";
import { SubscribeJsOpts, NatsControllerOpt } from "../interface";

export const NatsController = (options?: NatsControllerOpt): ClassDecorator => {
  return <TFunction extends Function>(target: TFunction): void => {
    if (options) {
      const methodNames = Object.getOwnPropertyNames(target.prototype).filter(
        (methodName) => methodName !== "constructor",
      );
      for (const methodName of methodNames) {
        const descriptor = Object.getOwnPropertyDescriptor(
          target.prototype,
          methodName,
        );

        if (descriptor && typeof descriptor.value === "function") {
          const meta = Reflect.getMetadata(
            "nats:meta",
            descriptor.value,
          ) as SubscribeJsOpts;
          if (meta && meta instanceof SubscribeJsOpts) {
            meta.stream ??= options?.stream;
            meta.streamCfg ??= options?.streamCfg;
            meta.consumerCfg ??= options?.consumerCfg;
          }
        }
      }
    }
    Controller()(target);
  };
};
