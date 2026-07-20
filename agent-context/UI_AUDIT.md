# UI_AUDIT — SEIRIS

> Temuan audit UI/UX affordance per 2026-07-20 — cross-referenced dengan **WCAG 2.2 Level A & AA**. Sesi parallel agent exploration mencakup seluruh halaman (kecuali landing page). Dokumen ini untuk referensi prioritisasi perbaikan.
>
> **Singkatan:**
> - `🚨` = Violasi WCAG A (wajib)
> - `🔥` = Violasi WCAG AA (harus)
> - `⚠️` = Usability / Heuristic (nice-to-have)

---

## 🏛️ WCAG 2.2 — Rangkuman per Kriteria

### 🔴 Violasi Level A (wajib difix)

| Kriteria | Item terdampak |
|----------|----------------|
| **2.1.1 Keyboard** — Semua fungsi harus bisa dari keyboard | 5 modal tanpa focus trap → keyboard user gak bisa navigasi keluar modal |
| **2.4.3 Focus Order** — Urutan fokus logis | Modal: Tab loncat ke background / browser chrome |
| **1.1.1 Non-text Content** — Konten non-teks punya alternatif teks | ✅❌ approve/reject FMR, sidebar collapse, share, show/hide token, modal close — semua icon-only **tanpa `aria-label`** |
| **4.1.2 Name, Role, Value** — Semua elemen interaktif punya accessible name | Sama seperti 1.1.1 — ~15 tombol ikon tanpa nama |

**Total: ~15 icon buttons tanpa label + 5 modal tanpa trap = ~20 titik fail A.**

### 🔴 Violasi Level AA

| Kriteria | Item terdampak |
|----------|----------------|
| **3.2.4 Consistent Identification** — Fungsi sama harus tampil konsisten | Approve/reject: 3 gaya berbeda (tombol berlabel, icon-only ✅❌, teks doang) untuk fungsi identik |
| **Target Size (2.2 AA, 2.4.13)** — Minimum 24×24px untuk pointer | Simpan FMR (~22px) & Batal edit (~22px) — **fail** |

### ⚠️ Usability / Heuristic (bukan WCAG, tapi tetap mengganggu)

| Item | Alasan |
|------|--------|
| False affordance StatCard "Anggota Aktif" | Konsistensi (Nielsen), gak langgar WCAG mana pun |
| "Ajukan FMR" gaya identik sidebar active | Consistency, bukan WCAG |
| "Simpan" project hijau vs orange | 1 outlier dari 10+, minor |
| "Batal" 3 gaya | Konteks beda bisa beda, asal fungsinya jelas |

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

### 🔴 3 Gaya Approve/Reject untuk Fungsi Sama — 🚨 WCAG AA

> Referensi: **3.2.4 Consistent Identification (AA)** — Fungsi sama harus diidentifikasi konsisten. **1.1.1 Non-text Content (A)** — Ikon tanpa label = fail A.

| Konteks | Gaya | Lokasi | WCAG |
|---------|------|--------|:----:|
| **Vote kontribusi** | Tombol penuh 👍 **Setuju** / 👎 **Tolak** (label teks) | `VotePanel.tsx` | ✅ |
| **Approve FMR proposal** | Ikon-only ✅ / ❌ (`size-4`, `p-1.5` ≈ 28px) | `TeamMembersTab.tsx:508-523` | 🚨 A + 🔥 AA |
| **Setujui FMR proposal** (toast) | Teks saja | Notifikasi broadcast | ⚠️ (toast sementara, acceptable) |

**Fix:** Approve/reject FMR proposal perlu tombol berlabel kecil (`Setujui`/`Tolak` + ikon), bukan icon-only. Minimal `aria-label` + target 44px.

### 🔴 "Kembali" — Teks Boros di Mobile

7 tempat konsisten pakai `<ArrowLeft /> Kembali`. Tidak fail WCAG karena teks tetap terbaca.

