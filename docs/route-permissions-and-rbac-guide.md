# Guide: Route Permissions & Role-Based Access Control (RBAC)

This guide maps all API routes across **TKPEX**, detailing what **Admins** and **Regular Users** can **Display (Read)**, **Create**, **Update**, and **Delete**.

---

## 1. System Roles Overview

The system defines two primary roles stored in the `User.role` field:

| Role | Target Persona | Scope of Access |
| :--- | :--- | :--- |
| **`admin`** | HR, Managers, System Administrators | **Full System Access**: Can view and manage all employees, backfill and correct attendance, edit schedules, and assign roles. |
| **`user`** | Regular Employees / Staff | **Self-Service Only**: Can check in, check out, view their own profile, and inspect their own attendance history and summary stats. |

---

## 2. Master Permissions Matrix

| Module | Route / Endpoint | HTTP | Operation Type | Regular `user` | `admin` |
| :--- | :--- | :---: | :--- | :---: | :---: |
| **Auth** | `/auth/login` | `POST` | Authenticate | ✅ Public | ✅ Public |
| **Auth** | `/auth/profile` | `GET` | **Display** Profile | ✅ Own profile | ✅ Own profile |
| **Auth** | `/auth/profile` | `PATCH` | **Update** Name / Email | ✅ Own profile | ✅ Own profile |
| **Auth** | `/auth/change-password` | `POST` | **Update** Password | ✅ Own password | ✅ Own password |
| **Auth** | `/auth/forgot-password` | `POST` | Request Reset Token | ✅ Public | ✅ Public |
| **Auth** | `/auth/reset-password` | `POST` | Reset with Token | ✅ Public | ✅ Public |
| **Users** | `/users` | `GET` | **Display** All Users | ❌ Forbidden | ✅ Full list |
| **Users** | `/users/:id` | `GET` | **Display** Single User | ❌ Forbidden | ✅ Any user |
| **Users** | `/users` | `POST` | **Create** New User | ❌ Forbidden | ✅ Any user |
| **Users** | `/users/:id` | `PATCH` | **Update** User Details | ❌ (Own only via profile) | ✅ Any user (name, email, role, password) |
| **Users** | `/users/:id` | `DELETE` | **Delete** User | ❌ Forbidden | ✅ Delete user (cascades data) |
| **Attendance** | `/attendance/today-status` | `GET` | **Display** Punch Status | ✅ Own status for today | ✅ Own status |
| **Attendance** | `/attendance/currently-in` | `GET` | **Display** Live Presence | ❌ Forbidden | ✅ Who is working right now |
| **Attendance** | `/attendance/check-in` | `POST` | **Create** Check-In | ✅ Own check-in | ✅ Any check-in |
| **Attendance** | `/attendance/:id/check-out` | `POST` | **Update** Check-Out | ✅ Own check-out | ✅ Any check-out |
| **Attendance** | `/attendance` | `GET` | **Display** Records | ✅ Own records (`?userId=my-id`) | ✅ All company records (or filtered) |
| **Attendance** | `/attendance/summary` | `GET` | **Display** Statistics | ✅ Own statistics | ✅ Company-wide or user statistics |
| **Attendance** | `/attendance/:id` | `GET` | **Display** Single Record | ✅ Own record only | ✅ Any record |
| **Attendance** | `/attendance` | `POST` | **Create** (Manual / Backfill) | ❌ Forbidden | ✅ Admin manual entry |
| **Attendance** | `/attendance/:id` | `PATCH` | **Update** (Adjust Timestamps) | ❌ Forbidden | ✅ Correct punches & status |
| **Attendance** | `/attendance/:id` | `DELETE` | **Delete** Record | ❌ Forbidden | ✅ Delete erroneous records |
| **Schedules** | `/schedules/my-schedule` | `GET` | **Display** Weekly Shifts | ✅ Own shifts (Mon–Sun) | ✅ Own shifts |
| **Schedules** | `/schedules/today` | `GET` | **Display** Today's Shift | ✅ Today's shift hours | ✅ Today's shift hours |
| **Schedules** | `/schedules` | `GET` | **Display** All Schedules | ✅ Own schedules | ✅ Full company roster |
| **Schedules** | `/schedules/:id` | `GET` | **Display** Single Shift | ✅ Own shift only | ✅ Any shift |
| **Schedules** | `/schedules` | `POST` | **Create** Shift Schedule | ❌ Forbidden | ✅ Assign shift to user |
| **Schedules** | `/schedules/:id` | `PATCH` | **Update** Shift Hours | ❌ Forbidden | ✅ Modify shift hours / status |
| **Schedules** | `/schedules/:id` | `DELETE` | **Delete** Shift Assignment | ❌ Forbidden | ✅ Delete shift |

---

## 3. Detailed Route Mapping by Module

### A. Authentication Module (`/auth`)

#### 1. Login
- **Endpoint**: `POST /auth/login`
- **Access**: Public (Unauthenticated)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password!@##"
  }
  ```
- **Returns**: JWT Access Token & User details:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "uuid-here",
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "role": "admin",
      "createdAt": "2026-10-28T..."
    }
  }
  ```

