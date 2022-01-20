import { logger } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import axios from 'axios';

import { getOrderMerchantUid } from '../../helper/order-info.helper';
import { PaymentApi } from '../domain/apis/payment.api';
import * as PaymentInfo from '../domain/payment.info';
import { PaymentDataResponse } from '../domain/payment.info';

@Injectable()
export class ImpPaymentApiImpl implements PaymentApi {
  async requestPayment(
    customerUid: string,
    domainToken: string,
    paymentName: string,
    amount: number,
  ): Promise<PaymentInfo.PaymentResponse> {
    const accessToken = await this.getToken();
    const response = await this.payment(accessToken, customerUid, domainToken, paymentName, amount);

    return this.mappingPaymentResponse(response);
  }

  async requestSchedulePayment(
    domainToken: string,
    customerUid: string,
    name: string,
    amount: number,
    scheduleAt: number,
  ): Promise<PaymentInfo.SchedulePaymentResponse> {
    const accessToken = await this.getToken();
    const response = await this.schedulePayment(
      accessToken,
      domainToken,
      customerUid,
      getOrderMerchantUid(),
      name,
      amount,
      scheduleAt,
    );
    return this.mappingSchedulePaymentResponse(response);
  }

  async requestCancelSchedulePayment(
    customerUid: string,
    merchantUid: string,
  ): Promise<PaymentInfo.CancelSchedulePaymentResponse> {
    const accessToken = await this.getToken();
    const response = await this.cancelSchedulePayment(accessToken, customerUid, merchantUid);
    return {
      res: true,
    };
  }

  async requestPaymentData(impUid: string): Promise<PaymentDataResponse> {
    const accessToken = await this.getToken();
    return await this.getPaymentData(accessToken, impUid);
  }

  async getBillingInfo(customerUid: string): Promise<PaymentInfo.BillingInfoResponse> {
    const accessToken = await this.getToken();
    const billingDataResponse = await axios.get<undefined, ImpResponse<BillingData>>(
      `https://api.iamport.kr/subscribe/customers/${customerUid}`,
      {
        headers: { 'Content-Type': `application/json`, Authorization: accessToken },
      },
    );

    logger.log('getBillingInfo: ', billingDataResponse);

    const { code, message, response } = billingDataResponse.data;
    if (code !== 0) {
      throw new Error(`billingDataResponse rejected (code: ${code}): ${message}`);
    }

    return {
      cardName: response.card_name,
      cardNumber: response.card_number,
    };
  }

  private mappingSchedulePaymentResponse(response: SchedulePaymentData): PaymentInfo.SchedulePaymentResponse {
    const customerData: CustomData = JSON.parse(response.custom_data);
    return {
      customerUid: response.customer_uid,
      merchantUid: response.merchant_uid,
      domainToken: customerData.domainToken,
      paymentName: response.name,
      amount: response.amount,
      scheduledAt: response.schedule_at,
    };
  }

  private async getPaymentData(accessToken: string, impUid: string): Promise<PaymentDataResponse> {
    const paymentDataResponse = await axios.get<undefined, ImpResponse<PaymentData>>(
      `https://api.iamport.kr/payments/${impUid}`,
      {
        headers: { 'Content-Type': `application/json`, Authorization: accessToken },
      },
    );

    logger.log('paymentDataResponse: ', paymentDataResponse);

    const { code, message, response } = paymentDataResponse.data;
    if (code !== 0) {
      throw new Error(`get paymentData rejected (code: ${code}): ${message}`);
    }

    if (response.status !== 'paid') {
      throw new Error(`get paymentData payment not approved (code: ${code}): ${message}`);
    }

    // const customData: CustomData = JSON.parse(response.custom_data);

    return this.MappingPaymentDataResponse(response);
  }

  private MappingPaymentDataResponse(response: PaymentData): PaymentDataResponse {
    return {
      status: response.status,
      impUid: response.imp_uid,
      domainToken: response.domainToken,
      merchantUid: response.merchant_uid,
      paymentName: response.name,
      amount: response.amount,
      paidAt: response.paid_at,
      receiptUrl: response.receipt_url,
    };
  }

  private async schedulePayment(
    accessToken: string,
    domainToken: string,
    customerUid: string,
    merchantUid: string,
    paymentName: string,
    amount: number,
    scheduleAt: number,
  ): Promise<SchedulePaymentData> {
    const scheduleRequestBody: SchedulePaymentRequest = {
      customer_uid: customerUid,
      schedules: [
        {
          merchant_uid: merchantUid,
          name: paymentName,
          amount: amount,
          schedule_at: scheduleAt,
          custom_data: JSON.stringify({ domainToken: domainToken }),
        },
      ],
    };
    logger.log('scheduleRequestBody: ', scheduleRequestBody);

    const scheduleResponse = await axios.post<SchedulePaymentRequest, ImpResponse<SchedulePaymentData[]>>(
      'https://api.iamport.kr/subscribe/payments/schedule',
      JSON.stringify(scheduleRequestBody),
      {
        headers: { 'Content-Type': `application/json`, Authorization: accessToken },
      },
    );

    logger.log('scheduleResponse: ', scheduleResponse);

    const { code, message, response: responseArray } = scheduleResponse.data;
    if (responseArray.length != 1) {
      throw new Error(`schedule result error: ${responseArray.length}`);
    }
    const response = responseArray[0];

    if (code !== 0) {
      throw new Error(`schedule payment rejected (code: ${code}): ${message}`);
    }

    if (response.schedule_status !== 'scheduled') {
      throw new Error(`schedule payment not approved (code: ${code}): ${message}`);
    }

    return {
      ...response,
    };
  }

