export class Schedule {
  id: string;
  userId: string;
  dayOfWeek: number; // 1 = Monday ... 7 = Sunday
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  shiftName?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
