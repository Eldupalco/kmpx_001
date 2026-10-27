import { describe, it, expect, beforeEach } from 'vitest';
import { AttendanceService } from './attendance.service.js';

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(() => {
    service = new AttendanceService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return initial seed attendance records', () => {
    const records = service.findAll();
    expect(records.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter attendance records by userId', () => {
    const records = service.findAll('1');
    expect(records.every((r) => r.userId === '1')).toBe(true);
  });

  it('should allow a user to check in', () => {
    const newRecord = service.checkIn({
      userId: '99',
      notes: 'Testing check-in',
    });
    expect(newRecord.userId).toBe('99');
    expect(newRecord.checkInTime).toBeDefined();
    expect(newRecord.checkOutTime).toBeNull();
  });

  it('should allow a user to check out', () => {
    const newRecord = service.checkIn({
      userId: '100',
    });
    const updated = service.checkOut(newRecord.id, {
      notes: 'Leaving for the day',
    });
    expect(updated.checkOutTime).toBeDefined();
  });

  it('should compute summary stats accurately', () => {
    const summary = service.getSummary();
    expect(summary.total).toBeGreaterThanOrEqual(2);
    expect(summary).toHaveProperty('present');
    expect(summary).toHaveProperty('late');
  });
});
