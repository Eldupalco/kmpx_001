import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prismaMock: Partial<PrismaService>;

  const mockSchedule = {
    id: 'sched-1',
    userId: 'user-1',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '16:00',
    shiftName: 'Morning Shift',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') {
            return Promise.resolve({ id: 'user-1', name: 'Alice' });
          }
          return Promise.resolve(null);
        }),
        findMany: vi.fn().mockResolvedValue([
          { id: 'user-1', name: 'Alice' },
          { id: 'user-2', name: 'Bob' },
        ]),
      } as any,
      schedule: {
        findMany: vi.fn().mockResolvedValue([mockSchedule]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'sched-1') return Promise.resolve(mockSchedule);
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockImplementation(({ where }) => {
          if (where?.dayOfWeek === 2) {
            return Promise.resolve(null);
          }
          return Promise.resolve(mockSchedule);
        }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'new-sched-id',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...mockSchedule,
            ...data,
          }),
        ),
        delete: vi.fn().mockResolvedValue(mockSchedule),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      } as any,
    };

    service = new SchedulesService(prismaMock as PrismaService);
  });

  it('should return all schedules', async () => {
    const list = await service.findAll();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('sched-1');
  });

  it('should return schedules for a specific user', async () => {
    const list = await service.findMySchedule('user-1');
    expect(list).toBeDefined();
    expect(prismaMock.schedule!.findMany).toHaveBeenCalled();
  });

  it('should return schedule for today', async () => {
    const today = await service.findTodaySchedule('user-1');
    expect(today).toBeDefined();
    expect(today!.shiftName).toBe('Morning Shift');
  });

  it('should create schedule if user exists and day has no schedule', async () => {
    const created = await service.create({
      userId: 'user-1',
      dayOfWeek: 2,
      startTime: '09:00',
      endTime: '17:00',
      shiftName: 'Standard',
    });
    expect(created.id).toBe('new-sched-id');
    expect(created.dayOfWeek).toBe(2);
  });

  it('should upsert/update existing schedule if already assigned for day of week', async () => {
    const updated = await service.create({
      userId: 'user-1',
      dayOfWeek: 1, // day 1 has mockSchedule
      startTime: '10:00',
      endTime: '18:00',
      shiftName: 'Late Shift',
    });
    expect(updated.id).toBe('sched-1');
    expect(prismaMock.schedule!.update).toHaveBeenCalled();
  });

  it('should throw NotFoundException when creating schedule for non-existing user', async () => {
    await expect(
      service.create({
        userId: 'invalid-user',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '16:00',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should bulk create schedules for multiple days', async () => {
    const createdList = await service.createBulk({
      userId: 'user-1',
      workDays: [1, 2, 3],
      startTime: '08:30',
      endTime: '16:30',
      shiftName: 'Bulk Shift',
    });
    expect(createdList).toHaveLength(3);
    expect(prismaMock.schedule!.deleteMany).toHaveBeenCalled();
  });

  it('should update schedule', async () => {
    const updated = await service.update('sched-1', {
      shiftName: 'Updated Shift',
    });
    expect(updated.shiftName).toBe('Updated Shift');
  });

  it('should remove schedule', async () => {
    const res = await service.remove('sched-1');
    expect(res.message).toContain('removed');
  });

  it('should assign weekly schedules to multiple employees in bulk', async () => {
    const res = await service.assignBulkUsers({
      userIds: ['user-1', 'user-2'],
      workDays: [1, 2],
      startTime: '09:00',
      endTime: '17:00',
      shiftName: 'Cohort Shift',
    });

    expect(res.assignedUsersCount).toBe(2);
    expect(res.totalSchedulesCreated).toBe(4);
    expect(res.schedules).toHaveLength(4);
  });
});
