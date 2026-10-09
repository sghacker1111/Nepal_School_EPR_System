# Verification and readiness — 8 October 2026

## Scope

This audit covers the existing local Nepal School ERP application, its linked academic/student/teacher workflows, administration, attendance, examinations, results, questions, and paper generation. It does not certify the application for production use or replace school review of current CDC/SEE/NEB requirements.

## Changes completed

- Academic years, sections, subjects, class subjects, teaching assignments, enrollment, and optional-subject choices are cross-validated within the authenticated school. Historical relationships cannot be silently moved once dependent records exist.
- Student and teacher changes synchronize linked user names and revoke access when a profile is disabled. Guardian editing reconciles the student's links, keeps exactly one primary contact, preserves parent details, and does not silently overwrite a shared guardian on another student's profile.
- Administration includes account creation, role/status editing, temporary-password reset, session revocation, assignment-derived Class Teacher access, and protection against disabling the last active school administrator.
- School module switches remove the corresponding permissions as well as navigation access. Teacher/student access is scoped to linked profiles and assignments. Unauthorized page visits show a useful access-denied page; expired sessions return to login, while actions and APIs retain typed authorization errors.
- Attendance requires a complete active roster and an in-year date. Submitted sheets cannot become drafts, only submitted sheets can be locked, and section-level transaction locks coordinate save/create/lock operations. Draft-to-submitted absence notifications are preserved.
- Marks validate every required component, limits, component pass thresholds, grading ranges, and the full student roster. Optional subjects appear only for enrolled students. Results require approved sheets; unlocking withdraws publication. Calculation, publication, and associated notifications use transactions.
- Draft question editing, MCQ/type values, chapter/topic hierarchy, grid matching, mandatory locked questions, and multi-set generation rollback were repaired. Builder failures display inline feedback. Incomplete printed papers are explicitly marked as drafts.
- Navigation is searchable and responsive. The server/client icon serialization crash and Prisma Decimal serialization warnings on exam forms were repaired. Setup progress is based on school records rather than static claims.
- Local startup generates Prisma, applies additive migrations, and seeds without replacing existing Super Admin credentials. Integration tests use a separate disposable database.

## Nepal curriculum references

The application includes a reference panel based on the [CDC grade 9–10 compulsory curriculum](https://moecdc.gov.np/content/201/secondary-education-curssions--2078--class-9-10--mandatory/) and [Letter Grading Directive 2078, fourth amendment 2081](https://www.moecdc.gov.np/content/22/letter-gradinging-directory--2078--fourth-amendment-2081-/), inspected during this audit.

The reference distinguishes integrated early-primary curricula from secondary subject structures. Grade 9–10 reference credits and current letter-grade ranges are available, while component pass marks remain explicit school settings. Schools must select appropriate local/optional subjects and review assessment rules for their grade and exam type. Printable school progress reports are not official board certificates; this implementation does not claim government certification or official IEMIS upload compatibility.

## Automated verification

Run from the repository root:

```powershell
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run build
```

- Unit/domain suite: 14 files, 58 tests passing.
- Database integration suite: 42 checks passing on fresh PGlite, including deployment of all five migrations.
- TypeScript and zero-warning ESLint checks pass.
- Production compilation and route generation pass.

The integration suite exercises academic setup, teachers and account roles, students/enrollment/guardians, optional rosters, attendance/locking/notifications, component marks and approvals, result publication/unlock, question allocation, multi-set transaction rollback, tenant/assignment access, and last-administrator safeguards. Regression tests were observed failing before the relevant guardian, attendance-lock, and exam-configuration fixes.

Test database port: **55433**, in memory. Saved local development database: **55432**, `.local-pglite/`. The fixtures refuse other database ports. Never point fixture scripts at school or production data.

## Local startup verification

`npm run dev:local:clean` was tested end to end on a disposable in-memory database at port 55432. It generated Prisma Client, deployed all five migrations, seeded the Super Admin, and started Next.js on `http://127.0.0.1:3000`. The bootstrap login succeeded and redirected to the mandatory first-login password-change page without browser console errors. No new password was entered during this check.

The temporary verification servers were stopped afterward. The existing `.local-pglite/` database was not modified. Use `npm run dev:local` for normal local work with persistent data; bootstrap credentials apply only when creating a new database.

## Browser verification

All 21 school sidebar destinations were opened with an authenticated isolated test administrator. The dashboard, setup pages, profiles, users/settings, exams, and reports rendered without browser console errors in that pass.

- English marks showed both enrolled students; optional Computer Science showed only the student who selected it. Published marks were not editable.
- Results and the administrator report card displayed the expected fixture total (177/200), percentage (88.5%), credit-weighted GPA (3.78), grade (A), and outcome (PASS). A withheld result was not published to its student.
- The teacher portal showed the linked teacher and assignment. Attempting the administrator user-management URL redirected to the access-denied page, whose return link led back to the teacher workspace.
- The student portal showed the linked profile, attendance, and published result. Its report-card link opened the matching subject/component marks, weighted GPA, attendance, and Print / Save PDF control with no browser console errors. The operating-system print dialog was not exercised.
- Visual evidence from the isolated fixture: `.local/qa/report-card.jpg`.

An earlier independent workflow review produced issues that were fixed and regression-tested. An additional final review could not run because the reviewer reached its usage limit; it is not counted as a completed review.

## Before real school data / production deployment

1. Provision PostgreSQL and configure `DATABASE_URL`, direct migration URL, a strong `AUTH_SECRET`, HTTPS application URL, and deployment secrets. Re-run migrations and integration checks against a disposable instance of the selected PostgreSQL provider; PGlite is not a production concurrency/load certification.
2. Configure backups and test restoration. Add deployment-level rate limiting, monitoring, and audit-retention policies appropriate for student information.
3. Configure private object storage before enabling binary photo/document uploads. The present forms preserve metadata; they do not upload files to unconfigured storage.
4. Review curriculum, optional-subject offerings, component thresholds, promotion practices, government reporting formats, and report-card wording with the school. BS birth-date fields and calendar preferences are not an automatic full AD/BS conversion or complete Nepali translation system.
5. Load-test realistic class sizes and concurrent teachers on PostgreSQL. Browser smoke tests and deterministic transaction-boundary regressions are not a penetration test or exhaustive concurrency test.

The current Prisma/pg integration emits a non-failing `client.query()` concurrency deprecation warning during some transactional integration checks. Tests complete successfully with the installed pg 8.x version; review upstream adapter compatibility before upgrading to pg 9.

No production deployment, external database provisioning, email/SMS service, or cloud storage configuration was performed.
