import { IsNotEmpty } from 'class-validator';

export class PostcardDto {
  @IsNotEmpty()
  userId: string;
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  content: string;
  @IsNotEmpty()
  to: string;

  contentReceivedAt: string;
  toReceivedAt: string;
}
