# Planning — Bukti Validasi Kontribusi + GitHub Diff Viewer

> Status: **RENCANA FINAL (disetujui konsep, belum diimplementasi)**.
> Tujuan: kontribusi (selain Revenue) bisa lampirin bukti/validasi. GitHub cukup **paste link** PR/commit → bisa dibuka modal diff beneran. **Bukan** webhook/OAuth, **bukan** wajib buat semua orang (cuma buat yang ngoding).

## Keputusan (locked)
- Bukti = **file upload + link** (`source_url`).
- Bisa dilampirkan **pas create DAN nyusul** (endpoint terpisah, PENDING-only).
- GitHub = **cukup paste link** (gak ada webhook/model GitHub/`github_username`).
- Render diff = **custom +/-** (0 dependency baru).
- Private repo = **langsung include token flow** (gaya Claude Projects: user simpan PAT encrypted, dipakai pas fetch diff).

## A. Data model / migrasi
- `contributions` + `source_url` (string, nullable).
- `contributions` + `proof_path` (string, nullable) — **MIRROR Revenue** (`proof_path`/`proof_url`/`proof`). Kolom `invoice_path`/`invoice_amount`/`actual_amount` **SUDAH DIDROP** di migration `2026_07_09_000001_drop_revenue_enum_and_legacy_columns.php:28` (komentar: "dead REVENUE-only columns") → harus re-add lewat migration BARU (timestamp > `2026_07_13_*`). Lihat ADR-026 + GOTCHAS.
- `users` + `github_token` (encrypted text, nullable).

## B. Backend
1. **Contribution model**: `fillable` + `proof_path` + `source_url`; accessor `proof_url` (mirror `RevenueResource::22-24`: `asset('storage/'.$this->proof_path)`).
2. **ContributionResource**: expose `proof_url`, `source_url`. (JANGAN pakai `invoice_*`/`actual_amount` — legacy, sudah drop & dihapus dari FE types.)
3. **StoreContributionRequest**: +`proof` (file, image|pdf, ≤5MB, nullable), `source_url` (nullable url). (Lokasi file: `app/Http/Requests/Contribution/StoreContributionRequest.php` — folder Feature, BUKAN `Api/`.)
4. **ContributionController::store**: handle `proof` → `store('contributions','public')` (mirror `RevenueController:64-67`) + simpan `source_url` + `proof_path`.
5. **Endpoint baru** `POST /api/teams/{team}/contributions/{id}/proof` (+ variant project-scoped):
   - attach/replace bukti nyusul. Guard: hanya `PENDING` + hanya contributor/owner.
   - validasi file (image/pdf, ≤5MB) + `source_url` (nullable url).
6. **Endpoint baru** `GET /api/teams/{team}/contributions/{id}/github-diff`:
   - ambil `source_url`; validasi host **github.com** & pola `pull`/`commit` (SSRF guard).
   - `token = contribution.member.user.github_token` (nullable).
   - fetch `{url}.diff` via `Http` (pakai token kalau ada), timeout ketat, allow_redirects aman.
   - parse jadi `files:[{filename, patch}]` + hitung +/−.
   - `Cache::remember(key=url, 1 hari)` → balikin JSON. Gagal → error rapi (404/401/rate-limit).

## C. FE
- Form create kontribusi: +input file `proof` + input `source_url`.
- **ContributionDetailPage** (dead `invoice_url` block removed; now no render for legacy invoice).
  - tampilin `source_url` sebagai link + tombol "Lampirkan/Edit bukti" (contributor/owner).
  - kalau `source_url` = PR/commit GitHub → tombol **"Lihat perubahan kode 🔍"** → modal fetch `/github-diff` → list file + patch **custom +/-** (merah/hijau, 0 lib; `lucide-react` untuk ikon).
- **Settings user**: input `github_token` (save/delete, status "tersimpan", gak pernah dikembaliin ke FE).
- Types (`src/types/index.ts`): +`source_url` (legacy `actual_amount`/`invoice_url` removed).

## D. Test + Docs
- `ContributionProofTest`: store+proof → `invoice_url` keisi & file ke-store; attach nyusul → update; `source_url` keisi; file salah → 422; edit setelah APPROVED → 422.
- `GithubDiffTest`: URL PR valid → balikin files (mock `Http`); non-github → 422; private tanpa token → error; cache hit ke-2x gak hit API.
- Docs: `agent-context/API_CONTRACTS.md` (proof + github-diff + `source_url` + `github_token`), `TYPES.md`, `GOTCHAS.md` (butuh `php artisan storage:link`; token encrypted; rate-limit GitHub 60/jam tanpa token).

## E. Di luar scope (sengaja)
- Webhook GitHub **gak dibuat**. OAuth **gak**. `enum` legacy `'REVENUE'` di tabel contributions dibiarin (harmless).

## File keci (estimasi)
- 2 migrasi, `Contribution` model + accessor, `ContributionResource`, `ContributionController` (+2 endpoint +2 request), 1 FE modal + form + settings, 2 test, 3 doc.
