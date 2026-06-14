# SEIRIS Frontend — TODO Progress

## Fase 0 — Inisialisasi & Struktur Proyek
- [x] Install dependencies (evilcharts/pie-chart, pusher-js, sonner, recharts, motion)
- [x] Setup shadcn + evilcharts
- [x] Buat folder structure (`api/`, `contexts/`, `hooks/`, `types/`, `pages/`)
- [x] Buat `api/axios.ts` dengan interceptor Bearer token & 401 redirect
- [x] Definisikan TypeScript types (`types/index.ts`)
- [x] Buat `AuthContext` (login, register, logout, auto-restore session)
- [x] Buat halaman `LoginPage`
- [x] Buat halaman `RegisterPage`
- [x] Buat halaman `DashboardPage` (scaffold dari `/api/my-dashboard`)
- [x] Buat `ProtectedRoute`
- [x] Update `App.tsx` dengan routing (`/`, `/login`, `/register`, `/dashboard`)
- [x] Update Navbar & CTA dengan Link ke `/login` & `/register`
- [x] Build sukses (tsc + vite)

## Fase 1 — Auth & Dashboard Polish
- [ ] Tambah validasi form frontend (min/max, email format, password match)
- [ ] Tampilkan error dari backend (422 field errors) di masing-masing input
- [ ] Loading state & disabled button saat submit
- [ ] Dashboard: card "Buat Tim Baru" modal
- [ ] Dashboard: card "Gabung Tim" (input invite code)
- [ ] Sidebar/navbar untuk halaman yang sudah login (nama user, daftar tim, logout)

## Fase 2 — Manajemen Tim
- [ ] Halaman `TeamDetailPage` (tabs layout)
- [ ] Tab Overview — info tim, invite code + copy button
- [ ] Tab Members — daftar anggota, role badge, FMR (owner bisa edit)
- [ ] Tab Settings — edit nama, deskripsi, threshold, freeze (owner only)
- [ ] `CreateTeamModal` — form buat tim baru
- [ ] `JoinTeamPage` — input invite code 8 karakter
- [ ] API: `GET /api/teams/{team}`, `PUT /api/teams/{team}`, `PUT .../fmr`, `POST .../freeze`, `POST .../exit`
- [ ] API: `POST /api/teams`, `POST /api/teams/join`

## Fase 3 — Contributions (FSM Core)
- [ ] Halaman `ContributionsPage` — daftar kontribusi (tab: Pending | Approved | Rejected | All)
- [ ] `ContributionCard` — type icon, value, slices, status badge
- [ ] `ContributionForm` — multi-step: pilih type → isi sesuai type (hours/amount/file)
- [ ] `ContributionDetailPage` — detail kontribusi + voting UI
- [ ] `VotePanel` — tombol APPROVE / REJECT + note
- [ ] `VoteBadge` — ikon per approval member
- [ ] `StatusBadge` — PENDING (kuning), APPROVED (hijau), REJECTED (merah)
- [ ] Filter by type, status, date
- [ ] Validasi: FMR=0 → disable TIME/IDEA/NETWORK
- [ ] API: `GET /api/teams/{team}/contributions`, `POST ...`, `GET .../{contribution}`
- [ ] API: `POST /api/contributions/{contribution}/vote`

## Fase 4 — Equity Dashboard (EvilCharts)
- [ ] Halaman `EquityPage` — equity saat ini
- [ ] `EquityPieChart` (evilcharts) — pie/donut chart equity_map per member
- [ ] `EquitySlicesTable` — tabel per member: nama, slices, equity %
- [ ] `EquityHistoryPage` — daftar snapshot
- [ ] `EquityHistoryTimeline` — line chart perubahan equity % dari waktu ke waktu
- [ ] `ExportPdfButton` — trigger download PDF
- [ ] `FrozenBadge` — indikator tim di-freeze
- [ ] API: `GET /api/teams/{team}/equity`, `GET .../history`, `GET .../export`

## Fase 5 — Revenue & Profit Distribution
- [ ] Halaman `RevenuesPage`
- [ ] `RevenueForm` — description, amount, distributable_amount, proof upload
- [ ] `RevenueCard` — ringkasan + status distribusi
- [ ] `DistributeButton` — owner only, konfirmasi modal
- [ ] `DistributionBreakdown` — tabel per member: nama, equity %, amount diterima
- [ ] API: `GET /api/teams/{team}/revenues`, `POST ...`, `POST /api/revenues/{revenue}/distribute`

## Fase 6 — Audit Log
- [ ] Halaman `AuditLogPage`
- [ ] `AuditLogItem` — icon per action, actor, time, payload
- [ ] `AuditLogFilter` — filter by action type, date range
- [ ] API: `GET /api/teams/{team}/audit-logs`

## Fase 7 — Realtime (Pusher)
- [ ] Setup `PusherContext` — subscribe ke presence channel tim
- [ ] Listen event `equity.updated` → auto-refresh equity & dashboard
- [ ] Tampilkan "X members online" (presence channel)
- [ ] Toast notification saat ada vote baru / status berubah

## Fase 8 — Polish & Testing
- [ ] Landing page: conditional Navbar (logged in → link dashboard, not → login/register)
- [ ] Responsive layout all pages
- [ ] Loading skeletons (evilcharts loading state di pie chart)
- [ ] Error boundaries & fallback UI
- [ ] Concurrency testing with JMeter (160 threads)
- [ ] SUS questionnaire integration
