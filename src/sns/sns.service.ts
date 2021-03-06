import { Injectable, Logger } from '@nestjs/common';
import { AppService } from '../app.service';
import { RedisService } from 'nestjs-redis';
import { BarrageDto } from '../dto/barrage.dto';
import { PostcardDto } from '../dto/postcard.dto';
import * as Moment from 'moment';
import axios from 'axios';
import { GiftDto } from '../dto/gift.dto';

@Injectable()
export class SnsService {
  private static BARRAGE_KEY_PREFIX = 'sns:barrage:';
  private static GIFT_KEY_PREFIX = 'sns:gift:';
  private static POSTCARD_READY_LIST_PREFIX = 'postcard:ready:';
  private static LUCKY_ONE_KEY = 'postcard:lucky';
  private static POSTCARD_FINISHED_LIST = 'postcard:finished';
  private static BARRAGE_EXPIRE_SECONDS = 160 * 5;
  private static GIFT_EXPIRE_SECONDS = 160 * 5;

  private static BASE_GIFT_PRICE = 100;
  // TODO
  private static READY_LIST_EXPIRE_SECONDS = 160 * 5;
  private static CONTENT_REG = /^\s*#\s*/i;
  private static TO_REG = /^\s*@\s*/i;
  private static BILIBILI_INTERFACE_USER_INFO = 'https://api.bilibili.com/x/space/acc/info?jsonp=jsonp'
  constructor(private readonly redisService: RedisService) {}
  private static luckyOne = null;

  async saveBarrage(barrage: BarrageDto): Promise<boolean> {
    Logger.debug(barrage, 'Barrage is');
    const result = await this.redisService.getClient()
      .lpush(SnsService.BARRAGE_KEY_PREFIX + barrage.userId, JSON.stringify(barrage));
    Logger.debug(result, 'Redis response when save barrage');
    return result === 'OK';
  }

  async saveGift(giftDto: GiftDto): Promise<boolean> {
    Logger.debug(giftDto, 'Gift is');
    const result = await this.redisService.getClient()
      .lpush(SnsService.GIFT_KEY_PREFIX + giftDto.userId, JSON.stringify(giftDto));
    Logger.debug(result, 'Redis response when save gift');
    return result === 'OK';
  }

  async getUserMessage(userId: number): Promise<any[]> {
    // get all
    const list = await this.redisService.getClient().lrange(SnsService.BARRAGE_KEY_PREFIX + userId, 0, -1);

    return list.map(m => {
      return JSON.parse(m);
    });
  }

  async extractPostcardBy(userId: number): Promise<PostcardDto> {
    return await this.extractPostcardFrom(await this.getUserMessage(userId));
  }

  async getPostcardFromReadyList(userId: number): Promise<PostcardDto> {
    const postcardStr = await this.redisService.getClient().get(SnsService.POSTCARD_READY_LIST_PREFIX + userId);
    if (postcardStr) {
      return JSON.parse(postcardStr);
    }
  }

  async getValidGiftBy(userId: number): Promise<GiftDto[]> {
    const list = await this.redisService.getClient().lrange(SnsService.GIFT_KEY_PREFIX + userId, 0, -1);

    return list.map(m => {
      return JSON.parse(m);
    }).filter(m => {
      return new Date().getTime() - Moment(m.receivedAt).toDate().getTime() < SnsService.GIFT_EXPIRE_SECONDS * 1000;
    });
  }

  async getValidGiftPriceBy(userId: number): Promise<number> {
    const gifts = await this.getValidGiftBy(userId);
    return gifts.map(g => g.unitPrice * g.amount).reduce((p, c) => {
      return p + c;
    }, 0);
  }

  async pushToReadyList(postcard: PostcardDto) {

    const res = await this.fetchUserInfo(postcard.userId).catch(e => {
      Logger.warn(e, '获取B站用户数据出错');
    });

    if (res && res.data && res.data.code === 0) {
      postcard.avatar = res.data.data.face;
    }

    postcard.giftPrice = await this.getValidGiftPriceBy(postcard.userId);
    Logger.debug(postcard.giftPrice, `${postcard.userName} 礼物金额`);

    if (!postcard.to) {
      const lastPostcard = await this.getPostcardFromReadyList(postcard.userId);
      if (lastPostcard && lastPostcard.to) {
        postcard.to = lastPostcard.to;
        postcard.postcode = await this.fetchPostcode(postcard.to);
        postcard.toReceivedAt = lastPostcard.toReceivedAt;
      }
    } else if (!postcard.content) {
      const lastPostcard = await this.getPostcardFromReadyList(postcard.userId);
      if (lastPostcard && lastPostcard.content) {
        postcard.content = lastPostcard.content;
        postcard.userName = lastPostcard.userName;
        postcard.contentReceivedAt = lastPostcard.contentReceivedAt;
      }
    }

    const result = await this.redisService.getClient()
      .setex(SnsService.POSTCARD_READY_LIST_PREFIX + postcard.userId, SnsService.READY_LIST_EXPIRE_SECONDS, JSON.stringify(postcard));

    Logger.debug(result, 'Redis response is');
    return result === 'OK';
  }

