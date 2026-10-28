import { ApiProperty } from '@nestjs/swagger';
import { Schedule } from '../models/schedule.entity.js';

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export class ScheduleResponseDto {
  @ApiProperty({ example: 'uuid-schedule-id' })
  id: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ example: 1, description: '1 = Monday ... 7 = Sunday' })
  dayOfWeek: number;

  @ApiProperty({ example: 'Monday', description: 'Name of the day' })
  dayName: string;

  @ApiProperty({ example: '08:00' })
  startTime: string;

  @ApiProperty({ example: '16:00' })
  endTime: string;

  @ApiProperty({ example: 'Morning Shift', nullable: true })
  shiftName: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  constructor(partial: Partial<Schedule>) {
    Object.assign(this, {
      id: partial.id,
      userId: partial.userId,
      dayOfWeek: partial.dayOfWeek,
      dayName:
        partial.dayOfWeek && partial.dayOfWeek >= 1 && partial.dayOfWeek <= 7
          ? DAY_NAMES[partial.dayOfWeek - 1]
          : 'Unknown',
      startTime: partial.startTime,
      endTime: partial.endTime,
      shiftName: partial.shiftName ?? null,
      isActive: partial.isActive ?? true,
      createdAt:
        partial.createdAt instanceof Date
          ? partial.createdAt.toISOString()
          : (partial.createdAt ?? new Date().toISOString()),
      updatedAt:
        partial.updatedAt instanceof Date
          ? partial.updatedAt.toISOString()
          : (partial.updatedAt ?? new Date().toISOString()),
    });
  }

  static fromEntity(schedule: Schedule): ScheduleResponseDto {
    return new ScheduleResponseDto(schedule);
  }

  static fromEntities(schedules: Schedule[]): ScheduleResponseDto[] {
    return schedules.map((s) => ScheduleResponseDto.fromEntity(s));
  }
}
