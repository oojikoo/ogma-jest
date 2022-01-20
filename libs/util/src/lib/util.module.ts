import { Filter } from '@mikro-orm/core';
import { Module } from '@nestjs/common';

@Module({
  controllers: [],
  providers: [],
  exports: [],
})
export class UtilModule {}

export type SoftDeleteOptions = {
  enabled?: boolean;
  defaultIsDeleted?: boolean;
  field?: string;
};

const defaultOptions = { enabled: true, defaultIsDeleted: false, field: 'deletedAt' };

export const SoftDelete = (options: SoftDeleteOptions = {}): ClassDecorator => {
  const { enabled, defaultIsDeleted, field } = { ...defaultOptions, ...options };
  return Filter({
    paymentName: 'softDelete',
    cond: ({ isDeleted = defaultIsDeleted }: { isDeleted?: boolean } = {}) =>
      isDeleted ? { [field]: { $ne: null } } : isDeleted === false ? { [field]: null } : {},
    args: false,
    default: enabled,
  });
};
