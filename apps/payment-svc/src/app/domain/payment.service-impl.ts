import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { OgmaLogger, OgmaService } from '@ogma/nestjs-module';
import * as dayjs from 'dayjs';
import { firstValueFrom } from 'rxjs';

import { getOrderMerchantUid } from '../../helper/order-info.helper';
import { CriticalException } from '../interfaces/CriticalException';
import { PaymentApi } from './apis/payment.api';
import { Billing } from './billing/billing.entity';
import * as PaymentCommand from './payment.command';
import { Payment, PaymentStatus } from './payment.entity';
import * as PaymentInfo from './payment.info';
import { PaymentService } from './payment.service';
import { PaymentCommandMapper } from './payment-command.mapper';

export class PaymentServiceImpl implements PaymentService {
  constructor(
    private mapper: PaymentCommandMapper,
    @OgmaLogger('PaymentServiceImpl') private readonly logger: OgmaService,
    @InjectRepository(Payment) private paymentRepo: EntityRepository<Payment>,
    @InjectRepository(Billing) private billingRepo: EntityRepository<Billing>,
    @Inject('PaymentApi') private paymentApi: PaymentApi,
    @Inject('TEMP_SERVICE') private client: ClientProxy,
  ) {}

  async requestPayment(command: PaymentCommand.Payment): Promise<PaymentInfo.Payment> {
    this.logger.log(command, { context: 'input command' });
    const { paymentName, amount, domainToken, identityToken } = { ...command };
    const billing = await this.getBillingByIdentityToken(identityToken);
    const paymentResponse = await this.paymentApi.requestPayment(billing.customerUid, domainToken, paymentName, amount);
    // TODO 요청시 buyerInfo 넘기게 수정
    const payment = await this.createPayment(paymentResponse);

    await this.paymentRepo.persistAndFlush(payment);
    this.logger.log(payment, { context: 'return entity' });

    return this.mapper.ofPayment(payment);
  }

  async requestRefund(command: PaymentCommand.Refund): Promise<PaymentInfo.Payment> {
    this.logger.log(command, { context: 'input command' });
    const { reason, refundAmount, domainToken } = { ...command };
    const payment = await this.getPaymentByDomainToken(domainToken);
    const refundResponse = await this.paymentApi.requestRefund(payment.paymentToken, refundAmount, reason);
    payment.refund(refundAmount, dayjs.unix(refundResponse.refundAt).toDate(), reason);

    await this.paymentRepo.persistAndFlush(payment);
    this.logger.log(payment, { context: 'return entity' });

    return this.mapper.ofPayment(payment);
  }

  async requestBillingToken(command: PaymentCommand.RequestBillingToken): Promise<PaymentInfo.BillingToken> {
    this.logger.log(command, { context: 'input command' });
    const { identityToken } = { ...command };
    const existBilling = await this.getBillingByIdentityToken(identityToken);
    if (existBilling) {
      return {
        paymentToken: getOrderMerchantUid(), // TODO db에 존재하는지 체크해야함
        customerUid: existBilling.customerUid,
      };
    }

    const initBilling = this.mapper.toBillingEntity(command.identityToken);
    this.logger.log(initBilling, { context: 'init Billing' });
    const billing = this.billingRepo.create(initBilling);
    this.logger.log(billing, { context: 'create Billing' });
    await this.billingRepo.persistAndFlush(billing);

    return {
      paymentToken: getOrderMerchantUid(),
      customerUid: billing.customerUid,
    };
  }

