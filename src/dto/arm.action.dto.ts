import { IsNotEmpty } from 'class-validator';

export class ArmActionDto {
  @IsNotEmpty()
  action: number;
}
