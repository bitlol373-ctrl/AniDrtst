import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(email: string, passwordHash: string, name?: string) {
    return this.prisma.user.create({
      data: { email: email.trim().toLowerCase(), nickname: name?.trim() || null, passwordHash },
      select: { id: true, email: true,  nickname: true, avatarUrl: true, bio: true },
    })
  }

  async getUser(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true,  nickname: true, avatarUrl: true, bio: true },
    })
  }
}
