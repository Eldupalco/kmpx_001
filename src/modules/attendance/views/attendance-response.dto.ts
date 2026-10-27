import { Attendance, AttendanceStatus } from '../models/attendance.entity.js';

export class AttendanceResponseDto {
  id: string;
  userId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  durationMinutes: number | null;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  constructor(partial: Partial<Attendance>) {
    const diffMs =
      partial.checkInTime && partial.checkOutTime
        ? partial.checkOutTime.getTime() - partial.checkInTime.getTime()
        : null;

    Object.assign(this, {
      id: partial.id ?? '',
      userId: partial.userId ?? '',
      date: partial.date ?? '',
      checkInTime: partial.checkInTime ? partial.checkInTime.toISOString() : '',
      checkOutTime: partial.checkOutTime ? partial.checkOutTime.toISOString() : null,
      durationMinutes: diffMs !== null ? Math.max(0, Math.round(diffMs / (1000 * 60))) : null,
      status: partial.status ?? 'present',
      notes: partial.notes,
      createdAt: partial.createdAt ? partial.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: partial.updatedAt ? partial.updatedAt.toISOString() : new Date().toISOString(),
    });
  }

  static fromEntity(attendance: Attendance): AttendanceResponseDto {
    return new AttendanceResponseDto(attendance);
  }

  static fromEntities(records: Attendance[]): AttendanceResponseDto[] {
    return records.map((record) => AttendanceResponseDto.fromEntity(record));
  }
}
