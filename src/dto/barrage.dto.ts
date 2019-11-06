import { IsNotEmpty } from 'class-validator';

export class BarrageDto {
  @IsNotEmpty()
  userId: string;
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  content: string;
  receivedAt: string;
}
