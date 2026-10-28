import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflectorMock: Partial<Reflector>;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(reflectorMock as Reflector);
  });

  function createMockExecutionContext(user?: { role?: string }): ExecutionContext {
    const request = { user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('should allow access if no roles are required', () => {
    (reflectorMock.getAllAndOverride as any).mockReturnValue(undefined);
    const context = createMockExecutionContext({ role: 'user' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the required role', () => {
    (reflectorMock.getAllAndOverride as any).mockReturnValue(['admin']);
    const context = createMockExecutionContext({ role: 'admin' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user has wrong role', () => {
    (reflectorMock.getAllAndOverride as any).mockReturnValue(['admin']);
    const context = createMockExecutionContext({ role: 'user' });

    expect(() => guard.canActivate(context)).toThrow(
      new ForbiddenException('You do not have permission to access this resource'),
    );
  });

  it('should throw ForbiddenException if user is not attached to request', () => {
    (reflectorMock.getAllAndOverride as any).mockReturnValue(['admin']);
    const context = createMockExecutionContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
