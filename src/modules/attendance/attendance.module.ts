import { Module } from '@nestjs/common';
import { AttendanceController } from './controllers/attendance.controller.js';
import { AttendanceService } from './services/attendance.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
