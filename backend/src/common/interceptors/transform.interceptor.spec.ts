import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

function createMockContext(url: string, statusCode: number): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('TransformInterceptor', () => {
  it('wraps the handler result in a standard success envelope', (done) => {
    const interceptor = new TransformInterceptor<{ id: string }>();
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
      expect(typeof result.timestamp).toBe('string');
      done();
    });
  });
});
