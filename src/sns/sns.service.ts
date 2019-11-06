import { Injectable, Logger } from '@nestjs/common';
import { AppService } from '../app.service';
import { RedisService } from 'nestjs-redis';
import { BarrageDto } from '../dto/barrage.dto';

@Injectable()
export class SnsService {
  private static BARRAGE_KEY_PREFIX = 'sns:barrage:';
  private static BARRAGE_EXPIRE_SECONDS = 60 * 5;
  constructor(private readonly redisService: RedisService) {}

  async saveBarrage(barrage: BarrageDto): Promise<boolean> {
    Logger.debug(barrage, 'Barrage is');
    const result = await this.redisService.getClient()
      .setex(SnsService.BARRAGE_KEY_PREFIX + barrage.userId, SnsService.BARRAGE_EXPIRE_SECONDS, JSON.stringify(barrage));
    Logger.debug(result, 'Redis response is');
    return result === 'OK';
  }
}
