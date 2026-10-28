import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { UsersModule } from './modules/users/users.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SchedulesModule } from './modules/schedules/schedules.module.js';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './database/prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AttendanceModule,
    AuthModule,
    SchedulesModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }

