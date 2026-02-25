import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AnimeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnimeWithEpisodes(id: number) {
    return this.prisma.anime.findUnique({
      where: { id },
      include: {
        episodes: {
          orderBy: { number: 'asc' },
        },
      },
    })
  }
}
