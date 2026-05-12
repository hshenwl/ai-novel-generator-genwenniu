// ============================================================
// JWT认证策略 — 提取并验证 Bearer Token
// ============================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;       // userId
  username: string;
  role: string;
  tenantId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'REPLACE-IN-PRODUCTION',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException('无效的访问令牌');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role || 'user',
      tenantId: payload.tenantId || 'local',
    };
  }
}
