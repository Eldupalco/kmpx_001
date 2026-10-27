import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service.js';
import { CheckInDto } from '../dto/check-in.dto.js';
import { CheckOutDto } from '../dto/check-out.dto.js';
import { CreateAttendanceDto } from '../dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto.js';
import { AttendanceResponseDto } from '../views/attendance-response.dto.js';

@ApiTags('attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('date') date?: string,
  ): AttendanceResponseDto[] {
    const records = this.attendanceService.findAll(userId, date);
    return AttendanceResponseDto.fromEntities(records);
  }

  @Get('summary')
  getSummary(@Query('userId') userId?: string) {
    return this.attendanceService.getSummary(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string): AttendanceResponseDto {
    const record = this.attendanceService.findOne(id);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post('check-in')
  checkIn(@Body() checkInDto: CheckInDto): AttendanceResponseDto {
    const record = this.attendanceService.checkIn(checkInDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post(':id/check-out')
  checkOut(
    @Param('id') id: string,
    @Body() checkOutDto: CheckOutDto,
  ): AttendanceResponseDto {
    const record = this.attendanceService.checkOut(id, checkOutDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post()
  create(@Body() createDto: CreateAttendanceDto): AttendanceResponseDto {
    const record = this.attendanceService.create(createDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAttendanceDto,
  ): AttendanceResponseDto {
    const record = this.attendanceService.update(id, updateDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Delete(':id')
  remove(@Param('id') id: string): { message: string } {
    return this.attendanceService.remove(id);
  }
}