#### 2. Get Profile
- **Endpoint**: `GET /auth/profile`
- **Access**: Both `user` and `admin` (Requires `Bearer <token>`)
- **Display**: Returns current logged-in user profile derived from the token's `sub` claim. Sensitive fields like `password` are excluded.

#### 3. Update Profile (Name & Email)
- **Endpoint**: `PATCH /auth/profile`
- **Access**: Both `user` and `admin` (Requires `Bearer <token>`)
- **Request Body**:
  ```json
  {
    "name": "Bob Smith",
    "email": "bob.updated@example.com"
  }
  ```
- **Returns**: Updated user profile. Checks email uniqueness and prevents privilege escalation (cannot modify `role`).

#### 4. Change Password
- **Endpoint**: `POST /auth/change-password`
- **Access**: Both `user` and `admin` (Requires `Bearer <token>`)
- **Request Body**:
  ```json
  {
    "currentPassword": "password!@##",
    "newPassword": "newSecretPassword123!"
  }
  ```
- **Returns**: `{ "message": "Password updated successfully" }`. Validates current password against stored Argon2 hash and enforces minimum length of 6 characters.

#### 5. Forgot Password
- **Endpoint**: `POST /auth/forgot-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "bob@example.com"
  }
  ```
- **Returns**: Generates a 15-minute signed JWT password reset token (`{ "message": "...", "resetToken": "..." }`).

