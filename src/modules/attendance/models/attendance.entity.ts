export type AttendanceStatus = 'present' | 'late' | 'absent' | 'half_day' | 'on_leave';

export class Attendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkInTime: Date;
  checkOutTime?: Date | null;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
