import { IsNotEmpty } from 'class-validator';

export class PostcardDto {
  @IsNotEmpty()
  userId: number;
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  content: string;
  @IsNotEmpty()
  to: string;

  state: number

  giftPrice: number;

  contentReceivedAt: string;
  toReceivedAt: string;
  beReadyAt: string;
  finishedAt: string;
  avatar: string;
}
