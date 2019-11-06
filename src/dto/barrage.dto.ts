import { IsNotEmpty } from 'class-validator';

export class BarrageDto {
  userId: string;
  userName: string;
  content: string;
  modifiedAt: string;
}
