import { Controller, Post, Body, Get, Param, NotFoundException } from '@nestjs/common';
import { VideoService } from 'video/video.service';
import { UsersService } from './users.service';
import { ParseIntPipe } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('create')
  async createUser(@Body() body: { email: string; nickname?: string }) {
    const user = await this.usersService.createUser(body.email, String(body.nickname));
    return { message: 'User created', user };
  }

  @Get(':id')
async getUser(
  @Param('id', ParseIntPipe) id: number
) {
  return this.usersService.getUser(id);
}

}

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  // Загружаем и конвертируем видео
  @Post('upload')
  async uploadVideo(
    @Body() body: { episodeId: number; inputPath: string },
  ) {
    const hlsPath = await this.videoService.convertToHLS(
      body.episodeId,
      body.inputPath,
    );
    return { message: 'Video processed', hlsPath };
  }

  // Получаем мастер-плейлист по ID эпизода
  @Get(':id/hls')
  async getHLS(@Param('id') episodeId: number) {
    const hlsPath = await this.videoService.getHLSPath(episodeId);

    if (!hlsPath) {
      throw new NotFoundException('Видео не найдено или не конвертировано');
    }

    return { hlsPath };
  }
}
