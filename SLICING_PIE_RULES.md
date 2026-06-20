# Slicing Pie — Aturan Penilaian Kontribusi

> Berdasarkan metodologi **Mike Moyer — "Slicing Pie: Guide to Startup Equity"**

---

## Dasar Filosofi

Semua kontribusi diukur dari **risiko** yang diambil, bukan nilai absolutnya.
Makin tinggi risiko → makin besar multiplier → makin banyak slices (equity).

**Formula Dasar:**
```
Slices = Value × Multiplier
Equity % = (Slices individu / Total slices tim) × 100
```

---

## 1. CASH — ×4

| Aspek | Detail |
|-------|--------|
| **Value** | `amount` — nominal uang diinvestasikan (IDR) |
| **Multiplier** | ×4 |
| **Input** | Jumlah uang (min Rp 1.000) |
| **Rating** | Paling berisiko |

**Teori:** Uang adalah kontribusi paling berisiko karena:
- Begitu dikeluarkan, **uang tidak bisa kembali**
- Jika startup gagal, uang **lenyap total**
- Berbeda dengan TIME — orang yang kerja masih bisa cari kerja lain
- ×4 mengkompensasi **risk premium** dan **time value of money**

**Contoh:**
```
Investasi Rp 10.000.000
Value = 10.000.000
Slices = 10.000.000 × 4 = 40.000.000 slices
```

---

## 2. TIME — ×2

| Aspek | Detail |
|-------|--------|
| **Value** | `hours × FMR` — jam kerja × tarif pasar |
| **Multiplier** | ×2 |
| **Input** | Jumlah jam (min 0.5, maks 744/bulan) |
| **FMR** | Fair Market Rate — ditentukan owner per anggota |

**Teori:**
- **FMR (Fair Market Rate)** = berapa yang bisa didapat jika bekerja di tempat lain dengan keahlian yang sama
- Ini adalah **opportunity cost** — nilai yang dikorbankan dengan memilih startup
- ×2 karena: waktu tidak bisa kembali, tapi orang masih bisa cari kerja lain (risiko lebih rendah dari cash)

**Contoh:**
```
FMR = Rp 150.000/jam (tarif student)
Jam = 40 jam
Value = 40 × 150.000 = Rp 6.000.000
Slices = 6.000.000 × 2 = 12.000.000 slices
```

---

## 3. IDEA — ×2

| Aspek | Detail |
|-------|--------|
| **Value** | `hours × FMR` — **sama dengan TIME** |
| **Multiplier** | ×2 |
| **Input** | Jumlah jam (min 0.5) |
| **Rating** | Sama risikonya dengan TIME |

**Kenapa pakai jam (bukan nilai ide)?**

Moyer: *"An idea is worth the time it takes to think of it."*

- **Ide tanpa eksekusi tidak ada nilainya**
- Yang bernilai adalah **waktu dan effort untuk mengembangkan ide**
- Riset, brainstorming, validasi, prototyping — itu semua TIME
- Tidak bisa klaim equity hanya karena "punya ide"

**Contoh:**
```
Riset kompetitor = 5 jam
Bikin wireframe = 3 jam
Presentasi ke tim = 1 jam
Total = 9 jam × FMR → value = 9 × 150.000 = Rp 1.350.000
Slices = 1.350.000 × 2 = 2.700.000 slices
```

**Bukan:**
```
❌ "Saya punya ide marketplace kucing → kasih saya 5% equity"
✅ "Saya habiskan 9 jam untuk riset dan presentasi ide"
```

---

## 4. NETWORK — ×2

| Aspek | Detail |
|-------|--------|
| **Value** | `hours × FMR` — **sama dengan TIME** |
| **Multiplier** | ×2 |
| **Input** | Jumlah jam (min 0.5) |
| **Rating** | Sama risikonya dengan TIME |

**Kenapa pakai jam (bukan nilai koneksi)?**

Moyer: *"A warm introduction requires time and effort."*

- **Koneksi itu sendiri tidak bernilai** — yang bernilai adalah usaha menghubungkan
- Harus dibuktikan berapa lama waktu dihabiskan untuk: ngenalin, ngatur meeting, follow-up, negosiasi
- Tidak bisa klaim equity hanya karena "kenal orang penting"

**Contoh:**
```
Mencari kontak yang tepat = 2 jam
Mengatur pertemuan = 1 jam
Follow-up dan negosiasi = 3 jam
Total = 6 jam × FMR → value = 6 × 150.000 = Rp 900.000
Slices = 900.000 × 2 = 1.800.000 slices
```

