# BOGCAT
> BOGCAT = Boots Opticians Gyle Coordinator's Assistive Tracker

## What is BOGCAT?
BOGCAT is a tracking application for the coordinator at Boots Opticians at the Gyle. The working hours are 9AM to 6PM. The coordinator is a collegue whose role is allocate tasks during this time. 

### Tasks
Tasks can be of the following types alongside the approximate time required to complete them:

1. Pre screening
    - Full Sight Test (15 mins)
    - Supplementary Test (10 mins)
2. Post checks (10 mins)
3. Dispensing 
    - Single Vision (30 mins)
    - Varifocals (30 mins)
4. Collection (10 mins)
5. E-GOS (30 mins)
6. File Pulling (1 hour)
7. Scanning (1 hour)

## Why BOGCAT?
The goal is to automate task allocation via a single real-time tracker, so that the coordinator can allocate tasks without manually running after other colleagues and asking for their availiblity or if they are free. The coordinator will be able to allocate tasks from their account.

The other goal is to enable communication between front desk and the coordinator, so that during busy hours, the front desk colleague can communicate (not literally) with the coordinator without having to leave the front desk.

## Tech stack

BOGCAT is a TypeScript monorepo using Turbo and npm workspaces.

### Frontend (apps/web)
- Next.js 15 (App Router)
- React + TypeScript
- Tailwind CSS for styling
- WebSocket client for live updates

### Backend (apps/api)
- Fastify (HTTP API)
- Fastify WebSocket for real-time events
- JWT authentication
- bcrypt password verification against hashed password in environment variables

### Shared / tooling
- Prisma ORM + Prisma Client
- Turbo for workspace orchestration
- tsx/TypeScript for development workflows

## Database design

The database is SQLite, managed through Prisma schema and migrations.

### Core entities
- `User`: elevated system users (`COORDINATOR`, `FRONTDESK`, `ADMIN`)
- `Session`: active login sessions (supports single-login enforcement and admin force logout)
- `Colleague`: store colleagues with colleague type and assignability flags
- `WorkingDay`: per-day setup record
- `ColleagueOnDay`: which colleagues are in on a specific day
- `TaskAllocation`: current and historical task assignments
- `PatientArrival`: front desk arrival alerts

### Enums / controlled values
- `Role`: `COORDINATOR`, `FRONTDESK`, `ADMIN`
- `ColleagueType`: `OC`, `SENIOR_OC`, `MANAGER`
- `TaskType`: predefined clinical/operational tasks
- `AllocationStatus`: `FREE`, `BUSY`
- `ArrivalReason`: `SIGHT_TEST`, `COLLECTION`, `ADJUSTMENT`

### Relationship model
- A `User` can have multiple `Session` records over time.
- A `WorkingDay` has many `ColleagueOnDay` rows.
- A `ColleagueOnDay` can have many `TaskAllocation` rows.
- A `WorkingDay` has many `PatientArrival` rows.

### Operational behavior enabled by this design
- Real-time task board updates across coordinator/admin/front desk clients
- Day setup persistence with lock rules and override paths
- Session tracking for active-login visibility and forced logout
- Historical storage for allocations and arrivals for later reporting

## Notes

- Secrets are stored in `.env` (`DATABASE_URL`, `JWT_SECRET`, `HASHED_PASSWORD`, etc.).
- Password comparison is done against a hash; plaintext is not persisted.
- Prisma migrations are the source of truth for schema evolution.