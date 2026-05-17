# AtomQuest Goal Setting Portal

Hackathon MVP for employee goal creation, manager approval, quarterly check-ins, admin unlocks, reporting, and audit visibility.

## Quick Start

```bash
pnpm install
pnpm prisma:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Accounts

The project already includes one seeded demo account for each role:

- Employee: `employee@atomquest.test` / `Employee@123`
- Manager: `manager@atomquest.test` / `Manager@123`
- Admin: `admin@atomquest.test` / `Admin@123`

Additional employee accounts created for testing:

- Employee 1: `employee1@gmail.com` / `password`
- Employee 2: `employee2@gmail.com` / `password`
- Employee 3: `employee3@gmail.com` / `password`

You can also create a new Employee, Manager, or Admin account from the **Create Account** section on the login page.

## Evaluator Notes

- Use the Employee account to create, edit, save, and submit goal sheets.
- Use the Manager account to review submitted goal sheets, edit target/weightage, approve, return for rework, and review check-ins.
- Use the Admin account to view dashboard counts, unlock approved goal sheets, view reports, and inspect audit logs.
- Public signup is enabled for hackathon demo convenience and lets the tester choose a role.
