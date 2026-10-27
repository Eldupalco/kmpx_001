import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
