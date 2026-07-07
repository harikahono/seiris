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
php artisan storage:link  # for invoice uploads
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
- `.env` needs `VITE_API_BASE_URL=http://localhost:8000`, `VITE_PUSHER_*` vars

### Tests (backend only)
- PHPUnit with SQLite `:memory:` (see phpunit.xml)
- `composer run test` — calls `config:clear` then `php artisan test`
- Only 2 stub tests exist (`ExampleTest.php` in Feature + Unit)

---

## API Conventions
- All routes under `auth:sanctum` middleware require Bearer token from `POST /api/auth/login`
- Validation errors return 422 with Indonesian messages
- Paginated endpoints return `{ data, meta: { current_page, last_page, total } }`
- API prefix: `/api`
- Rate limit: 60 req/min (config in `config/auth.php` throttle key; TA spec says 120)

### Key Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login (returns token) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| POST | `/api/teams` | Create team |
| GET | `/api/teams` | List user's teams |
| POST | `/api/teams/join` | Join via invite_code |
| GET | `/api/teams/{team}` | Show team detail |
| PUT | `/api/teams/{team}` | Update team (owner only) |
| PUT | `/api/teams/{team}/members/{member}/fmr` | Set member FMR (owner only) |
| POST | `/api/teams/{team}/members/{member}/exit` | Exit member (owner only) |
| POST | `/api/teams/{team}/freeze` | Freeze equity (owner only) |
| GET | `/api/teams/{team}/contributions` | List contributions (paginated) |
| POST | `/api/teams/{team}/contributions` | Create contribution (PENDING) |
| GET | `/api/teams/{team}/contributions/{contribution}` | Single contribution detail |
| POST | `/api/contributions/{contribution}/vote` | Vote APPROVE/REJECT |
| GET | `/api/teams/{team}/revenues` | List revenues (paginated) |
| POST | `/api/teams/{team}/revenues` | Create revenue (owner only) |
| POST | `/api/revenues/{revenue}/distribute` | Distribute profit (owner only) |
| POST | `/api/revenues/{revenue}/request-distribute` | Request distribution (any member) |
| POST | `/api/teams/{team}/fmr-proposals` | Propose FMR change |
| GET | `/api/teams/{team}/fmr-proposals` | List FMR proposals |
| POST | `/api/fmr-proposals/{proposal}/approve` | Approve FMR proposal (owner only) |
| POST | `/api/fmr-proposals/{proposal}/reject` | Reject FMR proposal (owner only) |
| GET | `/api/teams/{team}/equity` | Latest equity snapshot |
| GET | `/api/teams/{team}/equity/history` | Paginated snapshot history |
| GET | `/api/teams/{team}/equity/export` | PDF export (dompdf) |
| GET | `/api/teams/{team}/audit-logs` | Immutable audit trail (paginated) |
| GET | `/api/my-dashboard` | Dashboard summary |
| GET | `/api/ping` | Health check (public) |

---

## Core Business Logic

### FSM Flow: PENDING → APPROVED/REJECTED
- Contribution starts as PENDING directly (no DRAFT state)
- Only **other** team members can vote (creator cannot vote own claim)
- Threshold based on `team.approval_threshold` (50 = simple majority, 75 = supermajority, 100 = unanimous)
- **Tie-breaker**: team owner's casting vote wins; if owner is creator, falls back to longest-tenured active member
- Once APPROVED, `SlicingPieService::recalculate()` inserts a new `EquitySnapshot` row
- `ContributionApproval` model records each vote per member (no re-votes)

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

### Revenue & Distribution
- Revenues have `status`: `pending` → `distribute_requested` → `distributed`
- Any member can `POST /api/revenues/{revenue}/request-distribute`
- Owner approves via `POST /api/revenues/{revenue}/distribute`
- `ProfitDistribution` records each member's share (append-only, blocks update+delete)

### FMR Proposals
- Any member can propose FMR change; statuses: PENDING/APPROVED/REJECTED
- Owner approves/rejects. Once approved, `TeamMember.fmr` updated.

### Append-Only Ledger
- `AuditLog` model blocks `updating` and `deleting` events (INSERT ONLY)
- `EquitySnapshot` never updated — each APPROVED contribution creates a new row
- Contribution `total_slices` is immutable after creation (blocked in `booted()`)
- `ProfitDistribution` also blocks update + delete

