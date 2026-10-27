import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed into PostgreSQL...');

  // 1. Clean existing records (in reverse dependency order)
  await prisma.attendance.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: 'hashed_password_123',
      role: 'admin',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: 'hashed_password_456',
      role: 'user',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Davis',
      email: 'charlie@example.com',
      password: 'hashed_password_789',
      role: 'user',
    },
  });

  console.log(` Created 3 users: Alice (${alice.id}), Bob (${bob.id}), Charlie (${charlie.id})`);

  // 3. Create Schedules per User (Monday=1 through Friday=5)
  const workDays = [1, 2, 3, 4, 5]; // Mon - Fri
  const aliceSchedules = {};
  const bobSchedules = {};
  const charlieSchedules = {};

  // Alice: Morning Shift (08:00 - 16:00)
  for (const day of workDays) {
    const s = await prisma.schedule.create({
      data: {
        userId: alice.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '16:00',
        shiftName: 'Morning Shift',
        isActive: true,
      },
    });
    aliceSchedules[day] = s.id;
  }

  // Bob: Standard Shift (09:00 - 17:00)
  for (const day of workDays) {
    const s = await prisma.schedule.create({
      data: {
        userId: bob.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        shiftName: 'Standard Shift',
        isActive: true,
      },
    });
    bobSchedules[day] = s.id;
  }

  // Charlie: Evening Shift (13:00 - 21:00)
  for (const day of workDays) {
    const s = await prisma.schedule.create({
      data: {
        userId: charlie.id,
        dayOfWeek: day,
        startTime: '13:00',
        endTime: '21:00',
        shiftName: 'Evening Shift',
        isActive: true,
      },
    });
    charlieSchedules[day] = s.id;
  }

  console.log(' Created 15 weekly schedules (5 days x 3 users)');

  // 4. Create Sample Attendance records linked to User AND Schedule!
  // Note: 2026-10-26 is Monday (day 1), 2026-10-27 is Tuesday (day 2)
  await prisma.attendance.createMany({
    data: [
      {
        userId: alice.id,
        scheduleId: aliceSchedules[1], // Monday shift
        date: '2026-10-26',
        checkInTime: new Date('2026-10-26T07:58:00.000Z'),
        checkOutTime: new Date('2026-10-26T16:05:00.000Z'),
        status: 'present',
        notes: 'Arrived early for team sync',
      },
      {
        userId: bob.id,
        scheduleId: bobSchedules[1], // Monday shift
        date: '2026-10-26',
        checkInTime: new Date('2026-10-26T09:22:00.000Z'),
        checkOutTime: new Date('2026-10-26T17:15:00.000Z'),
        status: 'late',
        notes: 'Subway signal delay',
      },
      {
        userId: charlie.id,
        scheduleId: charlieSchedules[1], // Monday shift
        date: '2026-10-26',
        checkInTime: new Date('2026-10-26T12:55:00.000Z'),
        checkOutTime: new Date('2026-10-26T21:02:00.000Z'),
        status: 'present',
        notes: 'On schedule',
      },
      {
        userId: alice.id,
        scheduleId: aliceSchedules[2], // Tuesday shift
        date: '2026-10-27',
        checkInTime: new Date('2026-10-27T08:00:00.000Z'),
        checkOutTime: null,
        status: 'present',
        notes: 'Checked in today',
      },
      {
        userId: bob.id,
        scheduleId: bobSchedules[2], // Tuesday shift
        date: '2026-10-27',
        checkInTime: new Date('2026-10-27T08:50:00.000Z'),
        checkOutTime: null,
        status: 'present',
        notes: 'Checked in today',
      },
    ],
  });

  console.log(' Created 5 sample attendance records directly linked to Schedules');
  console.log(' Database seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
