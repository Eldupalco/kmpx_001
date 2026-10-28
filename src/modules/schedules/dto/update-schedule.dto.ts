import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class UpdateScheduleDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Day of week: 1 = Monday ... 7 = Sunday',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    example: '09:00',
    description: 'Shift start time (HH:MM 24-hour format)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 09:00)',
  })
  startTime?: string;

  @ApiPropertyOptional({
    example: '17:00',
    description: 'Shift end time (HH:MM 24-hour format)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 17:00)',
  })
  endTime?: string;

  @ApiPropertyOptional({
    example: 'Standard Shift',
    description: 'Optional name/label for shift',
  })
  @IsOptional()
  @IsString()
  shiftName?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether schedule is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
