import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { scryptSync, timingSafeEqual, randomBytes } from 'crypto'

type SafeUser = {
  id: number
  email: string
  nickname: string
  avatarUrl: string | null
  bio: string | null
  createdAt: Date
}

@Injectable()
export class AuthService {
  private readonly tokenSecret = process.env.JWT_SECRET || 'dev_secret'

  constructor(private readonly prisma: PrismaService) {}

  // ---------- password helpers ----------
  private hashPassword(password: string): string {
    // format: scrypt$<saltHex>$<hashHex>
    const salt = randomBytes(16)
    const hash = scryptSync(password, salt, 64)
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
  }

  private verifyPassword(password: string, stored: string): boolean {
    try {
      const [algo, saltHex, hashHex] = stored.split('$')
      if (algo !== 'scrypt' || !saltHex || !hashHex) return false
      const salt = Buffer.from(saltHex, 'hex')
      const expected = Buffer.from(hashHex, 'hex')
      const actual = scryptSync(password, salt, expected.length)
      return timingSafeEqual(actual, expected)
    } catch {
      return false
    }
  }

  // ---------- token helpers ----------
  private signToken(userId: number): string {
    // простой токен: userId.timestamp.signature
    const ts = Date.now()
    const payload = `${userId}.${ts}`
    const sig = scryptSync(payload, this.tokenSecret, 32).toString('hex')
    return `${payload}.${sig}`
  }

  private verifyToken(token: string): { userId: number } {
    const parts = token.split('.')
    if (parts.length !== 3) throw new UnauthorizedException('bad token')
    const [idStr, tsStr, sig] = parts
    const payload = `${idStr}.${tsStr}`
    const expected = scryptSync(payload, this.tokenSecret, 32).toString('hex')
    if (expected !== sig) throw new UnauthorizedException('bad token')
    const userId = Number(idStr)
    if (!Number.isFinite(userId) || userId <= 0)
      throw new UnauthorizedException('bad token')
    return { userId }
  }

  private safeUser(u: any): SafeUser {
    return {
      id: u.id,
      email: u.email,
      nickname: u.nickname,
      avatarUrl: u.avatarUrl ?? null,
      bio: u.bio ?? null,
      createdAt: u.createdAt,
    }
  }

  // ---------- nickname helpers ----------
  private normalizeNickname(raw: string) {
    const nick = raw.trim().toLowerCase()
    if (nick.length < 3) throw new BadRequestException('nickname min 3')
    if (nick.length > 24) throw new BadRequestException('nickname max 24')
    if (!/^[a-z0-9._-]+$/.test(nick))
      throw new BadRequestException('nickname: only a-z 0-9 . _ -')
    return nick
  }

  private async makeUniqueNickname(seed: string) {
    const base = this.normalizeNickname(seed)
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}${i}`
      const exists = await this.prisma.user.findUnique({
        where: { nickname: candidate },
        select: { id: true },
      })
      if (!exists) return candidate
    }
    return `${base}${Math.floor(Math.random() * 10000)}`
  }

  async updateProfileFromToken(
  token: string,
  body: { nickname?: string; bio?: string; avatarUrl?: string },
) {
  // если у тебя уже есть метод, который достаёт юзера из токена — используй его
  const me = await this.meFromToken(token).catch(() => null)
  if (!me?.id) throw new UnauthorizedException('invalid token')

  const userId = me.id as number

  const nickname =
    typeof body.nickname === 'string' ? body.nickname.trim() : undefined
  const bio = typeof body.bio === 'string' ? body.bio.trim() : undefined
  const avatarUrl =
    typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : undefined

  // уникальность ника
  if (nickname) {
    // простая валидация (можешь усилить)
    if (nickname.length < 3) throw new BadRequestException('nickname min 3')

    const exists = await this.prisma.user.findUnique({
      where: { nickname },
      select: { id: true },
    })

    if (exists && exists.id !== userId) {
      throw new BadRequestException('nickname already taken')
    }
  }

  const updated = await this.prisma.user.update({
    where: { id: userId },
    data: {
      ...(nickname !== undefined ? { nickname } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
    select: {
      id: true,
      email: true,
      nickname: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
    },
  })

  return updated
}

  // ---------- email/password auth ----------
  async register(email: string, password: string,  nickname: string) {
    const e = (email || '').trim().toLowerCase()
    const p = password || ''
    if (!e || !p) throw new BadRequestException('email/password required')
    if (p.length < 6) throw new BadRequestException('password min 6')

    const nick = await this.makeUniqueNickname(nickname || e.split('@')[0] || 'user')

    const existsEmail = await this.prisma.user.findUnique({
      where: { email: e },
      select: { id: true },
    })
    if (existsEmail) throw new BadRequestException('email already used')

    const existsNick = await this.prisma.user.findUnique({
      where: { nickname: nick },
      select: { id: true },
    })
    if (existsNick) throw new BadRequestException('nickname already used')

    const user = await this.prisma.user.create({
      data: {
        email: e,
        nickname: nick,
        passwordHash: this.hashPassword(p),
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    })

    return { token: this.signToken(user.id), user: this.safeUser(user) }
  }

  async login(email: string, password: string) {
    const e = (email || '').trim().toLowerCase()
    const p = password || ''
    if (!e || !p) throw new BadRequestException('email/password required')

    const user = await this.prisma.user.findUnique({ where: { email: e } })
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('invalid credentials')

    if (!this.verifyPassword(p, user.passwordHash))
      throw new UnauthorizedException('invalid credentials')

    return { token: this.signToken(user.id), user: this.safeUser(user) }
  }

  // ---------- google oauth auth ----------
  // googleId НЕ unique в схеме -> findUnique нельзя, только findFirst
  async loginWithGoogle(payload: {
    googleId: string
    email: string | null
    avatarUrl: string | null
  }) {
    const googleId = (payload.googleId || '').trim()
    if (!googleId) throw new BadRequestException('googleId required')

    let user = await this.prisma.user.findFirst({ where: { googleId } })

    const email = payload.email ? payload.email.trim().toLowerCase() : null
    const avatarUrl = payload.avatarUrl ?? null

    if (!user && email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } })
      if (byEmail) {
        user = await this.prisma.user.update({
          where: { id: byEmail.id },
          data: {
            googleId,
            avatarUrl: byEmail.avatarUrl ?? avatarUrl,
          },
        })
      }
    }

    if (!user) {
      // email обязателен в схеме
      const finalEmail = email ?? `google_${googleId}@local`

      const seed = (finalEmail.split('@')[0] || `user${googleId.slice(-6)}`)
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase()

      const nickname = await this.makeUniqueNickname(seed || `user${googleId.slice(-6)}`)

      user = await this.prisma.user.create({
        data: {
          email: finalEmail,
          nickname,
          googleId,
          avatarUrl,
          
          // passwordHash обязателен -> ставим случайный
          passwordHash: this.hashPassword(randomBytes(24).toString('hex')),
        },
      })
    }

    return { token: this.signToken(user.id), user: this.safeUser(user) }
  }

  // ---------- me ----------
  async meFromToken(token: string) {
    const { userId } = this.verifyToken(token)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    })
    if (!user) throw new UnauthorizedException('user not found')
    return this.safeUser(user)
  }
}
