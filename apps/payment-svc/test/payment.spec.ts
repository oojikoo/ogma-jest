import { EntityRepository, MikroORM, ReflectMetadataProvider } from '@mikro-orm/core';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { OgmaInterceptor, OgmaModule } from '@ogma/nestjs-module';
import { NatsParser } from '@ogma/platform-nats';
import * as faker from 'faker';
import { firstValueFrom } from 'rxjs';
import * as uuid from 'uuid';

import { PaymentFacade } from '../src/app/application/payment.facade';
import { Billing } from '../src/app/domain/billing/billing.entity';
import { Payment } from '../src/app/domain/payment.entity';
import * as PaymentInfo from '../src/app/domain/payment.info';
import { PaymentServiceImpl } from '../src/app/domain/payment.service-impl';
import { PaymentCommandMapper } from '../src/app/domain/payment-command.mapper';
import { PaymentController } from '../src/app/interfaces/payment.controller';
import * as PaymentDto from '../src/app/interfaces/payment.dto';
import * as PaymentResponse from '../src/app/interfaces/payment.response';
import { getOrderMerchantUid } from '../src/helper/order-info.helper';

// jest.mock('uuid', () => ({ v4: () => '00000000-0000-0000-0000-000000000000' }));

const mockPaymentApi = {
  requestPayment: jest.fn(),
  requestSchedulePayment: jest.fn(),
  cancelSchedulePayment: jest.fn(),
  requestPaymentData: jest.fn(),
  getBillingInfo: jest.fn(),
};

describe('Payment integration test', () => {
  let app: INestApplication;
  let client: ClientProxy;
  let billingRepo: EntityRepository<Billing>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
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
        ConfigModule.forRoot({
          envFilePath: '.env',
        }),
        MikroOrmModule.forRoot({
          type: 'postgresql',
          dbName: 'test',
          user: 'test',
          password: '',
          debug: true,
          autoLoadEntities: true,
          baseDir: __dirname,
          discovery: {
            warnWhenNoEntities: false,
          },
          metadataProvider: ReflectMetadataProvider,
        }),
        OgmaModule.forFeature(PaymentServiceImpl),
        OgmaModule.forFeature(PaymentFacade),
        OgmaModule.forFeature(PaymentController),
        MikroOrmModule.forFeature([Payment, Billing]),
        ClientsModule.register([
          {
            name: 'TEMP_SERVICE',
            transport: Transport.TCP,
          },
        ]),
      ],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: OgmaInterceptor,
        },
        PaymentCommandMapper,
        PaymentFacade,
        {
          provide: 'PaymentService',
          useClass: PaymentServiceImpl,
        },
        {
          provide: 'PaymentApi',
          useValue: mockPaymentApi,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.connectMicroservice({
      transport: Transport.TCP,
    });
    await app.startAllMicroservices();
    await app.init();
    billingRepo = app.get<EntityRepository<Billing>>(getRepositoryToken(Billing));
    client = app.get('TEMP_SERVICE');
    await client.connect();

    const orm = app.get<MikroORM>(MikroORM);
    const generator = orm.getSchemaGenerator();
    const dropDump = await generator.getDropSchemaSQL();
    const createDump = await generator.getCreateSchemaSQL();
    await generator.dropSchema();
    await generator.createSchema();
  });
  afterAll(async () => {
    app.close();
  });

  describe('updateBillingKey request', () => {
    it('success', async () => {
      const request: PaymentDto.UpdateBillingKey = {
        identityToken: faker.datatype.uuid(),
      };

      const initBilling = new Billing(request.identityToken);
      initBilling.billingId = faker.datatype.uuid();
      initBilling.cardName = 'ss';
      initBilling.cardNumber = '1234-1234-1234-1234';
      initBilling.buyerName = 'dd';
      initBilling.buyerTel = '010-2691-1111';
      initBilling.buyerEmail = 'ddddd@gmail.com';

      const billing = billingRepo.create(initBilling);
      await billingRepo.persistAndFlush(billing);

      mockPaymentApi.getBillingInfo.mockReturnValue({
        cardName: 'ss',
        cardNumber: '1234-1234-1234-1234',
      });

      const res: PaymentInfo.Billing = await firstValueFrom(client.send('payment.updateBillingKey', request));

      // TODO 기존 결제 취소하고 새로운결제
      expect(res.identityToken).toEqual(billing.identityToken);
      expect(res.cardName).toEqual(billing.cardName);
      expect(res.buyerName).toEqual(billing.buyerName);
      expect(res.buyerTel).toEqual(billing.buyerTel);
      expect(res.buyerEmail).toEqual(billing.buyerEmail);
    });
  });

  describe('requestPayment request', () => {
    it('succes', async () => {
      const request: PaymentDto.Payment = {
        identityToken: faker.datatype.uuid(),
        domainToken: faker.datatype.uuid(),
        paymentName: 'TEAMPLAN',
        amount: parseInt(faker.commerce.price()),
      };

      const initBilling = new Billing(request.identityToken);
      initBilling.billingId = faker.datatype.uuid();
      initBilling.cardName = 'ss';
      initBilling.cardNumber = '1234-1234-1234-1234';
      initBilling.buyerName = 'dd';
      initBilling.buyerTel = '010-1234-1234';
      initBilling.buyerEmail = 'ddddjeenz93@gmail.com';

      const billing = billingRepo.create(initBilling);
      await billingRepo.persistAndFlush(billing);
      const billingId = faker.datatype.string();
      const uuidMock = jest.fn().mockImplementation(() => {
        return billingId;
      });
      jest.mock('uuid', () => {
        return uuidMock;
      });

      const temp: PaymentInfo.PaymentResponse = {
        customerUid: faker.datatype.uuid(),
        merchantUid: getOrderMerchantUid(),
        domainToken: request.domainToken,
        paymentName: billingResponse.paymentName,
        amount: billingResponse.paid_amount,
        impUid: billingResponse.imp_uid,
        paidAt: billingResponse.paid_at,
        receiptUrl: billingResponse.receipt_url,
      };
      mockPaymentApi.requestPayment.mockReturnValue(temp);

      const res: PaymentResponse.Payment = await firstValueFrom(client.send('payment.requestPayment', request));
      expect(res.paymentId).not.toBeNull();
      expect(res.impUid).not.toBeNull();
      expect(res.paymentName).toEqual(request.paymentName);

      expect(res.amount).toEqual(100); // HARD
      expect(res.paidAt).not.toBeNull();
      expect(res.receiptUrl).not.toBeNull();
    });
  });
  describe('.env test', () => {
    it('success', async () => {
      const a = process.env['IMP_KEY'];
      const b = process.env['IMP_SECRET'];
      console.log(a);
    });
  });
});

const billingResponse = {
  success: true,
  imp_uid: 'imp_012126631615',
  pay_method: 'card',
  merchant_uid: 'asdadaddadddadda !!',
  paymentName: 'TEAMPLAN',
  paid_amount: 100,
  currency: 'KRW',
  pg_provider: 'danal_tpay',
  pg_type: 'payment',
  pg_tid: '202201051028466986003401',
  apply_num: '',
  buyer_name: 'dd',
  buyer_tel: '010-1234-1234',
  buyer_email: 'asdf@gmail.com',
  buyer_addr: '',
  buyer_postcode: '',
  custom_data: '{"userId": "mockUserId", "cardName": "card"}',
  status: 'paid',
  paid_at: 1641346196,
  receipt_url: '',
  card_name: 'sssc',
  bank_name: null,
  card_quota: 0,
  card_number: '',
  customer_uid: 'card_BjDEOa8v74B3',
};
