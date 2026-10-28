import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
import { Attendance, AttendanceStatus } from '../models/attendance.entity.js';
import { CheckInDto } from '../dto/check-in.dto.js';
import { CheckOutDto } from '../dto/check-out.dto.js';
import { CreateAttendanceDto } from '../dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto.js';
import { RequestLeaveDto } from '../dto/request-leave.dto.js';

/**
 * Service managing employee attendance records, daily check-ins/check-outs,
 * manual adjustments, and status summary metrics backed by PostgreSQL via Prisma.
 */
@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all attendance records from the database, sorted newest first.
   *
   * @param userId - Optional filter to return records for a specific employee.
   * @param date - Optional filter in YYYY-MM-DD format to return records for a specific date.
   * @returns Array of matching Attendance records.
   */
  async findAll(userId?: string, date?: string): Promise<Attendance[]> {
    return this.prisma.attendance.findMany({
      where: {
        ...(userId && { userId }),
        ...(date && { date }),
      },
      orderBy: { checkInTime: 'desc' },
    }) as Promise<Attendance[]>;
  }

  /**
   * Finds a single attendance record by its unique UUID.
   *
   * @param id - The UUID of the attendance record.
   * @throws NotFoundException If no record with the given ID exists.
   * @returns The matching Attendance record.
   */
  async findOne(id: string): Promise<Attendance> {
    const record = await this.prisma.attendance.findUnique({
      where: { id },
    });
    if (!record) {
      throw new NotFoundException(`Attendance record with ID "${id}" not found`);
    }
    return record as Attendance;
  }

  /**
   * Performs a daily clock-in for an employee.
   *
   * Business Logic:
   * 1. Validates that the user exists in PostgreSQL.
   * 2. Ensures the user has not already checked in for today (prevents duplicates).
   * 3. Determines 'late' status if clocking in after 9:00 AM (default threshold).
   * 4. Automatically queries and attaches the user's active work schedule for today.
   *
   * @param checkInDto - Payload containing userId and optional notes.
   * @throws NotFoundException If user does not exist.
   * @throws ConflictException If user has already clocked in today.
   * @returns Newly created Attendance record with checkInTime timestamp.
   */
  async checkIn(checkInDto: CheckInDto): Promise<Attendance> {
    if (!checkInDto.userId) {
      throw new BadRequestException('User ID is required for check-in');
    }
    const userId = checkInDto.userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const today = new Date().toISOString().split('T')[0];
    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    if (existing) {
      throw new ConflictException(
        `User "${userId}" has already checked in for today (${today})`,
      );
    }

    const now = new Date();

    // Find active schedule for user today (day of week: 1=Mon..7=Sun)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        userId,
        dayOfWeek,
        isActive: true,
      },
    });

    // Dynamic punctuality: determine late status against assigned schedule or default 9:00 AM
    let isLate = false;
    if (schedule?.startTime) {
      const [schedHour, schedMin] = schedule.startTime.split(':').map(Number);
      const schedMinutes = schedHour * 60 + schedMin;
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      isLate = currentMinutes > schedMinutes;
    } else {
      isLate = now.getHours() >= 9 && now.getMinutes() > 0;
    }

    const status: AttendanceStatus = isLate ? 'late' : 'present';

    return this.prisma.attendance.create({
      data: {
        userId,
        scheduleId: schedule?.id ?? null,
        date: today,
        checkInTime: now,
        status,
        notes: checkInDto.notes ?? null,
      },
    }) as Promise<Attendance>;
  }

  /**
   * Submits a leave or half-day request for an employee on a specific date.
   *
   * @param userId - Employee ID
   * @param dto - Details containing date, leave status ('on_leave' | 'half_day'), and reason notes.
   * @throws ConflictException If an attendance or leave record already exists on this date.
   */
  async requestLeave(userId: string, dto: RequestLeaveDto): Promise<Attendance> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const existing = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: dto.date,
      },
    });

    if (existing) {
      throw new ConflictException(
        `An attendance or leave record already exists for date "${dto.date}"`,
      );
    }

    return this.prisma.attendance.create({
      data: {
        userId,
        date: dto.date,
        status: dto.status ?? 'on_leave',
        notes: dto.notes,
        checkInTime: new Date(dto.date + 'T00:00:00.000Z'),
        checkOutTime: null,
      },
    }) as Promise<Attendance>;
  }

  /**
   * Performs an employee clock-out on an active attendance record.
   *
   * Business Logic:
   * 1. Validates that the record exists.
   * 2. Ensures the record does not already have a check-out time.
   * 3. Sets checkOutTime to the current timestamp and appends any closing notes.
   *
   * @param id - The UUID of the attendance record to clock out.
   * @param checkOutDto - Payload with optional check-out notes.
   * @throws NotFoundException If attendance record is not found.
   * @throws BadRequestException If attendance record already has a checkOutTime.
   * @returns Updated Attendance record with checkOutTime recorded.
   */
  async checkOut(id: string, checkOutDto: CheckOutDto): Promise<Attendance> {
    const record = await this.findOne(id);
    if (record.checkOutTime) {
      throw new BadRequestException(
        `Attendance record "${id}" already has a check-out time`,
      );
    }

    const now = new Date();
    const updatedNotes = checkOutDto.notes
      ? record.notes
        ? `${record.notes}; ${checkOutDto.notes}`
        : checkOutDto.notes
      : record.notes;

    return this.prisma.attendance.update({
      where: { id },
      data: {
        checkOutTime: now,
        notes: updatedNotes,
      },
    }) as Promise<Attendance>;
  }

  /**
   * Manually creates an attendance record (e.g. for administrative corrections or backfills).
   *
   * @param createDto - Details including userId, date, optional custom checkIn/checkOut, and status.
   * @throws NotFoundException If the specified user does not exist.
   * @returns The newly created Attendance record.
   */
  async create(createDto: CreateAttendanceDto): Promise<Attendance> {
    const user = await this.prisma.user.findUnique({
      where: { id: createDto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${createDto.userId}" not found`);
    }

    return this.prisma.attendance.create({
      data: {
        userId: createDto.userId,
        date: createDto.date,
        checkInTime: createDto.checkInTime ? new Date(createDto.checkInTime) : new Date(),
        checkOutTime: createDto.checkOutTime ? new Date(createDto.checkOutTime) : null,
        status: createDto.status ?? 'present',
        notes: createDto.notes ?? null,
      },
    }) as Promise<Attendance>;
  }

  /**
   * Updates fields of an existing attendance record (e.g. correcting status, timestamps, notes).
   *
   * @param id - The UUID of the attendance record to modify.
   * @param updateDto - Partial attendance updates.
   * @throws NotFoundException If attendance record is not found.
   * @returns The updated Attendance record.
   */
  async update(id: string, updateDto: UpdateAttendanceDto): Promise<Attendance> {
    await this.findOne(id);

    return this.prisma.attendance.update({
      where: { id },
      data: {
        ...(updateDto.status !== undefined && { status: updateDto.status }),
        ...(updateDto.checkInTime !== undefined && {
          checkInTime: new Date(updateDto.checkInTime),
        }),
        ...(updateDto.checkOutTime !== undefined && {
          checkOutTime: new Date(updateDto.checkOutTime),
        }),
        ...(updateDto.notes !== undefined && { notes: updateDto.notes }),
      },
    }) as Promise<Attendance>;
  }

  /**
   * Deletes an attendance record from the database.
   *
   * @param id - The UUID of the attendance record to delete.
   * @throws NotFoundException If attendance record is not found.
   * @returns Confirmation message indicating successful deletion.
   */
  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.prisma.attendance.delete({
      where: { id },
    });
    return { message: `Attendance record "${id}" has been removed` };
  }

  /**
   * Computes aggregate attendance summary statistics (total, present, late, absent, half_day, on_leave).
   *
   * @param userId - Optional filter to calculate statistics for a specific user only.
   * @returns Summary object containing counts for each status and total record count.
   */
  async getSummary(userId?: string) {
    const records = await this.prisma.attendance.findMany({
      where: {
        ...(userId && { userId }),
      },
      select: {
        status: true,
      },
    });

    const summary: Record<string, number> = {
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

  /**
   * Retrieves today's punch state for the specified employee (canCheckIn, canCheckOut).
   */
  async getTodayStatus(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const record = await this.prisma.attendance.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    const hasCheckedIn = !!record;
    const hasCheckedOut = !!record?.checkOutTime;

    return {
      date: today,
      hasCheckedIn,
      hasCheckedOut,
      canCheckIn: !hasCheckedIn,
      canCheckOut: hasCheckedIn && !hasCheckedOut,
      record: record ? record : null,
    };
  }

  /**
   * Admin only: Returns all employees currently working on-site today (punched in, not yet checked out).
   */
  async getCurrentlyIn(): Promise<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.prisma.attendance.findMany({
      where: {
        date: today,
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'asc' },
    }) as Promise<Attendance[]>;
  }

  /**
   * Admin only: Computes comprehensive daily HR KPI statistics.
   */
  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const totalEmployees = await this.prisma.user.count();

    const todayRecords = await this.prisma.attendance.findMany({
      where: { date: today },
    });

    let checkedInToday = 0;
    let lateToday = 0;
    let onLeaveToday = 0;
    let halfDayToday = 0;
    let currentlyWorking = 0;

    for (const record of todayRecords) {
      if (record.status === 'on_leave') {
        onLeaveToday++;
      } else {
        checkedInToday++;
        if (record.status === 'late') lateToday++;
        if (record.status === 'half_day') halfDayToday++;
        if (!record.checkOutTime) currentlyWorking++;
      }
    }

    const notPunchedYet = Math.max(
      0,
      totalEmployees - checkedInToday - onLeaveToday,
    );

    return {
      date: today,
      totalEmployees,
      checkedInToday,
      currentlyWorking,
      lateToday,
      onLeaveToday,
      halfDayToday,
      notPunchedYet,
    };
  }

  /**
   * Computes comprehensive timesheet calculations (hours worked, overtime, breakdown) for an employee.
   */
  async getTimesheet(userId: string, startDate?: string, endDate?: string) {
    const records = await this.prisma.attendance.findMany({
      where: {
        userId,
        ...(startDate &&
          endDate && {
            date: { gte: startDate, lte: endDate },
          }),
        ...(startDate &&
          !endDate && {
            date: { gte: startDate },
          }),
        ...(!startDate &&
          endDate && {
            date: { lte: endDate },
          }),
      },
      orderBy: { date: 'asc' },
    });

    let totalMinutesWorked = 0;
    let overtimeMinutes = 0;
    let completedShiftsCount = 0;
    let daysPresent = 0;
    let daysLate = 0;
    let daysOnLeave = 0;
    let daysHalfDay = 0;

    const details = records.map((r) => {
      let hoursWorked = 0;
      if (r.checkInTime && r.checkOutTime) {
        const diffMs = r.checkOutTime.getTime() - r.checkInTime.getTime();
        const minutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        hoursWorked = parseFloat((minutes / 60).toFixed(2));
        totalMinutesWorked += minutes;
        completedShiftsCount++;

        // Default 8-hour workday threshold for daily overtime (480 minutes)
        if (minutes > 480) {
          overtimeMinutes += minutes - 480;
        }
      }

      if (r.status === 'present') daysPresent++;
      if (r.status === 'late') daysLate++;
      if (r.status === 'on_leave') daysOnLeave++;
      if (r.status === 'half_day') daysHalfDay++;

      return {
        id: r.id,
        date: r.date,
        checkInTime: r.checkInTime,
        checkOutTime: r.checkOutTime,
        hoursWorked,
        status: r.status,
        notes: r.notes,
      };
    });

    const totalHoursWorked = parseFloat((totalMinutesWorked / 60).toFixed(2));
    const overtimeHours = parseFloat((overtimeMinutes / 60).toFixed(2));
    const averageDailyHours =
      completedShiftsCount > 0
        ? parseFloat((totalHoursWorked / completedShiftsCount).toFixed(2))
        : 0;

    return {
      userId,
      totalRecords: records.length,
      completedShiftsCount,
      totalHoursWorked,
      overtimeHours,
      averageDailyHours,
      daysPresent,
      daysLate,
      daysOnLeave,
      daysHalfDay,
      details,
    };
  }

  /**
   * Generates formatted CSV content of attendance and work hours records for payroll or reporting.
   */
  async exportCsv(
    userId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<string> {
    const records = await this.prisma.attendance.findMany({
      where: {
        ...(userId && { userId }),
        ...(startDate &&
          endDate && {
            date: { gte: startDate, lte: endDate },
          }),
        ...(startDate &&
          !endDate && {
            date: { gte: startDate },
          }),
        ...(!startDate &&
          endDate && {
            date: { lte: endDate },
          }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ date: 'asc' }, { checkInTime: 'asc' }],
    });

    const headers = [
      'Attendance ID',
      'User ID',
      'Employee Name',
      'Email',
      'Date',
      'Check In Time',
      'Check Out Time',
      'Hours Worked',
      'Status',
      'Notes',
    ];

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = records.map((r: any) => {
      let hoursWorked = '0.00';
      if (r.checkInTime && r.checkOutTime) {
        const diffMs = r.checkOutTime.getTime() - r.checkInTime.getTime();
        const mins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        hoursWorked = (mins / 60).toFixed(2);
      }

      return [
        r.id,
        r.userId,
        r.user?.name ?? '',
        r.user?.email ?? '',
        r.date,
        r.checkInTime ? r.checkInTime.toISOString() : '',
        r.checkOutTime ? r.checkOutTime.toISOString() : '',
        hoursWorked,
        r.status,
        r.notes ?? '',
      ]
        .map(escapeCsv)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
