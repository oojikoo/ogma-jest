import { InternalServerErrorException } from '@nestjs/common';

export class CriticalException extends InternalServerErrorException {
  constructor(message: string) {
    super('Critical', message);
  }
}
