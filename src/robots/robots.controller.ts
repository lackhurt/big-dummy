import { Body, Controller, Get, Logger, Put } from '@nestjs/common';
import { ArmActionDto } from '../dto/arm.action.dto';
import { RobotsService } from './robots.service';
import * as USBRelay from '@josephdadams/usbrelay';
import { PostcardDto } from '../dto/postcard.dto';
import { SnsService } from '../sns/sns.service';

@Controller('robots')
export class RobotsController {
  private relay = null;
  constructor(private readonly robotsService: RobotsService, private readonly snsService: SnsService) {
    try {
      this.relay = new USBRelay();
    } catch (e) {
      Logger.warn(e);
    }
  }
  private static armsStatue = 0;

  @Put('/pager')
  handlePager() {
    this.relay.setState(1, true);
    setTimeout(() => {
      this.relay.setState(1, false);
    }, 100);
  }

  @Put('/arms')
  handleArms(@Body() action: ArmActionDto) {
    this.relay.setState(action.action, true);
    setTimeout(() => {
      this.relay.setState(action.action, false);
    }, 100);
  }

  @Put('/arms/prepare-postcard')
  handleArmsPreparePostcard() {
    if (RobotsController.armsStatue !== 1) {
      this.clickButton(2);
      setTimeout(() => {
        this.clickButton(3);
      }, 9 * 1000);
      RobotsController.armsStatue = 1;
    }
  }

  @Put('/arms/collect-postcard')
  handleArmsCollectPostcard() {
    this.clickButton(3);
    RobotsController.armsStatue = 2;
    setTimeout(() => {
      RobotsController.armsStatue = 0;
    }, 8000);
  }

  clickButton(num: number) {
    this.relay.setState(num, true);
    setTimeout(() => {
      this.relay.setState(num, false);
    }, 100);
  }

  @Get('/axidraw/postcard')
  async getToBeWrittenPostcard(): Promise<PostcardDto> {
    const luckyOne = this.snsService.extractLuckyOneFromList();
    if (luckyOne) {
      this.handlePager();
      setTimeout(() => {
        this.handleArmsPreparePostcard();
      }, 3000);
    }
    return luckyOne;
  }

  @Put('/axidraw/postcard/finished')
  handleWritingPostcardStatus() {
    this.handleArmsCollectPostcard();
    return this.snsService.luckyOneDone();
  }
}
