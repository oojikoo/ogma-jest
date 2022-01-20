import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentStatus {
  // PRE_PAY = "PRE_PAY",
  SCHEDULED_PAY = 'SCHEDULED_PAY',
  PAY = 'PAY',
  FAIL = 'FAIL',
  REFUND = 'REFUND',
}

@Entity()
export class Payment {
  @PrimaryKey()
  id: number;

  @Property()
  paymentId: string = uuidv4();

  @Property()
  @Enum(() => PaymentStatus)
  paymentStatus: PaymentStatus;

  @Property({ nullable: true })
  impUid?: string;

  @Property()
  customerUid: string;

  @Property()
  paymentToken: string;

  @Property()
  domainToken: string;

  @Property()
  paymentName: string;

  @Property()
  amount: number;

  @Property({ nullable: true })
  paidAt?: Date;

  @Property({ nullable: true })
  receiptUrl?: string;

  @Property({ nullable: true })
  scheduledAt?: Date;

  @Property({ nullable: true })
  refundAt?: Date;

  @Property({ nullable: true })
  refundReason?: string;

  @Property({ nullable: true })
  refundAmount?: number;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  constructor(
    paymentStatus: PaymentStatus,
    customerUid: string,
    paymentToken: string,
    domainToken: string,
    paymentName: string,
    amount: number,
    impUid?: string,
    paidAt?: Date,
    receiptUrl?: string,
    scheduledAt?: Date,
  ) {
    this.paymentStatus = paymentStatus;
    this.impUid = impUid;
    this.customerUid = customerUid;
    this.paymentToken = paymentToken;
    this.domainToken = domainToken;
    this.paymentName = paymentName;
    this.amount = amount;
    this.paidAt = paidAt;
    this.receiptUrl = receiptUrl;
    this.scheduledAt = scheduledAt;
  }

  completeSchedulePayment(impUid: string, paidAt: Date, receiptUrl: string) {
    if (this.paymentStatus != PaymentStatus.SCHEDULED_PAY) {
      throw new Error('환불가능한 상태가 아닙니다.');
    }
    if (!this.scheduledAt) {
      throw new Error('Critical 결제예약 날짜가 없습니다.');
    }

    this.paymentStatus = PaymentStatus.PAY;
    this.paidAt = paidAt;
    this.receiptUrl = receiptUrl;
    this.impUid = impUid;
  }

  refund(refundAmount: number, refundAt: Date, refundReason: string) {
    if (this.paymentStatus != PaymentStatus.PAY) {
      throw new Error('환불가능한 상태가 아닙니다.');
    }
    if (!this.paidAt) {
      throw new Error('Critical 결제날짜가 없습니다.');
    }
    if (!this.receiptUrl) {
      throw new Error('Critical 결제링크가 없습니다.');
    }

    this.refundAmount = refundAmount;
    this.refundAt = refundAt;
    this.refundReason = refundReason;
    this.paymentStatus = PaymentStatus.REFUND;
  }
}
