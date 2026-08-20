# Seiris — Sistem Ekuitas Terdistribusi Berbasis FSM & Slicing Pie

Implementasi sistem distribusi ekuitas tim berdasarkan prinsip **Slicing Pie**, dikombinasikan dengan **Finite State Machine** (FSM) untuk alur klaim dan **append-only ledger** untuk audit trail.

---

## Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | React 19, Vite 8, TypeScript 6, Tailwind 4 |
| Auth | Sanctum (token-based) |
| Broadcasting | Pusher (presence channels) |
| PDF | Browser print (FE `ReportPage` → "Save as PDF") |
| DB | SQLite/PostgreSQL (row-level locking butuh PG) |
| Package | pnpm (FE), Composer (BE) |

---

## Struktur

```
seiris-be/   → Backend Laravel (12 models, ~35 API endpoints)
seiris-fe/   → Frontend React (10 pages, 25+ UI components)
```

---

## Setup

### Prasyarat
- PHP 8.2+, Composer
- Node.js 20+, pnpm
- Database (SQLite default, PostgreSQL untuk row-level locking)

### Backend

```bash
cd seiris-be
composer install
cp .env.example .env        # atur DB, MAX_STUDENT_FMR=150000
php artisan key:generate
php artisan migrate --seed
php artisan storage:link     # untuk upload proof (bukti kontribusi/revenue)
php artisan serve            # http://localhost:8000
```

### Frontend

```bash
cd seiris-fe
pnpm install
cp .env.example .env         # isi VITE_API_BASE_URL, VITE_PUSHER_*
pnpm dev                     # http://localhost:5173
```

### Dev Server (backend all-in-one)

```bash
cd seiris-be
composer run dev             # serve + queue:listen + pail (logs) + Vite concurrently
```

### Testing

```bash
cd seiris-be
composer run test            # config:clear → php artisan test (PHPUnit, SQLite :memory:)
```

> **Catatan:** Hanya 2 stub test bawaan Laravel (PHPUnit, SQLite `:memory:`). Skrip JMeter dan testing SUS belum tersedia.

---

## API Conventions

- Prefix: `/api`
- Auth: Bearer token dari `POST /api/auth/login`
- Rate limit: **120 req/min** (`throttle:api`), **30 req/min** (`throttle:write`), **5/email + 60/IP** (`throttle:auth`)
- Validation: 422 with Indonesian messages
- Pagination: `{ data, meta: { current_page, last_page, total } }`

### Key Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | Public (`throttle:auth`) |
| POST | `/api/auth/login` | Public (`throttle:auth`) |
| GET | `/api/ping` | Public |
| GET | `/api/teams/invite/{inviteCode}` | **Public** (preview undangan) |
| POST | `/api/auth/logout` | Sanctum |
| GET | `/api/auth/me` | Sanctum |
| GET | `/api/config` | Sanctum (feature flags) |
| POST | `/api/broadcasting/auth` | Sanctum (Pusher) |
| PATCH | `/api/users/me/profile` | Sanctum (multipart) |
| PATCH | `/api/users/me/github-token` | Sanctum |
| GET | `/api/my-dashboard` | Sanctum |
| POST | `/api/teams` | Sanctum |
| GET | `/api/teams` | Sanctum |
| POST | `/api/teams/join` | Sanctum |
| GET | `/api/teams/{team}` | Team member |
| PUT | `/api/teams/{team}` | Owner only |
| POST | `/api/teams/{team}/freeze` | Owner only |
| POST | `/api/teams/{team}/members/{member}/fmr` | Owner only |
| POST | `/api/teams/{team}/members/{member}/exit` | Owner only |
| GET | `/api/teams/{team}/contributions` | Team member |
| POST | `/api/teams/{team}/contributions` | Team member |
| GET | `/api/teams/{team}/contributions/{contribution}` | Team member |
| POST | `/api/teams/{team}/contributions/{contribution}/proof` | Team member¹ |
| GET | `/api/teams/{team}/contributions/{contribution}/github-diff` | Team member¹ |
| POST | `/api/contributions/{contribution}/vote` | Team member |
| GET | `/api/teams/{team}/revenues` | Team member |
| GET | `/api/teams/{team}/revenues/{revenue}` | Team member |
| POST | `/api/teams/{team}/revenues` | Owner only |
| POST | `/api/revenues/{revenue}/distribute` | Owner only |
| POST | `/api/revenues/{revenue}/request-distribute` | Team member |
| POST | `/api/teams/{team}/fmr-proposals` | Team member |
| GET | `/api/teams/{team}/fmr-proposals` | Team member |
| POST | `/api/fmr-proposals/{proposal}/approve` | Owner only |
| POST | `/api/fmr-proposals/{proposal}/reject` | Owner only |
| GET | `/api/teams/{team}/equity` | Team member |
| GET | `/api/teams/{team}/equity/history` | Team member |
| GET | `/api/teams/{team}/audit-logs` | Team member |
| GET/POST | `/api/teams/{team}/projects` | Team member / Owner |
| GET/POST | `/api/teams/{team}/projects/{project}/contributions` | Project member |
| GET/POST | `/api/teams/{team}/projects/{project}/revenues` | Project member |
| GET | `/api/teams/{team}/projects/{project}/equity` | Project member |
| POST/DELETE | `/api/teams/{team}/projects/{project}/members` | Owner only |

