import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAttendanceDto } from './create-attendance.dto.js';

export class UpdateAttendanceDto extends PartialType(
  OmitType(CreateAttendanceDto, ['userId', 'date'] as const),
) {}

