import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // Если тебе реально нужно создавать пользователя через UsersService —
  // passwordHash ОБЯЗАТЕЛЕН (согласно Prisma schema)
  async createUser(email: string, passwordHash: string, name?: string) {
    const e = (email ?? '').trim().toLowerCase()
    if (!e) throw new BadRequestException('email required')
    if (!passwordHash) throw new BadRequestException('passwordHash required')

    return this.prisma.user.create({
      data: {
        email: e,
        name: name?.trim() ? name.trim() : null,
        passwordHash,
      },
      select: { id: true, email: true, name: true, avatarUrl: true, bio: true, createdAt: true },
    })
  }

  async getUser(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, avatarUrl: true, bio: true, createdAt: true },
    })
  }
}
