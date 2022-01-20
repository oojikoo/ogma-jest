import * as PaymentInfo from '../domain/payment.info';

export interface Payment {
  paymentInfo: PaymentInfo.Payment;
}

export interface Billing {
  billingInfo: PaymentInfo.Billing;
}

export interface BillingToken {
  billingInfo: PaymentInfo.BillingToken;
}

export interface Simple {
  paymentInfo: PaymentInfo.Payment;
}

export interface PaymentResponse {
  paymentDataInfo: PaymentInfo.PaymentDataResponse;
}
