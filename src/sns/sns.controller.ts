import { Body, Controller, Get, HttpStatus, Logger, Param, Post, Put, Res } from '@nestjs/common';
import { SnsService } from './sns.service';
import { BarrageDto } from '../dto/barrage.dto';
import { validate } from 'class-validator';
import * as moment from 'moment';
import { GiftDto } from '../dto/gift.dto';

@Controller('sns')
export class SnsController {
  constructor(private readonly snsService: SnsService) {
  }

  /**
   * 弹幕
   * @param barrageDto
   */
  @Post('/barrage')
  async handleReceiveBarrage(@Body() barrageDto: BarrageDto): Promise<boolean> {

    // save
    await this.snsService.saveBarrage(barrageDto);

    // 组装明信片信息
    const postcard = await this.snsService.extractPostcardBy(barrageDto.userId);

    const errors = await validate(postcard);
    if (!errors.length) {
      postcard.beReadyAt = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
      // 信息完整
      await this.snsService.delUserMessages(barrageDto.userId);

      // 开始写
      await this.snsService.pushToReadyList(postcard);
      Logger.log(postcard, 'has been pushed to ready list !');
    }
    return true;
  }

  @Post('/gift')
  async handleReceiveGift(@Body() giftDto: GiftDto): Promise<boolean> {
    const result = await this.snsService.saveGift(giftDto);

    const postcard = await this.snsService.getPostcardFromReadyList(giftDto.userId);
    if (postcard) {
      // 这里会重新计算礼物
      await this.snsService.pushToReadyList(postcard);
    }

    return true;
  }

  @Get('/postcard/ready-list')
  async handleFetchReadyList() {
    return this.snsService.fetchReadyList();
  }

  /**
   * 私信
   */
  @Post('/message')
  async handleReceiveMessage() {
    return null;
  }
}