**Fix:** Layar kecil (`< sm`) — sembunyi teks pakai `<span className="hidden sm:inline">Kembali</span>`, bukan `sr-only`, karena teks masih berguna di layar besar. ArrowLeft tetap butuh `aria-label="Kembali"` karena pas teks hilang jadi icon-only.

### 🟡 "Ajukan FMR" — Gaya Identik Sidebar Active

`bg-accent/10 text-accent` — sama persis dengan gaya link sidebar yang aktif. User bisa kira ini indikator "halaman aktif", bukan tombol aksi.

### 🟢 "Simpan" Project — Satu-satunya Tombol Hijau

`ProjectSelector.tsx:74` pakai `bg-green-600`. Semua tombol "Simpan" lain pakai `bg-accent` (orange).

**Fix:** Ganti `bg-green-600` → `bg-accent`.

---

## 3. False Affordance — Kelihatan Clickable, Padahal Engga

> Bukan violasi WCAG (secara teknis lolos 3.2.3 Consistent Navigation). Tapi **Heuristic Violation** (Nielsen: Consistency & Standards).

### 🔴 StatCard "Anggota Aktif" + "Total Kontribusi" Hover Berbeda

Di `DashboardPage.tsx`:

| Card | Hover effect | Clickable? |
|------|-------------|------------|
| `Anggota Aktif` | `hover:border-gray-700 hover:-translate-y-0.5` | ❌ Display only |
| `Total Kontribusi` | Effect **sama** | ✅ Link ke halaman kontribusi |

User dapat sinyal visual yang sama untuk 2 card, 1 clickable 1 tidak. Bikin frustrasi — tapi gak langgar WCAG.

### 🔴 Baris Anggota di TeamMembersTab

Setiap baris anggota punya `hover:bg-gray-800/20` — terlihat clickable, tapi yang bisa diklik cuma ikon di ujung kanan.

---

## 4. Mobile Touch Targets

> Referensi WCAG: **2.5.8 Target Size (AA) 2.2** = 24×24px minimum. **2.5.5 Target Size (AAA) 2.1** = 44×44px. Di bawah 24px = **violasi AA**.

| Tombol | Ukuran | Level | Lokasi |
|--------|:------:|:-----:|--------|
| Edit FMR (pencil) | ~24px | ✅ AA / ❌ AAA | TeamMembersTab |
| **Simpan FMR (check)** | **~22px** | **❌ AA** | TeamMembersTab |
| **Batal edit FMR (X)** | **~22px** | **❌ AA** | TeamMembersTab |
| Setujui proposal (✅) | ~28px | ✅ AA / ❌ AAA | TeamMembersTab |
| Tolak proposal (❌) | ~28px | ✅ AA / ❌ AAA | TeamMembersTab |
| Share button dashboard | ~32px | ✅ AA / ❌ AAA | DashboardPage |
| Sidebar collapse | ~28px | ✅ AA / ❌ AAA | DashboardLayout |

**2 tombol fail WCAG 2.2 AA** (~22px < 24px). Sisanya lolos AA tapi fail AAA (44px). Fix: `min-w-[44px] min-h-[44px]` sekalian jadi AAA-ready.

---

## 5. Missing Tooltip pada Icon-Only Buttons — 🚨 WCAG A

> Referensi: **1.1.1 Non-text Content (A)** + **4.1.2 Name, Role, Value (A)** — Setiap elemen interaktif tanpa teks butuh `aria-label` atau `title` untuk accessible name.

### 🔴 Prioritas Tinggi — high traffic

| Tombol | Lokasi | WCAG | Fix |
|--------|--------|:----:|-----|
| Sidebar collapse `ChevronLeft`/`Menu` | `DashboardLayout.tsx` | 🚨 A | `aria-label="Ciutkan sidebar"` |
| Share `Share2` di dashboard | `DashboardPage.tsx` | 🚨 A | `aria-label="Bagikan undangan"` |
| Show/hide token `Eye`/`EyeOff` | `SettingsPage.tsx` | 🚨 A | `aria-label="Tampilkan/sembunyikan token"` |

