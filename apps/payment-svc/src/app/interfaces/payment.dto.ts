export interface Payment {
  identityToken: string;
  domainToken: string;
  paymentName: string;
  amount: number;
}

export interface SchedulePayment {
  identityToken: string;
  domainToken: string;
  scheduleAt: string;
  paymentName: string;
  amount: number;
}

export interface CancelSchedulePayment {
  identityToken: string;
  domainToken: string;
  scheduleAt: string;
  paymentName: string;
  amount: number;
}

export interface Refund {
  paymentId: string;
  domainToken: string;
  reason: string;
  refundAmount: number;
}

export interface RequestBillingToken {
  identityToken: string;
}

export interface RegisterBilling {
  customer_uid: string;
  identityToken: string;
  buyerName: string;
  buyerTel: string;
  buyerEmail: string;
}

export interface UpdateBillingKey {
  identityToken: string;
}

export interface UpdateBillingBuyerNumber {
  identityToken: string;
  buyerTel: string;
}

export interface UpdateBillingBuyerEmail {
  identityToken: string;
  buyerEmail: string;
}

export interface GetBillingKey {
  identityToken: string;
}

export interface ImportWebhook {
  status: string;
  imp_uid: string;
  merchant_uid: string;
}

export interface GetList {
  domainToken: string;
}

export interface Get {
  paymentId: string;
}
