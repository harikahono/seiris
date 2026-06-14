# SEIRIS — Agent Guide

## Project Structure
- `seiris-be/` — Laravel 12 backend (PHP 8.2+)
- `seiris-fe/` — React 19 + Vite 8 + TypeScript 6 + Tailwind 4 (pnpm)

## Setup & Commands

### Backend (`seiris-be/`)
```bash
composer install
cp .env.example .env     # set DB, MAX_STUDENT_FMR=150000
php artisan key:generate
php artisan migrate --seed
php artisan serve         # http://localhost:8000
```

Composer scripts:
- `composer run dev` — concurrently runs `php artisan serve`, `queue:listen`, `pail`, `npm run dev`
- `composer run test` — `php artisan config:clear && php artisan test`

Other artisan commands:
- `php artisan queue:listen --tries=1 --timeout=0` (queue-based broadcast driver)
- `php artisan pail --timeout=0` (log watcher, dev dep)

### Frontend (`seiris-fe/`)
```bash
pnpm install
pnpm dev          # Vite dev server at http://localhost:5173
pnpm build        # tsc -b && vite build
pnpm lint         # ESLint
pnpm preview      # vite preview
```

- `@/` path alias maps to `src/` (configured in vite.config.ts)
- `.env` needs `VITE_API_BASE_URL=http://localhost:8000`

### Tests (backend only)
- PHPUnit with SQLite `:memory:` (see phpunit.xml)
- `composer run test` — calls `config:clear` then `php artisan test`

## API Conventions
- All routes under `auth:sanctum` middleware require Bearer token from `POST /api/auth/login`
- Validation errors return 422 with Indonesian messages
- Paginated endpoints return `{ data, meta: { current_page, last_page, total } }`
- API prefix: `/api`

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login (returns token) |
| GET | `/api/teams` | List user's teams |
| POST | `/api/teams` | Create team |
| POST | `/api/teams/join` | Join via invite_code |
| POST | `/api/teams/{team}/contributions` | Create claim (DRAFT->PENDING) |
| POST | `/api/contributions/{contribution}/vote` | Vote APPROVE/REJECT |
| GET | `/api/teams/{team}/equity` | Latest equity snapshot |
| GET | `/api/teams/{team}/equity/history` | Paginated snapshot history |
| GET | `/api/teams/{team}/equity/export` | PDF export (dompdf) |
| POST | `/api/teams/{team}/freeze` | Freeze equity (owner only) |
| POST | `/api/revenues/{revenue}/distribute` | Distribute profit |
| GET | `/api/teams/{team}/audit-logs` | Immutable audit trail |
| GET | `/api/ping` | Health check (public) |

## Core Business Logic

### FSM Flow: DRAFT → PENDING → APPROVED/REJECTED
- Contribution starts as PENDING (no DRAFT state in code, created directly as PENDING)
- Only **other** team members can vote (creator cannot vote own claim)
- Threshold based on `team.approval_threshold` (50/75/100%)
- **Tie-breaker**: team owner's casting vote wins; if owner is creator, falls back to longest-tenured active member
- Once APPROVED, `SlicingPieService::recalculate()` inserts a new `EquitySnapshot` row

### Concurrency Control (Pessimistic Locking)
- Every `store` and `vote` wraps logic in `DB::transaction()` with `DB::table('teams')->where('id', $team->id)->lockForUpdate()` on the team row
- `lockForUpdate()` also used on the contribution row inside `checkAndUpdateStatus`
- DB should be PostgreSQL for row-level locking; default `.env.example` uses SQLite

### Slicing Pie Engine
| Type | Multiplier | Value Formula |
|------|-----------|---------------|
| CASH | ×4 | `amount` |
| TIME/IDEA/NETWORK | ×2 | `hours × FMR` |
| FACILITY | ×2 | `amount` |
| REVENUE | ×2 | `actual_amount - invoice_amount` |

- Equity % = `(member_slices / total_team_slices) × 100`
- FMV capped at `MAX_STUDENT_FMR` (default 150000 IDR/hour) — validated in `SlicingPieService`
- FMR=0 blocks TIME/IDEA/NETWORK contributions (owner must set FMR first)

### Append-Only Ledger
- `AuditLog` model blocks `updating` and `deleting` events (INSERT ONLY)
- `EquitySnapshot` never updated — each APPROVED contribution creates a new row
- Contribution `total_slices` is immutable after creation (blocked in `booted()`)

### Models & UUIDs
- All models `use HasUuids`; all FKs are `foreignUuid`
- `Contribution` statuses: PENDING, APPROVED, REJECTED
- `TeamMember` statuses: active, exited; roles: owner, member
- `Team` has `invite_code`, `approval_threshold`, `is_frozen`

### Broadcasting (Pusher)
- `EquityUpdated` event broadcasts to a `PresenceChannel('team.{teamId}')` as `equity.updated`
- Requires `PUSHER_*` env vars; driver set via `BROADCAST_CONNECTION`
- Queue connection: `database` (default), needs `queue:listen` running

## Routing
- All API routes in `routes/api.php` (no web routes for auth/views)
- `auth:sanctum` middleware — no additional tenant middleware; tenant isolation via `$team` route binding and manual `authorizeMember()` checks in controllers

## Quirks & Constraints
- PHP 8.2 required (composer.json: `^8.2`)
- Migrations use `gen_random_uuid()` (PostgreSQL native); fails on MySQL unless you change default
- PDF export uses `barryvdh/laravel-dompdf` with `DejaVu Sans` font
- Storage link needed for invoice uploads: `php artisan storage:link`
- No dedicated tenant-scope global middleware — isolation relies on route model binding and manual checks
- SEIRIS-specific config in `config/seiris.php` reads `MAX_STUDENT_FMR` env var
- Frontend is landing-page only; main feature integration (claims/equity UI) is incomplete
