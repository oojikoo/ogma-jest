import { Body, Controller, Post } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';
import { OgmaLogger, OgmaService } from '@ogma/nestjs-module';

import { PaymentFacade } from '../application/payment.facade';
import * as PaymentCommand from '../domain/payment.command';
import * as PaymentDto from './payment.dto';
import * as PaymentResponse from './payment.response';

@Controller('payment')
export class PaymentController {
  constructor(
    private paymentFacade: PaymentFacade,
    @OgmaLogger(PaymentController) private readonly logger: OgmaService,
  ) {}

  @MessagePattern('payment.requestPayment')
  async requestPayment(
    @Payload() input: PaymentDto.Payment,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Payment> {
    const command = { ...input };
    const result = await this.paymentFacade.requestPayment(command);
    this.logger.log(`requestPayment response: ${result} `);
    return {
      ...result.paymentInfo,
    };
  }

  @MessagePattern('payment.requestRefund')
  async requestRefund(
    @Payload() input: PaymentDto.Refund,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Payment> {
    const command = { ...input };
    const result = await this.paymentFacade.requestRefund(command);
    this.logger.log(`requestRefund response: ${result} `);
    return {
      ...result.paymentInfo,
    };
  }

  @MessagePattern('payment.requestBillingToken')
  async requestBillingToken(
    @Payload() input: PaymentDto.RequestBillingToken,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.BillingToken> {
    const command = { ...input };
    const result = await this.paymentFacade.requestBillingToken(command);
    this.logger.log(`requestPayment response: ${result} `);
    return {
      ...result.billingInfo,
    };
  }

  @MessagePattern('payment.updateBillingKey')
  async updateBillingKey(
    @Payload() input: PaymentDto.UpdateBillingKey,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Billing> {
    const command = {
      ...input,
    };
    const result = await this.paymentFacade.updateBillingKey(command);
    this.logger.log(`registerBilling response -> ${result}`);
    return { ...result.billingInfo };
  }

  @MessagePattern('payment.UpdateBillingBuyerNumber')
  async UpdateBillingBuyerNumber(
    @Payload() input: PaymentDto.UpdateBillingBuyerNumber,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Billing> {
    const command = {
      ...input,
    };
    const result = await this.paymentFacade.updateBillingBuyerNumber(command);
    return { ...result.billingInfo };
  }

  @MessagePattern('payment.UpdateBillingBuyerEmail')
  async UpdateBillingBuyerEmail(
    @Payload() input: PaymentDto.UpdateBillingBuyerEmail,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Billing> {
    const command = {
      ...input,
    };
    const result = await this.paymentFacade.updateBillingBuyerEmail(command);
    return { ...result.billingInfo };
  }

  @MessagePattern('payment.getBillingInfo')
  async getBillingInfo(
    @Payload() input: PaymentDto.GetBillingKey,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Billing> {
    const { identityToken } = { ...input };

    const result = await this.paymentFacade.getBillingInfo(identityToken);
    this.logger.log(`getBillingInfo response -> ${result}`);
    return { ...result.billingInfo };
  }

  @MessagePattern('payment.requestSchedulePayment')
  async requestSchedulePayment(
    @Payload() input: PaymentDto.SchedulePayment,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Payment> {
    const command = { ...input };
    const result = await this.paymentFacade.requestSchedulePayment(command);
    this.logger.log(`requestPayment response: ${result} `);
    return {
      ...result.paymentInfo,
    };
  }

  @MessagePattern('payment.cancelSchedulePayment')
  async cancelRequestSchedulePayment(
    @Payload() input: PaymentDto.CancelSchedulePayment,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Payment> {
    const command = { ...input };
    const result = await this.paymentFacade.requestSchedulePayment(command);
    this.logger.log(`requestPayment response: ${result} `);
    return {
      ...result.paymentInfo,
    };
  }

  @MessagePattern('payment.paymentComplete')
  async listenPaymentComplete(
    @Payload() input: PaymentDto.SchedulePayment,
    @Ctx() context: NatsContext,
  ): Promise<PaymentResponse.Payment> {
    const command = { ...input };
    const result = await this.paymentFacade.requestSchedulePayment(command);
    this.logger.log(`requestPayment response: ${result} `);
    return {
      ...result.paymentInfo,
    };
  }

  @Post('test2')
  async importWebHook(@Body() input: PaymentDto.ImportWebhook): Promise<PaymentResponse.Payment> {
    const command: PaymentCommand.ScheduledPaymentComplete = {
      status: input.status,
      impUid: input.imp_uid,
      paymentToken: input.merchant_uid,
    };
    const result = await this.paymentFacade.importWebhook(command);
    this.logger.log(`importWebHook response -> ${result}`);
    return { ...result.paymentInfo };
  }

  @MessagePattern('payment.get')
  async get(@Payload() input: PaymentDto.Get, @Ctx() context: NatsContext): Promise<PaymentResponse.Payment> {
    const command = { ...input };
    const result = await this.paymentFacade.getPayment(command);
    this.logger.log(`get response: ${result} `);
    return {
      ...result.paymentInfo,
    };
  }

  @MessagePattern('payment.getList')
  async getList(@Payload() input: PaymentDto.GetList, @Ctx() context: NatsContext): Promise<PaymentResponse.Payment[]> {
    const command = { ...input };
    const resultList = await this.paymentFacade.getPaymentList(command);
    this.logger.log(`getList response: ${resultList} `);
    return resultList.map((result) => {
      return {
        ...result.paymentInfo,
      };
    });
  }
}
