# Prisma Complete End-to-End Migration Guide
## From Fresh Installation to Managing Existing Databases with Manual Migrations

This guide provides a complete, step-by-step blueprint covering everything from initial installation down to managing and migrating an existing PostgreSQL database using Prisma ORM.

Every single step provides **both the generic syntax command and the exact real-world command** executed in this project (`TKPEX`).

---

## Command Cheat Sheet: Syntax vs. Actual Command

| Task | Generic Syntax Command | Actual Project Command (`TKPEX`) |
| :--- | :--- | :--- |
| **Install Prisma (Dev)** | `pnpm add -D prisma@<version>` | `pnpm add -D prisma@^6.4.1` |
| **Install Prisma Client** | `pnpm add @prisma/client@<version>` | `pnpm add @prisma/client@^6.4.1` |
| **Check Version** | `npx prisma -v` | `npx prisma -v` |
| **Pull from Existing DB** | `npx prisma db pull` | `npx prisma db pull` |
| **Generate Schema Diff** | `npx prisma migrate diff --from-empty --to-schema-datamodel <path> --script > <file>` | `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql` |
| **Mark Migration Applied** | `npx prisma migrate resolve --applied <migration_name>` | `npx prisma migrate resolve --applied 0_init` |
| **Draft Migration (No Apply)** | `npx prisma migrate dev --create-only --name <name>` | `npx prisma migrate dev --create-only --name add_schedules_per_user` |
| **Apply Migration (Dev)** | `npx prisma migrate dev --name <name>` | `npx prisma migrate dev --name add_schedules_per_user` |
| **Deploy Migration (Prod)** | `npx prisma migrate deploy` | `npx prisma migrate deploy` |
| **Check Migration Status** | `npx prisma migrate status` | `npx prisma migrate status` |
| **Generate TS Client** | `npx prisma generate` | `npx prisma generate` |
| **Seed Database** | `npx prisma db seed` | `npx prisma db seed` |

---

## Phase 1: Installation & Initial Setup

### Step 1.1: Install Dependencies
Install Prisma CLI as a development dependency and `@prisma/client` as a runtime dependency.

- **Syntax Command**:
  ```powershell
  <package-manager> add -D prisma@<version>
  <package-manager> add @prisma/client@<version>
  ```
- **Actual Project Command**:
  ```powershell
  pnpm add -D prisma@^6.4.1
  pnpm add @prisma/client@^6.4.1
  ```
- **Approve pnpm build scripts** (if prompted by pnpm v10+):
  ```powershell
  pnpm approve-builds --all
  ```

---

### Step 1.2: Configure Environment Variables (`.env`)
Prisma reads your database connection string from `.env`. Special characters in passwords (such as `@`, `#`, `$`, `%`) **must be percent-encoded** so standard URL parsers do not fail (e.g. `@` becomes `%40`).

- **Syntax**:
  ```ini
  DATABASE_URL="postgresql://<USER>:<ENCODED_PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=<SCHEMA>"
  ```
