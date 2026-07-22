import { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

function createMockContext(url: string, statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({ statusCode }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function createMockReflector(skipTransform: boolean): Reflector {
  return {
    getAllAndOverride: () => skipTransform,
  } as unknown as Reflector;
}

describe('TransformInterceptor', () => {
  it('wraps the handler result in a standard success envelope', (done) => {
    const interceptor = new TransformInterceptor<{ id: string }>(
      createMockReflector(false),
    );
    const context = createMockContext('/api/users/1', 200);
    const handler: CallHandler<{ id: string }> = {
      handle: () => of({ id: '1' }),
    };

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          statusCode: 200,
          path: '/api/users/1',
          data: { id: '1' },
        }),
      );
      expect(typeof (result as { timestamp: string }).timestamp).toBe('string');
      done();
    });
  });

  it('passes the handler result through unchanged when @SkipTransform is set', (done) => {
    const interceptor = new TransformInterceptor<{ id: string }>(
      createMockReflector(true),
    );
    const context = createMockContext('/api/documents/1/download', 200);
    const handler: CallHandler<{ id: string }> = {
      handle: () => of({ id: '1' }),
    };

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ id: '1' });
      done();
    });
  });
});
