<?php
// ============================================================
// config/seiris.php
// Konfigurasi khusus untuk logika bisnis Slicing Pie
// ============================================================

return [
    /*
    |--------------------------------------------------------------------------
    | Batas Maksimum Fair Market Rate (FMR) untuk Mahasiswa
    |--------------------------------------------------------------------------
    |
    | Nilai ini digunakan untuk mencegah klaim FMR yang tidak masuk akal
    | dari anggota tim berstatus mahasiswa. Default dalam Rupiah per jam.
    | Ubah nilai ini di file .env dengan variabel MAX_STUDENT_FMR
    |
    */
    'max_student_fmr' => env('MAX_STUDENT_FMR', 150000), // Default Rp 150.000/jam
];