- **Actual Project Config ([`.env`](file:///d:/Dev/TKPEX/.env))**:
  ```ini
  DATABASE_URL="postgresql://postgres:%402020@localhost:5432/tkpex?schema=public"
  PORT=3000
  NODE_ENV=development
  ```

---

### Step 1.3: Initialize Prisma Configuration
- **Syntax Command**:
  ```powershell
  npx prisma init
  ```
- **Actual Project File ([`prisma/schema.prisma`](file:///d:/Dev/TKPEX/prisma/schema.prisma))**:
  ```prisma
  generator client {
    provider = "prisma-client-js"
  }

  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```

---

## Phase 2: Connecting to an Existing Database

When connecting Prisma to an already populated PostgreSQL database, there are two distinct scenarios:

### Approach A: Reverse Engineering an Existing Database (`db pull`)
Use this when you have pre-existing database tables created by raw SQL, another framework, or another team, and you want Prisma to automatically write `schema.prisma` for you.

1. **Syntax Command**:
   ```powershell
   npx prisma db pull
   ```
2. **Actual Project Command**:
   ```powershell
   npx prisma db pull
   ```
   *Prisma connects to `localhost:5432/tkpex`, reads table definitions, and writes all models into `prisma/schema.prisma` automatically.*
3. **Generate TypeScript Client**:
   ```powershell
   npx prisma generate
   ```

---

### Approach B: Baselining an Existing Database (Crucial for `prisma migrate`)

> [!CAUTION]
> If a database already has tables and you run `npx prisma migrate dev`, Prisma will warning:
> `"The current database is not managed by Prisma Migrate... We need to reset the database. All data will be lost."`
> **Baselining informs Prisma that existing tables are already accounted for.**

#### Step 1: Create the baseline migration folder
- **Syntax Command**:
  ```powershell
  mkdir prisma/migrations/<baseline_folder_name>
  ```
- **Actual Project Command**:
  ```powershell
  mkdir prisma/migrations/0_init
  ```

#### Step 2: Generate the SQL representation of the current schema
Use `prisma migrate diff` to generate the raw SQL matching your current models:
- **Syntax Command**:
  ```powershell
  npx prisma migrate diff --from-empty --to-schema-datamodel <schema_path> --script > <output_path>
  ```
- **Actual Project Command**:
  ```powershell
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
  ```

> [!IMPORTANT]
> **UTF-8 BOM Warning**: On Windows PowerShell, redirecting output (`>`) can output UTF-16 or UTF-8 with BOM. PostgreSQL's parser fails on BOM characters (`\uFEFF`). Ensure the file is saved as standard UTF-8 without BOM.

#### Step 3: Mark baseline as applied without running it
- **Syntax Command**:
  ```powershell
  npx prisma migrate resolve --applied <migration_name>
  ```
- **Actual Project Command**:
  ```powershell
  npx prisma migrate resolve --applied 0_init
  ```
- **Verify status**:
  ```powershell
  npx prisma migrate status
  # Expected Output: Database schema is up to date!
  ```

---

## Phase 3: Executing Migrations

### Scenario 1: Standard Migration (Adding New Tables / Columns)

Here is how we added the `Schedule` model to [`prisma/schema.prisma`](file:///d:/Dev/TKPEX/prisma/schema.prisma):

#### Step 1: Add the model to `schema.prisma`
```prisma
model Schedule {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dayOfWeek Int      // 1 = Monday ... 7 = Sunday
  startTime String   // e.g. "08:00"
  endTime   String   // e.g. "16:00"
  shiftName String?  // e.g. "Morning Shift"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("schedules")
}
```

#### Step 2: Run migration command
- **Syntax Command**:
  ```powershell
  npx prisma migrate dev --name <migration_descriptive_name>
  ```
- **Actual Project Command**:
  ```powershell
  npx prisma migrate dev --name add_schedules_per_user
  ```
- **What Prisma Executed Under the Hood**:
  Prisma created [`prisma/migrations/20261027141438_add_schedules_per_user/migration.sql`](file:///d:/Dev/TKPEX/prisma/migrations/20261027141438_add_schedules_per_user/migration.sql) containing:
  ```sql
  CREATE TABLE "schedules" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "dayOfWeek" INTEGER NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "shiftName" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
  );
  ALTER TABLE "schedules" ADD CONSTRAINT "schedules_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  ```

---

### Scenario 2: Manual Migration with Custom SQL Review (`--create-only`)

Use this whenever you need to **rename a column safely without data loss**, add raw SQL views, or backfill rows before setting `NOT NULL`.

#### Step 1: Generate draft without executing
- **Syntax Command**:
  ```powershell
  npx prisma migrate dev --create-only --name <name>
  ```
- **Actual Project Command**:
  ```powershell
  npx prisma migrate dev --create-only --name safe_column_rename
  ```

#### Step 2: Manually edit the generated `migration.sql`
Open the generated file inside `prisma/migrations/<timestamp>_<name>/migration.sql` and replace dangerous `DROP` statements with safe PostgreSQL DDL:
```sql
-- DANGEROUS AUTO-GENERATED:
-- ALTER TABLE "attendances" DROP COLUMN "notes";
-- ALTER TABLE "attendances" ADD COLUMN "remarks" TEXT;

-- SAFE MANUAL FIX:
ALTER TABLE "attendances" RENAME COLUMN "notes" TO "remarks";
```

#### Step 3: Apply your custom migration
- **Syntax & Actual Command**:
  ```powershell
  npx prisma migrate dev
  ```

---

### Scenario 3: Deploying in Production / Staging / CI/CD

> [!WARNING]
> **Never run `prisma migrate dev` in production.** `prisma migrate dev` requires a shadow database and prompts interactively if it detects schema drift.

- **Syntax & Actual Command**:
  ```powershell
  npx prisma migrate deploy
  ```
- Applies all unapplied migration files in chronological order non-interactively.

---

## Phase 4: Database Seeding (Sample Data)

### Step 4.1: Write the Seed Script ([`prisma/seed.js`](file:///d:/Dev/TKPEX/prisma/seed.js))
```javascript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clean existing rows
  await prisma.schedule.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const alice = await prisma.user.create({
    data: { name: 'Alice Johnson', email: 'alice@example.com', password: 'hashed_password_123', role: 'admin' },
  });
  const bob = await prisma.user.create({
    data: { name: 'Bob Smith', email: 'bob@example.com', password: 'hashed_password_456', role: 'user' },
  });

  // Create Schedules
  for (const day of [1, 2, 3, 4, 5]) {
    await prisma.schedule.create({
      data: { userId: alice.id, dayOfWeek: day, startTime: '08:00', endTime: '16:00', shiftName: 'Morning Shift' },
    });
    await prisma.schedule.create({
      data: { userId: bob.id, dayOfWeek: day, startTime: '09:00', endTime: '17:00', shiftName: 'Standard Shift' },
    });
  }

  // Create Sample Attendance
  await prisma.attendance.create({
    data: { userId: alice.id, date: '2026-10-27', checkInTime: new Date(), status: 'present', notes: 'On schedule' },
  });
}

main().finally(() => prisma.$disconnect());
```

---

### Step 4.2: Register Seed Command in [`package.json`](file:///d:/Dev/TKPEX/package.json)
```json
"prisma": {
  "seed": "node prisma/seed.js"
}
```

---

### Step 4.3: Execute Seeder
- **Syntax & Actual Command**:
  ```powershell
  npx prisma db seed
  ```

---

## Phase 5: Actual Live PostgreSQL Data (`localhost:5432 / tkpex`)

Below are the exact live records in your PostgreSQL instance after migration and seeding:

### 1. Migrations History Table (`_prisma_migrations`)
| id | migration_name | finished_at | status |
| :--- | :--- | :--- | :--- |
| `298e1630-bd62-4f6e-ae2e-b39160b8a9b9` | `0_init` | `2026-10-27 14:14:29` | Applied (Baseline) |
| `039122ea-a74a-4fba-9caf-6623a6456370` | `20261027141438_add_schedules_per_user` | `2026-10-27 14:14:38` | Applied (Migration) |

### 2. Users Table (`users`)
| id | name | email | role |
| :--- | :--- | :--- | :--- |
| `a9515136-7466-4a2b-89bd-a6fddd548a2f` | Alice Johnson | alice@example.com | admin |
| `0c0aec29-0d55-45a0-afae-f09e9e4ec2e1` | Bob Smith | bob@example.com | user |
| `157c4b66-e2e2-4c1c-898a-c819a69b5db3` | Charlie Davis | charlie@example.com | user |

### 3. Schedules Table (`schedules` - sample rows)
| id | userId | dayOfWeek | shiftName | startTime | endTime | isActive |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `a558f658...` | `0c0aec29...` (Bob) | 1 (Mon) | Standard Shift | 09:00 | 17:00 | true |
| `3aa1004b...` | `0c0aec29...` (Bob) | 2 (Tue) | Standard Shift | 09:00 | 17:00 | true |
| `2312f13c...` | `0c0aec29...` (Bob) | 3 (Wed) | Standard Shift | 09:00 | 17:00 | true |
| `7174740f...` | `157c4b66...` (Charlie) | 1 (Mon) | Evening Shift | 13:00 | 21:00 | true |
| *(+11 more rows)* | *(Alice, Bob, Charlie)* | 1 to 5 (Mon-Fri) | Morning / Standard / Evening | *(per shift)* | *(per shift)* | true |

### 4. Attendances Table (`attendances`)
| id | userId | date | checkInTime | checkOutTime | status | notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `6bf0655e...` | Bob Smith | 2026-10-27 | 08:50:00 | *null* | present | Checked in today |
| `420e3927...` | Alice Johnson | 2026-10-27 | 08:00:00 | *null* | present | Checked in today |
| `aa7ed77d...` | Bob Smith | 2026-10-26 | 09:22:00 | 17:15:00 | late | Subway signal delay |
| `431ebe67...` | Charlie Davis | 2026-10-26 | 12:55:00 | 21:02:00 | present | On schedule |
| `25ac1455...` | Alice Johnson | 2026-10-26 | 07:58:00 | 16:05:00 | present | Arrived early for team sync |

---

## Phase 6: Navicat / pgAdmin SQL Queries for Direct Verification

Open a Query window in Navicat on database **`tkpex`** and run:

```sql
-- 1. View all users and their weekly shifts
SELECT 
  u.name, 
  u.email, 
  s."dayOfWeek", 
  s."shiftName", 
  s."startTime", 
  s."endTime"
FROM users u
JOIN schedules s ON u.id = s."userId"
ORDER BY u.name, s."dayOfWeek";

-- 2. Compare actual check-in against scheduled shift start time
SELECT 
  u.name,
  a.date,
  TO_CHAR(a."checkInTime", 'HH24:MI') as actual_checkin,
  s."startTime" as scheduled_start,
  a.status,
  a.notes
FROM attendances a
JOIN users u ON a."userId" = u.id
LEFT JOIN schedules s ON s."userId" = u.id 
  AND s."dayOfWeek" = EXTRACT(ISODOW FROM a."checkInTime"::date)
ORDER BY a.date DESC, u.name;

-- 3. Inspect Prisma migration history
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations"
ORDER BY finished_at ASC;
```
