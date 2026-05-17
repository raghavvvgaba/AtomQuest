# Context

This file captures the current MVP implementation context for quick reference.
It is separate from `MVP.md`, which remains the main MVP scope document.

## Pages and Routes

- `/` - role switcher for Employee, Manager, and Admin demo entry.
- `/employee` - employee dashboard with current goal-sheet status and entry points.
- `/employee/goals` - employee goal sheet editor and submission page.
- `/employee/check-ins` - employee quarterly check-in page.
- `/manager` - manager dashboard for direct-report goal sheets and check-ins.
- `/manager/goals/[employeeId]` - manager review page for an employee goal sheet.
- `/manager/check-ins` - manager check-in review queue.
- `/manager/check-ins/[employeeId]` - manager check-in detail and review page.
- `/admin` - admin dashboard with basic MVP counts.
- `/admin/unlock` - admin page to unlock approved goal sheets.
- `/admin/reports` - admin planned-vs-actual report table.
- `/admin/audit-log` - admin simple audit log page.

## Data Models

These are the minimal in-memory MVP models currently used by the app.
They are structured so they can later be moved to a real PostgreSQL schema with Neon.

### User

Purpose: stores demo users across the three MVP roles and the basic reporting relationship.

Fields:

- `id`
- `name`
- `role` (`employee | manager | admin`)
- `managerId` nullable

Notes:

- `managerId` links an employee to their manager.
- Manager and Admin users usually have `managerId: null`.

### GoalSheet

Purpose: stores one employee's active goal-sheet container.

Fields:

- `id`
- `employeeId`
- `status` (`draft | submitted | returned | approved | unlocked`)
- `managerComment` nullable
- `createdAt`
- `updatedAt`

Notes:

- One employee has one active goal sheet in the MVP.
- `submitted`, `returned`, `approved`, and `unlocked` drive the core workflow state.
- `unlocked` is created by Admin and is editable like `draft` or `returned`.

### Goal

Purpose: stores each individual goal inside a goal sheet.

Fields:

- `id`
- `goalSheetId`
- `thrustArea`
- `title`
- `description`
- `uomType` (`numeric | percentage | timeline | zero`)
- `uomDirection` (`min | max | timeline | zero`)
- `targetValue`
- `weightage`

Notes:

- `targetValue` is stored as a string and interpreted according to `uomType`.
- `employeeId` is not duplicated here because ownership is derived through `goalSheetId`.
- The MVP thrust-area options are `Revenue Growth`, `Customer Experience`, `Operational Excellence`, `People & Capability`, `Innovation`, and `Compliance / Risk`.

### CheckIn

Purpose: stores one quarterly check-in session for a goal sheet.

Fields:

- `id`
- `goalSheetId`
- `quarter` (`Q1 | Q2 | Q3 | Q4`)
- `status` (`draft | submitted | reviewed`)
- `managerComment` nullable
- `createdAt`
- `updatedAt`

Notes:

- One goal sheet can have one check-in per quarter.
- The check-in stores quarter-level workflow state and manager comment.

### CheckInGoalUpdate

Purpose: stores the per-goal achievement update inside a quarterly check-in.

Fields:

- `id`
- `checkInId`
- `goalId`
- `actualAchievement`
- `progressStatus` (`not_started | on_track | completed`)

Notes:

- Each check-in usually has one update per goal.
- Computed progress is not stored; it is derived at runtime from the goal target and actual achievement.

### AuditLogEntry

Purpose: stores simple MVP audit entries for important demo actions.

Fields:

- `id`
- `actorName`
- `action`
- `entityLabel`
- `createdAt`

Notes:

- This is intentionally simple for MVP.
- It is not a full audit system yet.

## Relationship Summary

- One manager `User` can have many employee `User` records through `managerId`.
- One employee `User` has one active `GoalSheet` in the MVP.
- One `GoalSheet` has many `Goal` records.
- One `GoalSheet` has many `CheckIn` records.
- One `CheckIn` has many `CheckInGoalUpdate` records.
- One `CheckInGoalUpdate` belongs to one `Goal`.
