import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller.js';
import { AttendanceService } from './services/attendance.service.js';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