#### 6. Reset Password
- **Endpoint**: `POST /auth/reset-password`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "resetToken": "eyJhbGci...",
    "newPassword": "brandNewPassword123!"
  }
  ```
- **Returns**: `{ "message": "Password has been successfully reset" }`. Validates token signature and expiration, then updates password in PostgreSQL with a new Argon2 hash.

---

### B. Attendance Module (`/attendance`)
*Protected by `AuthGuard`*

#### 1. Display (Read) Operations

| Endpoint | Regular `user` Permissions | `admin` Permissions |
| :--- | :--- | :--- |
| **`GET /attendance/today-status`** | **Allowed**: Inspects punch state for today. Returns `{ hasCheckedIn, hasCheckedOut, canCheckIn, canCheckOut, record }`. | Same (inspects admin's own punch state). |
| **`GET /attendance/currently-in`** | ❌ **Forbidden** | **Allowed**: Returns list of all employees currently working on-site right now (`date = today` and `checkOutTime IS NULL`). |
| **`GET /attendance/dashboard`** | ❌ **Forbidden** | **Allowed**: Executive daily HR pulse metrics: `{ totalEmployees, checkedInToday, currentlyWorking, lateToday, onLeaveToday, halfDayToday, notPunchedYet }`. |
| **`GET /attendance/timesheet`** | **Allowed**: Returns their own calculated timesheet summary with total hours worked, overtime (>8h/day), average daily hours, and day status counts. Query params: `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`. | **Allowed**: Displays their own or any employee's timesheet calculation via `?userId=...&startDate=...&endDate=...`. |
| **`GET /attendance/export`** | **Allowed**: Downloads personal attendance & work hours as a standard RFC-4180 CSV file for dates `?startDate=...&endDate=...`. | **Allowed**: Exports company-wide or employee-specific attendance data as a downloadable `.csv` file for payroll. |
| **`GET /attendance`** | Must filter by their own user ID (`/attendance?userId={myId}`). Displays their historical punch records. | Can view **all** company records, or filter by specific employee (`?userId=...`) and date (`?date=2026-10-28`). |
| **`GET /attendance/summary`** | Displays their personal summary count (e.g. `total: 20`, `present: 18`, `late: 2`). | Displays whole-company attendance statistics, or any individual employee's summary via `?userId=...`. |
| **`GET /attendance/:id`** | Can view details of their own attendance record only. | Can view details of any attendance record across the organization. |

#### 2. Create Operations

| Endpoint | Regular `user` Permissions | `admin` Permissions |
| :--- | :--- | :--- |
| **`POST /attendance/check-in`** | **Allowed**: Self check-in for the workday.<br/>**Body**: `{ "userId"?: "my-id", "notes"?: "On site" }`<br/>*Server sets `checkInTime = now()` automatically.* | Allowed (or check in on behalf of employees). |
| **`POST /attendance/leave`** | **Allowed**: Submit leave or half-day request.<br/>**Body**: `{ "date": "2026-11-15", "status"?: "on_leave", "notes": "Vacation / Medical" }`<br/>*Automatically registers employee leave without requiring physical check-in punches.* | Allowed (can request or record leave for any employee). |
| **`POST /attendance`** | ❌ **Forbidden**: Regular users cannot manually insert past records. | **Allowed**: Backfill or administrative correction.<br/>**Body**: `{ "userId": "...", "date": "2026-10-25", "checkInTime": "...", "status": "present" }` |

#### 3. Update Operations

| Endpoint | Regular `user` Permissions | `admin` Permissions |
| :--- | :--- | :--- |
| **`POST /attendance/:id/check-out`** | **Allowed**: Punch out when leaving.<br/>**Body**: `{ "notes": "Day complete" }`<br/>*Server sets `checkOutTime = now()` automatically.* | Same as user. |
| **`PATCH /attendance/:id`** | ❌ **Forbidden**: Regular users cannot modify timestamps or attendance status. | **Allowed**: HR / Admin adjustment.<br/>**Body**: `{ "status": "late", "checkInTime": "...", "checkOutTime": "...", "notes": "Approved override" }` |

#### 4. Delete Operations

| Endpoint | Regular `user` Permissions | `admin` Permissions |
| :--- | :--- | :--- |
| **`DELETE /attendance/:id`** | ❌ **Forbidden** | **Allowed**: Remove erroneous, duplicate, or corrupted punch records. |

---

### C. Users Module (`/users`)
*Intended for Admin Management*

| Endpoint | HTTP | Allowed Role | Purpose | What is Sent / Returned |
| :--- | :---: | :---: | :--- | :--- |
| `/users` | `GET` | `admin` | **Display** full user roster | Returns array of all employees with roles and creation dates. |
| `/users/:id` | `GET` | `admin` | **Display** single employee | Returns user details by UUID. |
| `/users` | `POST` | `admin` | **Create** new employee account | **Body**: `{ name, email, password, role? }`<br/>Password is automatically hashed with Argon2id. |
| `/users/:id` | `PATCH` | `admin` | **Update** user details or role | **Body**: `{ name?, email?, password?, role? }`<br/>Allows changing role between `user` and `admin`, or resetting password. |
| `/users/:id` | `DELETE` | `admin` | **Delete** employee account | Deletes user record and cascades deletion to linked attendance records. |

---

### D. Schedules Module (`/schedules`)
*Connected to PostgreSQL `schedules` table with day-of-week shift tracking*

| Endpoint | HTTP | Allowed Role | Purpose | Details |
| :--- | :---: | :---: | :--- | :--- |
| `/schedules/my-schedule` | `GET` | `user` & `admin` | **Display** my weekly shifts (Mon–Sun) | Returns array of active shifts with day names (e.g. Monday 09:00 - 17:00). |
| `/schedules/today` | `GET` | `user` & `admin` | **Display** my active shift for today | Computes current day of week and returns expected hours and shift name. |
| `/schedules` | `GET` | `admin` (or own) | **Display** all schedules | Lists all company shift assignments, filterable by `?userId=...`. |
| `/schedules/:id` | `GET` | `admin` (or own) | **Display** single shift by ID | Returns shift details. |
| `/schedules` | `POST` | `admin` | **Create** / assign shift | **Body**: `{ userId, dayOfWeek (1..7), startTime ("08:00"), endTime ("16:00"), shiftName? }`<br/>*Upserts shift if already assigned on that day.* |
| `/schedules/bulk` | `POST` | `admin` | **Bulk assign** recurring weekly shifts | **Body**: `{ userId, workDays: [1,2,3,4,5], startTime: "09:00", endTime: "17:00", shiftName?: "Standard Shift" }`<br/>*Upserts weekly schedules for single user.* |
| `/schedules/bulk-users` | `POST` | `admin` | **Team / Cohort assign** weekly shifts | **Body**: `{ userIds: ["..."], workDays: [1,2,3,4,5], startTime: "09:00", endTime: "17:00", shiftName?: "Cohort Shift" }`<br/>*Upserts weekly schedules across multiple employees at once.* |
| `/schedules/:id` | `PATCH` | `admin` | **Update** shift hours/status | **Body**: `{ startTime?, endTime?, shiftName?, isActive? }` |
| `/schedules/:id` | `DELETE` | `admin` | **Delete** shift assignment | Removes shift schedule from database. |

---

## 4. How to Enforce Role Restrictions in Code

To prevent a regular `user` from accessing `admin`-only routes, implement a `RolesGuard`:

### 1. The `@Roles()` Decorator
```typescript
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### 2. The `RolesGuard`
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    return true;
  }
}
```

### 3. Applying to Controllers or Routes
```typescript
@UseGuards(AuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

---

## 5. Summary Matrix for Quick Reference

```text
               +-------------------------------------------+
               |                WHO CAN DO WHAT?           |
+--------------+---------------------+---------------------+
| OPERATION    | Regular USER        | ADMIN               |
+--------------+---------------------+---------------------+
| Display      | Own profile         | All users           |
|              | Own attendance      | All attendance      |
|              | Own summary stats   | All company summary |
+--------------+---------------------+---------------------+
| Create       | Check-in punch      | New user accounts   |
|              |                     | Manual attendance   |
+--------------+---------------------+---------------------+
| Update       | Check-out punch     | Change roles        |
|              |                     | Correct timestamps  |
|              |                     | Adjust status       |
+--------------+---------------------+---------------------+
| Delete       | None                | Delete users        |
|              |                     | Delete attendances  |
+--------------+---------------------+---------------------+
```
