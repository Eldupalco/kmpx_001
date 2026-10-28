import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  Header,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from '../services/attendance.service.js';
import { CheckInDto } from '../dto/check-in.dto.js';
import { CheckOutDto } from '../dto/check-out.dto.js';
import { CreateAttendanceDto } from '../dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto.js';
import { RequestLeaveDto } from '../dto/request-leave.dto.js';
import { AttendanceResponseDto } from '../views/attendance-response.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type JwtPayload,
} from '../../auth/decorators/current-user.decorator.js';

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ApiOperation({ summary: 'List attendance records (Self for user, All for admin)' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
    @Query('date') date?: string,
  ): Promise<AttendanceResponseDto[]> {
    const targetUserId = user.role === 'admin' ? userId : user.sub;
    const records = await this.attendanceService.findAll(targetUserId, date);
    return AttendanceResponseDto.fromEntities(records);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get summary statistics (Self for user, All for admin)' })
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = user.role === 'admin' ? userId : user.sub;
    return this.attendanceService.getSummary(targetUserId);
  }

  @Get('today-status')
  @ApiOperation({ summary: 'Get current punch status for today (canCheckIn, canCheckOut)' })
  async getTodayStatus(@CurrentUser() user: JwtPayload) {
    const status = await this.attendanceService.getTodayStatus(user.sub);
    return {
      ...status,
      record: status.record ? AttendanceResponseDto.fromEntity(status.record) : null,
    };
  }

  @Get('currently-in')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: List of employees currently working today' })
  async getCurrentlyIn(): Promise<AttendanceResponseDto[]> {
    const records = await this.attendanceService.getCurrentlyIn();
    return AttendanceResponseDto.fromEntities(records);
  }

  @Get('dashboard')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Executive daily HR attendance pulse & KPI metrics' })
  async getDashboardStats() {
    return this.attendanceService.getDashboardStats();
  }

  @Get('timesheet')
  @ApiOperation({ summary: 'Calculate monthly or custom range timesheet with overtime & work hours' })
  async getTimesheet(
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const targetUserId = user.role === 'admin' && userId ? userId : user.sub;
    return this.attendanceService.getTimesheet(targetUserId, startDate, endDate);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @ApiOperation({ summary: 'Export attendance & timesheet records to downloadable CSV format' })
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<string> {
    const targetUserId = user.role === 'admin' ? userId : user.sub;
    const filename = `attendance-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return this.attendanceService.exportCsv(targetUserId, startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single attendance record by ID' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<AttendanceResponseDto> {
    const record = await this.attendanceService.findOne(id);
    if (user.role !== 'admin' && record.userId !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to view this attendance record',
      );
    }
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post('check-in')
  @ApiOperation({ summary: 'Punch in for workday (Auto-binds to authenticated user)' })
  async checkIn(
    @CurrentUser() user: JwtPayload,
    @Body() checkInDto: CheckInDto,
  ): Promise<AttendanceResponseDto> {
    const targetUserId =
      user.role === 'admin' && checkInDto.userId ? checkInDto.userId : user.sub;

    const record = await this.attendanceService.checkIn({
      ...checkInDto,
      userId: targetUserId,
    });
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post('leave')
  @ApiOperation({ summary: 'Submit an employee leave or half-day request' })
  async requestLeave(
    @CurrentUser() user: JwtPayload,
    @Body() requestLeaveDto: RequestLeaveDto,
  ): Promise<AttendanceResponseDto> {
    const record = await this.attendanceService.requestLeave(
      user.sub,
      requestLeaveDto,
    );
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post(':id/check-out')
  @ApiOperation({ summary: 'Punch out for workday (Requires record ownership)' })
  async checkOut(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() checkOutDto: CheckOutDto,
  ): Promise<AttendanceResponseDto> {
    const existing = await this.attendanceService.findOne(id);
    if (user.role !== 'admin' && existing.userId !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to check out this attendance record',
      );
    }

    const record = await this.attendanceService.checkOut(id, checkOutDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Manually create/backfill attendance record' })
  async create(
    @Body() createDto: CreateAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    const record = await this.attendanceService.create(createDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Update/correct attendance record' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAttendanceDto,
  ): Promise<AttendanceResponseDto> {
    const record = await this.attendanceService.update(id, updateDto);
    return AttendanceResponseDto.fromEntity(record);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Delete attendance record' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.attendanceService.remove(id);
  }
}
