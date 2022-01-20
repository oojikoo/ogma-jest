import { MikroORM, ReflectMetadataProvider } from '@mikro-orm/core';
import { getRepositoryToken, MikroOrmModule } from '@mikro-orm/nestjs';
import { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { OgmaInterceptor, OgmaModule } from '@ogma/nestjs-module';
import { NatsParser } from '@ogma/platform-nats';
import * as dayjs from 'dayjs';
import * as faker from 'faker';
import * as MockDate from 'mockdate';
import { Observable } from 'rxjs';

import { Billing } from '../src/app/domain/billing/billing.entity';
import * as PaymentCommand from '../src/app/domain/payment.command';
import { Payment, PaymentStatus } from '../src/app/domain/payment.entity';
import * as PaymentInfo from '../src/app/domain/payment.info';
import { PaymentService } from '../src/app/domain/payment.service';
import { PaymentServiceImpl } from '../src/app/domain/payment.service-impl';
import { PaymentCommandMapper } from '../src/app/domain/payment-command.mapper';
import { CriticalException } from '../src/app/interfaces/CriticalException';
import { getOrderMerchantUid } from '../src/helper/order-info.helper';

const mockPaymentApi = {
  requestPayment: jest.fn(),
  requestSchedulePayment: jest.fn(),
  cancelSchedulePayment: jest.fn(),
  requestRefund: jest.fn(),
  requestPaymentData: jest.fn(),
  getBillingInfo: jest.fn(),
};

const mockClientProxy = {
  send: jest.fn(),
};

const mockBillingRepo = {
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  persistAndFlush: jest.fn(),
  find: jest.fn(),
};

const mockPaymentRepo = {
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  persistAndFlush: jest.fn(),
  find: jest.fn(),
};

describe('Payment service Unit test', () => {
  let app: INestApplication;
  let client: ClientProxy;
  let paymentService: PaymentService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
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
        OgmaModule.forFeature('PaymentServiceImpl'),
        MikroOrmModule.forRoot({
          type: 'postgresql',
          dbName: 'test',
          user: 'dbuser',
          password: '',
          debug: true,
          autoLoadEntities: true,
          baseDir: __dirname,
          discovery: {
            warnWhenNoEntities: false,
          },
          metadataProvider: ReflectMetadataProvider,
        }),
        MikroOrmModule.forFeature([Payment, Billing]),
      ],
      providers: [
        PaymentCommandMapper,
        {
          provide: 'PaymentService',
          useClass: PaymentServiceImpl,
        },
        {
          provide: 'PaymentApi',
          useValue: mockPaymentApi,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: OgmaInterceptor,
        },
        {
          provide: 'TEMP_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepo,
        },
        {
          provide: getRepositoryToken(Billing),
          useValue: mockBillingRepo,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.startAllMicroservices();
    await app.init();
    paymentService = app.get<PaymentService>('PaymentService');

    const orm = app.get<MikroORM>(MikroORM);
    const generator = orm.getSchemaGenerator();
    const dropDump = await generator.getDropSchemaSQL();
    const createDump = await generator.getCreateSchemaSQL();
    await generator.dropSchema();
    await generator.createSchema();
    jest.mock('uuid', () => ({ v4: () => 'sdfjsk' }));
  });
  afterAll(async () => {
    app.close();
  });

  describe('requestPayment', () => {
    function makePaymentEntity(mockPaymentResponse: PaymentInfo.PaymentResponse) {
      const expectedEntity: Payment = new Payment(
        PaymentStatus.PAY,
        mockPaymentResponse.customerUid,
        mockPaymentResponse.merchantUid,
        mockPaymentResponse.domainToken,
        mockPaymentResponse.paymentName,
        mockPaymentResponse.amount,
        mockPaymentResponse.impUid,
        dayjs.unix(mockPaymentResponse.paidAt).toDate(),
        mockPaymentResponse.receiptUrl,
      );
      return expectedEntity;
    }

    function makePaymentResponse(mockRetrieveBilling: Billing, command: PaymentCommand.Payment) {
      const mockPaymentResponse: PaymentInfo.PaymentResponse = {
        customerUid: mockRetrieveBilling.customerUid,
        merchantUid: getOrderMerchantUid(),
        domainToken: command.domainToken,
        paymentName: command.paymentName,
        amount: command.amount,
        impUid: faker.datatype.uuid(),
        paidAt: dayjs(faker.datatype.datetime()).unix(),
        receiptUrl: faker.internet.url(),
      };
      return mockPaymentResponse;
    }

    function makeExpectInfo(mockCreatedPayment: Payment) {
      const expectInfo: PaymentInfo.Payment = {
        paymentId: mockCreatedPayment.paymentId,
        impUid: mockCreatedPayment.impUid,
        domainToken: mockCreatedPayment.domainToken,
        paymentName: mockCreatedPayment.paymentName,
        amount: mockCreatedPayment.amount,
        paidAt: dayjs(mockCreatedPayment.paidAt).format('YYYY-MM-DD').toString(),
        scheduledAt: '',
        refundAt: '',
        receiptUrl: mockCreatedPayment.receiptUrl,
      };
      return expectInfo;
    }

    function makeCommand() {
      const command: PaymentCommand.Payment = {
        identityToken: faker.datatype.uuid(),
        domainToken: faker.datatype.uuid(),
        paymentName: faker.commerce.productName(),
        amount: parseInt(faker.commerce.price()),
      };
      return command;
    }

    function makeBillingEntity(command: PaymentCommand.Payment) {
      const mockRetrieveBilling = new Billing(command.identityToken);
      mockRetrieveBilling.billingId = faker.datatype.uuid();
      mockRetrieveBilling.customerUid = faker.datatype.uuid();
      return mockRetrieveBilling;
    }

    describe('request with valid info', () => {
      it('success', async () => {
        MockDate.set(new Date());

        const command = makeCommand();
        const mockRetrieveBilling = makeBillingEntity(command);
        const mockPaymentResponse = makePaymentResponse(mockRetrieveBilling, command);
        const expectedEntity = makePaymentEntity(mockPaymentResponse);
        const mockCreatedPayment = expectedEntity; //TODO deepcopy로
        const expectInfo = makeExpectInfo(mockCreatedPayment);

        mockBillingRepo.findOneOrFail.mockReturnValue(mockRetrieveBilling);
        mockPaymentApi.requestPayment.mockReturnValue(mockPaymentResponse); // TODO input aaserrt
        mockPaymentRepo.create.mockReturnValue(mockCreatedPayment);

        const res = await paymentService.requestPayment(command);
        expect(res).toEqual(expectInfo);
        expect(mockBillingRepo.findOneOrFail).toHaveBeenCalledWith({ identityToken: command.identityToken }, true);
        expect(mockPaymentApi.requestPayment).toHaveBeenCalledWith(
          mockRetrieveBilling.customerUid,
          command.domainToken,
          command.paymentName,
          command.amount,
        );
        // expect(mockPaymentRepo.create).toHaveBeenCalledWith(expectedEntity); // TODO uuidmocking error
      });
    });
  });

  describe('requestRefund', () => {
    function makeExpectInfo(mockCreatedPayment: Payment) {
      const expectInfo: PaymentInfo.Payment = {
        paymentId: mockCreatedPayment.paymentId,
        impUid: mockCreatedPayment.impUid,
        domainToken: mockCreatedPayment.domainToken,
        paymentName: mockCreatedPayment.paymentName,
        amount: mockCreatedPayment.amount,
        paidAt: dayjs(mockCreatedPayment.paidAt).format('YYYY-MM-DD').toString(),
        scheduledAt: '',
        refundAt: '',
        receiptUrl: mockCreatedPayment.receiptUrl,
      };
      return expectInfo;
    }

    function makeCommand() {
      const command: PaymentCommand.Refund = {
        paymentId: faker.datatype.uuid(),
        domainToken: faker.datatype.uuid(),
        reason: 'refund test',
        refundAmount: parseInt(faker.commerce.price()),
      };
      return command;
    }

    function makePaymentResponse(mockRetrievePayment: Payment, command: PaymentCommand.Refund) {
      return {
        paymentId: mockRetrievePayment.paymentId,
        impUid: mockRetrievePayment.impUid ?? 'errorrrrr',
        domainToken: command.domainToken,
        paymentName: mockRetrievePayment.paymentName,
        amount: command.refundAmount,
        paidAt: dayjs(mockRetrievePayment.paidAt).unix(),
        refundAt: dayjs().unix(),
      };
    }

    describe('request with valid info', () => {
      it('success', async () => {
        MockDate.set(new Date());

        const command = makeCommand();
        const mockRetrievePayment = makePaymentEntity();
        mockRetrievePayment.domainToken = command.domainToken;
        mockRetrievePayment.refundReason = command.reason;
        mockRetrievePayment.amount = command.refundAmount;
        mockRetrievePayment.paymentId = command.paymentId;
        mockRetrievePayment.paymentStatus = PaymentStatus.PAY;
        mockRetrievePayment.paidAt = dayjs().toDate();

        const mockRefundResponse: PaymentInfo.RefundResponse = makePaymentResponse(mockRetrievePayment, command);

        const expectInfo: PaymentInfo.Payment = {
          paymentId: mockRetrievePayment.paymentId,
          impUid: mockRetrievePayment.impUid,
          domainToken: mockRetrievePayment.domainToken,
          paymentName: mockRetrievePayment.paymentName,
          amount: mockRetrievePayment.amount,
          paidAt: dayjs(mockRetrievePayment.paidAt).format('YYYY-MM-DD').toString(),
          scheduledAt: '',
          refundAt: dayjs.unix(mockRefundResponse.refundAt).format('YYYY-MM-DD').toString(),
          receiptUrl: mockRetrievePayment.receiptUrl,
        };

        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievePayment);
        mockPaymentApi.requestRefund.mockReturnValue(mockRefundResponse);

        const res = await paymentService.requestRefund(command);
        expect(res).toEqual(expectInfo);
      });
    });
    describe('when already refunded', () => {
      it('error response', async () => {
        const command = makeCommand();
        const mockRetrievePayment = makePaymentEntity();
        mockRetrievePayment.domainToken = command.domainToken;
        mockRetrievePayment.refundReason = command.reason;
        mockRetrievePayment.amount = command.refundAmount;
        mockRetrievePayment.paymentId = command.paymentId;
        mockRetrievePayment.paymentStatus = PaymentStatus.REFUND;

        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievePayment);

        await expect(async () => {
          await paymentService.requestRefund(command);
        }).rejects.toThrowError(new Error(`환불가능한 상태가 아닙니다.`));
      });
    });
    describe('when only reservation was made', () => {
      it('error response', async () => {
        const command = makeCommand();
        const mockRetrievePayment = makePaymentEntity();
        mockRetrievePayment.domainToken = command.domainToken;
        mockRetrievePayment.refundReason = command.reason;
        mockRetrievePayment.amount = command.refundAmount;
        mockRetrievePayment.paymentId = command.paymentId;
        mockRetrievePayment.paymentStatus = PaymentStatus.SCHEDULED_PAY;

        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievePayment);

        await expect(async () => {
          await paymentService.requestRefund(command);
        }).rejects.toThrowError(new Error(`환불가능한 상태가 아닙니다.`));
      });
    });
    describe('when fail status', () => {
      it('error response', async () => {
        const command = makeCommand();
        const mockRetrievePayment = makePaymentEntity();
        mockRetrievePayment.domainToken = command.domainToken;
        mockRetrievePayment.refundReason = command.reason;
        mockRetrievePayment.amount = command.refundAmount;
        mockRetrievePayment.paymentId = command.paymentId;
        mockRetrievePayment.paymentStatus = PaymentStatus.FAIL;

        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievePayment);

        await expect(async () => {
          await paymentService.requestRefund(command);
        }).rejects.toThrowError(new Error(`환불가능한 상태가 아닙니다.`));
      });
    });
  });

  describe('imPortWebHook', () => {
    describe('when status failed', () => {
      it('success', async () => {
        const command: PaymentCommand.ScheduledPaymentComplete = {
          status: 'failed',
          impUid: faker.datatype.uuid(),
          paymentToken: faker.datatype.uuid(),
        };

        await expect(async () => {
          await paymentService.imPortWebHook(command);
        }).rejects.toThrowError(new Error(`결제 실패`));
      });
    });
    describe('when status failed cancelled', () => {
      it('success', async () => {
        const command: PaymentCommand.ScheduledPaymentComplete = {
          status: 'cancelled',
          impUid: faker.datatype.uuid(),
          paymentToken: faker.datatype.uuid(),
        };

        await expect(async () => {
          await paymentService.imPortWebHook(command);
        }).rejects.toThrowError(new Error(`관리자 콘솔 환불`));
      });
    });
    describe('when status is not any of fail, cancelled, paid status', () => {
      it('success', async () => {
        const command: PaymentCommand.ScheduledPaymentComplete = {
          status: 'asd',
          impUid: faker.datatype.uuid(),
          paymentToken: faker.datatype.uuid(),
        };

        await expect(async () => {
          await paymentService.imPortWebHook(command);
        }).rejects.toThrowError(new CriticalException(`알 수 없는 상태`));
      });
    });
    describe('in case reserved payment and status is paid', () => {
      it('success', async () => {
        const command: PaymentCommand.ScheduledPaymentComplete = {
          status: 'paid',
          impUid: faker.datatype.uuid(),
          paymentToken: faker.datatype.uuid(),
        };

        const mockRetrievedPayment = new Payment(
          PaymentStatus.SCHEDULED_PAY,
          faker.datatype.uuid(),
          command.paymentToken,
          faker.datatype.uuid(),
          faker.commerce.productName(),
          parseInt(faker.commerce.price()),
          command.impUid,
          faker.datatype.datetime(),
          faker.internet.url(),
        );
        mockRetrievedPayment.scheduledAt = faker.datatype.datetime();

        const mockPaymentDataResponse: PaymentInfo.PaymentDataResponse = {
          status: command.status,
          impUid: command.impUid,
          domainToken: mockRetrievedPayment.domainToken,
          merchantUid: command.paymentToken,
          paymentName: mockRetrievedPayment.paymentName,
          amount: mockRetrievedPayment.amount,
          paidAt: dayjs(mockRetrievedPayment.paidAt).unix(),
          receiptUrl: faker.internet.url(),
          customerUidUsage: 'payment.scheduled',
        };

        const expectInfo: PaymentInfo.Payment = {
          paymentId: mockRetrievedPayment.paymentId,
          impUid: mockPaymentDataResponse.impUid,
          domainToken: mockPaymentDataResponse.domainToken,
          paymentName: mockPaymentDataResponse.paymentName,
          amount: mockPaymentDataResponse.amount,
          paidAt: dayjs(mockPaymentDataResponse.paidAt).format('YYYY-MM-DD').toString(),
          scheduledAt: dayjs(mockRetrievedPayment.scheduledAt).format('YYYY-MM-DD').toString(),
          refundAt: '',
          receiptUrl: mockPaymentDataResponse.receiptUrl,
        };

        mockPaymentApi.requestPaymentData.mockReturnValue(mockPaymentDataResponse);
        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievedPayment);
        mockClientProxy.send.mockReturnValue(mockAlertPaymentComplete());

        const res: PaymentInfo.Payment = await paymentService.imPortWebHook(command);
        expect(mockPaymentRepo.findOneOrFail).toHaveBeenCalledWith({ paymentToken: command.paymentToken }, true);
        expect(mockPaymentApi.requestPaymentData).toHaveBeenCalledWith(command.paymentToken);
        expect(mockClientProxy.send).toHaveBeenCalledWith('subscription.paymentComplete', {
          domainToken: mockRetrievedPayment.domainToken,
          paymentId: mockRetrievedPayment.paymentId,
        });
        expect(res).toEqual(expectInfo);
      });
    });
    describe('when reserved payment but reservation date is missing', () => {
      it('error', async () => {
        const command: PaymentCommand.ScheduledPaymentComplete = {
          status: 'paid',
          impUid: faker.datatype.uuid(),
          paymentToken: faker.datatype.uuid(),
        };

        const mockRetrievedPayment = new Payment(
          PaymentStatus.SCHEDULED_PAY,
          faker.datatype.uuid(),
          command.paymentToken,
          faker.datatype.uuid(),
          faker.commerce.productName(),
          parseInt(faker.commerce.price()),
          command.impUid,
          dayjs().toDate(),
          faker.internet.url(),
        );

        const mockPaymentDataResponse: PaymentInfo.PaymentDataResponse = {
          status: command.status,
          impUid: command.impUid,
          domainToken: mockRetrievedPayment.domainToken,
          merchantUid: command.paymentToken,
          paymentName: mockRetrievedPayment.paymentName,
          amount: mockRetrievedPayment.amount,
          paidAt: dayjs(mockRetrievedPayment.paidAt).unix(),
          receiptUrl: faker.internet.url(),
          customerUidUsage: 'payment.scheduled',
        };

        const expectInfo: PaymentInfo.Payment = {
          paymentId: faker.datatype.uuid(),
          impUid: mockPaymentDataResponse.impUid,
          domainToken: mockPaymentDataResponse.domainToken,
          paymentName: mockPaymentDataResponse.paymentName,
          amount: mockPaymentDataResponse.amount,
          paidAt: mockPaymentDataResponse.paidAt.toString(),
          scheduledAt: faker.datatype.datetime().toString(),
          refundAt: undefined,
          receiptUrl: mockPaymentDataResponse.receiptUrl,
        };

        mockPaymentApi.requestPaymentData.mockReturnValue(mockPaymentDataResponse);
        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievedPayment);

        await expect(async () => {
          await paymentService.imPortWebHook(command);
        }).rejects.toThrowError(new Error(`Critical 결제예약 날짜가 없습니다.`));
      });
    });
    describe('when status is paid', () => {
      it('success', async () => {
        const command: PaymentCommand.ScheduledPaymentComplete = {
          status: 'paid',
          impUid: faker.datatype.uuid(),
          paymentToken: faker.datatype.uuid(),
        };

        const mockRetrievedPayment = new Payment(
          PaymentStatus.SCHEDULED_PAY,
          faker.datatype.uuid(),
          command.paymentToken,
          faker.datatype.uuid(),
          faker.commerce.productName(),
          parseInt(faker.commerce.price()),
          command.impUid,
          faker.datatype.datetime(),
          faker.internet.url(),
        );
        mockRetrievedPayment.scheduledAt = faker.datatype.datetime();

        const mockPaymentDataResponse: PaymentInfo.PaymentDataResponse = {
          status: command.status,
          impUid: command.impUid,
          domainToken: mockRetrievedPayment.domainToken,
          merchantUid: command.paymentToken,
          paymentName: mockRetrievedPayment.paymentName,
          amount: mockRetrievedPayment.amount,
          paidAt: dayjs(mockRetrievedPayment.paidAt).unix(),
          receiptUrl: mockRetrievedPayment.receiptUrl!,
          customerUidUsage: undefined,
        };

        const expectInfo: PaymentInfo.Payment = {
          paymentId: mockRetrievedPayment.paymentId,
          impUid: mockPaymentDataResponse.impUid,
          domainToken: mockPaymentDataResponse.domainToken,
          paymentName: mockPaymentDataResponse.paymentName,
          amount: mockPaymentDataResponse.amount,
          paidAt: dayjs.unix(mockPaymentDataResponse.paidAt).format('YYYY-MM-DD').toString(),
          scheduledAt: dayjs(mockRetrievedPayment.scheduledAt).format('YYYY-MM-DD').toString(),
          refundAt: '',
          receiptUrl: mockPaymentDataResponse.receiptUrl,
        };

        mockPaymentApi.requestPaymentData.mockReturnValue(mockPaymentDataResponse);
        mockPaymentRepo.findOneOrFail.mockReturnValue(mockRetrievedPayment);
        mockClientProxy.send.mockReturnValue(mockAlertPaymentComplete());

        const res: PaymentInfo.Payment = await paymentService.imPortWebHook(command);
        expect(mockPaymentRepo.findOneOrFail).toHaveBeenCalledWith({ paymentToken: command.paymentToken }, true);
        expect(mockPaymentApi.requestPaymentData).toHaveBeenCalledWith(command.paymentToken);
        expect(mockClientProxy.send).toHaveBeenCalledWith('subscription.paymentComplete', {
          domainToken: mockRetrievedPayment.domainToken,
          paymentId: mockRetrievedPayment.paymentId,
        });
        expect(res).toEqual(expectInfo);
      });
    });
  });
});

function mockAlertPaymentComplete() {
  return new Observable(function (observer) {
    observer.next({
      paymentId: faker.datatype.uuid(),
    });
    observer.complete();
  });
}

function makePaymentEntity(): Payment {
  return new Payment(
    PaymentStatus.SCHEDULED_PAY,
    faker.datatype.uuid(),
    faker.datatype.uuid(),
    faker.datatype.uuid(),
    faker.commerce.productName(),
    parseInt(faker.commerce.price()),
    faker.datatype.uuid(),
    faker.datatype.datetime(),
    faker.internet.url(),
  );
}
