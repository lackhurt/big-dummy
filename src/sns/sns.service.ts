import { Injectable, Logger } from '@nestjs/common';
import { AppService } from '../app.service';
import { RedisService } from 'nestjs-redis';
import { BarrageDto } from '../dto/barrage.dto';
import { PostcardDto } from '../dto/postcard.dto';
import * as Moment from 'moment';

@Injectable()
export class SnsService {
  private static BARRAGE_KEY_PREFIX = 'sns:barrage:';
  private static BARRAGE_EXPIRE_SECONDS = 60 * 5;
  private static CONTENT_REG = /^\s*content\s*[:：]/i;
  private static TO_REG = /^\s*to\s*[:：]/i;
  constructor(private readonly redisService: RedisService) {}

  async saveBarrage(barrage: BarrageDto): Promise<boolean> {
    Logger.debug(barrage, 'Barrage is');
    const result = await this.redisService.getClient()
      .lpush(SnsService.BARRAGE_KEY_PREFIX + barrage.userId, JSON.stringify(barrage));
    Logger.debug(result, 'Redis response is');
    return result === 'OK';
  }

  async getUserMessage(userId: string): Promise<any[]> {
    // get all
    const list = await this.redisService.getClient().lrange(SnsService.BARRAGE_KEY_PREFIX + userId, 0, -1);

    return list.map(m => {
      return JSON.parse(m);
    });
  }

  async getPostcard(userId: string): Promise<PostcardDto> {
    return this.extractPostcard(await this.getUserMessage(userId));
  }

  async delUserMessages(userId: string): Promise<boolean> {
    const result = await this.redisService.getClient().del(SnsService.BARRAGE_KEY_PREFIX + userId);
    Logger.debug(result, `Del user:${userId} message in redis, result is`)
    return result > 0;
  }

  /**
   * 抽取明信片信息
   * @param messages
   */
  extractPostcard(messages: any[]): PostcardDto {
    const postcard = new PostcardDto();

    messages.filter(m => {
      return new Date().getTime() - Moment(m.receivedAt).toDate().getTime() < SnsService.BARRAGE_EXPIRE_SECONDS * 1000;
    }).forEach((message) => {
      if (SnsService.CONTENT_REG.test(message.content)) {
        postcard.content = message.content.replace(SnsService.CONTENT_REG, '');
        postcard.contentReceivedAt = message.receivedAt;
      } else if (SnsService.TO_REG.test(message.content)) {
        postcard.to = message.content.replace(SnsService.TO_REG, '');
        postcard.toReceivedAt = message.receivedAt;
      }
      postcard.userId = message.userId;
      postcard.userName = message.userName;
    });

    Logger.debug(postcard, 'extractPostcard returns');

    return postcard;
  }
}
