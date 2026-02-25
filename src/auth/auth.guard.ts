import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest()
    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new UnauthorizedException('No token')
    }

    const token = authHeader.replace('Bearer ', '')

    const user = await this.prisma.user.findUnique({
      where: { id: Number(token) },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid token')
    }

    req.user = user
    return true
  }
}