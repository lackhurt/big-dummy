import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SnsController } from './sns/sns.controller';
import { SnsService } from './sns/sns.service';
import { RedisModule } from 'nestjs-redis';
import RedisConfig from '../config/redis.config';

@Module({
  imports: [RedisModule.register(RedisConfig)],
  controllers: [AppController, SnsController],
  providers: [AppService, SnsService],
})
export class AppModule {}
