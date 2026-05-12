// ============================================================
// @Public() 装饰器 — 标记不需要认证的公开路由
// ============================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
