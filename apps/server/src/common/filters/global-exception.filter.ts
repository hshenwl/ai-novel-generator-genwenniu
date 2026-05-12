import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalException');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || res;
      code = this.getErrorCode(status);
    } else if (exception?.name === 'PrismaClientKnownRequestError') {
      status = HttpStatus.BAD_REQUEST;
      message = '数据库操作失败';
      code = 'DB_ERROR';
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = '记录不存在';
        code = 'NOT_FOUND';
      } else if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = '记录已存在（唯一约束冲突）';
        code = 'DUPLICATE';
      }
    } else if (exception?.name === 'AIError') {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = exception.message || 'AI服务暂时不可用';
      code = 'AI_ERROR';
    } else {
      this.logger.error(`Unhandled exception: ${exception?.message || exception}`, exception?.stack);
    }

    if (status >= 500) {
      this.logger.error(`[${code}] ${request.method} ${request.url} → ${status}: ${JSON.stringify(message)}`);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      code,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
    };
    return map[status] || 'HTTP_ERROR';
  }
}
