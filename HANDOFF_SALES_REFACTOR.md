# HANDOFF — Refactor REVENUE → SALES + Markup Commission Model

> Dibuat: 2026-07-08
> Konteks: Diskusi teknis SEIRIS — menyelesaikan kerancuan antara contribution type REVENUE dengan halaman Revenue.

---

## 1. Masalah yang Ditemukan

### 1.1 Kerancuan Nama "REVENUE"

| Di sistem | Fungsi | Masalah |
|-----------|--------|---------|
| **REVENUE** (contribution type) | Bonus slices buat yg bawa client/investor | Namanya SAMA dengan halaman Revenue → user bingung |
| **Revenue** (halaman sidebar) | Catat uang client masuk, potong expense, distribute | Orang pikir ini duplikat |

### 1.2 Kerancuan Konsep

- REVENUE contribution auto-create Revenue record saat di-approve → campur aduk antara **usaha bawa deal** dengan **uang client**
- Orang bisa dapet slices dari REVENUE + dapet distribution dari Revenue yg sama → kesannya double-dip
- Buku Moyer bilang: revenue itu **sumber bayar**, bukan kontribusi. Sales commission yang dikonversi ke slices.

### 1.3 Buku Moyer vs Implementasi

| Aspek | Moyer (Slicing Pie Handbook) | SEIRIS Sekarang |
|-------|------------------------------|-----------------|
| Revenue sebagai kontribusi? | ❌ Revenue BUKAN tipe kontribusi. Revenue dipake bayar expense. | ✅ Ada tipe REVENUE |
| Sales/bawa client? | ✅ Sales commission: `deal × rate%` → slices ×2 | ✅ Tapi dari full `(actual - invoice)`, bukan komisi |
| Commission rate | 5-10% dari **total deal** | — |
| Profit distribution | Setelah freeze, dividen based on final equity % | ✅ Sama |

---

## 2. Solusi: SALES Contribution dengan Markup Commission

### 2.1 Konsep

Hapus REVENUE contribution type. Ganti dengan **SALES**.

SALES = komisi dari **markup** (selisih deal dengan estimasi tim), dikonversi ke slices ×2.

**Rumus:**
```
markup          = max(0, deal_value - estimated_value)
commission_value = markup × commission_rate / 100
slices          = commission_value × 2
```

**Contoh:**
- Estimasi tim: Rp20jt
- Deal PM: Rp30jt
- Markup: Rp10jt (50%)
- Komisi 50%: Rp5jt
- Slices: 10.000

### 2.2 Kenapa Markup, Bukan Total Deal?

| Skema | Contoh | Kelemahan |
|-------|--------|-----------|
| Total deal × rate | Rp30jt × 10% = Rp3jt → 6.000 slices | Gak bedain deal pass-pasan vs deal gila |
| **Markup × rate** | **(Rp30jt-Rp20jt) × 50% = Rp5jt → 10.000 slices** | **Makin tinggi markup, makin besar komisi** |

**Insentif lurus:** PM termotivasi nego > estimasi. Tim tetap dapet sesuai estimasi.

### 2.3 Perbandingan 3 Opsi

| Opsi | Nama | Logic | Expense Field | Data Existing | Bisa Defend? |
|------|------|-------|---------------|---------------|--------------|
| **A: Full Moyer** | SALES | `deal × 10% × 2` | ✅ | Migrasi REVENUE → SALES | ✅ Paling sesuai buku |
| **B: Markup** | SALES | `(deal - estimasi) × rate × 2` | ✅ | Migrasi REVENUE → SALES | ✅ Inovasi utk konteks mahasiswa |
| **C: Status Quo** | REVENUE | `(actual - invoice) × 2` | ❌ | — | ⚠️ Dosen tanya "kok gak sesuai Moyer?" |

**Keputusan:** Opsi **B** (Markup) — paling cocok buat use case freelance mahasiswa + startup bootstrap.

