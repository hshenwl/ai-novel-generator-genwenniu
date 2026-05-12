// ============================================================
// @CurrentUser() 装饰器 — 从JWT提取当前用户信息
// ============================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserInfo {
  userId: string;
  username: string;
  role: string;
  tenantId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserInfo;
    return data ? user?.[data] : user;
  },
);
