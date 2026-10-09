# Nepal School ERP

Nepal School ERP is a local-first, multi-school management application built with Next.js, TypeScript, Prisma, and PostgreSQL. Phases 1–8 of the supplied development plan are implemented: platform security, academics, teachers, students, attendance, examinations and results, question bank, specification grids and paper generation, reports, notifications, and deployment preparation.

Every school-owned record carries `schoolId`. Protected reads and writes derive the school from the authenticated database session; URL and form values identify records but never authorize their tenant.

## Run locally without installing a database

Only Node.js 22.12 or newer and npm are required. The local command starts an embedded PostgreSQL-compatible PGlite database, deploys all migrations, performs the repeatable seed, and starts Next.js:

```powershell
npm install
npm run dev:local
```

Open [http://127.0.0.1:3000/super-admin/login](http://127.0.0.1:3000/super-admin/login).

Development bootstrap account:

```text
Username: superadmin
Password: ChangeMe@12345
```

The first login requires a password change. Existing accounts and passwords are preserved on restart; the bootstrap credentials apply only to a new database. Create a school and its first School Administrator from the Super Admin workspace, then use `/login` with the displayed school code and temporary credentials.

Local data persists in `.local-pglite/` and is excluded from source control. To run with a clean, temporary database that disappears when the process stops:

```powershell
npm run dev:local:clean
```

PGlite is a convenient local PostgreSQL-compatible development environment, not the production database. Its socket multiplexer does not guarantee every behavior of a standalone PostgreSQL server. Use PostgreSQL, Supabase, or Neon before deploying real school data.

## Implemented phases

### Phase 1 — secure multi-school foundation

- Separate school and Super Admin login routes
- Opaque HttpOnly database sessions and Argon2id password hashing
- Forced first-login password change, lockout, reset, and session revocation
- School lifecycle, settings, first administrator, tenant roles, and permissions
- Tenant and platform audit history

### Phase 2 — academics and teachers

- Academic years, classes, sections, subjects, and class-subject assignments
- Teacher profiles, login accounts, employment lifecycle, class-teacher designation, and assignments
- Teacher self-service workspace restricted to the linked teacher record

### Phase 3 — student management

- Full personal, family, guardian, address, academic, IEMIS-style, health, and document metadata profile
- Optional-subject selection per enrollment, linked to marks rosters and results
- Historical enrollment, promotion/re-enrollment, hide from class, archive, and restore
- Multi-signal duplicate confidence with separate audited override permission
- Server-side search, filters, pagination, Excel import preview/error report/confirmation, and export
- Read-only linked student portal

### Phase 4 — attendance

- Daily class/section sessions with Present, Absent, Late, Leave, and Holiday
- Assignment-scoped teacher entry and server-side enrollment checks
- Draft, submit, and administrative lock workflow
- One session per class/section/date and one record per student/session
- Daily, monthly, student, class, absent-list, percentage, and date-range reporting
- Newly absent student notifications when a linked account exists

### Phase 5 — exams, grading, results, and report cards

- Exam types, exam periods, subject/component marks, credit hours, dates, and duration
- School-configurable grading schemes and non-overlapping grade rules
- Teacher assignment-scoped marks with full-mark and negative-value validation
- Draft → Submitted → Verified → Approved/Locked workflow and audited administrative unlock
- Central deterministic subject grade, weighted GPA, final result, and attendance calculation
- Controlled publication, student result notifications, and printable/save-as-PDF report cards

The grading engine is configurable and is not represented as a permanent government rule. Each school must verify its rules against the currently applicable Nepal standard.

### Phase 6 — question bank

- Class → Subject → Chapter → Topic → Question hierarchy
- MCQ, true/false, fill-in, short, long, numerical, matching, and custom question types
- Validated MCQ options and exactly one correct answer
- Marks, difficulty, cognitive level, curriculum code, outcome, answer, solution, and approval workflow

### Phase 7 — specification grids and paper generation

- Allocation rows by chapter/topic/type/cognitive level/difficulty/marks/count
- Exact full-mark validation with draft support for incomplete grids
- Approved-question selection with no duplicate within a paper
- Deterministic equivalent Sets A–D rather than order-only randomization
- Regeneration that preserves locked questions
- Lock/unlock, replace, remove, move up/down, and regenerate controls
- Separate student question paper and confidential answer-key/marking-scheme output
- Printable browser output with PDF save support

### Phase 8 — reports, notifications, and hardening

- School operational report for enrollment, attendance, results, exams, questions, and papers
- Multi-sheet Excel export for students, attendance, and results
- Broadcast and targeted student/teacher/administrator notifications
- Per-user broadcast read receipts and expiring notifications
- Admin user management, assignment-derived roles, last-administrator protection, session revocation, and module availability controls
- Searchable role-aware navigation, teacher/student dashboards, loading/error states, pagination, database indexes, and audit events
- Additive migrations, guarded repeatable seed, production build, and deployment checklist

## Main routes

| Area                       | Route                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| School / Super Admin login | `/login`, `/super-admin/login`                                                                                               |
| School dashboard           | `/dashboard`                                                                                                                 |
| Academic setup             | `/dashboard/academic-years`, `/dashboard/classes`, `/dashboard/sections`, `/dashboard/subjects`, `/dashboard/class-subjects` |
| Teachers                   | `/dashboard/teachers`, `/dashboard/teacher-assignments`                                                                      |
| Students / import          | `/dashboard/students`, `/dashboard/students/import`                                                                          |
| Attendance / reports       | `/dashboard/attendance`, `/dashboard/attendance/reports`                                                                     |
| Exams / subjects / marks   | `/dashboard/exams`, `/dashboard/exams/subjects`, `/dashboard/exams/marks`                                                    |
| Results / report cards     | `/dashboard/results`                                                                                                         |
| Question bank              | `/dashboard/question-bank`                                                                                                   |
| Specification grids        | `/dashboard/exams/specification-grid`                                                                                        |
| Paper generator / builder  | `/dashboard/exams/paper-generator`, `/dashboard/exams/papers/[paperId]`                                                      |
| Admin users / settings     | `/dashboard/users`, `/dashboard/settings`                                                                                    |
| Reports / notifications    | `/dashboard/reports`, `/dashboard/notifications`                                                                             |
| Teacher / student portals  | `/teacher`, `/student`                                                                                                       |

## Recommended school setup order

1. Create the school and first School Administrator.
2. Create the current academic year, classes, sections, subjects, and class-subject assignments.
3. Add teachers and teaching/class-teacher assignments.
4. Add students individually or through the validated Excel import.
5. Take and submit attendance.
6. Add an exam type and review the default/editable grading rules.
7. Create an exam, configure class subjects, enter, verify, and approve marks.
8. Calculate results, review them, then publish.
9. Create chapters, topics, and approved questions.
10. Validate a specification grid and generate paper sets and answer keys.

For optional subjects, select the student’s actual subjects from their profile before entering marks. Subject choices and class/enrollment mappings are protected once marks or attendance depend on them. Administrative unlocking withdraws published results and requires recalculation and approval before republication.

The Nepal reference panel links to the CDC grade 9–10 curriculum and revised letter-grading directive. Component pass thresholds remain school-configurable; school progress reports are not official SEE/NEB certificates.

## Use a real PostgreSQL database later

Copy the example environment and replace both database URLs and the session secret:

```powershell
Copy-Item .env.example .env
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Use a pooled `DATABASE_URL` for the application and a direct `DIRECT_URL` for migrations when your provider requires it. The repeatable seed synchronizes permissions and default Teacher, Student, Class Teacher, and Exam Coordinator roles. It never replaces an existing Super Admin password.

## Verification

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

The tests cover authentication boundaries, tenant identity, school creation, academic/student validation, duplicate confidence, attendance input, deterministic grades and GPA, question/MCQ/grid validation, `schoolId` ownership on every operational model, historical retention, uniqueness, and plaintext-password protections.

Integration checks create a fresh in-memory test database on port 55433 and never use `.local-pglite/`. Use a free port 55433 and stop a previous test preview before rerunning. The test suite needs no separately installed database. Prisma generation/build commands require `DATABASE_URL` and `DIRECT_URL` (see `.env.example`).

See [the verification and readiness report](docs/verification-2026-10-08.md) for coverage and production limits.

Checked-in additive migrations:

- `20260820000000_phase_one_foundation`
- `20260820010000_phase_two_and_student_management`
- `20260820020000_phases_four_to_eight`
- `20261008000000_workflow_integrity`
- `20261008010000_optional_subjects`

Do not use `prisma migrate reset`, destructive `db push`, or local embedded data for production.

## Security and operational notes

- Every Server Action and Route Handler authenticates and authorizes again; hidden buttons are not treated as security.
- Teacher attendance and marks operations recheck linked assignments.
- Student self-service reads only the student linked to the authenticated user.
- Approved/locked marks require a separately authorized, reasoned, audited unlock.
- Student master records have no permanent-delete workflow; enrollment, attendance, marks, and result history remain attached.
- Excel uploads are type/size/row limited and validated before transactional confirmation.
- Passwords, temporary plaintext credentials, session tokens, and storage secrets are excluded from audit payloads.
- Configure backups, point-in-time recovery, WAF/rate limiting, monitoring, and a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` for multi-instance self-hosting.
- Binary photo and document uploads remain intentionally gated until private R2/S3-compatible storage is configured. Identifiers and storage keys exist; the app does not pretend unconfigured storage is active.
- Revalidate official IEMIS formats and government reporting/grading rules before regulated exports because those standards can change.

## Technology and structure

- Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4
- Prisma ORM 7, PostgreSQL, `pg` adapter, and PGlite for local-only embedded development
- Zod, Server Actions, Route Handlers, Argon2id, Radix UI, Lucide, ExcelJS, Vitest

```text
prisma/                 Schema, seed, additive migrations
scripts/local-start.ts  Embedded local database bootstrap
src/app/                Pages, portals, print views, and APIs
src/modules/            Academic, attendance, auth, exams, notifications,
                        questions, schools, students, and teachers
tests/                  Domain, authentication, schema, and security tests
```

## Deployment

1. Provision PostgreSQL 15+ or a compatible Supabase/Neon database.
2. Configure `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, canonical `APP_URL`, and a stable Server Actions encryption key.
3. Run `npm ci`, `npm run db:generate`, `npm run db:deploy`, `npm run build`.
4. Seed the first Super Admin once, rotate/remove bootstrap secrets, and create schools through the UI.
5. Enable database backup/PITR, TLS, WAF/rate limiting, log monitoring, and audit retention.
6. Configure private object storage before enabling binary uploads.

Codex assisted with repository inspection, implementation, migration construction, tests, and reproducible verification. The security and calculation decisions remain visible in ordinary TypeScript and Prisma code; no unverified production infrastructure or autonomous operation is claimed.
