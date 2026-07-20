# UI_AUDIT — SEIRIS

> Temuan audit UI/UX affordance per 2026-07-20. Sesi parallel agent exploration mencakup seluruh halaman (kecuali landing page). Dokumen ini untuk referensi prioritisasi perbaikan.

---

## 1. Form — Keyboard Submission

**✅ Semua form sudah OK** — pakai `<form onSubmit>` + `<button type="submit">`. Enter bisa submit dari input mana aja.

**❌ Tapi modal focus management bermasalah:**

| Modal | Masalah |
|-------|---------|
| `CreateRevenueForm` | Inline (bukan portal) — Tab bisa tembus ke halaman di belakang |
| `ContributionForm` | Portal tapi tanpa focus trap — Tab bisa kabur ke browser chrome |
| `CreateTeamModal` | Sama — tanpa trap |
| `ConfirmModal` | Inline, Tab tembus ke background |
| `ShareInviteModal` | Portal, tanpa trap |
| **SEMUA MODAL** | Tidak ada focus restoration ke tombol trigger setelah ditutup |

**Fix:** Tambah `useEffect` di tiap modal: buka → fokus ke elemen pertama, Tab cycle di dalam modal, tutup → balikin fokus ke tombol trigger.

---

## 2. Clickable Text vs Tombol vs Icon

### 🔴 3 Gaya Approve/Reject untuk Fungsi Sama

| Konteks | Gaya | Lokasi |
|---------|------|--------|
| **Vote kontribusi** | Tombol penuh 👍 **Setuju** / 👎 **Tolak** (label teks) | `VotePanel.tsx` |
| **Approve FMR proposal** | Ikon-only ✅ / ❌ (`size-4`, `p-1.5` ≈ 28px) | `TeamMembersTab.tsx:508-523` |
| **Setujui FMR proposal** (toast) | Teks saja | Notifikasi broadcast |

**Fix:** Approve/reject FMR proposal perlu tombol berlabel kecil (`Setujui`/`Tolak` + ikon), bukan icon-only. Minimal tooltip proper + target area 44px.

### 🔴 "Kembali" — Teks Boros di Mobile

7 tempat di seluruh app konsisten pakai `<ArrowLeft /> Kembali`.

**Fix:** Layar kecil (`< sm`) — sembunyi teks "Kembali", cukup ArrowLeft + `aria-label="Kembali"`.

### 🟡 "Ajukan FMR" — Gaya Identik Sidebar Active

`bg-accent/10 text-accent` — sama persis dengan gaya link sidebar yang aktif. User bisa kira ini indikator "halaman aktif", bukan tombol aksi.

### 🟢 "Simpan" Project — Satu-satunya Tombol Hijau

`ProjectSelector.tsx:74` pakai `bg-green-600`. Semua tombol "Simpan" lain pakai `bg-accent` (orange).

**Fix:** Ganti `bg-green-600` → `bg-accent`.

---

## 3. False Affordance — Kelihatan Clickable, Padahal Engga

### 🔴 StatCard "Anggota Aktif" + "Total Kontribusi" Hover Berbeda

Di `DashboardPage.tsx`:

| Card | Hover effect | Clickable? |
|------|-------------|------------|
| `Anggota Aktif` | `hover:border-gray-700 hover:-translate-y-0.5` | ❌ Display only |
| `Total Kontribusi` | Effect **sama** | ✅ Link ke halaman kontribusi |

User dapat sinyal visual yang sama untuk 2 card, 1 clickable 1 tidak.

### 🔴 Baris Anggota di TeamMembersTab

Setiap baris anggota punya `hover:bg-gray-800/20` — terlihat clickable, tapi yang bisa diklik cuma ikon di ujung kanan.

---

## 4. Mobile Touch Targets — Semua < 44px (WCAG Fail)

| Tombol | Ukuran | Lokasi |
|--------|:------:|--------|
| Edit FMR (pencil) | ~24px | TeamMembersTab |
| Simpan FMR (check) | ~22px | TeamMembersTab |
| Batal edit FMR (X) | ~22px | TeamMembersTab |
| Setujui proposal (✅) | ~28px | TeamMembersTab |
| Tolak proposal (❌) | ~28px | TeamMembersTab |
| Share button dashboard | ~32px | DashboardPage |
| Sidebar collapse | ~28px | DashboardLayout |

Semua tombol ikon di app ini **setengah** dari ukuran minimal WCAG untuk mobile (44px).

---

## 5. Missing Tooltip pada Icon-Only Buttons

### 🔴 Prioritas Tinggi (high traffic)

| Tombol | Lokasi | Butuh |
|--------|--------|-------|
| Sidebar collapse `ChevronLeft`/`Menu` | `DashboardLayout.tsx` | `title` + `aria-label` |
| Share `Share2` di dashboard | `DashboardPage.tsx` | `title` + `aria-label` |
| Show/hide token `Eye`/`EyeOff` | `SettingsPage.tsx` | `title` + `aria-label` |

### 🟡 Sisanya

10+ tombol ikon lain (modal close, back, trash, dll) juga tanpa tooltip.

---

## 6. Visual Inconsistencies

### 🔴 "Batal" — 3 Gaya Berbeda

| Gaya | Lokasi |
|------|--------|
| Bordered (`border border-gray-700`) | Modal konfirmasi, JoinPage |
| Solid gray (`bg-gray-700`) | `ProjectSelector.tsx` — **outlier** |
| Ikon X-only (`p-1.5`) | `TeamMembersTab` inline |

### 🔴 Redundant Empty State Equity

2 komponen bersebelahan pesan hampir sama:
- *"Belum ada equity. Buat kontribusi untuk mulai."* — Equity Hero (internal)
- *"Belum ada data equity."* — EmptyState component

---

## Prioritas Perbaikan

| Tier | Item | Effort |
|------|------|--------|
| **P1 🔥** | False affordance: Anggota Aktif + Revenue card hover lift | 2 line |
| **P1 🔥** | Tooltip: sidebar collapse, share button, show/hide token | 3 line |
| **P1 🔥** | Mobile touch target: semua icon button `min-w-[44px]` | ~10 line |
| **P2** | Approve/reject: 3 gaya → 1 standar dengan label | ~20 line |
| **P2** | Modal focus trap + focus restoration | ~30 line |
| **P2** | "Ajukan FMR" ganti gaya biar beda dari sidebar active | 2 line |
| **P2** | "Simpan" project hijau → orange | 1 line |
| **P3** | "Batal" 3 gaya → 1 standar | ~10 line |
| **P3** | "Kembali" teks hidden di `< sm` | 7 line |
| **P3** | Redundant empty state equity (merge jadi 1) | 2 line |
| **P3** | ContributionForm bisa close via backdrop (konsisten) | 2 line |