  async updateBillingKey(command: PaymentCommand.UpdateBillingKey): Promise<PaymentInfo.Billing> {
    this.logger.log(command, { context: 'input command' });
    const { identityToken } = { ...command };
    const billing = await this.getBillingByIdentityToken(identityToken);
    const billingResponse = await this.paymentApi.getBillingInfo(billing.customerUid);
    billing.changeCard(billingResponse.cardNumber, billingResponse.cardNumber);
    await this.billingRepo.persistAndFlush(billing);
    this.logger.log(billing, { context: 'updated entity' });

    const scheduledPayment = await this.findScheduledPaymentByCustomerUid(billing.customerUid);
    if (!scheduledPayment) {
      // 예약된 결제가 없음 -> 기존 예약 취소후 새 카드로 예약결제를 안해도 됨.
      return this.mapper.ofBilling(billing);
    }

    if (!scheduledPayment.scheduledAt) {
      throw new Error('Critical Error 예약된 결제에 예약 결제 날짜가 없습니다.');
    }

    // TODO 여기서 취소 & 재 예약시 뭔가를 남겨야할거같은데
    const cancelResponse = await this.paymentApi.requestCancelSchedulePayment(
      scheduledPayment.customerUid,
      scheduledPayment.paymentToken,
      scheduledPayment.domainToken,
    );

    const reSchedulePaymentResponse = await this.paymentApi.requestSchedulePayment(
      scheduledPayment.domainToken,
      billing.customerUid,
      scheduledPayment.paymentName,
      scheduledPayment.amount,
      dayjs(scheduledPayment.scheduledAt).unix(),
    );

    return this.mapper.ofBilling(billing);
  }

  async updateBillingBuyerEmail(command: PaymentCommand.UpdateBillingBuyerEmail): Promise<PaymentInfo.Billing> {
    this.logger.log(command, { context: 'input command' });
    const { identityToken, buyerEmail } = { ...command };
    const retrievedBilling = await this.getBillingByIdentityToken(identityToken);
    retrievedBilling.updateBillingBuyerEmail(buyerEmail);

    await this.billingRepo.persistAndFlush(retrievedBilling);
    this.logger.log(retrievedBilling, { context: 'return entity' });

    return this.mapper.ofBilling(retrievedBilling);
  }

  async updateBillingBuyerNumber(command: PaymentCommand.UpdateBillingBuyerNumber): Promise<PaymentInfo.Billing> {
    this.logger.log(command, { context: 'input command' });
    const { identityToken, buyerTel } = { ...command };
    const retrievedBilling = await this.getBillingByIdentityToken(identityToken);
    retrievedBilling.updateBillingBuyerNumber(buyerTel);

    await this.billingRepo.persistAndFlush(retrievedBilling);
    this.logger.log(retrievedBilling, { context: 'return entity' });

    return this.mapper.ofBilling(retrievedBilling);
  }

  async getBillingInfo(identityToken: string): Promise<PaymentInfo.Billing> {
    this.logger.log(identityToken, { context: 'input identityToken' });
    const billing = await this.getBillingByIdentityToken(identityToken);
    this.logger.log(billing, { context: 'return entity' });

    return this.mapper.ofBilling(billing);
  }

  async requestSchedulePayment(command: PaymentCommand.RequestSchedulePayment): Promise<PaymentInfo.Payment> {
    this.logger.log(command, { context: 'input command' });
    const { identityToken, scheduleAt, paymentName, amount, domainToken } = { ...command };
    const billing = await this.getBillingByIdentityToken(identityToken);
    const paymentResponse = await this.paymentApi.requestSchedulePayment(
      domainToken,
      billing.customerUid,
      paymentName,
      amount,
      dayjs(scheduleAt).unix(),
    );
    const payment = await this.createSchedulePayment(paymentResponse);
    await this.paymentRepo.persistAndFlush(payment);
    this.logger.log(payment, { context: 'return entity' });

    return this.mapper.ofPayment(payment);
  }

