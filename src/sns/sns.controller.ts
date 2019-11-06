import { Body, Controller, Get, HttpStatus, Logger, Param, Post, Res } from '@nestjs/common';
import { SnsService } from './sns.service';
import { BarrageDto } from '../dto/barrage.dto';
import { validate } from 'class-validator';

@Controller('sns')
export class SnsController {
  constructor(private readonly snsService: SnsService) {}

  /**
   * 弹幕
   * @param barrageDto
   */
  @Post('/barrage')
  async handleReceiveBarrage(@Body() barrageDto: BarrageDto): Promise<boolean> {
    // save
    await this.snsService.saveBarrage(barrageDto);

    // 组装明信片信息
    const postcard = await this.snsService.getPostcard(barrageDto.userId);

    const errors = await validate(postcard);
    if (!errors.length) {
      // 信息完整
      await this.snsService.delUserMessages(barrageDto.userId);

      // 开始写
    }
    return true;
  }

  /**
   * 私信
   */
  @Post('/message')
  async handleReceiveMessage() {
    return null;
  }
}
