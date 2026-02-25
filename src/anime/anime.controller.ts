import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
  Headers,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from '../auth/auth.service' // путь проверь
import { Query } from '@nestjs/common/decorators'
@Controller('anime')
export class AnimeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  @Get()
async getAll(
  @Query('source') source?: 'DSTUDIO' | 'COMMUNITY',
  @Query('sort') sort?: 'new' | 'rating',
) {
  const animes = await this.prisma.anime.findMany({
    where: source ? { source } : undefined,
    include: {
      episodes: { select: { id: true } },
      ratings: { select: { value: true } },
    },
    orderBy: sort === 'new' ? { id: 'desc' } : undefined,
  })

  const enriched = animes.map((a) => {
    const count = a.ratings.length
    const avg =
      count === 0
        ? 0
        : a.ratings.reduce((s, r) => s + r.value, 0) / count

    return {
      ...a,
      avgRating: avg,
      ratingsCount: count,
    }
  })

  if (sort === 'rating') {
    enriched.sort((a, b) => b.avgRating - a.avgRating)
  }

  return enriched
}



  @Get(':id')
  async getAnime(@Param('id', ParseIntPipe) animeId: number) {
    return this.prisma.anime.findUnique({
      where: { id: animeId },
      include: {
        episodes: {
          orderBy: { number: 'asc' },
          select: { id: true, number: true, title: true },
        },
      },
    })
  }

 // --- helpers ---
  private extractBearer(header?: string) {
    if (!header) return null
    const [type, token] = header.split(' ')
    if (type !== 'Bearer' || !token) return null
    return token
  }

  private async userIdFromAuthHeader(authHeader?: string) {
    const token = this.extractBearer(authHeader)
    if (!token) throw new UnauthorizedException('no token')
    const me = await this.auth.meFromToken(token)
    return me.id
  }

  // ✅ POST comment
  @Post(':id/comments')
  async addComment(
    @Param('id', ParseIntPipe) animeId: number,
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: { text: string },
  ) {
    const userId = await this.userIdFromAuthHeader(authHeader)

    const text = (body?.text || '').trim()
    if (!text) return { ok: false, message: 'empty' }

    const c = await this.prisma.comment.create({
      data: { animeId, userId, text },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    })

    return { ok: true, comment: c }
  }

  // ✅ POST rating
  @Post(':id/rating')
  async setRating(
    @Param('id', ParseIntPipe) animeId: number,
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: { value: number },
  ) {
    const userId = await this.userIdFromAuthHeader(authHeader)

    const value = Number(body?.value)
    if (!Number.isFinite(value) || value < 1 || value > 10) {
      return { ok: false, message: 'rating must be 1..10' }
    }

    // ✅ upsert: один юзер — одна оценка на тайтл
    const r = await this.prisma.rating.upsert({
      where: { userId_animeId: { userId, animeId } }, // нужен @@unique([userId, animeId]) в схеме
      create: { userId, animeId, value },
      update: { value },
    })

    return { ok: true, rating: r }
  }

  // ✅ GET social (чтобы фронт грузил комменты/рейтинг)
  @Get(':id/social')
  async social(@Param('id', ParseIntPipe) animeId: number) {
    const avg = await this.prisma.rating.aggregate({
      where: { animeId },
      _avg: { value: true },
      _count: { value: true },
    })

    const comments = await this.prisma.comment.findMany({
      where: { animeId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
    })

    return {
      avgRating: avg._avg.value ?? null,
      ratingsCount: avg._count.value ?? 0,
      comments,
    }
  }
}

this