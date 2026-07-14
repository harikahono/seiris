# GOTCHAS — SEIRIS

> Trap yang sudah bikin bug / salah asumsi. Diambil dari `CLAIMS_V2.md` (caveats) + `AGENTS.md` quirks + temuan sesi 2026-07-14. Baca ini SEBELUM ngubah kode.

## Database & Deploy
- **PostgreSQL wajib di produksi.** Migrasi pakai `gen_random_uuid()` & `lockForUpdate()` (row-level lock) — **gagal di MySQL/SQLite**. SQLite hanya untuk test (`:memory:`). Jangan deploy ke SQLite.
- **Backend jalan CLI SAPI (`php artisan serve`), BUKAN php-fpm.** Upload limit = `upload_max_filesize`/`post_max_size` di **`php-cli/php.ini`** (bukan fpm). Ubah lalu restart service `seiris-backend`.
- **nginx butuh `client_max_body_size 20M;`** di site `seiris` (default 1M → **413** pas upload bukti revenue). Setelah ubah: `nginx -t && systemctl reload nginx`.
- `php artisan storage:link` perlu dijalankan agar upload bukti (`proof_path`) keakses via URL.

## AGENTS.md SUDAH STALE — jangan percaya buta
- **Models = 12, bukan 10.** `Project` + `ProjectMember` nyata (Slicing Pie Beranak). Tabel endpoint AGENTS.md kehilangan SELURUH route `/projects/...` + `/api/broadcasting/auth`.
- **Tipe kontribusi:** `CASH, TIME, IDEA, NETWORK, FACILITY, SALES`. Tidak ada `REVENUE` (itu legacy, sisa `invoice_amount`/`invoice_url` di FE). `SALES` = `(deal−estimasi)×rate`.
- **`exitMember` = POST**, bukan PUT (AGENTS.md salah).
- **`EquitySnapshotResource` TIDAK ADA** — endpoint equity balikin array inline.
- **Rate limit = `api` 120 / `write` 30 / `auth` 5-per-email+60-per-ip**, didefinisikan di `AppServiceProvider::RateLimiter`, BUKAN `config/auth.php`. AGENTS.md bilang "60/min" — salah.

## Frontend traps
- **`notProjectMember` JANGAN di-re-declare di `RevenueCard.tsx`.** Base sudah mendeklarasikannya (`const notProjectMember = isProjectMember === false;`). Nambah lagi → `TS2451: Cannot redeclare`. `isProjectMember` di-pass dari `RevenueTab` (`isCurrentUserProjectMember`).
- **`git add -p` unreliable** untuk hunk campuran di `RevenueCard.tsx` (proof vs gate). Kalau mau split commit bersih, lebih aman revert ke base lalu re-apply sebagian.
- **Naming FE ≠ BE:** FE pakai `EquityData` (bukan `EquitySnapshot`), `RevenueDistribution` (bukan `ProfitDistribution`), `ProjectItem` (bukan `Project`). Waktu ngetik tipe, pakai nama FE.
- **Inkonsistensi scoping project di FE:** Contributions/Revenue/Equity pakai **path-based** (`/teams/{id}/projects/{pid}/...` via `basePath`), tapi **AuditLogTab + TeamMembersTab pakai query param `project_id`**. Pastikan BE dukung kedua gaya (memang begitu: audit filter `project_id`, team show terima `project_id`).
- **`project_fmr` menentukan keanggotaan project:** FE anggap "project member" = `project_fmr !== null`. Pastikan BE populate `project_fmr` benar untuk roster project, `null` untuk non-roster.
- **Endpoint path di-hardcode** sebagai string literal di komponen (tidak ada central route map). Kalau ganti nama route BE, grep seluruh `seiris-fe/src`.
- **Pusher:** butuh `VITE_PUSHER_*` + `BROADCAST_CONNECTION=pusher` + `queue:listen` jalan. Channel FE = `presence-team.{id}` harus cocok dengan BE `team.{id}`. Bila env Pusher absen, realtime silently mati (no UI fallback).
- **`Revenue.distributable` optional** (`distributable?`). FE gate tombol distribusi: `canDistribute = revenue.distributable ?? hasEquity ?? false`. Pastikan BE mengembalikan `distributable` (sudah ada di `RevenueResource`).

## Domain traps
- **FMR = 0 memblokir** kontribusi `TIME`/`IDEA`/`NETWORK` (controller). `CASH`/`FACILITY`/`SALES` tetap boleh.
- **Append-only:** `AuditLog`, `EquitySnapshot` (hanya `is_frozen` yg mutable), `ProfitDistribution`, `Contribution` (delete diblokir + `total_slices` immutable). Jangan bikin endpoint update/delete untuk ini.
- **Freeze tim diblokir bila ada project aktif.** Freeze project dulu.
- **Tie-breaker hanya saat semua voter sudah vote.** Jangan panggil `handleTieBreaker` sebelum itu.
- **Bad-leaver:** slice non-cash = 0 di `recalculate()`; slice cash tetap dihitung.
- **`Contribution.value`/`hours`/dsb boleh berubah di model, tapi `total_slices` tidak** — slice final dihitung ulang saat APPROVED lewat `recalculate()`.
- **Distribusi butuh snapshot scope:** `Revenue::distributableSnapshot()` null → distribute 422. Untuk revenue project-scoped, harus ada snapshot `project_id` sama.
