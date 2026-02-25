import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VideoService {
  constructor(private readonly prisma: PrismaService) {}

  async convertToHLS(episodeId: number, inputPath: string): Promise<string> {
    const outputDir = path.join(process.cwd(), 'uploads', `episode_${episodeId}`);

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const qualities = [
      { name: '360p', width: 640, height: 360, bitrate: 400000 },
      { name: '480p', width: 854, height: 480, bitrate: 800000 },
      { name: '720p', width: 1280, height: 720, bitrate: 1500000 },
    ];

    for (const q of qualities) {
      const qDir = path.join(outputDir, q.name);
      if (!fs.existsSync(qDir)) fs.mkdirSync(qDir, { recursive: true });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${q.width}x${q.height}`)
          .outputOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls',
          ])
          .output(path.join(qDir, 'playlist.m3u8'))
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    }

    const masterPlaylist =
      '#EXTM3U\n' +
      qualities
        .map(
          (q) =>
            `#EXT-X-STREAM-INF:BANDWIDTH=${q.bitrate},RESOLUTION=${q.width}x${q.height}\n${q.name}/playlist.m3u8`,
        )
        .join('\n');

    fs.writeFileSync(path.join(outputDir, 'master.m3u8'), masterPlaylist);

    const hlsPath = `${process.env.CDN_BASE_URL}/episode_${episodeId}/master.m3u8`;

    // ✅ ДОБАВИЛ: чтобы не падало P2025, если эпизода ещё нет
    const episodeExists = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true },
    });

    if (episodeExists) {
      await this.prisma.episode.update({
        where: { id: episodeId },
        data: { hlsPath },
      });
    } else {
      // ✅ Создаём "черновик" эпизода
      // ВАЖНО: поля title/number/animeId/videoPath — должны существовать в твоей Prisma-схеме Episode
      await this.prisma.episode.create({
        data: {
          title: `Episode ${episodeId}`,
          number: episodeId,
          animeId: 1,       // ⚠️ ДОЛЖЕН существовать Anime с id=1 (для теста)
          videoPath: '',
          hlsPath,
        },
      });
    }

    return hlsPath;
  }

  // Метод для VideoController
  async getHLSPath(episodeId: number): Promise<string | null> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });
    return episode?.hlsPath ?? null;
  }
}
