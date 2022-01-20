export interface Payment {
  paymentId: string;
  impUid?: string;
  domainToken: string;
  paymentName: string;
  amount: number;
  paidAt?: string;
  scheduledAt?: string;
  refundAt?: string;
  receiptUrl?: string;
}

export interface Billing {
  identityToken: string;
  customerUid: string;
  cardName?: string;
  cardNumber?: string;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
}

export interface BillingToken {
  customerUid: string;
  paymentToken: string;
}

//
// export interface Refund {
//   customerUid: string;
//   merchantUid: string;
//   paymentName: string;
//   amount: number;
//   currency: string;
//   paidAt: number;
//   receiptUrl: string;
// }

export interface Temp {
  temp: string;
}
