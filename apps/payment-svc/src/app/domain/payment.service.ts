import * as PaymentInfo from '../domain/payment.info';
import * as PaymentCommand from './payment.command';

export interface PaymentService {
  requestPayment(command: PaymentCommand.Payment): Promise<PaymentInfo.Payment>;

  requestRefund(command: PaymentCommand.Refund): Promise<PaymentInfo.Payment>;

  requestBillingToken(command: PaymentCommand.RequestBillingToken): Promise<PaymentInfo.BillingToken>;

  updateBillingKey(command: PaymentCommand.UpdateBillingKey): Promise<PaymentInfo.Billing>;

  updateBillingBuyerNumber(command: PaymentCommand.UpdateBillingBuyerNumber): Promise<PaymentInfo.Billing>;

  updateBillingBuyerEmail(command: PaymentCommand.UpdateBillingBuyerEmail): Promise<PaymentInfo.Billing>;

  getBillingInfo(teamId: string): Promise<PaymentInfo.Billing>;

  requestSchedulePayment(command: PaymentCommand.RequestSchedulePayment): Promise<PaymentInfo.Payment>;

  imPortWebHook(command: PaymentCommand.ScheduledPaymentComplete): Promise<PaymentInfo.Payment>;

  getPayment(command: PaymentCommand.Get): Promise<PaymentInfo.Payment>;

  getPaymentList(command: PaymentCommand.GetList): Promise<PaymentInfo.Payment[]>;
}
