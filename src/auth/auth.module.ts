import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PrismaService } from '../../prisma/prisma.service'
import { GoogleStrategy } from './google.strategy'
import { Module } from '@nestjs/common'

@Module({
  imports: [PassportModule.register({ session: false })],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
