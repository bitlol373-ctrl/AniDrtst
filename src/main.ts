// backend/src/main.ts
import * as dotenv from 'dotenv'
dotenv.config()

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import type { NestExpressApplication } from '@nestjs/platform-express'
import * as express from 'express'
import { join } from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // ✅ CORS для фронта (Vite). Если фронт на другом домене — добавишь туда.
  app.enableCors({
    origin: ['http://localhost:5173',
            'https://anidraftofficial.netlify.app'
            'https://anidraft23.netlify.app'],
    credentials: true,
  });

  // ✅ Раздача HLS (master.m3u8 + чанки) из backend/uploads
  // ВАЖНО: process.cwd() должен быть backend/ (когда запускаешь из backend)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')))

  const port = Number(process.env.PORT || 3000)
  await app.listen(port, '0.0.0.0')

  console.log(`API listening on http://localhost:${port}`)
}

bootstrap().catch((e) => {
  console.error('BOOTSTRAP FAILED:', e)
})
