import { Module } from '@nestjs/common'
import { AnimeController } from './anime.controller'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from "../auth/auth.service";
@Module({
  controllers: [AnimeController],
  providers: [PrismaService, AuthService],
})
export class AnimeModule {}
