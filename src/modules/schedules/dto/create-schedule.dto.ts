import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({
    example: 'uuid-user-id',
    description: 'Target employee user ID',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    example: 1,
    description: 'Day of week: 1 = Monday ... 7 = Sunday',
  })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({
    example: '08:00',
    description: 'Shift start time (HH:MM 24-hour format)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 08:00)',
  })
  startTime: string;

  @ApiProperty({
    example: '16:00',
    description: 'Shift end time (HH:MM 24-hour format)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 16:00)',
  })
  endTime: string;

  @ApiPropertyOptional({
    example: 'Morning Shift',
    description: 'Optional name/label for shift',
  })
  @IsOptional()
  @IsString()
  shiftName?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether schedule is currently active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
