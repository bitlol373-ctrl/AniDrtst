import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20'

// важно: чтобы process.env был заполнен
import * as dotenv from 'dotenv'
dotenv.config()

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientID) {
      throw new Error('GOOGLE_CLIENT_ID is missing in backend/.env')
    }
    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET is missing in backend/.env')
    }

    super({
      clientID,
      clientSecret,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ?? 'https://anidrtst.onrender.com/auth/google/redirect',
      scope: ['email', 'profile'],
    })
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const email = profile.emails?.[0]?.value ?? null
    const avatarUrl = profile.photos?.[0]?.value ?? null

    // важно: googleId всегда строка
    const payload = {
      googleId: profile.id,
      email,
      avatarUrl,
    }

    done(null, payload)
  }
}
