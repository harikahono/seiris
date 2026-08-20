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
- **ADR-024 PDF export** — ~~`barryvdh/laravel-dompdf` + font DejaVu Sans~~ **SUPERSEDED (ADR-029)**. Dihapus: backend `equity/export`, blade `equity-report`, dep dompdf → diganti laporan `ReportPage` di FE (print browser, `/teams/:teamId/report`). ✅
- **ADR-025 Backend jalan CLI SAPI** — `php artisan serve`, bukan php-fpm → upload limit di `php-cli/php.ini`, nginx butuh `client_max_body_size`. ✅
- **ADR-026 Proof field naming** — Contribution menggunakan `proof_path` + `proof_url` (mirrored dari Revenue). Legacy `invoice_*`/`actual_amount` di‑drop, jangan gunakan lagi. ✅
- **ADR-027 Public invite preview** — `GET /teams/invite/{inviteCode}` publik (tanpa auth) agar calon anggota bisa lihat info tim sebelum login. Data terbatas (nama, deskripsi, jumlah anggota, owner) — tidak bocorkan invite_code atau data sensitif. ✅
- **ADR-028 Share via modal portal** — Modal share (Copy/WA/Gmail) dirender via `createPortal` ke `document.body` untuk menghindari masalah CSS `transform` ancestor dan konsisten dengan pattern modal lain. ✅
- **ADR-029 UserAvatar reusable** — Semua foto anggota via komponen `<UserAvatar>` (img → fallback inisial). Hindari duplikasi logika load-error + inisial di 8 tempat. ✅
- **ADR-030 Revenue detail page** — RevenueDetailPage sebagai halaman sendiri (bukan modal) untuk konsistensi dengan ContributionDetailPage. ✅
- **ADR-031 Project creation lock + unique name** — 3 lapis cegah duplikat project: (a) `lockForUpdate` di transaksi, (b) `Rule::unique` di form request, (c) unique constraint `(team_id, name)` di DB. Menutup celah race yang bikin 5+ project nama sama saat jaringan lambat. ✅
- **ADR-032 Partial unique FMR proposal** — Partial unique index `(member_id) WHERE status = 'PENDING'` + `lockForUpdate` pada `teams` row di dalem transaksi `store()`. Cegah 2 proposal PENDING untuk member yg sama akibat TOCTOU race. ✅
- **ADR-033 Guard stale status pada attachProof** — `ContributionController::attachProof()` dulunya pakai in-memory model untuk cek `status === 'PENDING'`, bisa kena race vote concurrent. Fix: `WHERE status = 'PENDING'` di query update + `fresh()`. ✅
- **ADR-034 Team logo** — Tim mendapat `logo_path` (mirip `profile_photo_path` user), accessor `logo_url`, endpoint `POST /teams/{team}/logo`, dan UI upload di TeamSettingsTab. ✅
- **ADR-035 Filter & search pada kontribusi & audit log** — Contribution index tambah param: `search`, `type`, `member_id`, `date_from`, `date_to`, `per_page`. Audit log tambah: `search`, `date_from`, `date_to`, `per_page`. FE: search input + filter dropdown + date range picker. ✅
- **ADR-036 Revenue/distribusi butuh min 2 anggota tim** — Revenue store + distribute diblokir 422 kalau `activeMembers()->count() < 2`. Owner sendiri boleh kontribusi, tapi gak bisa catat revenue atau distribusi. ✅
- **ADR-037 Exit member lock** — `TeamController::exitMember()` pindahin check `status !== 'exited'` ke DALEM transaction + `lockForUpdate` pada `team_members` row. Cegah double-exit race. ✅
- **ADR-038 Modal unification** — 9 modals diseragamkan: `bg-black/60 backdrop-blur-sm z-50`, card `bg-card border-gray-700 shadow-2xl`. Semua pakai `useModalAnimation` (150ms exit scale-down). 3 inline modal di-portal ke `document.body`. Click-outside close di modal tanpa tombol X yang jelas. `useFocusTrap` dipanggil dengan `show` (bukan `open`) agar trap aktif selama exit animation. ✅
- **ADR-039 TypeScript build gotchas** — Error umum `pnpm build` yang selalu terulang dan cara cegahnya:
  - **Unused import (TS6133)**: Jangan biarkan import `Loader2`, `Plus`, `cn`, dll menganggur. Hapus sebelum commit, atau jangan import dulu sampai benar-benar dipakai.
  - **Duplicate JSX attribute (TS17001)**: Saat nambah `title` ke elemen yang udah punya `title`, cek dulu apakah atribut udah ada. Ganti yang lama, jangan tambah baru.
  - **`title` di Lucide icon (TS2322)**: `title` bukan prop valid untuk komponen SVG Lucide (`LucideProps`). Kalau perlu tooltip, bungkus `<span title="...">` di luar ikon, jangan langsung di `<Lock>`, `<X>`, dll.
  - **Prop `size` invalid (TS2322)**: `UserAvatar` cuma nerima `xs | sm | md | lg`. Jangan pake `xl`. Kalau butuh lebih besar, pake `lg` + CSS.
  - **Dead code refactor**: Saat hapus state variable (misal `team`), cek juga semua panggilan `setTeam(...)` di body — hapus atau ganti. Jangan tinggalin dangling reference. ✅
- **ADR-040 Double-submit guard di handler, bukan cuma `disabled`** — `disabled={loading}` cegah mouse click, tapi tidak cegah Enter key, programmatic submit, atau rapid double-tap. Tiap async submit handler WAJIB punya `if (loading) return;` di baris pertama, sebelum setErrors/validasi lain. Commit `edaf35c`. ✅
- **ADR-041 Event-driven logout sync, ganti polling** — `TeamContext.tsx` polling localStorage tiap 500ms. Diganti `window.addEventListener('storage')` (cross-tab) + `CustomEvent('seiris:teams-cleared')` (same-tab). Nol interval, nol polling. Commit `edaf35c`. ✅
- **ADR-042 activeRef guard untuk setState setelah unmount** — Detail pages (RevenueDetailPage, ContributionDetailPage, MemberDetailPage, DashboardPage) punya realtime fetch tanpa guard. `useRef(true)`, cleanup set false, tiap fetch handler cek `if (!activeRef.current) return`. Cegah React 18+ warning dan state corruption. Commit `edaf35c`. ✅
- **ADR-043 fetchingRef guard untuk realtime vs pagination race** — RevenueTab & ContributionsTab punya 2 useEffect (page change + realtime). `fetchingRef.current = true` sebelum fetch di page effect, realtime effect skip kalo `fetchingRef.current === true`. Cegah nampilin data dari page berbeda. Commit `edaf35c`. ✅
- **ADR-029 PDF export pindah ke FE (browser print)** — dompdf jelek render SVG/emoji/font (pie chart rusak, tofu). Export `equity/export` + blade `equity-report` + `barryvdh/laravel-dompdf` dihapus. Gantinya `ReportPage` (`/teams/:teamId/report?project=&print=1`) — halaman React light-theme, pie SVG + bar chart + tabel kontribusi/revenue, `window.print()` → browser render → "Save as PDF". `document.title` jadi nama file. Nol dependency baru. ✅
