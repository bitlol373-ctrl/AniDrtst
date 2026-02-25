import {
  Controller,
  Post,
  Get,
  Param,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { VideoService } from './video.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { AdminUploadGuard } from '../auth/admin-upload.guard';
import { Multer } from 'multer';

import type { Request } from 'express';
@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @UseGuards(AdminUploadGuard) // ✅ закрыли загрузку ключом
  @Post(':id/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: './temp',
      limits: {
        fileSize: 20 * 1024 * 1024 * 1024, // 20GB
      },
    }),
  )
  async uploadVideo(
    
    @Param('id', ParseIntPipe) episodeId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const inputPath = path.resolve(file.path);

    // ✅ конвертация в фоне
    this.videoService.convertToHLS(episodeId, inputPath).catch((e) => {
      console.error('HLS convert error:', e);
    });

    // ✅ сразу отвечаем, чтобы соединение не рвалось на больших файлах
    return { message: 'Upload received, processing started' };
  }

  @Get(':id/hls')
  async getHLS(@Param('id', ParseIntPipe) episodeId: number) {
    const hlsPath = await this.videoService.getHLSPath(episodeId);

    if (!hlsPath) {
      throw new NotFoundException('Видео не найдено или не конвертировано');
    }

    return { hlsPath };
  }
}