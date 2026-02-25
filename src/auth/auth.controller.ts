import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  UseGuards,
  Req,
  Res,
  Patch,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; nickname: string }) {
    return this.auth.register(body.email, body.password, body.nickname)
    
  }

  @Patch('profile')
  async updateProfile(
    @Headers('authorization') authHeader: string | undefined,
    @Body() body: { nickname?: string; bio?: string; avatarUrl?: string },
  ) {
    const token = this.extractBearer(authHeader)
    if (!token) throw new UnauthorizedException('no token')
    return this.auth.updateProfileFromToken(token, body)
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password)
  }

  @Get('me')
  async me(@Headers('authorization') authHeader?: string) {
    const token = this.extractBearer(authHeader)
    if (!token) throw new UnauthorizedException('no token')
    return this.auth.meFromToken(token)
  }
  

  // ---- GOOGLE OAUTH ----

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleStart() {
    // редирект сделает passport
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleRedirect(@Req() req: Request, @Res() res: Response) {
    // req.user приходит из GoogleStrategy.validate()
    const u = req.user as any

    const result = await this.auth.loginWithGoogle({
      googleId: u.googleId,
      email: u.email,
      
      avatarUrl: u.avatarUrl,
    })

    const front = process.env.FRONTEND_URL ?? 'http://localhost:5173'
    const url = new URL(front)
    url.searchParams.set('token', result.token)

    // можешь ещё прокинуть flag
    url.searchParams.set('auth', 'google')

    return res.redirect(url.toString())
  }

  private extractBearer(header?: string) {
    if (!header) return null
    const [type, token] = header.split(' ')
    if (type !== 'Bearer' || !token) return null
    return token
  }
}
