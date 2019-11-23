import { Body, Controller, Get, HttpStatus, Logger, Param, Post, Put, Res } from '@nestjs/common';
import { SnsService } from './sns.service';
import { BarrageDto } from '../dto/barrage.dto';
import { validate } from 'class-validator';
import * as moment from 'moment';
import { GiftDto } from '../dto/gift.dto';
import { PostcardDto } from '../dto/postcard.dto';

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
      // 信息完整
      await this.snsService.delUserMessages(barrageDto.userId);

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

  @Get('/live-board')
  async handleLiveBoardInfo() {
    const luckyOne = await this.snsService.extractLuckyOneFromList();
    const readyList = await this.snsService.fetchReadyList();
    const finishedList = await this.snsService.fetchFinishedPostcards();
    const finishedCount = await this.snsService.getFinishedListLength();
    return {
      readyList,
      luckyOne,
      finishedList,
      finishedCount,
    };
  }

  /**
   * 私信
   */
  @Post('/addr/:id')
  async handleReceiveAddr(@Param('id') id, @Body() body: any) {
    const postcard = new PostcardDto();
    postcard.to = body.addr;
    postcard.userId = id;
    postcard.postcode = body.postcode;
    postcard.toReceivedAt = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    await this.snsService.pushToReadyList(postcard);
    Logger.debug(postcard, '收到地址信息')
    return null;
  }
}
