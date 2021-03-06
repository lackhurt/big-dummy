import { IsNotEmpty } from 'class-validator';

export class BarrageDto {
  @IsNotEmpty()
  userId: number;
  @IsNotEmpty()
  userName: string;
  @IsNotEmpty()
  content: string;
  receivedAt: string;
}
