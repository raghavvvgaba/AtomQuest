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
- `/manager/shared-goals` - manager shared-goal creation and tracking page.
- `/admin` - admin dashboard with basic MVP counts.
- `/admin/shared-goals` - admin shared-goal creation and tracking page.
- `/admin/unlock` - admin page to unlock approved goal sheets.
- `/admin/reports` - admin planned-vs-actual report table.
- `/admin/audit-log` - admin simple audit log page.

## Data Models

These are the current persisted MVP models used by the app.
The source of truth is `prisma/schema.prisma`. This section is a readable summary of that schema.

## Enums

- `AppRole`: `employee | manager | admin`
- `GoalSheetStatus`: `draft | submitted | returned | approved | unlocked`
- `UomType`: `numeric | percentage | timeline | zero`
- `UomDirection`: `min | max | timeline | zero`
- `Quarter`: `Q1 | Q2 | Q3 | Q4`
- `CheckInStatus`: `draft | submitted | reviewed`
- `ProgressStatus`: `not_started | on_track | completed`

## Auth Models

These are Better Auth / session persistence models.

### User

Purpose: stores the authentication user record.

Fields:

- `id`
- `name`
- `email`
- `emailVerified`
- `image` nullable
- `createdAt`
- `updatedAt`

### Session

Purpose: stores active login sessions.

Fields:

- `id`
- `expiresAt`
- `token`
- `createdAt`
- `updatedAt`
- `ipAddress` nullable
- `userAgent` nullable
- `userId`

### Account

Purpose: stores auth provider account data, including credential-password data for demo login.

Fields:

- `id`
- `accountId`
- `providerId`
- `userId`
- `accessToken` nullable
- `refreshToken` nullable
- `idToken` nullable
- `accessTokenExpiresAt` nullable
- `refreshTokenExpiresAt` nullable
- `scope` nullable
- `password` nullable
- `createdAt`
- `updatedAt`

### Verification

Purpose: stores verification / token-style auth records.

Fields:

- `id`
- `identifier`
- `value`
- `expiresAt`
- `createdAt`
- `updatedAt`

## App Models

These are the product-specific workflow models.

### AppUser

Purpose: stores the app-level identity, role, and reporting relationship on top of auth users.

Fields:

- `id`
- `authUserId`
- `name`
- `role` (`AppRole`)
- `managerId` nullable
- `createdAt`
- `updatedAt`

Notes:

- `managerId` links an employee to their manager.
- Manager and Admin users usually have `managerId: null`.
- This is the model used by the actual app workflow for authorization and routing.

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
- `sharedGoalId` nullable
- `thrustArea`
- `title`
- `description`
- `uomType` (`numeric | percentage | timeline | zero`)
- `uomDirection` (`min | max | timeline | zero`)
- `targetValue`
- `weightage`
- `createdAt`
- `updatedAt`

Notes:

- `targetValue` is stored as a string and interpreted according to `uomType`.
- `employeeId` is not duplicated here because ownership is derived through `goalSheetId`.
- The MVP thrust-area options are `Revenue Growth`, `Customer Experience`, `Operational Excellence`, `People & Capability`, `Innovation`, and `Compliance / Risk`.
- `sharedGoalId` is set when this is a linked shared goal copy.

### SharedGoal

Purpose: stores the source definition for a shared departmental KPI pushed to multiple employees.

Fields:

- `id`
- `title`
- `description`
- `thrustArea`
- `uomType`
- `uomDirection`
- `targetValue`
- `primaryOwnerEmployeeId`
- `createdByAppUserId`
- `createdAt`
- `updatedAt`

Notes:

- One selected employee recipient is the primary owner.
- The primary owner's submitted check-in values are the source for sync across linked copies.
- Admin or Manager can create these, but Manager scope is limited to direct reports.

### SharedGoalAssignment

Purpose: links one shared goal source to each employee recipient and their inserted goal row.

Fields:

- `id`
- `sharedGoalId`
- `employeeId`
- `goalId`
- `createdAt`

Notes:

- One row exists per employee recipient.
- `goalId` points to the actual copied goal row inside that employee's goal sheet.

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
- `createdAt`
- `updatedAt`

Notes:

- Each check-in usually has one update per goal.
- Computed progress is not stored; it is derived at runtime from the goal target and actual achievement.
- For shared goals, non-primary employee updates are synced from the primary owner on submitted check-ins.

### AuditLogEntry

Purpose: stores workflow audit entries.

Fields:

- `id`
- `actorAppUserId` nullable
- `actorName`
- `action`
- `entityLabel`
- `details` nullable JSON
- `createdAt`

Notes:

- This stores both coarse workflow events and detailed unlocked-goal edit history.
- `details` is used for grouped field-level audit entries after unlocked goal-sheet edits.
- Shared-goal creation and shared-goal sync actions are also logged here.

## Relationship Summary

- One auth `User` has one app-level `AppUser`.
- One manager `AppUser` can have many employee `AppUser` records through `managerId`.
- One employee `AppUser` has one active `GoalSheet` in the MVP.
- One `GoalSheet` has many `Goal` records.
- One `SharedGoal` has many `SharedGoalAssignment` records.
- One `SharedGoal` can be linked to many copied `Goal` records through `Goal.sharedGoalId`.
- One `SharedGoalAssignment` links one employee recipient to one copied `Goal`.
- One `GoalSheet` has many `CheckIn` records.
- One `CheckIn` has many `CheckInGoalUpdate` records.
- One `CheckInGoalUpdate` belongs to one `Goal`.
- One `AppUser` can create many `SharedGoal` records.
- One employee `AppUser` can be the primary owner for many `SharedGoal` records.
