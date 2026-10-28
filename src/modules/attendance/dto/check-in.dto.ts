import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @ApiPropertyOptional({
    description: 'User ID. Optional for logged-in employees (defaults to authenticated token user)',
    example: 'uuid-user-id',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Optional notes for check-in',
    example: 'Arrived on time for morning shift',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