  async fetchReadyList(): Promise<PostcardDto[]> {
    // get all
    const keys = await this.redisService.getClient().keys(SnsService.POSTCARD_READY_LIST_PREFIX + '*');

    if (keys.length) {
      const list = await this.redisService.getClient().mget(...keys);

      return list.filter(v => !!v).map(v => JSON.parse(v)).filter(v => v.userName && (v.content || v.to));
    } else {
      return [];
    }
  }

  async extractLuckyOneFromList(): Promise<any> {
    // get all
    let luckyOne = await this.getLuckyOne();
    if (!luckyOne) {
      let list = await this.fetchReadyList();

      list = list.filter(r => {
        return r.to && r.content;
      });

      const totalPrice = list.reduce((p, c) => {
        return p + c.giftPrice + SnsService.BASE_GIFT_PRICE;
      }, 0);

      const randomNum = Math.random() * totalPrice;

      for (
        let price = 0, i = 0;
        i < list.length && price < randomNum;
        i++) {
          price += list[i].giftPrice + SnsService.BASE_GIFT_PRICE;
          luckyOne = list[i];
      }

      if (luckyOne) {
        await this.redisService.getClient().del(SnsService.POSTCARD_READY_LIST_PREFIX + luckyOne.userId);

        this.setLuckyOne(luckyOne);

        Logger.debug(luckyOne, 'Lucky one 新选出来的');
      }

      return luckyOne;
    } else {
      return luckyOne;
    }
  }

  async setLuckyOne(postcard: PostcardDto) {
    const result = await this.redisService.getClient().set(SnsService.LUCKY_ONE_KEY, JSON.stringify(postcard));
    return result === 'ok';
  }

  async getLuckyOne(): Promise<PostcardDto> {
    const result = await this.redisService.getClient().get(SnsService.LUCKY_ONE_KEY);
    if (result) {
      return JSON.parse(result);
    }
  }

  async markLuckyOneDone() {
    const luckyOne = await this.getLuckyOne();
    if (luckyOne) {
      await this.redisService.getClient().lpush(SnsService.POSTCARD_FINISHED_LIST, JSON.stringify(luckyOne));
      await this.redisService.getClient().del(SnsService.LUCKY_ONE_KEY);
    }
  }

  async fetchUserInfo(userId: number): Promise<any> {
    return axios.get(SnsService.BILIBILI_INTERFACE_USER_INFO, {
      params: {
        mid: userId,
      },
    });
  }

  async delUserMessages(userId: number): Promise<boolean> {
    const result = await this.redisService.getClient().del(SnsService.BARRAGE_KEY_PREFIX + userId);
    Logger.debug(result, `Del user:${userId} message in redis, result is`)
    return result > 0;
  }

  /**
   * 抽取明信片信息
   * @param messages
   */
  async extractPostcardFrom(messages: any[]): Promise<PostcardDto> {
    const postcard = new PostcardDto();

    await Promise.all(
      messages.filter(m => {
        return new Date().getTime() - Moment(m.receivedAt).toDate().getTime() < SnsService.BARRAGE_EXPIRE_SECONDS * 1000;
      }).map(async (message) => {
        if (SnsService.CONTENT_REG.test(message.content)) {
          postcard.content = message.content.replace(SnsService.CONTENT_REG, '');
          postcard.contentReceivedAt = message.receivedAt;
        } else if (SnsService.TO_REG.test(message.content)) {
          postcard.to = message.content.replace(SnsService.TO_REG, '');
          postcard.toReceivedAt = message.receivedAt;
          postcard.postcode = await this.fetchPostcode(postcard.to);
          ;
        }
        postcard.userId = message.userId;
        postcard.userName = message.userName;
      }),
    );

    Logger.debug(postcard, 'extractPostcard returns');

    return postcard;
  }

  async fetchPostcode(addr: string) {
    Logger.debug(addr, '获取邮编');
    return await axios.get('http://cpdc.chinapost.com.cn/web/index.php?m=postsearch&c=index&a=ajax_addr', {
      params: {
        searchkey: addr,
      },
    }).then(res => {
      Logger.debug(res.data, '邮编返回');
      if (res.data.errcode === 0) {
        if (res.data.rs && res.data.rs.length) {
          const postcode = res.data.rs.find(p => {
            return /\d{6}/.test(p.POSTCODE);
          });
          if (postcode) {
            return postcode.POSTCODE;
          }
        }
      } else {
        return null;
      }
    });
  }

  async getFinishedListLength(): Promise<number> {
    return await this.redisService.getClient().llen(SnsService.POSTCARD_FINISHED_LIST);
  }

  async fetchFinishedPostcards(limit: number = 2): Promise<PostcardDto[]> {
    const list = await this.redisService.getClient().lrange(SnsService.POSTCARD_FINISHED_LIST, 0, limit);
    return list.map(m => {
      return JSON.parse(m);
    });
  }
}
