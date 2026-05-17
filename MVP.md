# MVP

This file captures the currently agreed MVP scope for the Goal Setting and Tracking Portal.

It is intentionally minimal and is based on the current MVP-phase decisions.
It does not replace [PRD.md](/Users/raghavvvgaba/Coding/AtomQuest/PRD.md), which remains the long-term product document.
This file exists to record what we have currently decided to build for the MVP.

## MVP Phase Decisions

- Current build phase is MVP only.
- Chosen application stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zod
- Planned database choice for later persistence: PostgreSQL with Neon
- Planned ORM for later persistence: Prisma
- Planned deployment direction: Next.js frontend and app backend on Vercel, with PostgreSQL hosted on Neon
- Real authentication is out for now; use a simple role switcher for Employee, Manager, and Admin.
- Microsoft Entra ID / Azure AD integration is out for MVP.
- Email and Microsoft Teams integrations are out for MVP.
- Automatic reminders and escalations are out for MVP.
- Advanced analytics are out for MVP.
- Strict real-date window enforcement is out for MVP; quarter selection will be manual via `Q1`, `Q2`, `Q3`, and `Q4`.
- Shared goals are out for the first MVP.
- Real CSV/Excel export is out for MVP; reports can be shown as a table and the export action can remain disabled.
- Complex audit logging is out for MVP; a simple audit-log UI can be shown first.

## Chosen Stack

The current approved stack for this project is:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zod

Supporting technical direction:

- For the MVP phase, application state can be managed through a shared in-memory store.
- For later persistence, the database choice is PostgreSQL.
- The selected PostgreSQL provider is Neon.
- For later database access, Prisma is the planned ORM.
- The deployment direction is to host the Next.js frontend and app backend together, while the PostgreSQL database is hosted separately on Neon.

Reason for this choice:

- It is fast for hackathon development.
- It supports a clean full-stack web app in a single codebase.
- It fits the future workflow-heavy and reporting-heavy nature of the product better than a NoSQL-first approach.
- It avoids unnecessary platform coupling compared to using Supabase for this project.

## MVP Implementation Phases

The MVP should be implemented in two separate build phases.
This is still one overall MVP milestone, but it should not be built in one single pass.

### Phase 1: Core Goal Creation and Approval Flow

Purpose: build the main employee-manager workflow first and stabilize the shared application structure.

Includes:

- app routing foundation
- role switcher page
- shared layout and navigation shell
- shared in-memory store
- reusable UI primitives for forms, tables, status badges, and action panels
- employee dashboard
- employee goal sheet page
- manager dashboard
- manager goal approval page
- goal creation, edit, remove, draft save, and submit flow
- goal-sheet validations
- manager inline edit flow for `targetValue` and `weightage`
- return-for-rework flow
- approve-and-lock flow

Phase 1 outcome:

- the core employee-to-manager goal workflow works end-to-end
- the main data shape and state transitions are validated early
- the rest of MVP can build on a stable foundation

### Phase 2: Quarterly Tracking, Admin Surfaces, and Demo Completion

Purpose: extend the stable core into the full MVP experience required for the demo.

Includes:

- employee quarterly check-in page
- manager check-in review page
- computed progress display
- admin dashboard
- admin unlock page
- reports table page
- audit log page
- quarter-based check-in flow
- manager review comment flow
- admin unlock behavior
- demo polish and final flow validation across all roles

Phase 2 outcome:

- all three roles have a complete MVP journey
- the full planned MVP page set is usable
- the product is ready for end-to-end hackathon demo

## Minimal Approved Schema

The schema below is the bare minimum currently agreed for the MVP core structure.
It is meant to support the main employee-manager-admin flow without bringing in future-only complexity.

### 1. User

Purpose: stores users across the three MVP roles and the basic manager-employee reporting relationship.

Fields:

- `id`
- `name`
- `role` (`employee | manager | admin`)
- `managerId` nullable

Notes:

- `managerId` is needed to represent who an employee reports to.
- This is separate from `id`; `id` identifies the user, while `managerId` defines reporting structure.

### 2. GoalSheet

Purpose: stores one employee's goal submission container.

Fields:

- `id`
- `employeeId`
- `status` (`draft | submitted | returned | approved`)
- `managerComment` nullable
- `createdAt`
- `updatedAt`

Notes:

- A `GoalSheet` belongs to one employee.
- In MVP, there is one active `GoalSheet` per employee for the current cycle.
- It acts as the parent container for that employee's goals.
- Manager approval and rework state belong here.

### 3. Goal

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

- `targetValue` is the stored goal target.
- `uomDirection` is needed because the PRD's progress rules distinguish between higher-is-better and lower-is-better behavior.
- `numeric` and `percentage` goals can use either `min` or `max` direction depending on the goal.
- `timeline` and `zero` use fixed direction behavior.
- For MVP, `targetValue` should be stored as a string and interpreted based on `uomType`.
- `employeeId` is intentionally not duplicated here because the employee can already be derived through the parent `GoalSheet`.
- This keeps the structure cleaner and avoids duplicate ownership data.

### 4. CheckIn

Purpose: stores one quarterly submission event for one employee goal sheet.

Fields:

- `id`
- `goalSheetId`
- `quarter` (`Q1 | Q2 | Q3 | Q4`)
- `status` (`draft | submitted | reviewed`)
- `managerComment` nullable
- `createdAt`
- `updatedAt`

Notes:

- One `CheckIn` represents the quarter-level review session itself.
- In MVP, there is one `CheckIn` per quarter per `GoalSheet`.
- It stores quarter-wide data such as submission state and manager comment.
- Example: one employee's `Q1` update for their goal sheet.