### Models
- All models `use HasUuids`; all FKs are `foreignUuid`
- **10 Models**: User, Team, TeamMember, Contribution, ContributionApproval, EquitySnapshot, Revenue, ProfitDistribution, FmrProposal, AuditLog
- `Contribution` statuses: PENDING, APPROVED, REJECTED
- `TeamMember` statuses: active, exited; roles: owner, member
- `FmrProposal` statuses: PENDING, APPROVED, REJECTED
- `Revenue` statuses: pending, distribute_requested, distributed
- `Team` has `invite_code` (8 char), `approval_threshold` (50/75/100), `is_frozen`

### Broadcasting (Pusher) — **wired on client side**
| Event | Broadcast Name | Payload |
|-------|---------------|---------|
| `EquityUpdated` | `equity.updated` | snapshot_id, total_slices, equity_map, is_frozen, updated_at |
| `ContributionCreated` | `contribution.created` | id, type, description, value, member_name, status |
| `TeamUpdated` | `team.updated` | team_id, timestamp |

- All broadcast on `PresenceChannel('team.{teamId}')` as `ShouldBroadcastNow`
- Client: `usePusher()` hook in `DashboardLayout.tsx` handles all 3 events + presence members tracking (`onlineCount`)
- `RealtimeContext` provides `refreshVersion` + `triggerRefresh()` consumed by all tabs
- Requires `PUSHER_*` env vars; driver set via `BROADCAST_CONNECTION`
- Queue connection: `database` (default), needs `queue:listen` running

---

## Routing

### Backend (`routes/api.php`)
- All API routes in `routes/api.php` (no web routes for auth/views)
- `auth:sanctum` middleware — routes with `{team}` param get `team.member` middleware (`EnsureTeamMember`) that verifies active membership + attaches `TeamMember` to `$request->teamMember`
- Owner-only actions use `Gate::authorize('update', $team)` via `TeamPolicy`
- Public route: `GET /api/ping` (health check, no auth)

### Frontend (`src/App.tsx`)
| Path | Component | Note |
|------|-----------|------|
| `/` | `LandingPage` | Public landing |
| `/login` / `/register` | `AuthPage` | Public auth |
| `/dashboard` | `DashboardPage` | Protected, team list + summary |
| `/teams/:teamId` | `TeamDetailPage` | Outlet with 5 tabs |
| `/teams/:teamId/members` | `TeamMembersTab` | Member list + FMR management |
| `/teams/:teamId/contributions` | `ContributionsTab` | Contribution list + create |
| `/teams/:teamId/revenue` | `RevenueTab` | Revenue list + create + distribute |
| `/teams/:teamId/audit` | `AuditLogTab` | Append-only audit trail |
| `/teams/:teamId/settings` | `TeamSettingsTab` | Team config, freeze, invite |
| `/teams/:teamId/contributions/:contributionId` | `ContributionDetailPage` | Detail + voting |

- `ProtectedRoute` wraps all dashboard routes (redirects to `/login` if unauthenticated)
- `AuthContext` handles login state + token storage (localStorage)
- `TeamContext` manages `currentTeamId` + team list (persisted in localStorage)
- `RealtimeContext` wraps `DashboardLayout` to provide refresh triggers to all children

---

## Quirks & Constraints
- PHP 8.2 required (composer.json: `^8.2`)
- Migrations use `gen_random_uuid()` (PostgreSQL native); fails on MySQL unless you change default
- PDF export uses `barryvdh/laravel-dompdf` with `DejaVu Sans` font
- Storage link needed for invoice uploads: `php artisan storage:link`
- No dedicated tenant-scope global middleware — isolation relies on route model binding and manual checks
- SEIRIS-specific config in `config/seiris.php` reads `MAX_STUDENT_FMR` env var
- `composer.json` `post-install` and `dev` scripts use `npm` not `pnpm` (legacy), but frontend is pnpm — run `pnpm install` + `pnpm dev` separately if composer scripts fail
- Rate limiter in `config/auth.php` set to 60 req/min (TA document specifies 120); update if needed
- Seeders: `DatabaseSeeder.php` calls `DemoDataSeeder.php` which creates demo users + teams
- Composer `dev` script uses `npx concurrently` but runs `npm run dev` instead of `pnpm dev`
