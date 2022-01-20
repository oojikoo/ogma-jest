export interface Payment {
  identityToken: string;
  domainToken: string;
  paymentName: string;
  amount: number;
}

export interface Refund {
  paymentId: string;
  domainToken: string;
  reason: string;
  refundAmount: number;
}

export interface RegisterBilling {
  customer_uid: string;
  buyerName: string;
  buyerTel: string;
  buyerEmail: string;
}

export interface Subscription {
  subscriptionId: string;
  planName: string;
  optionName: string;
  description: string;
  amount: number;
  period: string;
  duration: number;
  isTrial: boolean;
  maxPlayerCount: number;
  maxTeamCount: number;
  planId: string;
  planOptionId: string;
}

export interface RequestBillingToken {
  identityToken: string;
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

export interface RequestSchedulePayment {
  identityToken: string;
  domainToken: string;
  scheduleAt: string;
  paymentName: string;
  amount: number;
}

export interface ScheduledPaymentComplete {
  status: string;
  impUid: string;
  paymentToken: string;
}

export interface GetList {
  domainToken: string;
}

export interface Get {
  paymentId: string;
}
