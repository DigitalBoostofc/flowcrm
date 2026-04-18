import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MetaSignatureGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const signature = req.headers['x-hub-signature-256'];
    if (!signature || typeof signature !== 'string') throw new UnauthorizedException('Missing signature');
    const secret = this.config.getOrThrow<string>('META_APP_SECRET');
    const rawBody: Buffer = req.rawBody;
    if (!rawBody) throw new UnauthorizedException('Raw body unavailable');
    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Invalid signature');
    }
    return true;
  }
}
