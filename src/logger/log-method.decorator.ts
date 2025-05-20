import { Logger } from "@nestjs/common";

export function LogMethod(): MethodDecorator {
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const logger = new Logger(target.constructor.name);

    descriptor.value = async function (...args: any[]) {
      const suppressLogging = args.find(arg => arg?.suppressLogging === true);
      if (!suppressLogging) {
        logger.log(`Entering ${String(propertyKey)} with arguments: ${JSON.stringify(args)}`);
      }
      try {
        const result = await originalMethod.apply(this, args);
        if (!suppressLogging) {
          logger.log(`Exiting ${String(propertyKey)} with result: ${JSON.stringify(result)}`);
        }
        return result;
      } catch (error) {
        if (!suppressLogging) {
          logger.error(`Error in ${String(propertyKey)}: ${error.message}`, error.stack);
        }
        throw error;
      }
    };

    return descriptor;
  };
}