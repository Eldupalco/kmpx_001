import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './modules/users/users.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { PrismaModule } from './database/prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, UsersModule, AttendanceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

