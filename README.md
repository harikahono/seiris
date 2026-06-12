# Seiris - Sistem Ekuitas Terdistribusi Berbasis FSM & Matematika Slicing Pie

Selamat datang di repositori utama proyek Seiris! Proyek ini merupakan implementasi dari sistem distribusi ekuitas tim berdasarkan prinsip *Slicing Pie*, dikombinasikan dengan mesin *Finite State Machine* (FSM) untuk mengatur alur klaim dan *Audit Trail* yang tidak dapat diubah (*immutable ledger*).

---

## Status Implementasi

Berdasarkan panduan teknis tesis:

- [x] **Finite State Machine (FSM) Engine**: Sudah diimplementasikan. Klaim melewati state DRAFT -> PENDING -> APPROVED/REJECTED. Fungsi *Tie-Breaker* untuk voting seri juga telah dibuat.
- [x] **Concurrency Control**: Penguncian tingkat baris (*Row-Level Locking*) di backend aktif untuk menangani permintaan bersamaan pada entitas klaim.
- [x] **Slicing Pie Mathematical Engine**: Logika konversi kontribusi (Uang/Waktu) ke dalam *slices* dan perhitungan persentase ekuitas selesai. Termasuk *multiplier* (Cash * 4, Non-Cash * 2) dan batasan *Fair Market Value* (FMV).
- [x] **Audit Trail (Immutable Ledger)**: Pendekatan *Append-Only Ledger* digunakan. Perubahan ekuitas dicatat sebagai entri baru dengan *timestamp*, mencegah pengubahan histori.
- [ ] **Frontend UI/UX**: Saat ini hanya berupa *landing page*. Integrasi penuh dengan fitur klaim dan manajemen ekuitas belum selesai.
- [ ] **Testing Otomatis (JMeter/SUS)**: Panduan testing tersedia, namun skrip JMeter dan eksekusi otomatis SUS masih perlu dibuat/dijalankan secara manual.

---

## Struktur Repositori

Proyek ini merupakan *monorepo* yang terdiri dari dua bagian utama:

- `seiris-be/`: Kode sumber *backend* menggunakan framework Laravel (PHP).
- `seiris-fe/`: Kode sumber *frontend* menggunakan React dengan Vite sebagai *bundler*.

---

## Setup Awal

### Prasyarat

- PHP >= 8.1 (untuk backend)
- Composer (dependency manager PHP)
- Node.js & npm/pnpm (untuk frontend)
- Database MySQL/PostgreSQL/SQLite
- Web Server (opsional, bisa gunakan `php artisan serve`)

### Langkah-langkah Instalasi

#### 1. Backend (Laravel)

1. Masuk ke direktori `seiris-be`.
    ```bash
    cd seiris-be
    ```
2. Install dependency PHP.
    ```bash
    composer install
    ```
3. Salin file `.env.example` menjadi `.env` dan sesuaikan konfigurasi database Anda.
    ```bash
    cp .env.example .env
    ```
    > **Penting:** Pastikan variabel `MAX_STUDENT_FMR` sudah ada di `.env` (default: 150000).
4. Generate *application key* (jika belum).
    ```bash
    php artisan key:generate
    ```
5. Jalankan migrasi database dan seeding awal (jika ada).
    ```bash
    php artisan migrate --seed
    ```
6. Jalankan server development Laravel.
    ```bash
    php artisan serve
    ```
    Backend akan berjalan di `http://localhost:8000`.

#### 2. Frontend (React)

1. Masuk ke direktori `seiris-fe`.
    ```bash
    cd ../seiris-fe
    ```
2. Install dependency (disarankan menggunakan pnpm).
    ```bash
    pnpm install
    # atau
    npm install
    ```
3. Salin file `.env.example` menjadi `.env` dan sesuaikan URL API backend.
    ```bash
    cp .env.example .env
    ```
    Pastikan `VITE_API_BASE_URL` mengarah ke backend (misal: `http://localhost:8000`).
4. Jalankan server development Vite.
    ```bash
    pnpm dev
    # atau
    npm run dev
    ```
    Frontend akan berjalan di `http://localhost:5173`.

---

## Testing & Validasi

### 1. Concurrency Testing (Manual dengan JMeter)

Untuk membuktikan ketahanan *Row-Level Locking*:

1.  Pastikan backend Laravel berjalan.
2.  Buka Apache JMeter.
3.  Buat *Test Plan* dengan *Thread Group* diatur ke **160 threads** (simulasi 20 tim x 8 anggota).
4.  Tambahkan *HTTP Request Sampler* yang menembak endpoint kritis FSM, contoh:
    -   `POST /api/contributions` (Saat membuat klaim baru)
    -   `POST /api/approvals/{id}/vote` (Saat melakukan voting approve/reject)
5.  Jalankan test.
6.  **Target:** Tidak ada *Error 500* atau *Lost Update*. Data harus konsisten meskipun ada 160 request bersamaan.

### 2. Usability Testing (SUS)

1.  Setelah fitur frontend selesai, integrasikan kuesioner *System Usability Scale* (SUS).
2.  Lakukan uji coba dengan pengguna target (mahasiswa/founder startup).
3.  Hitung skor SUS.
4.  **Target:** Skor rata-rata > 68 (Above Average).

---

## Fitur Utama Backend

### 1. Tie-Breaker Mechanism
Jika hasil voting seri (50:50), sistem otomatis menggunakan hierarki:
1.  Suara *Team Owner*.
2.  Suara *Senior Member* (berdasarkan tenure/jumlah slices).
Logika ini tercatat di *Audit Trail*.

### 2. Fair Market Value (FMV) Cap
Sistem membatasi klaim FMR untuk mahasiswa agar tidak *overpriced*.
-   Konfigurasi ada di `.env`: `MAX_STUDENT_FMR=150000` (Rp 150.000/jam).
-   Validasi otomatis menolak input di atas batas ini.

### 3. Append-Only Equity Ledger
Tidak ada operasi `UPDATE` pada histori ekuitas. Setiap perubahan status kontribusi memicu pencatatan baru di tabel `equity_snapshots`, menjamin jejak audit yang abadi.

---

## Catatan Penting

- Proyek ini sedang dalam pengembangan aktif menuju tahap sidang.
- Fitur utama backend sudah sesuai dengan panduan teknis inti.
- Prioritas selanjutnya adalah menyelesaikan integrasi frontend dan melaksanakan testing komprehensif.

---
*Generated for SEIRIS Thesis Project.*
