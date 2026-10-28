import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SchedulesService } from '../services/schedules.service.js';
import { CreateScheduleDto } from '../dto/create-schedule.dto.js';
import { UpdateScheduleDto } from '../dto/update-schedule.dto.js';
import { BulkCreateScheduleDto } from '../dto/bulk-create-schedule.dto.js';
import { BulkAssignUsersScheduleDto } from '../dto/bulk-assign-users-schedule.dto.js';
import { ScheduleResponseDto } from '../views/schedule-response.dto.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { RolesGuard } from '../../../common/guards/roles.guard.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type JwtPayload,
} from '../../auth/decorators/current-user.decorator.js';

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @ApiOperation({
    summary: 'List schedules (All for admin, Self only for regular users)',
  })
  @ApiResponse({ status: 200, type: [ScheduleResponseDto] })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('userId') userId?: string,
  ): Promise<ScheduleResponseDto[]> {
    const targetUserId = user.role === 'admin' ? userId : user.sub;
    const schedules = await this.schedulesService.findAll(targetUserId);
    return ScheduleResponseDto.fromEntities(schedules);
  }

  @Get('my-schedule')
  @ApiOperation({ summary: 'Get current user weekly schedule (Mon - Sun)' })
  @ApiResponse({ status: 200, type: [ScheduleResponseDto] })
  async findMySchedule(
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto[]> {
    const schedules = await this.schedulesService.findMySchedule(user.sub);
    return ScheduleResponseDto.fromEntities(schedules);
  }

  @Get('today')
  @ApiOperation({ summary: "Get current user's active shift schedule for today" })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  async findTodaySchedule(
    @CurrentUser() user: JwtPayload,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.findTodaySchedule(user.sub);
    if (!schedule) {
      throw new NotFoundException('No active schedule found for today');
    }
    return ScheduleResponseDto.fromEntity(schedule);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single schedule by ID' })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.findOne(id);
    if (user.role !== 'admin' && schedule.userId !== user.sub) {
      throw new ForbiddenException(
        'You do not have permission to view this schedule',
      );
    }
    return ScheduleResponseDto.fromEntity(schedule);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Assign/create shift schedule for a user' })
  @ApiResponse({ status: 201, type: ScheduleResponseDto })
  async create(
    @Body() createScheduleDto: CreateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.create(createScheduleDto);
    return ScheduleResponseDto.fromEntity(schedule);
  }

  @Post('bulk')
  @Roles('admin')
  @ApiOperation({
    summary: 'Admin only: Bulk assign weekly shift schedule (e.g. Mon-Fri in one call)',
  })
  @ApiResponse({ status: 201, type: [ScheduleResponseDto] })
  async createBulk(
    @Body() bulkDto: BulkCreateScheduleDto,
  ): Promise<ScheduleResponseDto[]> {
    const schedules = await this.schedulesService.createBulk(bulkDto);
    return ScheduleResponseDto.fromEntities(schedules);
  }

  @Post('bulk-users')
  @Roles('admin')
  @ApiOperation({
    summary: 'Admin only: Assign recurring weekly shift schedules to multiple employees simultaneously',
  })
  @ApiResponse({ status: 201 })
  async assignBulkUsers(
    @Body() bulkUsersDto: BulkAssignUsersScheduleDto,
  ) {
    const result = await this.schedulesService.assignBulkUsers(bulkUsersDto);
    return {
      ...result,
      schedules: ScheduleResponseDto.fromEntities(result.schedules),
    };
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Update schedule hours or shift name' })
  @ApiResponse({ status: 200, type: ScheduleResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    const schedule = await this.schedulesService.update(id, updateScheduleDto);
    return ScheduleResponseDto.fromEntity(schedule);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Admin only: Delete schedule assignment' })
  @ApiResponse({ status: 200 })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.schedulesService.remove(id);
  }
}
