export interface PaymentResponse {
  customerUid: string;
  merchantUid: string;
  domainToken: string;
  paymentName: string;
  amount: number;
  impUid: string;
  paidAt: number;
  receiptUrl: string;
}

export interface PaymentDetailResponse {
  customerUid: string;
  merchantUid: string;
  domainToken: string;
  paymentName: string;
  amount: number;
  impUid: string;
  paidAt: number;
  receiptUrl: string;
}

export interface SchedulePaymentResponse {
  customerUid: string;
  merchantUid: string;
  domainToken: string;
  paymentName: string;
  amount: number;
  scheduledAt: number;
}

export interface CancelSchedulePaymentResponse {
  res: boolean;
}

export interface BillingInfoResponse {
  cardName: string;
  cardNumber: string;
}

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

export interface RefundResponse {
  paymentId: string;
  impUid: string;
  domainToken: string;
  paymentName: string;
  amount: number;
  paidAt: number;
  refundAt: number;
}

export interface PaymentData {
  payment_status: string;
  impUid: string;
  customerUid: string;
  merchantUid: string;
  name: string;
  amount: number;
  paidAt: number;
  receiptUrl: string;
  // custom_data
  customer_data: string;
}

export interface PaymentDataResponse {
  status: string;
  impUid: string;
  domainToken: string;
  merchantUid: string;
  paymentName: string;
  amount: number;
  paidAt: number;
  receiptUrl: string;
  customerUidUsage?: string; // TODO 이거 작업 추가해서 예약결제인지 구분
  // custom_data
  // subscriptionId: string;
  // teamId: string;
  // billingId: string;
  // planId: string;
  // planOptionId: string;
}

export interface Detail {
  temp: string;
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
