import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Schedule } from '../models/schedule.entity.js';
import { CreateScheduleDto } from '../dto/create-schedule.dto.js';
import { UpdateScheduleDto } from '../dto/update-schedule.dto.js';
import { BulkCreateScheduleDto } from '../dto/bulk-create-schedule.dto.js';
import { BulkAssignUsersScheduleDto } from '../dto/bulk-assign-users-schedule.dto.js';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId?: string): Promise<Schedule[]> {
    return this.prisma.schedule.findMany({
      where: {
        ...(userId && { userId }),
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    }) as Promise<Schedule[]>;
  }

  async findMySchedule(userId: string): Promise<Schedule[]> {
    return this.findAll(userId);
  }

  async findTodaySchedule(userId: string): Promise<Schedule | null> {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        userId,
        dayOfWeek,
        isActive: true,
      },
    });
    return schedule as Schedule | null;
  }

  async findOne(id: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });
    if (!schedule) {
      throw new NotFoundException(`Schedule with ID "${id}" not found`);
    }
    return schedule as Schedule;
  }

  async create(createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    const user = await this.prisma.user.findUnique({
      where: { id: createScheduleDto.userId },
    });
    if (!user) {
      throw new NotFoundException(
        `User with ID "${createScheduleDto.userId}" not found`,
      );
    }

    const existing = await this.prisma.schedule.findFirst({
      where: {
        userId: createScheduleDto.userId,
        dayOfWeek: createScheduleDto.dayOfWeek,
      },
    });

    if (existing) {
      return this.prisma.schedule.update({
        where: { id: existing.id },
        data: {
          startTime: createScheduleDto.startTime,
          endTime: createScheduleDto.endTime,
          shiftName: createScheduleDto.shiftName ?? null,
          isActive: createScheduleDto.isActive ?? true,
        },
      }) as Promise<Schedule>;
    }

    return this.prisma.schedule.create({
      data: {
        userId: createScheduleDto.userId,
        dayOfWeek: createScheduleDto.dayOfWeek,
        startTime: createScheduleDto.startTime,
        endTime: createScheduleDto.endTime,
        shiftName: createScheduleDto.shiftName ?? null,
        isActive: createScheduleDto.isActive ?? true,
      },
    }) as Promise<Schedule>;
  }

  async createBulk(bulkDto: BulkCreateScheduleDto): Promise<Schedule[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: bulkDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${bulkDto.userId}" not found`);
    }

    const uniqueDays = Array.from(new Set(bulkDto.workDays));

    await this.prisma.schedule.deleteMany({
      where: {
        userId: bulkDto.userId,
        dayOfWeek: { in: uniqueDays },
      },
    });

    const created: Schedule[] = [];
    for (const day of uniqueDays) {
      const s = await this.prisma.schedule.create({
        data: {
          userId: bulkDto.userId,
          dayOfWeek: day,
          startTime: bulkDto.startTime,
          endTime: bulkDto.endTime,
          shiftName: bulkDto.shiftName ?? null,
          isActive: true,
        },
      });
      created.push(s as Schedule);
    }

    return created;
  }

  /**
   * Admin only: Assign recurring weekly shift schedules to multiple employees simultaneously.
   */
  async assignBulkUsers(dto: BulkAssignUsersScheduleDto): Promise<{
    assignedUsersCount: number;
    totalSchedulesCreated: number;
    schedules: Schedule[];
  }> {
    const uniqueUserIds = Array.from(new Set(dto.userIds));
    const uniqueDays = Array.from(new Set(dto.workDays));

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
    });

    if (users.length === 0) {
      throw new NotFoundException('No valid users found for the provided IDs');
    }

    const validUserIds = users.map((u) => u.id);

    await this.prisma.schedule.deleteMany({
      where: {
        userId: { in: validUserIds },
        dayOfWeek: { in: uniqueDays },
      },
    });

    const created: Schedule[] = [];
    for (const userId of validUserIds) {
      for (const day of uniqueDays) {
        const s = await this.prisma.schedule.create({
          data: {
            userId,
            dayOfWeek: day,
            startTime: dto.startTime,
            endTime: dto.endTime,
            shiftName: dto.shiftName ?? null,
            isActive: true,
          },
        });
        created.push(s as Schedule);
      }
    }

    return {
      assignedUsersCount: validUserIds.length,
      totalSchedulesCreated: created.length,
      schedules: created,
    };
  }

  async update(
    id: string,
    updateScheduleDto: UpdateScheduleDto,
  ): Promise<Schedule> {
    await this.findOne(id);

    return this.prisma.schedule.update({
      where: { id },
      data: {
        ...(updateScheduleDto.dayOfWeek !== undefined && {
          dayOfWeek: updateScheduleDto.dayOfWeek,
        }),
        ...(updateScheduleDto.startTime !== undefined && {
          startTime: updateScheduleDto.startTime,
        }),
        ...(updateScheduleDto.endTime !== undefined && {
          endTime: updateScheduleDto.endTime,
        }),
        ...(updateScheduleDto.shiftName !== undefined && {
          shiftName: updateScheduleDto.shiftName,
        }),
        ...(updateScheduleDto.isActive !== undefined && {
          isActive: updateScheduleDto.isActive,
        }),
      },
    }) as Promise<Schedule>;
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.schedule.delete({
      where: { id },
    });
    return { message: `Schedule "${id}" has been removed` };
  }
}