### 🟡 Sisanya — 10+ tombol ikon

| Tombol | Lokasi | WCAG | Fix |
|--------|--------|:----:|-----|
| ✅❌ approve/reject FMR proposal | `TeamMembersTab.tsx` | 🚨 A | `aria-label="Setujui"/"Tolak proposal"` |
| × close modal (semua modal) | Modal components | 🚨 A | `aria-label="Tutup"` |
| Pencil edit FMR | `TeamMembersTab.tsx` | 🚨 A | `aria-label="Edit FMR"` |
| Check simpan FMR | `TeamMembersTab.tsx` | 🚨 A | `aria-label="Simpan FMR"` |
| X batal edit FMR | `TeamMembersTab.tsx` | 🚨 A | `aria-label="Batal"` |
| ArrowLeft Kembali | 7 halaman | 🚨 A | sudah ada teks "Kembali" — aman |
| Trash/delete | `TeamMembersTab.tsx` | 🚨 A | `aria-label="Hapus"` |
| FileText lihat bukti | `RevenueDetailPage.tsx` dll | ✅ aman | sudah ada teks "Lihat Bukti" |

> **Estimasi total: ~15 titik fail A. Fix termudah di audit ini — cukup tambah `aria-label` di setiap icon button.**

---

## 6. Visual Inconsistencies

> Kebanyakan borderline atau bukan WCAG. Yang nyata violasi cuma "Batal" icon-only tanpa `aria-label` (sama seperti seksi 5).

### 🔴 "Batal" — 3 Gaya Berbeda

| Gaya | Lokasi | WCAG |
|------|--------|:----:|
| Bordered (`border border-gray-700`) | Modal konfirmasi, JoinPage | ✅ aman |
| Solid gray (`bg-gray-700`) | `ProjectSelector.tsx` — **outlier** | ⚠️ konsistensi doang |
| Ikon X-only (`p-1.5`) | `TeamMembersTab` inline | 🚨 **A — tanpa `aria-label`** |

### 🔴 Redundant Empty State Equity

2 komponen bersebelahan pesan hampir sama:
- *"Belum ada equity. Buat kontribusi untuk mulai."* — Equity Hero (internal)
- *"Belum ada data equity."* — EmptyState component

Bukan WCAG. Cuma duplikasi konten yang bikin bingung.

---

## Prioritas Perbaikan (berdasarkan WCAG)

| Tier | WCAG | Item | Effort |
|:----:|:----:|------|:------:|
| **P0 🚨** | **A** | `aria-label` di semua icon-only button (~15 titik) | 5 menit |
| **P0 🚨** | **A** | Modal focus trap + return focus (5 modal) | 30 menit |
| **P1 🔥** | **AA** | Approve/reject FMR: 3 gaya → 1 standar + label | 20 menit |
| **P1 🔥** | **AA** | Touch target Simpan/Batal edit FMR → `min-w-[44px]` | 10 menit |
| **P2 ⚠️** | usability | False affordance StatCard (Anggota Aktif + baris anggota) | 2 line |
| **P2 ⚠️** | usability | "Ajukan FMR" ganti gaya beda dari sidebar active | 2 line |
| **P2 ⚠️** | borderline | "Simpan" project hijau → orange (konsisten tombol) | 1 line |
| **P3** | — | "Batal" 3 gaya → 1 standar | 10 menit |
| **P3** | — | "Kembali" teks hidden di `< sm` | 7 line |
| **P3** | — | Redundant empty state equity (merge jadi 1) | 2 line |
| **P3** | — | ContributionForm close via backdrop (konsisten) | 2 line |

> **Prioritas hukum WCAG:** A → wajib, AA → harus, AAA → target ideal.
> **P0 + P1 cover semua violasi WCAG.** P2+ sisanya usability/code hygiene.