  // 일반결제 - 대사, 결제완료 메세지(구독활성화)
  // 예약결제 - payment 엔티티 업데이트, 대사, 결제완료 메세지(구독활성화)
  async imPortWebHook(command: PaymentCommand.ScheduledPaymentComplete): Promise<PaymentInfo.Payment> {
    this.logger.log(command, { context: 'input command' });
    const { paymentToken, impUid, status } = { ...command };
    if (status == 'failed') {
      // TODO 예약결제 실패한 케이스
      throw new Error('결제 실패');
    }
    if (status == 'cancelled') {
      // TODO 관리자 콘솔에서 환불
      throw new Error('관리자 콘솔 환불');
    }
    if (status != 'paid') {
      // TODO 실행되면 안됨
      throw new CriticalException('알 수 없는 상태');
    }

    const scheduledPayment = await this.paymentRepo.findOneOrFail({ paymentToken: paymentToken }, true);
    const paymentDataResponse = await this.paymentApi.requestPaymentData(paymentToken);
    const { paidAt, receiptUrl, customerUidUsage } = { ...paymentDataResponse };
    // 예약결제
    if (customerUidUsage) {
      scheduledPayment.completeSchedulePayment(impUid, dayjs(paidAt).toDate(), receiptUrl);
    }

    this.logger.log(scheduledPayment, { context: 'return entity' });
    await this.paymentRepo.persistAndFlush(scheduledPayment);
    await this.alertPaymentComplete(scheduledPayment.domainToken, scheduledPayment.paymentId);

    return this.mapper.ofPayment(scheduledPayment);
  }

  async getPayment(command: PaymentCommand.Get): Promise<PaymentInfo.Payment> {
    this.logger.log(command, { context: 'input command' });
    const { paymentId } = { ...command };
    const payment = await this.paymentRepo.findOneOrFail({ paymentId: paymentId }, true);
    this.logger.log(payment, { context: 'return entity' });

    return this.mapper.ofPayment(payment);
  }

  async getPaymentList(command: PaymentCommand.GetList): Promise<PaymentInfo.Payment[]> {
    this.logger.log(command, { context: 'input command' });
    const { domainToken } = { ...command };
    const paymentList = await this.paymentRepo.find({ domainToken: domainToken }, true);
    this.logger.log(paymentList, { context: 'return entityList' });

    return paymentList.map((payment) => {
      return this.mapper.ofPayment(payment);
    });
  }

  private makePaymentMapList(paymentList: Payment[]): Map<string, Payment> {
    const paymentMap = new Map<string, Payment>();
    paymentList.map((payment) => {
      paymentMap.set(payment.domainToken, payment);
    });
    return paymentMap;
  }

  private async createPayment(paymentResponse: PaymentInfo.PaymentResponse) {
    const initPayment = this.mapper.toPaymentEntity(paymentResponse);
    this.logger.log(`initPayment: ${initPayment}`);

    const payment = this.paymentRepo.create(initPayment);
    this.logger.log(`persist payment: ${payment}`);

    return payment;
  }

  private async createSchedulePayment(paymentResponse: PaymentInfo.SchedulePaymentResponse): Promise<Payment> {
    const initSchedulePayment = this.mapper.toSchedulePaymentEntity(paymentResponse);
    this.logger.log(initSchedulePayment, { context: 'initSchedulePayment' });

    const payment = this.paymentRepo.create(initSchedulePayment);
    this.logger.log(payment, { context: 'persist schedulePayment' });

    return payment;
  }

  private async getPaymentByDomainToken(domainToken: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOneOrFail({ domainToken: domainToken }, true);
    this.logger.log(payment, { context: 'getPaymentByDomainToken' });
    return payment;
  }

  private async getBillingByIdentityToken(identityToken: string): Promise<Billing> {
    const billing = await this.billingRepo.findOneOrFail({ identityToken: identityToken }, true);
    this.logger.log(billing, { context: 'retrieved entity' });
    return billing;
  }

  private async alertPaymentComplete(domainToken: string, paymentId: string) {
    const request = {
      domainToken: domainToken,
      paymentId: paymentId,
    };

    return await firstValueFrom(this.client.send('subscription.paymentComplete', request));
    // TODO 메세징 확인
  }

  private async findScheduledPaymentByCustomerUid(customerUid: string) {
    return await this.paymentRepo.findOne(
      {
        customerUid: customerUid,
        paymentStatus: PaymentStatus.SCHEDULED_PAY,
      },
      true,
    );
  }
}
