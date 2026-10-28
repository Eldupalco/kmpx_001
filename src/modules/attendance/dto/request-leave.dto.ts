import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestLeaveDto {
  @ApiProperty({
    example: '2026-11-02',
    description: 'Target date for leave in YYYY-MM-DD format',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    example: 'on_leave',
    description: 'Leave type: on_leave or half_day',
    enum: ['on_leave', 'half_day'],
    default: 'on_leave',
  })
  @IsOptional()
  @IsIn(['on_leave', 'half_day'])
  status?: 'on_leave' | 'half_day';

  @ApiProperty({
    example: 'Annual vacation / medical appointment',
    description: 'Reason or explanation for the leave',
  })
  @IsString()
  @IsNotEmpty()
  notes: string;
}
