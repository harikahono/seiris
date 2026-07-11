# Slicing Pie — Aturan Penilaian Kontribusi (SEIRIS)

> Berdasarkan metodologi **Mike Moyer — "Slicing Pie: Guide to Startup Equity"**
> + ekstensi SEIRIS untuk tim startup mahasiswa yang beroperasi **project-based**.

---

## Filosofi (dari buku Moyer)

> *"Your % share of the reward = Your % share of what's at risk."*

Setiap kontribusi yang **tidak dibayar penuh** adalah "bet" (taruhan) atas
nilai pasar wajar (fair market value / FMV). Ekuitas = proporsi total bet.

```
slice      = fair_market_value × multiplier
equity_%   = individual_slices ÷ total_slices
```

---

## Multiplier (TETAP — jangan diubah, ini rahasia model)

| Tipe | Multiplier | Keterangan |
|------|-----------|------------|
| **CASH** (uang + unreimbursed expense) | ×4 | Paling berisiko: uang lenyap jika gagal, after-tax |
| **NON-CASH** (semua selain cash) | ×2 | Waktu/ide/koneksi/fasilitas = pre-tax, risiko lebih rendah |

Sumber buku: *"I recommend a non-cash multiplier of two (2) and a cash
multiplier of four (4)."* — Moyer.

---

## Tipe Kontribusi di SEIRIS

Semua tipe di bawah adalah **non-cash ×2** kecuali CASH ×4.

| Tipe | Basis Nilai | Formula | Catatan |
|------|------------|---------|---------|
| **CASH** | Nominal uang diinvestasikan | `amount` | ×4 |
| **TIME** | Jam kerja | `hours × FMR` | ×2, FMR = fair market rate |
| **IDEA** | Jam kerja | `hours × FMR` | ×2, ide bernilai dari waktu mengembangkannya |
| **NETWORK** | Jam kerja | `hours × FMR` | ×2, koneksi bernilai dari usaha menghubungkan |
| **FACILITY** | Nilai pasar aset | `amount` | ×2, aset masih bisa dijual (risiko < cash) |
| **SALES** *(ekstensi SEIRIS)* | Selisih deal | `(deal_value − estimated_value) × commission_rate` | ×2, apresiasi untuk yang bisa nego client |

### Tentang REVENUE
**REVENUE BUKAN tipe kontribusi di buku Moyer** — di buku, revenue adalah
**titik freeze** (model berhenti saat perusahaan break-even / dapat investor).
Di SEIRIS, "revenue" sudah ada sebagai **fitur tersendiri** (Distribusi Profit
pada halaman Revenue), bukan sebagai slice. Oleh karena itu tipe `REVENUE`
**dihapus** dari kontribusi (legacy, tidak memiliki branch di `calculateSlices`).

---

## Ekstensi SEIRIS: Slicing Pie Beranak (Team induk + Project anak)

Pre-seed startup mahasiswa hidup dari **project/client yang putus-putus**.
Agar distribusi adil per-project (tidak cross-subsidi antar project), SEIRIS
menggunakan model **beranak**:

- **Team** = induk (1 ekuitas jangka panjang). Bake ke cap table saat investor /
  break-even.
- **Project** = anak. Tiap project punya Pie sendiri (kontribusi + revenue scoped
  ke project). Project "kelar" → Pie anak **freeze** → slices masuk ke induk.
- Ekuitas induk = Σ slices semua project + kontribusi langsung tim.

```
TIM (induk) ── bake ke cap table saat investor
 ├─ Project A (Pie anak) → freeze saat kelar
 ├─ Project B (Pie anak) → freeze saat kelar
 └─ ...
```

---

## Recovery Framework (Good/Bad Leaver)

Saat member keluar, berlaku aturan Moyer (setengah dari model):

| Skenario keluar | Dampak slices |
|-----------------|---------------|
| Fired for good reason / Resign no good reason (dia salah) | Kehilang slices non-cash; cash di-recalc tanpa ×4 |
| Fired no good reason / Resign with good reason (perusahaan salah) | Keep semua slices (perusahaan bayar buyback) |

Diterapkan di **2 level**: per-project (saat keluar tengah project) dan per-team
(saat exit dari tim).

---

## Aturan Tambahan

- **FMR = 0** → blokir TIME/IDEA/NETWORK (owner harus set FMR dulu).
- **Jam**: min 0.5, max 744/bulan.
- **Nominal CASH/FACILITY**: min Rp 1.000.
- **Freeze**: saat tim di-freeze (investor/break-even), kontribusi baru ditolak.
- **Concurrency**: semua write pakai `lockForUpdate()` (butuh PostgreSQL, bukan
  SQLite — SQLite no-op).
