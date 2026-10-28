import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { JwtService } from '@nestjs/jwt';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtServiceMock: Partial<JwtService>;

  beforeEach(() => {
    jwtServiceMock = {
      verifyAsync: vi.fn(),
    };
    guard = new AuthGuard(jwtServiceMock as JwtService);
  });

  function createMockExecutionContext(authorizationHeader?: string): ExecutionContext {
    const request = {
      headers: {
        authorization: authorizationHeader,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow request with valid Bearer token and set request.user', async () => {
    const mockPayload = { sub: 'user-1', email: 'test@example.com', role: 'user' };
    (jwtServiceMock.verifyAsync as any).mockResolvedValue(mockPayload);

    const context = createMockExecutionContext('Bearer valid-token');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const req = context.switchToHttp().getRequest() as any;
    expect(req.user).toEqual(mockPayload);
  });

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const context = createMockExecutionContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should throw UnauthorizedException when header is not Bearer', async () => {
    const context = createMockExecutionContext('Basic dXNlcjpwYXNz');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Authentication token is missing'),
    );
  });

  it('should throw UnauthorizedException when token verification fails', async () => {
    (jwtServiceMock.verifyAsync as any).mockRejectedValue(new Error('jwt expired'));

    const context = createMockExecutionContext('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Invalid or expired authentication token'),
    );
  });
});