---

## 3. Arsitektur Final

```
                    ┌──────────────────────────┐
                    │      CONTRIBUTION        │
                    │  TIME / CASH / FACILITY  │
                    │  IDEA / NETWORK          │←── kerja + slices
                    │  ─────────────────────── │
                    │  SALES                   │←── komisi markup → slices
                    │  (deal - estimasi) × rate │
                    └───────────┬──────────────┘
                                │ equity %
                                ▼
                    ┌──────────────────────────┐
                    │       EQUITY %           │
                    │  dinamis, berubah tiap   │
                    │  ada approval kontribusi  │
                    └───────────┬──────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
  ┌──────────────────────┐          ┌──────────────────────┐
  │     REVENUE PAGE     │          │   FREEZE EQUITY?     │
  │  Catat uang client   │          │  ────────────────    │
  │  Potong expense      │          │  Ya → equity fix     │
  │  Distribute by eq %  │          │  Cetak PDF final     │
  └──────────────────────┘          │  Duit jalan di luar  │
                                    │  SEIRIS              │
                                    └──────────────────────┘
```

### 3.1 Fungsi Halaman (Jelas)

| Halaman | Isi | Fungsi |
|---------|-----|--------|
| **Contribution** | TIME, CASH, IDEA, NETWORK, FACILITY, **SALES** | Catat KONTRIBUSI — slices → equity % |
| **Revenue** (sidebar) | Uang client masuk, operasional expense, distribute | Catat PEMASUKAN — bagikan by equity % |

### 3.2 SALES Gak Auto-Create Revenue

Ini perubahan paling kritis. Di kode lama (`ApprovalController::autoCreateRevenue()`):
- REVENUE approved → auto-create Revenue record ← **DIHAPUS**

Sekarang:
- SALES approved → **cuma** nambah slices → equity % berubah
- Uang client dicatat **manual** di Revenue page pas beneran cair

---

## 4. Studi Kasus

### 4.1 Freelance — Proyek Rp30jt, DP Rp10jt

Tim 4 orang. Estimasi Rp20jt. PM deal Rp30jt. Komisi 50% dari markup.

**Minggu 1-3:** TIME kerja → equity % A
**Minggu 3:** PM catet SALES — deal Rp30jt, estimasi Rp20jt, markup Rp10jt, komisi Rp5jt → 10.000 slices
**Minggu 3:** Client DP Rp10jt → Revenue page → expense Rp2jt (server) → distribute Rp8jt by equity % A
**Minggu 4-8:** TIME lanjut → equity % B
**Minggu 9:** Client bayar Rp20jt → Revenue page → expense Rp0 → distribute Rp20jt by equity % B

| Orang | TIME slices | SALES slices | Total | Equity % B | Dapet dr Rp28jt |
|-------|-------------|--------------|-------|------------|-----------------|
| PM | 2.000 | 10.000 | 12.000 | **44%** | **Rp12,4jt** |
| Dev1 | 5.000 | — | 5.000 | **19%** | **Rp5,3jt** |
| Dev2 | 5.000 | — | 5.000 | **19%** | **Rp5,3jt** |
| UI/UX | 5.000 | — | 5.000 | **19%** | **Rp5,3jt** |

**Hasil:** PM dapet lebih karena bawa deal gede. Tiap Dev dapet Rp5,3jt dari coding. **Adil.**

### 4.2 Startup Bootstrap — Pendanaan Bertahap

3 founder bikin SaaS. Estimasi butuh Rp45jt.

| Bulan | Sumber | Deal | Estimasi | Markup | SALES slices |
|-------|--------|------|----------|--------|-------------|
| 1 | Angel investor | Rp50jt | Rp45jt | Rp5jt | 10.000 |
| 3 | Client A (tahunan) | Rp30jt | Rp25jt | Rp5jt | 10.000 |
| 6 | Client B (tahunan) | Rp20jt | Rp20jt | Rp0 | 0 |
| 8 | Series A | Rp500jt | — | — | Freeze |