**Bukan:**
```
❌ "Saya kenal CEO Gojek → kasih saya 5% equity"
✅ "Saya habiskan 6 jam untuk memperkenalkan dan follow-up"
```

---

## 5. FACILITY — ×2

| Aspek | Detail |
|-------|--------|
| **Value** | `amount` — nilai pasar fasilitas (IDR) |
| **Multiplier** | ×2 |
| **Input** | Nominal (min Rp 1.000) |
| **Rating** | Risiko lebih rendah dari CASH |

**Kenapa pakai nominal, bukan jam?**

- Fasilitas adalah **tangible asset** dengan **nilai pasar yang jelas**
- Laptop bekas → harga pasar laptop
- Garasi untuk kantor → harga sewa garasi di daerah itu
- Server → harga sewa/server
- **Tidak perlu dikonversi ke jam** karena nilai pasarnya sudah eksplisit

**Kenapa multiplier ×2 bukan ×4?**
- Fasilitas **masih bisa dijual kembali** — risikonya lebih rendah dari cash murni
- Cash ×4 karena uang lenyap; Facility ×2 karena barang masih ada

**Contoh:**
```
Nilai sewa kantor 1 bulan = Rp 5.000.000
Value = 5.000.000
Slices = 5.000.000 × 2 = 10.000.000 slices
```

---

## 6. REVENUE — ×2

| Aspek | Detail |
|-------|--------|
| **Value** | `actual_amount - invoice_amount` — **profit bersih** |
| **Multiplier** | ×2 |
| **Input** | Invoice amount + Actual amount + Upload invoice |
| **Rating** | Sama risikonya dengan TIME |

**Kenapa selisih (bukan gross)?**

Moyer: pendapatan yang masuk ke bisnis adalah hasil kerja banyak orang.
Yang bisa diklaim sebagai kontribusi individu adalah:

```
Profit Margin = Actual Amount - Invoice Amount
```

- **Invoice amount** = biaya/biaya yang dilaporkan (modal, operasional)
- **Actual amount** = total pendapatan yang benar-benar diterima
- **Selisih** = profit margin yang dihasilkan oleh individu tersebut
- Hanya **excess** di atas biaya yang dihitung, bukan gross revenue

**Kenapa bukan gross revenue?**
```
Jual barang Rp 10.000.000 dengan modal Rp 9.000.000
→ Kontribusi ke equity = Rp 1.000.000 (profit), bukan Rp 10.000.000 (gross)
→ Karena Rp 9.000.000 hanya muter (modal)
```

**Contoh:**
```
Invoice amount (biaya) = Rp 3.000.000
Actual amount (pendapatan) = Rp 5.000.000
Value = 5.000.000 - 3.000.000 = Rp 2.000.000
Slices = 2.000.000 × 2 = 4.000.000 slices
```

---

## Tabel Ringkasan

| Tipe | Basis Nilai | Multiplier | Formula | Mengapa? |
|------|------------|------------|---------|----------|
| **CASH** | Nominal | ×4 | `amount` | Paling berisiko — uang lenyap jika gagal |
| **TIME** | Jam kerja | ×2 | `hours × FMR` | Waktu = opportunity cost |
| **IDEA** | Jam kerja | ×2 | `hours × FMR` | Ide hanya worth waktu memikirkannya |
| **NETWORK** | Jam kerja | ×2 | `hours × FMR` | Koneksi hanya worth usaha menghubungkan |
| **FACILITY** | Nominal | ×2 | `amount` | Aset memiliki nilai pasar jelas |
| **REVENUE** | Selisih | ×2 | `actual - invoice` | Hanya profit yang diperhitungkan |

---

## Aturan Tambahan

### FMR = 0 → Blok TIME / IDEA / NETWORK
Jika FMR seorang anggota = 0 (belum diset owner), mereka **tidak bisa** membuat kontribusi TIME, IDEA, atau NETWORK. Harus minta owner set FMR terlebih dahulu via FMR Proposal.

### Validasi Jam (TIME / IDEA / NETWORK)
- Minimal: 0.5 jam
- Maksimal: 744 jam (~31 hari, 1 bulan)

### Validasi Nominal (CASH / FACILITY)
- Minimal: Rp 1.000

### Validasi Revenue
- `actual_amount ≥ invoice_amount` (tidak boleh rugi)
- Wajib upload invoice sebagai bukti

---
