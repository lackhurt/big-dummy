import { IsNotEmpty } from 'class-validator';

export class GiftDto {
  @IsNotEmpty()
  userId: number;
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  receivedAt: string;
  giftId: string;
  giftName: string;
  amount: number;
  unitPrice: number;
}
