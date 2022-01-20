import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 } from 'uuid';

@Entity()
export class Billing {
  @PrimaryKey()
  id: number;

  @Property()
  billingId: string = v4();

  @Property()
  identityToken: string;

  @Property()
  customerUid = 'aa';

  @Property({ nullable: true })
  cardName?: string;

  @Property({ nullable: true })
  cardNumber?: string;

  @Property({ nullable: true })
  buyerName?: string;

  @Property({ nullable: true })
  buyerTel?: string;

  @Property({ nullable: true })
  buyerEmail?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  constructor(identityToken: string) {
    this.identityToken = identityToken;
  }

  updateBillingBuyerEmail(buyerEmail: string) {
    this.buyerEmail = buyerEmail;
  }

  updateBillingBuyerNumber(buyerTel: string) {
    this.buyerTel = buyerTel;
  }

  changeCard(cardName: string, cardNumber: string) {
    this.cardNumber = cardNumber;
    this.cardName = cardName;
  }
}
