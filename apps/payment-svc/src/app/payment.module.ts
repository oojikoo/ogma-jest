import { EntityRepository } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OgmaModule } from '@ogma/nestjs-module';

import { PaymentFacade } from './application/payment.facade';
import { Billing } from './domain/billing/billing.entity';
import { Payment } from './domain/payment.entity';
import { PaymentService } from './domain/payment.service';
import { PaymentServiceImpl } from './domain/payment.service-impl';
import { PaymentCommandMapper } from './domain/payment-command.mapper';
import { ImpPaymentApiImpl } from './infra/imp-payment.api-impl';
import { PaymentController } from './interfaces/payment.controller';

@Module({
  imports: [
    OgmaModule.forFeature(PaymentServiceImpl),
    OgmaModule.forFeature(PaymentFacade),
    OgmaModule.forFeature(PaymentController),
    MikroOrmModule.forFeature([Payment, Billing]),
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    ClientsModule.register([
      {
        name: 'TEMP_SERVICE',
        transport: Transport.TCP,
      },
    ]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentFacade,
    {
      provide: 'PaymentService',
      useClass: PaymentServiceImpl,
    },
    {
      provide: 'PaymentApi',
      useClass: ImpPaymentApiImpl,
    },
    // {
    //   provide: 'UserApi',
    //   useClass: SubscriptionApiImpl,
    // },
    PaymentCommandMapper,
    EntityRepository,
  ],
})
export class PaymentModule {}
