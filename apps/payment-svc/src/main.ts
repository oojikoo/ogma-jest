/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { OgmaService } from '@ogma/nestjs-module';

import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL],
    },
    logger: false,
  });

  // ref: https://jmcdo29.github.io/ogma/
  const logger = app.get<OgmaService>(OgmaService);
  app.useLogger(logger);
  await app.listen().then(() => {
    logger.log(`microservice is listening via nats ${process.env.NATS_URL}`);
    logger.log(`stage: ${process.env.APP_ENV}`);
  });
}

bootstrap();
