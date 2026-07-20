# DECISIONS (ADR) — SEIRIS

> Diambil dari `CLAIMS_V2.md` per 2026-07-20. Setiap item: keputusan + alasan singkat + status.

## Arsitektur & Model Domain
- **ADR-001 Slicing Pie Beranak** — 1 Tim induk → banyak Project (pie anak), tiap scope `EquitySnapshot` immutable, agregat tim = total project (zero-loss). ✅
- **ADR-002 Multiplier Moyer** — CASH×4, NON-CASH (TIME/IDEA/NETWORK/FACILITY/SALES)×2. ✅
- **ADR-003 SALES = komisi markup** — `(deal − estimasi) × rate`, bukan REVENUE murni (legacy dihapus). ✅
- **ADR-004 Per-scope snapshot immutable** — tiap scope (tim/project) hasilkan `EquitySnapshot` yang tak pernah diupdate. ✅
- **ADR-005 total_slices immutable** — `Contribution.total_slices` dikunci via `boot()` guard (tak bisa diubah setelah create). ✅
- **ADR-006 Self-vote dilarang** — pembuat kontribusi tak bisa vote miliknya sendiri. ✅
- **ADR-007 Voting dipagar per-project** — hanya `project_members` roster yg boleh vote/kontribusi di project tsb. ✅
- **ADR-008 Tie-breaker owner** — owner casting vote; fallback tenure terlama; **hanya diputuskan saat semua voter sudah vote**. ✅
- **ADR-009 Freeze mengunci pie** — vote & kontribusi baru diblokir setelah freeze; tim freeze butuh semua project sudah frozen. ✅
- **ADR-010 Pessimistic locking** — `lockForUpdate()` + DB transaction cegah race voting/distribusi. **Butuh PostgreSQL** (SQLite tak dukung row-lock). ✅
- **ADR-011 Per-project FMR** — `project_members.fmr` menimpa `TeamMember.fmr` per project. ✅

## Security
- **ADR-012 Sanctum Bearer** — semua route terproteksi `auth:sanctum` (kecuali `/ping`, auth). ✅
- **ADR-013 Rate limiting bertingkat** — `api`=120, `write`=30, `auth`=5/email+60/ip. ✅
- **ADR-014 IDOR request-distribute tertutup** — hanya anggota tim yg boleh ajukan distribusi (cek manual di controller). ✅
- **ADR-015 Append-only ledger** — AuditLog / EquitySnapshot / ProfitDistribution (+ Contribution) tak bisa diupdate/delete. ✅
- **ADR-016 FMR cap** — `MAX_STUDENT_FMR` (150.000) divalidasi di layer validasi + hard 422. ✅

## Revenue & Distribution
- **ADR-017 Alur distribusi** — member ajukan → owner setujui → bagi per `equity_pct` snapshot saat distribusi. ✅
- **ADR-018 Concurrent distribute aman** — row lock + status guard. ✅
- **ADR-019 Bad-leaver recovery** — slice non-cash hilang untuk leaver "bad" (cash tetap). ✅
- **ADR-020 Distribusi per-scope** — `Revenue::distributableSnapshot()` wajib ada snapshot valid untuk scope (project_id atau tim) sebelum distribute. ✅

## Real-time & UX
- **ADR-021 Pusher events** — `equity.updated`, `contribution.created`, `team.updated` via `PresenceChannel('team.{id}')`. ✅
- **ADR-022 Online count** — presence members tracking → `onlineCount` di UI. ✅

## Database & Deploy
- **ADR-023 PostgreSQL-only** — `gen_random_uuid()`, `lockForUpdate()` butuh PostgreSQL; SQLite hanya untuk test. ✅
- **ADR-024 PDF export** — `barryvdh/laravel-dompdf` + font DejaVu Sans. ✅
- **ADR-025 Backend jalan CLI SAPI** — `php artisan serve`, bukan php-fpm → upload limit di `php-cli/php.ini`, nginx butuh `client_max_body_size`. ✅
- **ADR-026 Proof field naming** — Contribution menggunakan `proof_path` + `proof_url` (mirrored dari Revenue). Legacy `invoice_*`/`actual_amount` di‑drop, jangan gunakan lagi. ✅
- **ADR-027 Public invite preview** — `GET /teams/invite/{inviteCode}` publik (tanpa auth) agar calon anggota bisa lihat info tim sebelum login. Data terbatas (nama, deskripsi, jumlah anggota, owner) — tidak bocorkan invite_code atau data sensitif. ✅
- **ADR-028 Share via modal portal** — Modal share (Copy/WA/Gmail) dirender via `createPortal` ke `document.body` untuk menghindari masalah CSS `transform` ancestor dan konsisten dengan pattern modal lain. ✅
- **ADR-029 UserAvatar reusable** — Semua foto anggota via komponen `<UserAvatar>` (img → fallback inisial). Hindari duplikasi logika load-error + inisial di 8 tempat. ✅
- **ADR-030 Revenue detail page** — RevenueDetailPage sebagai halaman sendiri (bukan modal) untuk konsistensi dengan ContributionDetailPage. ✅