> ¹ = Guarded by feature flag `contribution_proof`. All project-scoped routes also available under `teams/{team}/projects/{project}/...`.

---

## Core Business Logic

### FSM Flow: PENDING → APPROVED / REJECTED

- Kontribusi langsung `PENDING` (tanpa DRAFT)
- Hanya **anggota lain** yang bisa vote (creator gak bisa vote klaim sendiri)
- Threshold: `team.approval_threshold` (50=mayoritas sederhana, 100=bulat; 75 dihapus)
- **Tie-breaker:** Suara owner menang. Jika owner adalah creator, fallback ke anggota aktif dengan **tenure terlama** (`created_at`)
- Status `APPROVED` → `SlicingPieService::recalculate()` insert `EquitySnapshot` baru

### Slicing Pie Engine

| Tipe | Multiplier | Rumus |
|------|-----------|-------|
| CASH | ×4 | `amount` |
| TIME / IDEA / NETWORK | ×2 | `hours × FMR` |
| FACILITY | ×2 | `amount` |
| SALES | ×2 | `(deal - estimated) × commission_rate%` |

- Equity % = `(member_slices / total_team_slices) × 100`
- **FMR** (Fair Market Rate) cap: `MAX_STUDENT_FMR=150000` IDR/jam
- FMR=0 blokir kontribusi TIME/IDEA/NETWORK

### Revenue & Distribution

- Status: `pending` → `distribute_requested` → `distributed`
- Anggota bisa `request-distribute`, owner approve via `distribute`
- `ProfitDistribution` bersifat **append-only** (block update+delete)

### Concurrency

- Semua `store`/`vote` dibungkus `DB::transaction()` + `lockForUpdate()` pada row team
- **Row-level locking butuh PostgreSQL.** SQLite fallback gak provide ini.

### Append-Only Ledger

- `AuditLog` — block `updating` + `deleting`
- `EquitySnapshot` — gak pernah di-update, tiap APPROVED bikin baris baru
- `Contribution.total_slices` — immutable setelah dibuat
- `ProfitDistribution` — append-only

### Broadcasting (Pusher)

| Event | Channel | Payload |
|-------|---------|---------|
| `EquityUpdated` | `presence-team.{id}` | snapshot_id, total_slices, equity_map, is_frozen |
| `ContributionCreated` | `presence-team.{id}` | id, type, description, value, member, status |
| `TeamUpdated` | `presence-team.{id}` | team_id, timestamp |

Client: `usePusher()` hook di `DashboardLayout` handle 3 events + presence members.

---

## Models (12, semua pake HasUuids)

- User, Team, TeamMember, Contribution, ContributionApproval
- EquitySnapshot, Revenue, ProfitDistribution, FmrProposal, AuditLog
- Project, ProjectMember (Slicing Pie Beranak — nested pies)

### Status Enums

- `Contribution`: PENDING / APPROVED / REJECTED
- `TeamMember`: active / exited ; roles: owner / member
- `FmrProposal`: PENDING / APPROVED / REJECTED
- `Revenue`: pending / distribute_requested / distributed

---

## Quirks

- `.env.example` default pake SQLite. Row-level locking butuh PostgreSQL.
- `QUEUE_CONNECTION=database` di `.env.example` — butuh `queue:listen` jalan.
- `composer run dev` pake `npm` legacy. Frontend tetep `pnpm` — jalanin manual kalo script gagal.
- Migrations pake `gen_random_uuid()` (PostgreSQL native). Gagal di MySQL.
- Storage link: `php artisan storage:link` untuk proof uploads (bukti kontribusi/revenue) dan foto profil.
- **Invite flow**: `GET /api/teams/invite/{inviteCode}` **publik** (tanpa auth). Info terbatas (nama, deskripsi, jumlah anggota, owner). FE JoinPage di `/join/:inviteCode` + AuthPage dukung `?redirect=`.
- **Share modal**: `ShareInviteModal` (portal) di dashboard — Copy link, WhatsApp, Gmail.
- **UserAvatar**: komponen reusable `@/components/ui/UserAvatar` — fallback inisial jika `profile_photo_url` null/error.
- **Feature flag**: `config.seiris.features.contribution_proof` — guard proof/diff routes + FE UI.

---

*Terakhir diupdate: 2026-07-20 — sinkron dengan codebase.*
