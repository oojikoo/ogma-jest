import * as PaymentInfo from '../payment.info';
import { BillingInfoResponse } from '../payment.info';

export interface PaymentApi {
  requestPayment(
    customerUid: string,
    domainToken: string,
    paymentName: string,
    amount: number,
  ): Promise<PaymentInfo.PaymentResponse>;

  requestSchedulePayment(
    domainToken: string,
    customerUid: string,
    paymentName: string,
    amount: number,
    scheduleAt: number,
  ): Promise<PaymentInfo.SchedulePaymentResponse>;

  requestRefund(paymentToken: string, amount: number, reason: string): Promise<PaymentInfo.RefundResponse>;

  requestPaymentData(impUid: string): Promise<PaymentInfo.PaymentDataResponse>;

  requestCancelSchedulePayment(
    customerUid: string,
    merchantUid: string,
    domainToken: string,
  ): Promise<PaymentInfo.CancelSchedulePaymentResponse>;

  getBillingInfo(customerUid: string): Promise<BillingInfoResponse>;
}
