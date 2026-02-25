import { Module } from '@nestjs/common';
import { VideoService } from './video.service';
import { VideoController } from './video.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // <-- импортируем PrismaModule
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [PrismaModule],  // теперь PrismaService будет доступен
  providers: [VideoService, PrismaService],
  controllers: [VideoController],
  exports: [VideoService],
})
export class VideoModule {}
