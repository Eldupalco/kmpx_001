import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class BulkAssignUsersScheduleDto {
  @ApiProperty({
    example: ['uuid-user-1', 'uuid-user-2'],
    description: 'Array of target employee user IDs',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  userIds: string[];

  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Array of days of week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  workDays: number[];

  @ApiProperty({
    example: '09:00',
    description: 'Shift start time (HH:MM 24-hour format)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 09:00)',
  })
  startTime: string;

  @ApiProperty({
    example: '17:00',
    description: 'Shift end time (HH:MM 24-hour format)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 17:00)',
  })
  endTime: string;

  @ApiPropertyOptional({
    example: 'Standard Shift',
    description: 'Optional name/label for shift',
  })
  @IsOptional()
  @IsString()
  shiftName?: string;
}
