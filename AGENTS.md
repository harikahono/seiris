# SEIRIS — Agent Guide

> **Dokumentasi lengkap ada di folder `agent-context/`** (diturunkan & diverifikasi dari kode per 2026-07-20). File ini cuma entry point + setup cepat. Baca `agent-context/` untuk arsitektur, tipe, logic domain, kontrak API, keputusan, gotchas, dan UI audit.

## Docs Index (baca ini)
- `agent-context/ARCHITECTURE.md` — stack, folder convention, data flow, Slicing Pie Beranak, realtime, deploy note.
- `agent-context/TYPES.md` — interface FE + 12 model BE + 8 resource, plus mapping nama FE↔BE.
- `agent-context/DOMAIN_LOGIC.md` — formula, multiplier, FSM, freeze, append-only, bad-leaver, distribusi per-scope.
- `agent-context/API_CONTRACTS.md` — semua endpoint (termasuk subtree project + broadcasting/auth) lengkap & terverifikasi.
- `agent-context/DECISIONS.md` — ADR (kenapa X bukan Y).
- `agent-context/GOTCHAS.md` — trap & caveats yang sudah bikin bug. **Baca sebelum ngubah kode.**
- `agent-context/UI_AUDIT.md` — hasil audit affordance UI/UX (false hover, missing tooltip, icon vs text, dll).

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
php artisan storage:link  # for proof uploads (bukti kontribusi/revenue)
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
| `/login` `/register` | `AuthPage` (public, support `?redirect=` param) |
| `/join/:inviteCode` | `JoinPage` (public — Discord-style join confirmation) |
| `/dashboard` | `DashboardPage` (protected, punya share button `ShareInviteModal`) |
| `/settings` | `SettingsPage` (protected — profile, foto, password, GitHub token) |
| `/teams/:teamId` | `TeamDetailPage` (outlet, tab — **Pengaturan hanya untuk owner**) |
| `/teams/:teamId/members` | `TeamMembersTab` |
| `/teams/:teamId/contributions` | `ContributionsTab` |
| `/teams/:teamId/revenue` | `RevenueTab` |
| `/teams/:teamId/audit` | `AuditLogTab` |
| `/teams/:teamId/settings` | `TeamSettingsTab` |
| `/teams/:teamId/contributions/:contributionId` | `ContributionDetailPage` |
| `/teams/:teamId/revenues/:revenueId` | `RevenueDetailPage` |

## Catatan penting (ringkas — lengkap di GOTCHAS.md)
- **Models = 12** (bukan 10): ada `Project` + `ProjectMember` (Slicing Pie Beranak).
- **Rate limit**: `api`=120, `write`=30, `auth`=5/email+60/ip (di `AppServiceProvider`, bukan `config/auth.php`).
- **Tipe kontribusi**: `CASH, TIME, IDEA, NETWORK, FACILITY, SALES` — tidak ada `REVENUE` (legacy).
- **`exitMember` = POST** (bukan PUT).
- Backend jalan **CLI SAPI** → upload limit di `php-cli/php.ini`; nginx butuh `client_max_body_size 20M`.
- PostgreSQL wajib (row-lock `lockForUpdate`, `gen_random_uuid`).
- **Feature flag**: `config.seiris.features.contribution_proof` guards proof/diff routes + FE UI. Setel `.env` atau `config/seiris.php`.
- **Endpoint baru**: `PATCH /users/me/github-token`, `PATCH /users/me/profile`, `GET /config`, proof & github-diff routes (team & project scope).
- **Settings pribadi**: semua user bisa akses `/settings` (nama, email, password, foto, GitHub token).
- **Team Settings** di sidebar hanya tampil untuk owner.
- **Invite flow**: `GET /teams/invite/{inviteCode}` publik (tanpa auth). JoinPage di `/join/:inviteCode`. AuthPage dukung `?redirect=` untuk post-login redirect.
- **Share modal**: `ShareInviteModal` (portal) di dashboard, 3 opsi: Copy link, WhatsApp, Gmail.
- **UserAvatar**: komponen reusable `@/components/ui/UserAvatar` untuk semua foto anggota — fallback inisial jika `profile_photo_url` null/error.
