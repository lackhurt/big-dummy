import { Body, Controller, Get, Logger, Param, Post, Res } from '@nestjs/common';
import { SnsService } from './sns.service';
import { BarrageDto } from '../dto/barrage.dto';

@Controller('sns')
export class SnsController {
  constructor(private readonly snsService: SnsService) {}
  @Post('/barrage')
  async createBarrageDto(@Body() barrageDto: BarrageDto): Promise<boolean> {
    return await this.snsService.saveBarrage(barrageDto);
  }
}
