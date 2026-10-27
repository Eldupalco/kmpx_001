import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { User } from '../models/user.entity.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<User[]>;
  }

  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user as User;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });
    if (existing) {
      throw new ConflictException(
        `Email "${createUserDto.email}" is already registered`,
      );
    }

    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
        role: createUserDto.role ?? 'user',
      },
    }) as Promise<User>;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    await this.findOne(id);

    if (updateUserDto.email) {
      const emailTaken = await this.prisma.user.findFirst({
        where: { email: updateUserDto.email, NOT: { id } },
      });
      if (emailTaken) {
        throw new ConflictException(
          `Email "${updateUserDto.email}" is already in use`,
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name !== undefined && { name: updateUserDto.name }),
        ...(updateUserDto.email !== undefined && { email: updateUserDto.email }),
        ...(updateUserDto.role !== undefined && { role: updateUserDto.role }),
      },
    }) as Promise<User>;
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.user.delete({
      where: { id },
    });
    return { message: `User "${id}" has been removed` };
  }
}