**Revenue page:** Rp50jt + Rp30jt + Rp20jt + Rp500jt = **Rp600jt** — semuanya distribute by equity %.

**Freeze pas Series A:** Equity final fix. Cetak PDF. Duit selanjutnya di luar SEIRIS.

### 4.3 Tanpa SALES — Pembawa Deal Gigit Jari

Tim sama, proyek sama, **TANPA SALES**:

| Orang | TIME | Equity | Dapet dr Rp30jt |
|-------|------|--------|-----------------|
| PM | 2.000 | **12%** | **Rp3,5jt** |
| Dev1 | 5.000 | **29%** | **Rp8,8jt** |
| Dev2 | 5.000 | **29%** | **Rp8,8jt** |
| UI/UX | 5.000 | **29%** | **Rp8,8jt** |

**PM cuma dapet Rp3,5jt.** Padahal DIA YANG BAWA PROYEK. Gak ada insentif cari proyek lagi. **Tim bubar.**

---

## 5. Code Changes — Detail per File

### 5.1 Backend (~6 file)

#### 1. Migration baru: `add_sales_fields_to_contributions`

```php
// File baru: database/migrations/xxxx_add_sales_fields_to_contributions.php
Schema::table('contributions', function (Blueprint $table) {
    $table->unsignedBigInteger('deal_value')->nullable()->after('actual_amount');
    $table->unsignedBigInteger('estimated_value')->nullable()->after('deal_value');
    $table->unsignedDecimal('commission_rate', 5, 2)->nullable()->after('estimated_value');
});
```

#### 2. `StoreContributionRequest.php`

```php
// Ubah validasi type
'type' => ['required', 'in:TIME,CASH,IDEA,NETWORK,FACILITY,SALES'],

// Tambah validasi conditional untuk SALES
'deal_value'       => ['required_if:type,SALES', 'integer', 'min:0'],
'estimated_value'  => ['required_if:type,SALES', 'integer', 'min:0'],
'commission_rate'  => ['required_if:type,SALES', 'numeric', 'min:0', 'max:100'],
```

```php
// Hapus validasi REVENUE:
'invoice_amount'   => [...],
'actual_amount'    => [...],
'invoice'          => [...],
```

#### 3. `ContributionController.php`

```php
// 1. Hapus upload invoice logic (baris 82-86)
// 2. Hapus passing invoice_amount, actual_amount, invoice_path ke create()

// 3. calculateValue() — tambah case SALES:
'SALES' => (int) round(
    max(0, $request->deal_value - $request->estimated_value) 
    * $request->commission_rate / 100
),
```

```php
// 4. store() — hapus ini:
// 'invoice_amount' => $request->invoice_amount,
// 'actual_amount'  => $request->actual_amount,
// 'invoice_path'   => $invoicePath,
```

#### 4. `SlicingPieService.php`

```php
// calculateSlices() — tambah SALES di match case:
'TIME', 'IDEA', 'NETWORK',
'FACILITY', 'SALES'        => 2.0,
// Hapus 'REVENUE' dari match
```

#### 5. `ApprovalController.php`

```php
// autoCreateRevenue() — HAPUS function ini (atau comment out).
// Atau ubah jadi:
private function autoCreateRevenue(Contribution $contribution): void
{
    // SALES gak auto-create Revenue. Revenue dicatat manual.
    // Hanya REVENUE (legacy) yang masih perlu.
    if (!in_array($contribution->type, ['REVENUE'])) return;
    // ... sisanya dibiarin buat data lama
}
```

#### 6. `Contribution.php` (Model)

```php
// fillable — tambah:
'deal_value', 'estimated_value', 'commission_rate',

// casts — tambah:
'deal_value'       => 'integer',
'estimated_value'  => 'integer',
'commission_rate'  => 'decimal:2',
```

