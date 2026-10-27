import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prismaMock: Partial<PrismaService>;

  beforeEach(() => {
    prismaMock = {
      user: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: '1',
            name: 'Alice Johnson',
            email: 'alice@example.com',
            password: 'pwd',
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === '1' || where.email === 'alice@example.com') {
            return Promise.resolve({
              id: '1',
              name: 'Alice Johnson',
              email: 'alice@example.com',
              password: 'pwd',
              role: 'admin',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'new-id',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: '1',
            name: data.name ?? 'Alice Johnson',
            email: data.email ?? 'alice@example.com',
            password: 'pwd',
            role: data.role ?? 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        delete: vi.fn().mockResolvedValue({ id: '1' }),
      } as any,
    };

    service = new UsersService(prismaMock as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all users from PostgreSQL via Prisma', async () => {
    const users = await service.findAll();
    expect(users).toHaveLength(1);
    expect(users[0].name).toBe('Alice Johnson');
    expect(prismaMock.user?.findMany).toHaveBeenCalled();
  });

  it('should return a user by ID', async () => {
    const user = await service.findOne('1');
    expect(user.id).toBe('1');
    expect(user.name).toBe('Alice Johnson');
  });

  it('should throw NotFoundException if user not found', async () => {
    await expect(service.findOne('non-existent')).rejects.toThrow();
  });

  it('should create a new user', async () => {
    const newUser = await service.create({
      name: 'Bob',
      email: 'bob@unique.com',
      password: 'password123',
    });
    expect(newUser.name).toBe('Bob');
    expect(newUser.id).toBe('new-id');
  });
});
