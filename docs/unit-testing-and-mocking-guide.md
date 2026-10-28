# Guide: Unit Testing & Prisma Mocking with Vitest

This guide explains how unit testing works in **TKPEX**, how to mock database calls with **Prisma**, and how to write and run fast, isolated tests for your services and guards.

---

## 1. Why We Unit Test with Mocks

In unit tests, we test **business logic in isolation**. We **do not** connect to a real PostgreSQL database:
- **Fast**: Tests run in milliseconds instead of seconds.
- **Isolated**: Tests do not corrupt or depend on database rows.
- **Reliable**: Tests never fail due to network or connection errors.

```mermaid
flowchart LR
    subgraph Unit Test Environment
        Test["Test Spec (Vitest)"] -->|Calls method| Service["Service under test"]
        Service -->|Calls prisma.user.findUnique()| Mock["prismaMock (vi.fn() in-memory)"]
        Mock -->|Returns fake data instantly| Service
        Service -->|Returns result| Test
    end
```

---

## 2. How to Run Tests

### Run all tests in the project
```bash
npm test
# or
pnpm test
```

### Run a single test file
Pass the filename after `--`:
```bash
npm test -- attendance.service.spec.ts
# or
pnpm test attendance.service.spec.ts
# or direct with Vitest:
npx vitest run src/modules/attendance/services/attendance.service.spec.ts
```

### Run in Watch Mode (Auto-rerun on file changes)
```bash
npx vitest attendance.service.spec.ts
# or
npm run test:watch -- attendance.service.spec.ts
```

### Run with Code Coverage
```bash
npm run test:cov
```

---

## 3. Dissecting `attendance.service.spec.ts`

Here is how [`src/modules/attendance/services/attendance.service.spec.ts`](file:///d:/Dev/TKPEX/src/modules/attendance/services/attendance.service.spec.ts) is constructed step-by-step:

### Step 1: Imports
Import test utilities from `vitest` instead of Jest:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttendanceService } from './attendance.service.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';
```

### Step 2: Define Variables and Fake Data
```typescript
describe('AttendanceService', () => {
  let service: AttendanceService;
  let prismaMock: Partial<PrismaService>;

  const mockAttendance = {
    id: 'att-1',
    userId: 'user-1',
    date: '2026-10-28',
    checkInTime: new Date('2026-10-28T09:00:00Z'),
    checkOutTime: null,
    status: 'present',
    notes: 'On time',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
```

### Step 3: Setup Fresh Mocks before Each Test (`beforeEach`)
`beforeEach()` runs before every single `it(...)` block, ensuring test isolation:

```typescript
  beforeEach(() => {
    prismaMock = {
      user: {
        // Mock user lookup
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'user-1') {
            return Promise.resolve({ id: 'user-1', name: 'Test User' });
          }
          return Promise.resolve(null);
        }),
      } as any,

      attendance: {
        // Mock finding attendance list
        findMany: vi.fn().mockResolvedValue([mockAttendance]),

        // Mock finding one record
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'att-1') return Promise.resolve(mockAttendance);
          return Promise.resolve(null);
        }),

        // Mock creating a record
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'new-att-id',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),

        // Mock updating a record
        update: vi.fn().mockImplementation(({ where, data }) =>
          Promise.resolve({
            ...mockAttendance,
            ...data,
            id: where.id,
            updatedAt: new Date(),
          }),
        ),
      } as any,
    };

    // Instantiate service with the fake Prisma mock
    service = new AttendanceService(prismaMock as PrismaService);
  });
```

### Step 4: Write Test Cases (`it`)

#### Positive Case: Check In
```typescript
  it('should allow a user to check in', async () => {
    const result = await service.checkIn({
      userId: 'user-1',
      notes: 'Morning shift',
    });

    expect(result).toBeDefined();
    expect(result.userId).toBe('user-1');
    expect(result.status).toBe('present');
    expect(prismaMock.attendance!.create).toHaveBeenCalledTimes(1);
  });
```

#### Negative Case: Error Handling
```typescript
  it('should throw NotFoundException if user does not exist', async () => {
    await expect(
      service.checkIn({ userId: 'unknown-id' }),
    ).rejects.toThrow('User with ID "unknown-id" not found');
  });
```

---

## 4. Vitest Mocking Patterns in This Repository

### 1. Mocking a Simple Return Value (`mockResolvedValue`)
Use when the method always returns the same value:
```typescript
prismaMock.attendance!.findFirst = vi.fn().mockResolvedValue(null);
```

### 2. Mocking with Arguments (`mockImplementation`)
Use when you need conditional logic based on what was passed to the method:
```typescript
prismaMock.user!.findUnique = vi.fn().mockImplementation(({ where }) => {
  if (where.id === '1') return Promise.resolve({ id: '1', name: 'Alice' });
  return Promise.resolve(null);
});
```

### 3. Overriding a Mock for a Single Test
You can override a mock inside a specific `it` block:
```typescript
it('should throw if already checked out', async () => {
  // Override mock specifically for this test
  prismaMock.attendance!.findUnique = vi.fn().mockResolvedValue({
    ...mockAttendance,
    checkOutTime: new Date(), // Already checked out!
  });

  await expect(service.checkOut('att-1', {})).rejects.toThrow(
    'already has a check-out time',
  );
});
```

### 4. Mocking External Functions with `vi.spyOn`
When testing functions that call utility functions (like Argon2 in [`src/common/utils/password.util.ts`](file:///d:/Dev/TKPEX/src/common/utils/password.util.ts)):
```typescript
import * as passwordUtil from '../../../common/utils/password.util.js';

// Inside test:
vi.spyOn(passwordUtil, 'verifyPassword').mockResolvedValue(true);
```

---

## 5. Common Vitest Assertions Cheat Sheet

| Assertion | Example | Usage |
| :--- | :--- | :--- |
| `toBeDefined()` | `expect(result).toBeDefined()` | Checks that value is not undefined |
| `toBe(val)` | `expect(result.status).toBe('present')` | Exact primitive equality (`===`) |
| `toEqual(obj)` | `expect(user).toEqual(expectedObj)` | Deep object comparison |
| `toBeNull()` | `expect(result.checkOutTime).toBeNull()` | Value is null |
| `toHaveBeenCalledTimes(n)` | `expect(mockFn).toHaveBeenCalledTimes(1)` | Verifies function execution count |
| `toHaveBeenCalledWith(...)` | `expect(mockFn).toHaveBeenCalledWith({ sub: '1' })` | Verifies arguments passed to mock |
| `rejects.toThrow(...)` | `await expect(promise).rejects.toThrow(NotFoundException)` | Verifies expected error was thrown |

---

## 6. Template for a New Service Test

Copy and adapt this template when creating `[feature].service.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { PrismaService } from '../../../database/prisma/prisma.service.js';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let prismaMock: Partial<PrismaService>;

  const mockItem = {
    id: 'sched-1',
    name: 'Shift A',
    createdAt: new Date(),
  };

  beforeEach(() => {
    prismaMock = {
      schedule: {
        findMany: vi.fn().mockResolvedValue([mockItem]),
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'sched-1') return Promise.resolve(mockItem);
          return Promise.resolve(null);
        }),
        create: vi.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'sched-new', ...data }),
        ),
      } as any,
    };

    service = new SchedulesService(prismaMock as PrismaService);
  });

  it('should return all schedules', async () => {
    const results = await service.findAll();
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Shift A');
  });

  it('should throw NotFoundException if schedule does not exist', async () => {
    await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
  });
});
```
