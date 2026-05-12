// ============================================================
// 加密服务 — 用于API Key等本地敏感配置的对称加密
// AES-256-GCM: ciphertext = v1:iv:tag:data (base64url)
// ============================================================

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor() {
    const secret = process.env.APP_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new InternalServerErrorException('APP_SECRET 或 JWT_SECRET 未配置或长度不足');
    }
    this.key = createHash('sha256').update(secret).digest();
  }

  encrypt(value?: string | null): string | null {
    if (!value) return null;
    if (value.startsWith('enc:v1:')) return value;

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      'enc:v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString('base64url'),
    ].join(':');
  }

  decrypt(value?: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith('enc:v1:')) return value;

    try {
      const [, , ivRaw, tagRaw, dataRaw] = value.split(':');
      const iv = Buffer.from(ivRaw, 'base64url');
      const tag = Buffer.from(tagRaw, 'base64url');
      const encrypted = Buffer.from(dataRaw, 'base64url');

      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      // APP_SECRET 变更导致旧数据无法解密，返回 null
      return null;
    }
  }

  mask(value?: string | null): string | null {
    if (!value) return null;
    // 未加密的旧数据直接遮掩
    if (!value.startsWith('enc:v1:')) {
      if (value.length <= 8) return '***';
      return `${value.slice(0, 4)}***${value.slice(-4)}`;
    }
    const raw = this.decrypt(value);
    if (!raw) return '***（密钥已变更，请重新配置）';
    if (raw.length <= 8) return '***';
    return `${raw.slice(0, 4)}***${raw.slice(-4)}`;
  }
}
