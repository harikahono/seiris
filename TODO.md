# SEIRIS — Progress

## Fase 0 — Inisialisasi & Struktur Proyek
- [x] Install dependencies
- [x] Setup folder structure (`api/`, `contexts/`, `hooks/`, `types/`, `pages/`)
- [x] `api/axios.ts` dengan interceptor Bearer token & 401 redirect
- [x] TypeScript types (`types/index.ts`)
- [x] `AuthContext` (login, register, logout, auto-restore session)
- [x] Halaman Auth (login/register)
- [x] `ProtectedRoute`
- [x] Routing (`/`, `/login`, `/register`, `/dashboard`, `/teams/:teamId/*`)
- [x] Build sukses (tsc + vite)

## Fase 1 — Auth & Dashboard
- [x] Validasi form frontend + 422 error fields
- [x] Loading state & disabled button
- [x] Dashboard: card "Buat Tim Baru" + "Gabung Tim"
- [x] Sidebar/navbar (nama user, daftar tim, logout)

## Fase 2 — Manajemen Tim
- [x] `TeamDetailPage` (tabs layout via Outlet)
- [x] Tab Members — daftar, role badge, edit FMR
- [x] Tab Settings — edit nama, deskripsi, threshold, freeze
- [x] `CreateTeamModal` + team picker
- [x] API integration: show, update, updateFmr, freeze, exit

## Fase 3 — Contributions (FSM Core)
- [x] `ContributionsTab` — list + filter (All/Pending/Approved/Rejected)
- [x] `ContributionCard` — type icon, value, slices, status badge
- [x] `ContributionForm` — multi-step
- [x] `ContributionDetailPage` + `VotePanel`
- [x] `StatusBadge` — PENDING/APPROVED/REJECTED
- [x] Validasi: FMR=0 → disable TIME/IDEA/NETWORK
- [x] API integration: create, list, detail, vote

## Fase 4 — Equity Dashboard
- [x] `EquityPieCard` — pie chart
- [x] `ContributionTypeBar` — bar per tipe kontribusi
- [x] `MemberEquityTable` — tabel anggota
- [x] `ExportPdfButton` — download PDF

## Fase 5 — Revenue & Profit Distribution
- [x] `RevenueTab` — list + create
- [x] `CreateRevenueForm` — modal
- [x] `RevenueCard` — card + distribusi
- [x] API integration: create, list, distribute

## Fase 6 — Audit Log
- [x] `AuditLogTab` — list + filter by category
- [x] `AuditLogEntry` — icon per action, actor, payload
- [x] API integration: `GET /api/teams/{team}/audit-logs?filter=...`

## Fase 7 — Realtime (Pusher)
- [x] Fix 403 Pusher auth — buat `BroadcastServiceProvider`
- [x] `usePusher` hook — subscribe ke presence channel
- [x] Listen `equity.updated` → auto-refresh equity
- [x] Events: `ContributionCreated`, `TeamUpdated`, `EquityUpdated`
- [x] Broadcast dari 9 controller methods
- [x] Toast notification `contribution.created`
- [x] Pagination component (5 page numbers + ellipsis)
- [ ] Tampilkan "X members online" — belum

## Fase 8 — Code Quality
- [x] Code review Fase 1-3: dead code, console.log, error handling
- [x] Extract `parseErrors()` utility
- [x] Fix non-null assertions (`user!`, `root!`)
- [x] Fix `setTimeout` cleanup
- [x] ESLint: 0 errors (17 pre-existing suppressed)

## Fase 9 — Ponytail Audit
- [x] Hapus 4 dead config files (mail, services, cache, session)
- [x] Hapus dead routes (web.php, console.php, welcome.blade.php)
- [x] Hapus `User::$avatar` dead field
- [x] Hapus unused constructor injection + dead config keys
- [x] Hapus debug `Log::info` noise
- [x] TeamPolicy wrapper methods → `update()` langsung
- [x] Hapus 3 unused types frontend
- [x] Hapus dead route `/teams/:teamId/equity`
- [x] Fix missing `isAxiosError` import
- [x] Hapus dep `class-variance-authority` (0 imports)

## Fase 10 — Bug Fixes
- [x] Flicker halaman tim — `fetchTeam` trigger skeleton tiap re-fetch

## Todo (belum)
- [ ] Tampilkan "X members online" (presence channel user count)
- [ ] Error boundaries & fallback UI
- [ ] `strict: true` di tsconfig
- [ ] Extract constants (`src/lib/constants.ts`)
- [ ] Concurrency testing with JMeter
- [ ] SUS questionnaire
