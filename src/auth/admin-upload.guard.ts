import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class AdminUploadGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()

    const provided =
      (req.headers['x-admin-key'] as string | undefined) ??
      (req.headers['x-admin-upload-key'] as string | undefined)

    const expected = process.env.ADMIN_UPLOAD_KEY

    if (!expected) {
      throw new UnauthorizedException('Server ADMIN_UPLOAD_KEY is not set')
    }

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid admin key')
    }

    return true
  }
}