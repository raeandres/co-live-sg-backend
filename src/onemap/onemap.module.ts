import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OneMapController } from './onemap.controller';
import { OneMapService } from './onemap.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
  ],
  controllers: [OneMapController],
  providers: [OneMapService],
  exports: [OneMapService],
})
export class OneMapModule {}
