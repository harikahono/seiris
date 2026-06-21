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
- [x] Tambah validasi form frontend (min/max, email format, password match)
- [x] Tampilkan error dari backend (422 field errors) di masing-masing input
- [x] Loading state & disabled button saat submit
- [x] Dashboard: card "Buat Tim Baru" modal
- [x] Dashboard: card "Gabung Tim" (input invite code)
- [x] Sidebar/navbar untuk halaman yang sudah login (nama user, daftar tim, logout)

## Fase 2 — Manajemen Tim
- [x] Halaman `TeamDetailPage` (tabs layout)
- [x] Tab Overview — info tim, invite code + copy button
- [x] Tab Members — daftar anggota, role badge, FMR (owner bisa edit)
- [x] Tab Settings — edit nama, deskripsi, threshold, freeze (owner only)
- [x] `CreateTeamModal` — form buat tim baru
- [x] Sidebar direstruktur: navigasi berbasis fitur (bukan tab horizontal)
- [x] Team picker popover — klik fitur → pilih tim → navigate
- [x] TeamDetailPage jadi layout route — Outlet + context
- [x] `JoinTeamCard` — input invite code 8 karakter
- [x] Route `/teams/:teamId` di bawah DashboardLayout
- [x] API integration: show, update, updateFmr, freeze, exit

## Fase 3 — Contributions (FSM Core)
- [x] Halaman ContributionsTab — daftar kontribusi (filter: All | Pending | Approved | Rejected)
- [x] `ContributionCard` — type icon, value, slices, status badge
- [x] `ContributionForm` — multi-step: pilih type → isi sesuai type (hours/amount/file)
- [x] `ContributionDetailPage` — detail kontribusi + voting UI
- [x] `VotePanel` — tombol APPROVE / REJECT + note
- [x] `StatusBadge` — PENDING (kuning), APPROVED (hijau), REJECTED (merah)
- [x] Filter by status (tab buttons)
- [x] Validasi: FMR=0 → disable TIME/IDEA/NETWORK (type selector)
- [x] Route `/teams/:teamId/contributions/:contributionId`
- [x] API integration: create, list, detail, vote

## Fase 4 — Equity Dashboard (EvilCharts)
- [x] Sidebar item "Equity" baru (antara Overview & Anggota)
- [x] Route `/teams/:teamId/equity`
- [x] `EquityPieCard` — EvilPieChart donut (paddingAngle, cornerRadius, innerRadius)
- [x] `ContributionTypeBar` — Recharts horizontal bars per tipe kontribusi
- [x] `MemberEquityTable` — tabel anggota: nama, role, slices, equity %, bar visual
- [x] `ExportPdfButton` — download PDF equity

## Fase 5 — Revenue & Profit Distribution
- [x] Sidebar item "Revenue" baru (antara Kontribusi & Pengaturan)
- [x] Route `/teams/:teamId/revenue`
- [x] `RevenueTab` — halaman utama (list revenue + create button)
- [x] `CreateRevenueForm` — modal: deskripsi, amount, distributable_amount, date, proof
- [x] `RevenueCard` — card revenue + rincian distribusi + tombol distribusi
- [x] Frontend validation + 422 backend errors
- [x] API integration: create, list, distribute

## Fase 6 — Audit Log
- [x] Sidebar item "Audit Log" baru (antara Revenue & Pengaturan)
- [x] Route `/teams/:teamId/audit`
- [x] `AuditLogTab` — halaman utama (list + filter by category)
- [x] `AuditLogEntry` — komponen per log: icon per action, actor name, timestamp, payload
- [x] Backend: filter param `?filter=vote` → `action LIKE 'vote.%'`
- [x] API integration: `GET /api/teams/{team}/audit-logs?filter=...`

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
