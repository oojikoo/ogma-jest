import { customAlphabet } from 'nanoid';
import dayjs = require('dayjs');

export const getOrderMerchantUid = () => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const size = 12;
  const nanoid = customAlphabet(alphabet, size);

  return `order_${nanoid()}`;
};

export const getOrderName = (value: string) => {
  return `${value} monthly subscription`;
};

export const getDateFromTimestamp = (timestamp: number) => {
  return dayjs.unix(timestamp).toDate();
};

export const getTimestampFromDate = (date: Date) => {
  return dayjs(date).valueOf();
};

export const getLenientNextMonthDate = (date: Date) => {
  return dayjs(date).clone().add(1, 'months').toDate();
};
