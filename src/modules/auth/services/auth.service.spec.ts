import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { UsersService } from '../../users/services/users.service.js';
import { JwtService } from '@nestjs/jwt';
import * as passwordUtil from '../../../common/utils/password.util.js';

describe('AuthService', () => {
  let authService: AuthService;
  let usersServiceMock: Partial<UsersService>;
  let jwtServiceMock: Partial<JwtService>;

  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashed_password',
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(() => {
    usersServiceMock = {
      findByEmail: vi.fn().mockImplementation((email: string) => {
        if (email === mockUser.email) {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      }),
      findOne: vi.fn().mockImplementation((id: string) => {
        if (id === mockUser.id) {
          return Promise.resolve(mockUser);
        }
        return Promise.reject(new Error('User not found'));
      }),
      findByIdWithPassword: vi.fn().mockImplementation((id: string) => {
        if (id === mockUser.id) {
          return Promise.resolve(mockUser);
        }
        return Promise.reject(new Error('User not found'));
      }),
      update: vi.fn().mockImplementation((id: string, dto: any) => {
        return Promise.resolve({
          ...mockUser,
          ...dto,
        });
      }),
    };

    jwtServiceMock = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
      verifyAsync: vi.fn().mockImplementation((token: string) => {
        if (token === 'valid-reset-token') {
          return Promise.resolve({
            sub: mockUser.id,
            email: mockUser.email,
            type: 'password_reset',
          });
        }
        return Promise.reject(new Error('Invalid token'));
      }),
    };

    authService = new AuthService(
      usersServiceMock as UsersService,
      jwtServiceMock as JwtService,
    );
  });

  describe('login', () => {
    it('should return an accessToken and user when credentials are valid', async () => {
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);

      const result = await authService.login({
        email: 'john@example.com',
        password: 'correctPassword',
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw UnauthorizedException when email does not exist', async () => {
      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'somePassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'john@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const profile = await authService.getProfile('user-123');

      expect(profile).toBeDefined();
      expect(profile.id).toBe(mockUser.id);
      expect(profile.name).toBe(mockUser.name);
      expect(profile.email).toBe(mockUser.email);
      expect((profile as any).password).toBeUndefined();
    });
  });

  describe('updateProfile', () => {
    it('should update name and email', async () => {
      const updated = await authService.updateProfile('user-123', {
        name: 'John Updated',
        email: 'john.new@example.com',
      });

      expect(updated.name).toBe('John Updated');
      expect(updated.email).toBe('john.new@example.com');
      expect(usersServiceMock.update).toHaveBeenCalledWith('user-123', {
        name: 'John Updated',
        email: 'john.new@example.com',
      });
    });
  });

  describe('changePassword', () => {
    it('should change password when current password matches', async () => {
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);

      const res = await authService.changePassword('user-123', {
        currentPassword: 'oldPassword123!',
        newPassword: 'newPassword123!',
      });

      expect(res.message).toBe('Password updated successfully');
      expect(usersServiceMock.update).toHaveBeenCalledWith('user-123', {
        password: 'newPassword123!',
      });
    });

    it('should throw BadRequestException when current password is wrong', async () => {
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(false);

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'wrongOldPassword',
          newPassword: 'newPassword123!',
        }),
      ).rejects.toThrow(new BadRequestException('Current password does not match'));
    });

    it('should throw BadRequestException when new password equals current password', async () => {
      vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'samePassword123!',
          newPassword: 'samePassword123!',
        }),
      ).rejects.toThrow(
        new BadRequestException('New password must be different from current password'),
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return reset token if user exists', async () => {
      const res = await authService.forgotPassword({
        email: 'john@example.com',
      });

      expect(res.resetToken).toBe('mock-jwt-token');
      expect(jwtServiceMock.signAsync).toHaveBeenCalled();
    });

    it('should return generic message without token if user does not exist', async () => {
      const res = await authService.forgotPassword({
        email: 'nonexistent@example.com',
      });

      expect(res.resetToken).toBeUndefined();
      expect(res.message).toContain('If the email is registered');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const res = await authService.resetPassword({
        resetToken: 'valid-reset-token',
        newPassword: 'resetNewPassword123!',
      });

      expect(res.message).toBe('Password has been successfully reset');
      expect(usersServiceMock.update).toHaveBeenCalledWith('user-123', {
        password: 'resetNewPassword123!',
      });
    });

    it('should throw UnauthorizedException with invalid token', async () => {
      await expect(
        authService.resetPassword({
          resetToken: 'invalid-token',
          newPassword: 'resetNewPassword123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
