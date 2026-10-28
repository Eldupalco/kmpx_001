import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prismaMock: Partial<PrismaService>;

  const mockAttendance = {
    id: 'att-1',
    userId: 'user-1',
    scheduleId: 'sched-1',
    date: '2026-10-26',
    checkInTime: new Date('2026-10-26T08:55:00.000Z'),
    checkOutTime: new Date('2026-10-26T17:05:00.000Z'),
    status: 'present',
    notes: 'On time',
    createdAt: new Date('2026-10-26T08:55:00.000Z'),
    updatedAt: new Date('2026-10-26T17:05:00.000Z'),
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1' || where.id === '99' || where.id === '100') {
            return Promise.resolve({ id: where.id, name: 'Test User' });
          }
          return Promise.resolve(null);
        }),
      } as any,
      schedule: {
        findFirst: vi.fn().mockResolvedValue({ id: 'sched-1', userId: 'user-1' }),
      } as any,
      attendance: {
        findMany: vi.fn().mockImplementation(({ where }) => {
          const records = [mockAttendance];
          if (where?.userId) {
            return Promise.resolve(records.filter((r) => r.userId === where.userId));
          }
          return Promise.resolve(records);
        }),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'att-1') return Promise.resolve(mockAttendance);
          return Promise.resolve(null);
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'new-att-id',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
        update: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...mockAttendance,
            ...data,
            updatedAt: new Date(),
          }),
        ),
        delete: vi.fn().mockResolvedValue(mockAttendance),
      } as any,
    };

    service = new AttendanceService(prismaMock as PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return attendance records from PostgreSQL via Prisma', async () => {
    const records = await service.findAll();
    expect(records).toHaveLength(1);
    expect(records[0].userId).toBe('user-1');
    expect(prismaMock.attendance?.findMany).toHaveBeenCalled();
  });

  it('should filter attendance records by userId', async () => {
    const records = await service.findAll('user-1');
    expect(records.every((r) => r.userId === 'user-1')).toBe(true);
  });

  it('should allow a user to check in', async () => {
    const newRecord = await service.checkIn({
      userId: '99',
      notes: 'Testing check-in',
    });
    expect(newRecord.userId).toBe('99');
    expect(newRecord.id).toBe('new-att-id');
  });

  it('should submit leave request for an employee', async () => {
    prismaMock.attendance!.findFirst = vi.fn().mockResolvedValue(null);

    const leave = await service.requestLeave('user-1', {
      date: '2026-11-05',
      status: 'on_leave',
      notes: 'Doctor visit',
    });

    expect(leave).toBeDefined();
    expect(leave.status).toBe('on_leave');
    expect(leave.notes).toBe('Doctor visit');
    expect(prismaMock.attendance!.create).toHaveBeenCalled();
  });

  it('should allow a user to check out', async () => {
    // Mock record without checkout
    prismaMock.attendance!.findUnique = vi.fn().mockResolvedValue({
      ...mockAttendance,
      checkOutTime: null,
    });

    const updated = await service.checkOut('att-1', {
      notes: 'Leaving for the day',
    });
    expect(updated.checkOutTime).toBeDefined();
  });

  it('should compute summary stats accurately', async () => {
    prismaMock.attendance!.findMany = vi.fn().mockResolvedValue([
      { status: 'present' },
      { status: 'late' },
    ]);

    const summary = await service.getSummary();
    expect(summary.total).toBe(2);
    expect(summary.present).toBe(1);
    expect(summary.late).toBe(1);
  });

  it('should compute HR dashboard pulse stats accurately', async () => {
    prismaMock.user!.count = vi.fn().mockResolvedValue(10);
    prismaMock.attendance!.findMany = vi.fn().mockResolvedValue([
      { status: 'present', checkOutTime: new Date() },
      { status: 'late', checkOutTime: null },
      { status: 'on_leave', checkOutTime: null },
    ]);

    const stats = await service.getDashboardStats();
    expect(stats.totalEmployees).toBe(10);
    expect(stats.checkedInToday).toBe(2);
    expect(stats.currentlyWorking).toBe(1);
    expect(stats.lateToday).toBe(1);
    expect(stats.onLeaveToday).toBe(1);
    expect(stats.notPunchedYet).toBe(7);
  });

  it('should compute employee timesheet and overtime hours accurately', async () => {
    const inTime = new Date('2026-10-28T09:00:00Z');
    const outTime = new Date('2026-10-28T18:30:00Z'); // 9.5 hours -> 570 mins (90 mins / 1.5h overtime)

    prismaMock.attendance!.findMany = vi.fn().mockResolvedValue([
      {
        id: 'att-1',
        userId: 'user-1',
        date: '2026-10-28',
        checkInTime: inTime,
        checkOutTime: outTime,
        status: 'present',
        notes: null,
      },
    ]);

    const timesheet = await service.getTimesheet('user-1', '2026-10-01', '2026-10-31');
    expect(timesheet.totalRecords).toBe(1);
    expect(timesheet.completedShiftsCount).toBe(1);
    expect(timesheet.totalHoursWorked).toBe(9.5);
    expect(timesheet.overtimeHours).toBe(1.5);
    expect(timesheet.averageDailyHours).toBe(9.5);
    expect(timesheet.daysPresent).toBe(1);
  });

  it('should export attendance records as formatted CSV', async () => {
    prismaMock.attendance!.findMany = vi.fn().mockResolvedValue([
      {
        id: 'att-1',
        userId: 'user-1',
        user: { name: 'Alice', email: 'alice@example.com' },
        date: '2026-10-28',
        checkInTime: new Date('2026-10-28T09:00:00Z'),
        checkOutTime: new Date('2026-10-28T17:00:00Z'),
        status: 'present',
        notes: 'Regular day',
      },
    ]);

    const csv = await service.exportCsv('user-1');
    expect(csv).toContain('Attendance ID,User ID,Employee Name');
    expect(csv).toContain('Alice,alice@example.com,2026-10-28');
    expect(csv).toContain('8.00,present,Regular day');
  });
});