### 5. CheckInGoalUpdate

Purpose: stores the per-goal achievement entry within a quarterly check-in.

Fields:

- `id`
- `checkInId`
- `goalId`
- `actualAchievement`
- `progressStatus` (`not_started | on_track | completed`)

Notes:

- A single `CheckIn` will usually contain multiple goal updates, one for each goal.
- This table exists so quarter-level data and goal-level data remain separate and clean.
- Example: the `Q1` update for one specific goal inside one employee's quarterly check-in.

## Relationship Summary

- One `User` can manage many employee `User` records through `managerId`.
- One employee `User` has one `GoalSheet` for the active goal-setting cycle in MVP.
- One `GoalSheet` has many `Goal` records.
- One `GoalSheet` has many `CheckIn` records.
- One `GoalSheet` can have at most one `CheckIn` for each of `Q1`, `Q2`, `Q3`, and `Q4`.
- One `CheckIn` has many `CheckInGoalUpdate` records.
- One `CheckInGoalUpdate` belongs to one `Goal`.

## UI Behavior and Validation Spec

This section is based on the currently finalized MVP scope and on the core requirements in [PRD.md](/Users/raghavvvgaba/Coding/AtomQuest/PRD.md), especially:

- employee goal creation and submission
- goal validation rules
- manager inline editing during approval
- locked goals after approval
- quarterly achievement capture
- goal-level status updates
- manager check-in comments

### Employee Goal Sheet Behavior

- Employee can create a goal sheet and save work in `draft` state.
- Employee can add, edit, and remove goals while the sheet is in `draft` or `returned` state.
- Employee should be allowed to save an incomplete draft.
- Employee should only be blocked at final submission time, not at every intermediate edit.
- Once submitted, the goal sheet becomes read-only for the employee.
- If manager returns it for rework, the sheet becomes editable again for the employee.
- Once approved, the goal sheet is locked and cannot be edited by the employee.
- Approved goal sheets can only become editable again through Admin unlock action.
- When Admin unlocks an approved goal sheet, the sheet should move to `unlocked` state and become editable again for the employee.

### Goal Sheet Validation Rules

- Maximum number of goals per goal sheet: `8`
- Minimum weightage per goal: `10`
- Total weightage across all goals must equal `100` for submission
- Each goal must require:
- `thrustArea`
- `title`
- `description`
- `uomType`
- `uomDirection`
- `targetValue`
- `weightage`

Validation behavior:

- Draft save should be allowed even if the sheet is incomplete.
- Submission should fail if any required field is missing.
- Submission should fail if goal count is more than `8`.
- Submission should fail if any goal weightage is below `10`.
- Submission should fail if total weightage is not exactly `100`.
- Validation messages should be shown inline near the relevant field where possible.
- A top-level summary message can also be shown for submission-blocking issues.

Target input behavior:

- `numeric` goals use a numeric input for `targetValue`.
- `percentage` goals use a numeric input for `targetValue`.
- `timeline` goals use a date input for `targetValue`.
- `zero` goals use a fixed `0` target value and the field can be read-only or hidden.

### Manager Goal Approval Behavior

- Manager can view submitted goal sheets of employees who report to them.
- During approval review, manager can edit only:
- `targetValue`
- `weightage`
- Manager can approve the sheet.
- Manager can return the sheet for rework with a comment.
- If returned, the manager comment should be visible to the employee.
- After approval, the goal sheet becomes locked.

### Employee Quarterly Check-in Behavior

- Employee can manually choose `Q1`, `Q2`, `Q3`, `Q4` from the UI.
- Real date-based quarter locking is not enforced in MVP.
- Check-in is allowed only for approved goal sheets.
- For each goal, employee can enter:
- `actualAchievement`
- `progressStatus`
- Progress status options are:
- `Not Started`
- `On Track`
- `Completed`
- Employee can save check-in in `draft` state before final submission.
- Once a check-in is submitted, it becomes read-only for the employee.

### Manager Check-in Behavior

- Manager can view planned target vs actual achievement for each employee goal.
- Manager can add one structured quarter-level comment to the check-in.
- Manager marks the check-in as reviewed.
- After manager review, the check-in remains read-only.
- Computed progress should be shown in the UI, but it should be derived at runtime and not stored in the schema.

### Admin Behavior

- Admin can view basic dashboard counts.
- Admin can unlock an approved goal sheet.
- Unlock action should move the goal sheet back to editable state for the employee.
- Admin can view a report table of planned vs actual data.
- Admin can view a simple audit-log page.

## Intentionally Not Included Yet

These are intentionally excluded from the current schema and behavior to avoid overengineering in the MVP phase:

- auth/login tables
- org hierarchy tables beyond `managerId`
- shared goal models
- notification tables
- escalation tables
- analytics tables
- export job tables
- detailed audit-log persistence tables
- cycle/date-window configuration tables
- approval history tables
- separate comment history tables
- stored computed progress score
- strict quarter-window enforcement

## MVP Assumption

- The PRD requires selecting a `thrustArea`, but it does not define the allowed options. For MVP, the controlled options are `Revenue Growth`, `Customer Experience`, `Operational Excellence`, `People & Capability`, `Innovation`, and `Compliance / Risk`.

## Current Direction

The current approach is:

- keep the schema minimal
- support the core employee-manager-admin flow first
- avoid future-only data structures until they are truly required
- show computed progress in MVP by deriving it at runtime from `uomType`, `uomDirection`, `targetValue`, and `actualAchievement` instead of storing it
- keep UI behavior simple and predictable, while matching the core PRD requirements that matter for MVP
- use a shared in-memory store for MVP state instead of scattered page-local state, so replacing it with real persistence later is easier
