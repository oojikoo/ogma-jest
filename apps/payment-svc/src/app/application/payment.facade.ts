import { Inject, Injectable } from '@nestjs/common';
import { OgmaLogger, OgmaService } from '@ogma/nestjs-module';

import * as PaymentCommand from '../domain/payment.command';
import { PaymentService } from '../domain/payment.service';
import * as PaymentResult from './payment.result';

@Injectable()
export class PaymentFacade {
  constructor(
    @Inject('PaymentService') private paymentService: PaymentService,
    @OgmaLogger(PaymentFacade) private readonly logger: OgmaService,
  ) {}

  async requestPayment(command: PaymentCommand.Payment): Promise<PaymentResult.Payment> {
    const info = await this.paymentService.requestPayment(command);
    this.logger.log(info, { context: 'getInfo' });
    return { paymentInfo: info };
  }

  async requestRefund(command: PaymentCommand.Refund): Promise<PaymentResult.Payment> {
    const info = await this.paymentService.requestRefund(command);
    return { paymentInfo: info };
  }

  async requestBillingToken(command: PaymentCommand.RequestBillingToken): Promise<PaymentResult.BillingToken> {
    const info = await this.paymentService.requestBillingToken(command);
    return {
      billingInfo: info,
    };
  }

  async getBillingInfo(teamId: string): Promise<PaymentResult.Billing> {
    const info = await this.paymentService.getBillingInfo(teamId);
    return {
      billingInfo: info,
    };
  }

  async updateBillingKey(command: PaymentCommand.UpdateBillingKey): Promise<PaymentResult.Billing> {
    const info = await this.paymentService.updateBillingKey(command);
    return {
      billingInfo: info,
    };
  }

  async updateBillingBuyerNumber(command: PaymentCommand.UpdateBillingBuyerNumber): Promise<PaymentResult.Billing> {
    const info = await this.paymentService.updateBillingBuyerNumber(command);
    return {
      billingInfo: info,
    };
  }

  async updateBillingBuyerEmail(command: PaymentCommand.UpdateBillingBuyerEmail): Promise<PaymentResult.Billing> {
    const info = await this.paymentService.updateBillingBuyerEmail(command);
    return {
      billingInfo: info,
    };
  }

  async requestSchedulePayment(command: PaymentCommand.RequestSchedulePayment): Promise<PaymentResult.Payment> {
    const info = await this.paymentService.requestSchedulePayment(command);
    this.logger.log(info, { context: 'getInfo' });
    return { paymentInfo: info };
  }

  async importWebhook(command: PaymentCommand.ScheduledPaymentComplete): Promise<PaymentResult.Payment> {
    const info = await this.paymentService.imPortWebHook(command);
    return { paymentInfo: info };
  }

  async getPayment(command: PaymentCommand.Get): Promise<PaymentResult.Payment> {
    const info = await this.paymentService.getPayment(command);
    return { paymentInfo: info };
  }

  async getPaymentList(command: PaymentCommand.GetList): Promise<PaymentResult.Payment[]> {
    const infoList = await this.paymentService.getPaymentList(command);
    return infoList.map((info) => {
      return { paymentInfo: info };
    });
  }
}
