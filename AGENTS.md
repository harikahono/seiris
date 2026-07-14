# SEIRIS — Agent Guide

> **Dokumentasi lengkap ada di folder `agent-context/`** (diturunkan & diverifikasi dari kode per 2026-07-14). File ini cuma entry point + setup cepat. Baca `agent-context/` untuk arsitektur, tipe, logic domain, kontrak API, keputusan, dan gotchas.

## Docs Index (baca ini)
- `agent-context/ARCHITECTURE.md` — stack, folder convention, data flow, Slicing Pie Beranak, realtime, deploy note.
- `agent-context/TYPES.md` — interface FE + 12 model BE + 8 resource, plus mapping nama FE↔BE.
- `agent-context/DOMAIN_LOGIC.md` — formula, multiplier, FSM, freeze, append-only, bad-leaver, distribusi per-scope.
- `agent-context/API_CONTRACTS.md` — semua endpoint (termasuk subtree project + broadcasting/auth) lengkap & terverifikasi.
- `agent-context/DECISIONS.md` — ADR (kenapa X bukan Y).
- `agent-context/GOTCHAS.md` — trap & caveats yang sudah bikin bug. **Baca sebelum ngubah kode.**

## Project Structure
- `seiris-be/` — Laravel 12 backend (PHP 8.2+, **PostgreSQL di produksi**, SQLite untuk test)
- `seiris-fe/` — React 19 + Vite 8 + TypeScript 6 + Tailwind 4 (pnpm)

## Setup & Commands

### Backend (`seiris-be/`)
```bash
composer install
cp .env.example .env     # set DB, MAX_STUDENT_FMR=150000
php artisan key:generate
php artisan migrate --seed
php artisan serve         # http://localhost:8000 (CLI SAPI, bukan php-fpm)
php artisan storage:link  # for invoice uploads
```
- `composer run dev` — `php artisan serve` + `queue:listen` + `pail` + `npm run dev`
- `composer run test` — `php artisan config:clear && php artisan test` (PHPUnit, SQLite `:memory:`)

### Frontend (`seiris-fe/`)
```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm build        # tsc -b && vite build
pnpm lint         # ESLint
```
- `@/` → `src/`; butuh `VITE_API_BASE_URL`, `VITE_PUSHER_*`.

## Frontend Routes (`src/App.tsx`)
| Path | Component |
|------|-----------|
| `/` | `LandingPage` (public) |
| `/login` `/register` | `AuthPage` (public) |
| `/dashboard` | `DashboardPage` (protected) |
| `/teams/:teamId` | `TeamDetailPage` (outlet, 5 tab) |
| `/teams/:teamId/members` | `TeamMembersTab` |
| `/teams/:teamId/contributions` | `ContributionsTab` |
| `/teams/:teamId/revenue` | `RevenueTab` |
| `/teams/:teamId/audit` | `AuditLogTab` |
| `/teams/:teamId/settings` | `TeamSettingsTab` |
| `/teams/:teamId/contributions/:contributionId` | `ContributionDetailPage` |

## Catatan penting (ringkas — lengkap di GOTCHAS.md)
- **Models = 12** (bukan 10): ada `Project` + `ProjectMember` (Slicing Pie Beranak).
- **Rate limit**: `api`=120, `write`=30, `auth`=5/email+60/ip (di `AppServiceProvider`, bukan `config/auth.php`).
- **Tipe kontribusi**: `CASH, TIME, IDEA, NETWORK, FACILITY, SALES` — tidak ada `REVENUE` (legacy).
- **`exitMember` = POST** (bukan PUT).
- Backend jalan **CLI SAPI** → upload limit di `php-cli/php.ini`; nginx butuh `client_max_body_size 20M`.
- PostgreSQL wajib (row-lock `lockForUpdate`, `gen_random_uuid`).
