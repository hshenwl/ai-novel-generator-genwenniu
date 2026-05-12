// ============================================================
// 认证服务 — 本地用户名密码 + JWT Token签发
// ============================================================

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: { username: string; password: string; email?: string; nickname?: string }) {
    // 检查用户名唯一性
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        passwordHash,
        email: dto.email,
        nickname: dto.nickname || dto.username,
        role: 'user',
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId || 'local',
    });

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }

  async login(dto: { username: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      role: user.role,
      tenantId: user.tenantId || 'local',
    });

    return {
      success: true,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
      },
    };
  }

  async logout() {
    // JWT本身是无状态的，客户端丢弃token即可
    return { success: true, message: '已登出' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