  private async cancelSchedulePayment(
    accessToken: string,
    customerUid: string,
    merchantUid: string,
  ): Promise<SchedulePaymentCancelData> {
    const cancelScheduleRequestBody: CancelSchedulePaymentRequest = {
      customer_uid: customerUid,
      merchant_uid: merchantUid,
    };
    logger.log('cancelScheduleRequestBody: ', cancelScheduleRequestBody);

    if (!merchantUid) {
      // TODO 체크
      throw Error('merchantUid 이 없습니다.');
    }

    const cancelScheduleResponse = await axios.post<
      CancelSchedulePaymentRequest,
      ImpResponse<SchedulePaymentCancelData[]>
    >('https://api.iamport.kr/subscribe/payments/unschedule', JSON.stringify(cancelScheduleRequestBody), {
      headers: { 'Content-Type': `application/json`, Authorization: accessToken },
    });

    logger.log('cancelSchedulePayment: ', cancelScheduleResponse);

    const { code, message, response: responseArray } = cancelScheduleResponse.data;
    if (responseArray.length != 1) {
      throw new Error(`schedule result error: ${responseArray.length}`);
    }
    const response = responseArray[0];

    if (code !== 0) {
      throw new Error(`cancelSchedulePayment rejected (code: ${code}): ${message}`);
    }

    if (response.schedule_status !== 'revoked') {
      throw new Error(`cancelSchedulePayment not approved (code: ${code}): ${message}`);
    }

    return response;
  }

  private async payment(
    accessToken: string,
    customerUid: string,
    domainToken: string,
    paymentName: string,
    amount: number,
  ): Promise<PaymentData> {
    const paymentRequestBody: PaymentRequest = {
      customer_uid: 'card_BjDEOa8v74B3', // TODO HARD
      merchant_uid: getOrderMerchantUid(),
      name: paymentName,
      amount: amount,
      custom_data: JSON.stringify({ domainToken: domainToken }),
    };
    logger.log('paymentRequestBody: ', paymentRequestBody);

    const paymentResponse = await axios.post<PaymentRequest, ImpResponse<PaymentData>>(
      'https://api.iamport.kr/subscribe/payments/again',
      JSON.stringify(paymentRequestBody),
      {
        headers: {
          'Content-Type': `application/json`,
          Authorization: accessToken,
        },
      },
    );
    logger.log('paymentResponse: ', paymentResponse);

    const { code, message, response } = paymentResponse.data;

    if (code !== 0) {
      throw new Error(`payment rejected (code: ${code}): ${message}`);
    }

    if (response.status !== 'paid') {
      throw new Error(`payment not approved (code: ${code}): ${message}`);
    }

    return response;
  }

  private async getToken(): Promise<string> {
    const test = {
      imp_key: process.env['IMP_KEY'],
      imp_secret: process.env['IMP_SECRET'],
    };
    const res = await axios.post<GetTokenRequest, GetTokenResponse>(
      'https://api.iamport.kr/users/getToken',
      JSON.stringify(test),
      {
        headers: {
          'Content-Type': `application/json`,
        },
      },
    );

    // console.log('sfgijadfi -> ', res);
    logger.log('getTokenResponse: ', res);

    return res.data.response.access_token;
    // TODO 해당 클래스로 못가져올떄 에러 어떻게 되는지 확인
  }

  private mappingPaymentResponse(response: PaymentData): PaymentInfo.PaymentResponse {
    const customerData: CustomData = JSON.parse(response.custom_data);
    return {
      merchantUid: response.merchant_uid,
      customerUid: response.customer_uid,
      domainToken: customerData.domainToken,
      paymentName: response.name,
      amount: response.amount,
      impUid: response.imp_uid,
      paidAt: response.paid_at,
      receiptUrl: response.receipt_url,
    };
  }

  // async requestRefund(paymentToken: string): Promise<PaymentInfo.Payment> {
  //   return Promise.resolve(undefined);
  // }
}

interface SchedulePaymentRequest {
  customer_uid: string;
  schedules: {
    merchant_uid: string;
    name: string;
    amount: number;
    schedule_at: number;
    custom_data: string;
  }[];
}

interface CancelSchedulePaymentRequest {
  customer_uid: string;
  merchant_uid: string;
}

interface PaymentRequest {
  customer_uid: string;
  merchant_uid: string;
  name: string;
  amount: number;
  custom_data: string;
}

interface ImpResponse<T> {
  data: {
    code: number;
    message: string;
    response: T;
  };
}

interface PaymentData {
  status: string;
  domainToken: string;
  imp_uid: string;
  merchant_uid: string;
  customer_uid: string;
  name: string;
  amount: number;
  paid_at: number;
  receipt_url: string;
  custom_data: string;
}

interface BillingData {
  card_number: string;
  card_name: string;
}

interface SchedulePaymentData {
  schedule_status: string;
  customer_uid: string;
  merchant_uid: string;
  name: string;
  amount: number;
  schedule_at: number;
  custom_data: string;
}

interface SchedulePaymentCancelData {
  schedule_status: string;
}

interface GetTokenRequest {
  imp_key: string;
  imp_secret: string;
}

interface GetTokenResponse {
  data: {
    response: TokenData;
  };
}

interface TokenData {
  access_token: string;
}

interface CustomData {
  domainToken: string;
}
