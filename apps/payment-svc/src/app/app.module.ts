import { ReflectMetadataProvider } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OgmaInterceptor, OgmaModule } from '@ogma/nestjs-module';
import { NatsParser } from '@ogma/platform-nats';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentModule } from './payment.module';

@Module({
  imports: [
    OgmaModule.forRoot({
      service: {
        logLevel: 'ALL',
        color: true,
        application: 'payment-svc',
      },
      interceptor: {
        rpc: NatsParser,
      },
    }),
    // OgmaModule.forFeature(AppService, ),
    MikroOrmModule.forRoot({
      type: 'postgresql',
      dbName: 'test_db',
      user: 'test',
      password: '',
      debug: ['query', 'query-params'],
      autoLoadEntities: true,
      baseDir: __dirname,
      discovery: {
        warnWhenNoEntities: false,
      },
      metadataProvider: ReflectMetadataProvider,
    }),
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OgmaInterceptor,
    },
  ],
})
export class AppModule {}
