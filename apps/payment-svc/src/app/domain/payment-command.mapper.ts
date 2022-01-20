import { Injectable } from '@nestjs/common';

import { Billing } from './billing/billing.entity';
import { Payment, PaymentStatus } from './payment.entity';
import * as PaymentInfo from './payment.info';
import dayjs = require('dayjs');

@Injectable()
export class PaymentCommandMapper {
  toPaymentEntity(paymentResponse: PaymentInfo.PaymentResponse) {
    return new Payment(
      PaymentStatus.PAY,
      paymentResponse.customerUid,
      paymentResponse.merchantUid,
      paymentResponse.domainToken,
      paymentResponse.paymentName,
      paymentResponse.amount,
      paymentResponse.impUid,
      dayjs.unix(paymentResponse.paidAt).toDate(),
      paymentResponse.receiptUrl,
    );
  }

  toSchedulePaymentEntity(paymentResponse: PaymentInfo.SchedulePaymentResponse) {
    return new Payment(
      PaymentStatus.SCHEDULED_PAY,
      paymentResponse.customerUid,
      paymentResponse.merchantUid,
      paymentResponse.domainToken,
      paymentResponse.paymentName,
      paymentResponse.amount,
      undefined,
      undefined,
      undefined,
      dayjs.unix(paymentResponse.scheduledAt).toDate(),
    );
  }

  toBillingEntity(teamId: string) {
    return new Billing(teamId);
  }

  ofPayment(entity: Payment): PaymentInfo.Payment {
    const {
      paymentId,
      impUid,
      paymentName,
      amount,
      domainToken,
      paymentStatus,
      paymentToken,
      receiptUrl,
      scheduledAt,
      refundAmount,
      refundAt,
      paidAt,
    } = { ...entity };
    return {
      paymentId: paymentId,
      impUid: impUid,
      domainToken: domainToken,
      paymentName: paymentName,
      amount: amount,
      paidAt: paidAt ? dayjs(paidAt).format('YYYY-MM-DD').toString() : '',
      scheduledAt: scheduledAt ? dayjs(scheduledAt).format('YYYY-MM-DD').toString() : '',
      refundAt: refundAt ? dayjs(refundAt).format('YYYY-MM-DD').toString() : '',
      receiptUrl: receiptUrl,
    };
  }

  ofBilling(billing: Billing): PaymentInfo.Billing {
    return {
      identityToken: billing.identityToken,
      customerUid: billing.customerUid,
      cardNumber: billing.cardNumber,
      cardName: billing.cardName,
      buyerName: billing.buyerName,
      buyerTel: billing.buyerTel,
      buyerEmail: billing.buyerEmail,
    };
  }
}
