import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Attendance, AttendanceStatus } from '../models/attendance.entity.js';
import { CheckInDto } from '../dto/check-in.dto.js';
import { CheckOutDto } from '../dto/check-out.dto.js';
import { CreateAttendanceDto } from '../dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto.js';

@Injectable()
export class AttendanceService {
  // In-memory data store for demonstration
  private records: Attendance[] = [
    {
      id: '1',
      userId: '1',
      date: '2026-10-26',
      checkInTime: new Date('2026-10-26T08:55:00.000Z'),
      checkOutTime: new Date('2026-10-26T17:05:00.000Z'),
      status: 'present',
      notes: 'On time',
      createdAt: new Date('2026-10-26T08:55:00.000Z'),
      updatedAt: new Date('2026-10-26T17:05:00.000Z'),
    },
    {
      id: '2',
      userId: '2',
      date: '2026-10-26',
      checkInTime: new Date('2026-10-26T09:25:00.000Z'),
      checkOutTime: new Date('2026-10-26T17:30:00.000Z'),
      status: 'late',
      notes: 'Traffic delay',
      createdAt: new Date('2026-10-26T09:25:00.000Z'),
      updatedAt: new Date('2026-10-26T17:30:00.000Z'),
    },
  ];

  findAll(userId?: string, date?: string): Attendance[] {
    return this.records.filter((rec) => {
      if (userId && rec.userId !== userId) return false;
      if (date && rec.date !== date) return false;
      return true;
    });
  }

  findOne(id: string): Attendance {
    const record = this.records.find((r) => r.id === id);
    if (!record) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found`);
    }
    return record;
  }

  checkIn(checkInDto: CheckInDto): Attendance {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.records.find(
      (r) => r.userId === checkInDto.userId && r.date === today,
    );

    if (existing) {
      throw new ConflictException(
        `User "${checkInDto.userId}" has already checked in for today (${today})`,
      );
    }

    const now = new Date();
    // Default 9:00 AM threshold for 'late' status
    const isLate = now.getHours() >= 9 && now.getMinutes() > 0;
    const status: AttendanceStatus = isLate ? 'late' : 'present';

    const newRecord: Attendance = {
      id: (this.records.length + 1).toString(),
      userId: checkInDto.userId,
      date: today,
      checkInTime: now,
      checkOutTime: null,
      status,
      notes: checkInDto.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.records.push(newRecord);
    return newRecord;
  }

  checkOut(id: string, checkOutDto: CheckOutDto): Attendance {
    const record = this.findOne(id);
    if (record.checkOutTime) {
      throw new BadRequestException(
        `Attendance record "${id}" already has a check-out time`,
      );
    }

    const now = new Date();
    record.checkOutTime = now;
    if (checkOutDto.notes) {
      record.notes = record.notes
        ? `${record.notes}; ${checkOutDto.notes}`
        : checkOutDto.notes;
    }
    record.updatedAt = now;
    return record;
  }

  create(createDto: CreateAttendanceDto): Attendance {
    const now = new Date();
    const newRecord: Attendance = {
      id: (this.records.length + 1).toString(),
      userId: createDto.userId,
      date: createDto.date,
      checkInTime: createDto.checkInTime ? new Date(createDto.checkInTime) : now,
      checkOutTime: createDto.checkOutTime ? new Date(createDto.checkOutTime) : null,
      status: createDto.status ?? 'present',
      notes: createDto.notes,
      createdAt: now,
      updatedAt: now,
    };

    this.records.push(newRecord);
    return newRecord;
  }

  update(id: string, updateDto: UpdateAttendanceDto): Attendance {
    const record = this.findOne(id);
    if (updateDto.status !== undefined) record.status = updateDto.status;
    if (updateDto.checkInTime !== undefined) {
      record.checkInTime = new Date(updateDto.checkInTime);
    }
    if (updateDto.checkOutTime !== undefined) {
      record.checkOutTime = new Date(updateDto.checkOutTime);
    }
    if (updateDto.notes !== undefined) record.notes = updateDto.notes;
    record.updatedAt = new Date();
    return record;
  }

  remove(id: string): { message: string } {
    const index = this.records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found`);
    }
    this.records.splice(index, 1);
    return { message: `Attendance record "${id}" has been removed` };
  }

  getSummary(userId?: string) {
    const records = userId
      ? this.records.filter((r) => r.userId === userId)
      : this.records;

    const summary = {
      total: records.length,
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
    };

    for (const r of records) {
      if (summary[r.status] !== undefined) {
        summary[r.status]++;
      }
    }

    return summary;
  }
}