### 5.2 Frontend (~3 file)

#### 1. `lib/contribution.ts`

```typescript
export const CONTRIBUTION_TYPES = [
  // ... lainnya tetap ...
  { 
    value: "SALES", 
    label: "Sales", 
    icon: Handshake, 
    desc: "Komisi dari deal", 
    color: "#ec4899" 
  },
] as const;
// Icon bisa pake Handshake dari lucide-react (import)
```

#### 2. `ContributionForm.tsx`

Hapus semua form REVENUE (baris 265-318). Ganti dengan form SALES:

```tsx
{isSales && (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label>Estimasi Tim (Rp)</label>
        <input type="number" placeholder="Estimasi" />
      </div>
      <div>
        <label>Deal Client (Rp)</label>
        <input type="number" placeholder="Deal" />
      </div>
    </div>
    <div>
      <label>Komisi Rate (%)</label>
      <input type="number" min="0" max="100" />
    </div>
    {dealValue && estimatedValue && (
      <p>
        Markup: Rp{(dealValue - estimatedValue).toLocaleString('id-ID')}
        {' · '}
        Komisi: Rp{(commission_amount).toLocaleString('id-ID')}
        {' → '}
        <span className="text-accent">{slices.toLocaleString('id-ID')} slices</span>
      </p>
    )}
  </div>
)}
```

Variable baru di state:
- `dealValue: string`
- `estimatedValue: string`  
- `commissionRate: string` (default "50")

#### 3. `ContributionResource.php` (backend resource)

```php
// Di toArray(), hapus atau sesuaikan field REVENUE:
// 'invoice_amount' => $this->invoice_amount,
// 'actual_amount'  => $this->actual_amount,
// 'invoice_path'   => $this->invoice_path,

// Tambah kalo type SALES:
'deal_value'       => $this->when($this->type === 'SALES', $this->deal_value),
'estimated_value'  => $this->when($this->type === 'SALES', $this->estimated_value),
'commission_rate'  => $this->when($this->type === 'SALES', $this->commission_rate),
```

### 5.3 Data Existing

Data REVENUE di DB dibiarin aja. Gak perlu migrasi data karena:
- Equity snapshot lama udah terlanjut dihitung
- Tipe `REVENUE` masih dikenal di match case (bisa dibiarin atau di-migrate ke SALES kalo mau)
- ContributionApproval, AuditLog — semua tetap konsisten

Migration opsional (kalo mau rapi):
```sql
UPDATE contributions SET type = 'SALES' WHERE type = 'REVENUE';
```

---

## 6. Alasan Defend (Buat Sidang)

### 6.1 Kenapa Hapus REVENUE?

> "Kami menghapus tipe kontribusi REVENUE dan menggantinya dengan SALES setelah menemukan bahwa dalam konteks tim mahasiswa bootstrap, kontribusi membawa klien adalah aktivitas yang berbeda secara fundamental dari kontribusi teknis. REVENUE mencampurkan dua hal yang berbeda: usaha mendapatkan deal dengan pencatatan pemasukan."

### 6.2 Kenapa Markup, Bukan Komisi Flat?

> "Berbeda dengan model Moyer yang menggunakan komisi flat 5-10% untuk salesperson, kami menerapkan komisi berbasis markup (selisih deal dengan estimasi tim). Modifikasi ini dilakukan karena dalam tim mahasiswa: (1) tidak ada basis gaji untuk menentukan komisi, (2) seluruh anggota berperan sebagai founder, bukan karyawan, (3) kami ingin memberikan insentif yang proposional terhadap nilai lebih yang dihasilkan oleh pembawa deal."

### 6.3 Kenapa Pisah SALES dan Revenue Page?

