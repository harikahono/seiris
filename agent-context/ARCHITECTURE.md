# ARCHITECTURE — SEIRIS

> Diambil dari kode per 2026-07-14. Untuk detail bisnis baca `DOMAIN_LOGIC.md`, untuk endpoint baca `API_CONTRACTS.md`.

## Stack

**Backend** (`seiris-be/`) — Laravel 12, PHP 8.2+, SQLite untuk test (`phpunit.xml`), **PostgreSQL di produksi** (wajib, lihat `GOTCHAS.md`).
- Auth: Laravel Sanctum (Bearer token).
- Broadcasting: Pusher (`ShouldBroadcastNow` pada `PresenceChannel`).
- Engine ekuitas: `app/Services/SlicingPieService.php`.

**Frontend** (`seiris-fe/`) — React 19 + Vite 8 + TypeScript 6 + Tailwind 4, package manager **pnpm**.
- `@/` → `src/` (vite alias).
- State: `AuthContext`, `TeamContext`, `ProjectContext`, `RealtimeContext`.
- API client: `src/lib/api.ts` (base URL `VITE_API_BASE_URL`, default `http://localhost:8000/api`).

## Folder convention

```
seiris-be/
  app/
    Models/            # 12 Eloquent models (HasUuids)
    Http/
      Controllers/Api/ # 1 file per resource
      Resources/       # API resource transformers (8 class)
      Middleware/      # EnsureTeamMember, EnsureProjectMember
    Services/
      SlicingPieService.php
    Providers/AppServiceProvider.php  # RateLimiter definitions
  routes/api.php       # SEMUA route API
  config/seiris.php    # MAX_STUDENT_FMR dll

seiris-fe/
  src/
    components/        # ui/ (primitives) + teams/ (tabs)
    contexts/          # Auth, Team, Project, Realtime
    hooks/usePusher.ts
    types/index.ts     # semua interface FE
    lib/{api,constants}.ts
    App.tsx            # route table
```

## Data flow

```
FE component
  -> src/lib/api.ts (Bearer token)
  -> Laravel route (routes/api.php)
      -> middleware auth:sanctum + throttle + team.member / project.member
      -> Controller (validasi FormRequest)
      -> SlicingPieService::recalculate() bila status berubah
      -> Model (DB, PostgreSQL)
  -> Resource (JSON)
  -> FE Context / state -> re-render
Pusher event (equity.updated / contribution.created / team.updated)
  -> usePusher -> RealtimeContext.triggerRefresh() -> semua tab re-fetch
```

## Slicing Pie Beranak (nested pie)

Arsitektur inti: **1 Team induk -> banyak Project (pie anak)**.

- Setiap scope (tim OR project) menghasilkan `EquitySnapshot` **immutable** (`equity_snapshots.project_id` null = tim, terisi = project).
- `SlicingPieService::recalculate($team)` = agregat slic tim-level (`project_id IS NULL`) + **semua** snapshot project terbaru -> prinsip **zero-loss** (total tim = jumlah seluruh project, tak ada yang terbuang).
- `recalculate($team, $contribution, $project)` = scope project saja; setelah snapshot project dibuat, **cascade** ke `recalculate($team)` agar induk ikut re-agregat.
- Freeze: tim hanya bisa di-freeze bila **semua** project sudah frozen.

Detail formula & FSM -> `DOMAIN_LOGIC.md`.

## Realtime

- Channel: `PresenceChannel('team.{teamId}')` (FE subscribe `presence-team.{teamId}` — prefix `presence-` otomatis dari Pusher).
- 3 event: `equity.updated`, `contribution.created`, `team.updated`.
- `DashboardLayout` consume -> `triggerRefresh()` + toast; presence members -> `onlineCount`.
- Butuh env `VITE_PUSHER_*` + `BROADCAST_CONNECTION=pusher` + `queue:listen` jalan (event `ShouldBroadcastNow`).

## Deploy note (penting)

Backend jalan via **`php artisan serve` (CLI SAPI)**, BUKAN php-fpm. Artinya:
- Limit upload = `upload_max_filesize`/`post_max_size` di **`php-cli/php.ini`**, bukan fpm.
- nginx site butuh `client_max_body_size 20M;` (default 1M -> 413).
- Lihat `GOTCHAS.md` + `VPS_DEPLOY.md`.
