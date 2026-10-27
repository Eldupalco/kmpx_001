import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import type { AttendanceStatus } from '../models/attendance.entity.js';

export class CreateAttendanceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  checkInTime?: string;

  @IsOptional()
  @IsDateString()
  checkOutTime?: string;

  @IsOptional()
  @IsIn(['present', 'late', 'absent', 'half_day', 'on_leave'])
  status?: AttendanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
