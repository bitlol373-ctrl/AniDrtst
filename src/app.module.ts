import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'

import { AppController } from './app.controller'
import { AppService } from './app.service'

import { PrismaModule } from '../prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { VideoModule } from './video/video.module'
import { AnimeModule } from './anime/anime.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    // статика (если надо отдавать public)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/public',
    }),

    PrismaModule,
    UsersModule,
    AnimeModule,
    VideoModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}