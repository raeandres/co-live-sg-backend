import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OneMapModule } from './onemap/onemap.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    OneMapModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