> "Pemisahan ini memastikan transparansi penuh: kontribusi (SALES, TIME, dll) menentukan porsi kepemilikan, sementara halaman Revenue mencatat pemasukan aktual dan mendistribusikannya berdasarkan porsi tersebut. Tidak ada lagi kebingungan antara 'yang membawa deal' dan 'uang yang masuk'."

### 6.4 Satu Arsitektur untuk Freelance dan Startup

> "Sistem ini mampu menangani dua model bisnis berbeda — proyek freelance termin dan startup bootstrap — dalam satu arsitektur yang sama. Perbedaannya hanya pada frekuensi pencatatan revenue dan penggunaan fitur freeze equity, bukan pada logika inti."

---

## 7. Urutan Implementasi

| Prioritas | Task | File | Estimasi |
|-----------|------|------|----------|
| 🔴 P1 | Migration: tambah kolom SALES | `database/migrations/xxxx_xx_xx_add_sales_fields.php` | 15 menit |
| 🔴 P2 | Backend: validasi + controller | `StoreContributionRequest.php`, `ContributionController.php` | 30 menit |
| 🔴 P3 | Backend: SlicingPie match case | `SlicingPieService.php` | 5 menit |
| 🔴 P4 | Backend: hapus autoCreateRevenue | `ApprovalController.php` | 10 menit |
| 🔴 P5 | Frontend: ganti contribution types | `lib/contribution.ts` | 5 menit |
| 🔴 P6 | Frontend: ganti form SALES | `ContributionForm.tsx` | 30 menit |
| 🟡 P7 | Backend: Contribution model casts + fillable | `Contribution.php` | 5 menit |
| 🟡 P8 | Backend: ContributionResource | `ContributionResource.php` | 10 menit |
| 🟢 P9 | Data migration REVENUE → SALES | SQL manual | 5 menit |
| 🟢 P10 | Test: create SALES + approve + equity | Manual / PHPUnit | 30 menit |

**Total:** ~2-3 jam kerja efektif.

---

## 8. Ringkasan

| Sebelum | Sesudah |
|---------|---------|
| 6 contribution types: TIME, CASH, IDEA, NETWORK, FACILITY, **REVENUE** | 6 types: TIME, CASH, IDEA, NETWORK, FACILITY, **SALES** |
| REVENUE = `(actual_amount - invoice_amount) × 2` | SALES = `max(0, deal - estimasi) × rate × 2` |
| REVENUE auto-create Revenue record | SALES **gak** auto-create Revenue |
| Revenue page: catet uang + distribute | Revenue page: catet uang + expense + distribute |
| Rancu: "Revenue" ada di 2 tempat | Jelas: SALES = kontribusi, Revenue = pemasukan |
| Cocok: startup doang (gak cocok freelance) | Cocok: **freelance** + **startup** — 1 arsitektur |

---

## 9. Referensi Terkait

- Buku: *Slicing Pie Handbook* (Mike Moyer) — Bab 6 (Non-Cash Contributions), Bab 8 (Freezing the Pie), Bab 9 (Revenue)
- Kode: `seiris-be/app/Http/Controllers/Api/ApprovalController.php` — baris 138-162 (`autoCreateRevenue`)
- Kode: `seiris-be/app/Http/Controllers/Api/ContributionController.php` — baris 82-86, 173-180
- Kode: `seiris-fe/src/lib/contribution.ts` — definisi CONTRIBUTION_TYPES
- Kode: `seiris-fe/src/components/ui/ContributionForm.tsx` — baris 265-318 (form REVENUE)
- Kode: `seiris-be/app/Services/SlicingPieService.php` — baris 90-103 (calculateSlices)

---

## 10. Suggested Skills

- `ponytail` — Prioritaskan solusi paling sederhana. Jangan nambah fitur di luar scope.
- `caveman` — Mode ringkas untuk komunikasi.
- `caveman-commit` — Commit message ringkas per perubahan.
- `tdd` — Kalo perlu bikin test untuk approval flow + equity recalculation.
