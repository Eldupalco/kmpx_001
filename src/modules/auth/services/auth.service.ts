import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/services/users.service.js';
import { verifyPassword } from '../../../common/utils/password.util.js';
import { LoginDto } from '../dto/login.dto.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { ChangePasswordDto } from '../dto/change-password.dto.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
import { UserResponseDto } from '../../users/views/user-response.dto.js';
import { JwtPayload } from '../decorators/current-user.decorator.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: UserResponseDto;
  }> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(
      user.password,
      loginDto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: UserResponseDto.fromEntity(user),
    };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(userId);
    return UserResponseDto.fromEntity(user);
  }

  /**
   * Updates display name or email for the authenticated user.
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const updated = await this.usersService.update(userId, {
      name: updateProfileDto.name,
      email: updateProfileDto.email,
    });
    return UserResponseDto.fromEntity(updated);
  }

  /**
   * Changes password after validating the current password.
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByIdWithPassword(userId);
    const isCurrentValid = await verifyPassword(
      user.password,
      changePasswordDto.currentPassword,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('Current password does not match');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    await this.usersService.update(userId, {
      password: changePasswordDto.newPassword,
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Generates a 15-minute password reset token for the specified email.
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      return {
        message:
          'If the email is registered, a password reset token has been generated.',
      };
    }

    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'password_reset',
      },
      { expiresIn: '15m' },
    );

    return {
      message:
        'If the email is registered, a password reset token has been generated.',
      resetToken,
    };
  }

  /**
   * Resets password using a validated password reset token.
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        type: string;
      }>(resetPasswordDto.resetToken);

      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token type');
      }

      await this.usersService.update(payload.sub, {
        password: resetPasswordDto.newPassword,
      });

      return { message: 'Password has been successfully reset' };
    } catch {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }
  }
}
