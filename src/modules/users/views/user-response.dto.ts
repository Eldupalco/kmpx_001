import { User, UserRole } from '../models/user.entity.js';

export class UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  createdAt: string;

  constructor(partial: Partial<User>) {
    Object.assign(this, {
      id: partial.id,
      name: partial.name,
      email: partial.email,
      role: partial.role ?? 'user',
      createdAt:
        partial.createdAt instanceof Date
          ? partial.createdAt.toISOString()
          : (partial.createdAt ?? new Date().toISOString()),
    });
  }

  static fromEntity(user: User): UserResponseDto {
    return new UserResponseDto(user);
  }

  static fromEntities(users: User[]): UserResponseDto[] {
    return users.map((u) => UserResponseDto.fromEntity(u));
  }
}
