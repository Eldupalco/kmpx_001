export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'on_leave';

export class Attendance {
  id: string;
  userId: string;
  scheduleId?: string | null;
  date: string; // YYYY-MM-DD
  checkInTime: Date;
  checkOutTime?: Date | null;
  status: AttendanceStatus | string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

