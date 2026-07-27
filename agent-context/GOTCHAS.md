# GOTCHAS — SEIRIS

> Trap yang sudah bikin bug / salah asumsi. Diambil dari `CLAIMS_V2.md` (caveats) + `AGENTS.md` quirks + temuan sesi 2026-07-14 s.d. 2026-07-26. Baca ini SEBELUM ngubah kode. Untuk isu UI/UX affordance selain trap di sini, baca `UI_AUDIT.md`.

## Database & Deploy
- **PostgreSQL wajib di produksi.** Migrasi pakai `gen_random_uuid()` & `lockForUpdate()` (row-level lock) — **gagal di MySQL/SQLite**. SQLite hanya untuk test (`:memory:`). Jangan deploy ke SQLite.
- **Backend jalan CLI SAPI (`php artisan serve`), BUKAN php-fpm.** Upload limit = `upload_max_filesize`/`post_max_size` di **`php-cli/php.ini`** (bukan fpm). Ubah lalu restart service `seiris-backend`.
- **nginx butuh `client_max_body_size 20M;`** di site `seiris` (default 1M → **413** pas upload bukti revenue). Setelah ubah: `nginx -t && systemctl reload nginx`.
- `php artisan storage:link` perlu dijalankan agar upload bukti (`proof_path`) keakses via URL.

## AGENTS.md SUDAH STALE — jangan percaya buta
- **Models = 12, bukan 10.** `Project` + `ProjectMember` nyata (Slicing Pie Beranak). Tabel endpoint AGENTS.md kehilangan SELURUH route `/projects/...` + `/api/broadcasting/auth`.
- **Tipe kontribusi:** `CASH, TIME, IDEA, NETWORK, FACILITY, SALES`. Tidak ada `REVENUE` (itu legacy, sisa `invoice_amount`/`invoice_url` di FE). `SALES` = `(deal−estimasi)×rate`.
- **`exitMember` = POST**, bukan PUT (AGENTS.md salah).
- **`EquitySnapshotResource` TIDAK ADA** — endpoint equity balikin array inline.
- **Rate limit = `api` 120 / `write` 30 / `auth` 5-per-email+60-per-ip**, didefinisikan di `AppServiceProvider::RateLimiter`, BUKAN `config/auth.php`. AGENTS.md bilang "60/min" — salah.

## Frontend traps
- **`notProjectMember` JANGAN di-re-declare di `RevenueCard.tsx`.** Base sudah mendeklarasikannya (`const notProjectMember = isProjectMember === false;`). Nambah lagi → `TS2451: Cannot redeclare`. `isProjectMember` di-pass dari `RevenueTab` (`isCurrentUserProjectMember`).
- **`git add -p` unreliable** untuk hunk campuran di `RevenueCard.tsx` (proof vs gate). Kalau mau split commit bersih, lebih aman revert ke base lalu re-apply sebagian.
- **Naming FE ≠ BE:** FE pakai `EquityData` (bukan `EquitySnapshot`), `RevenueDistribution` (bukan `ProfitDistribution`), `ProjectItem` (bukan `Project`). Waktu ngetik tipe, pakai nama FE.
- **Inkonsistensi scoping project di FE:** Contributions/Revenue/Equity pakai **path-based** (`/teams/{id}/projects/{pid}/...` via `basePath`), tapi **AuditLogTab + TeamMembersTab pakai query param `project_id`**. Pastikan BE dukung kedua gaya (memang begitu: audit filter `project_id`, team show terima `project_id`).
- **`project_fmr` menentukan keanggotaan project:** FE anggap "project member" = `project_fmr !== null`. Pastikan BE populate `project_fmr` benar untuk roster project, `null` untuk non-roster.
- **Endpoint path di-hardcode** sebagai string literal di komponen (tidak ada central route map). Kalau ganti nama route BE, grep seluruh `seiris-fe/src`.
- **Pusher:** butuh `VITE_PUSHER_*` + `BROADCAST_CONNECTION=pusher` + `queue:listen` jalan. Channel FE = `presence-team.{id}` harus cocok dengan BE `team.{id}`. Bila env Pusher absen, realtime silently mati (no UI fallback).
- **`Revenue.distributable` optional** (`distributable?`). FE gate tombol distribusi: `canDistribute = revenue.distributable ?? hasEquity ?? false`. Pastikan BE mengembalikan `distributable` (sudah ada di `RevenueResource`).

## Domain traps
- **FMR = 0 memblokir** kontribusi `TIME`/`IDEA`/`NETWORK` (controller). `CASH`/`FACILITY`/`SALES` tetap boleh.
- **Append-only:** `AuditLog`, `EquitySnapshot` (hanya `is_frozen` yg mutable), `ProfitDistribution`, `Contribution` (delete diblokir + `total_slices` immutable). Jangan bikin endpoint update/delete untuk ini.
- **Freeze tim diblokir bila ada project aktif.** Freeze project dulu.
- **Tie-breaker hanya saat semua voter sudah vote.** Jangan panggil `handleTieBreaker` sebelum itu.
- **Bad-leaver:** slice non-cash = 0 di `recalculate()`; slice cash tetap dihitung.
- **`Contribution.value`/`hours`/dsb boleh berubah di model, tapi `total_slices` tidak** — slice final dihitung ulang saat APPROVED lewat `recalculate()`.
- **Distribusi butuh snapshot scope:** `Revenue::distributableSnapshot()` null → distribute 422. Untuk revenue project-scoped, harus ada snapshot `project_id` sama.
- **Legacy invoice fields** (`invoice_path`, `invoice_amount`, `actual_amount`) **dihapus** (kini langsung di `create_contributions_table` saja). Gunakan `proof_path`/`proof_url` pada Contribution untuk bukti. ✅

## Profile update traps
- **`updateProfile` pakai multipart** karena ada upload foto. Frontend kirim `FormData` + `_method=PATCH` via `POST`, karena browser tidak support `PATCH` dengan `multipart/form-data`.
- **`password` nullable** — jika tidak diisi, password lama tetap. Validasi `confirmed` hanya jalan jika `password` ada.
- **Email unique** — `Rule::unique('users')->ignore($user->id)` agar user bisa pakai email sendiri.
- **Old photo dihapus** saat upload baru (`Storage::delete`). Jika upload gagal di tengah, perlu rollback manual.
- **`profile_photo_url` accessor** menghasilkan `asset('storage/...')`. Pastikan `php artisan storage:link` sudah jalan.
- **Team Settings di sidebar** disembunyikan untuk non-owner via `visibleFeatures.filter()`. Route tetap bisa diakses via URL langsung — perlu tambahan guard di dalam `TeamSettingsTab` jika ingin proteksi penuh.

## Proof & Diff traps (new in this patch)
- **Feature flag `contribution_proof` guards TWO things:** route registration (BE) AND form/button rendering (FE). Bila dicabut, pastikan keduanya sinkron — FE jangan kirim request ke endpoint yang 404.
- **`source_url` regex validasi** berlaku di dua tempat: `StoreContributionRequest` (saat create) dan inline `attachProof` (saat update). Regex harus sama: `/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/(pull\/\d+|commit\/[a-f0-9]+)$/`. Jangan ubah satu tanpa yang lain.
- **Diff parser pakai `preg_split('/\ndiff --git /')`**, bukan `explode("\n\n")`. Explode("\\n\\n") pecah di baris kosong mana pun dalam patch → hasil potongan tidak berguna. `preg_split` hanya pecah di delimiter file boundary `\ndiff --git `.
- **Commit hash regex** (`[a-f0-9]+`) minimal 1 karakter hex. `\d+` hanya cocok angka → gagal untuk commit SHA yang mengandung huruf a-f. Pastikan kedua validasi source_url (StoreContributionRequest + attachProof) pakai `[a-f0-9]+`.
- **`attachProof` hanya untuk PENDING.** Kontribusi APPROVED/REJECTED return 422. Jangan izinkan upload bukti setelah status berubah.
- **Creator atau owner saja** yang boleh `attachProof`. Check: `$member->id !== $contribution->member_id && !$member->isOwner()` → 403.
- **Multipart upload test** harus pakai `$this->post()` bukan `$this->postJson()` — `postJson()` tidak kirim file.
- **Cache diff 1 hari** — key `github_diff:<md5(url)>`. Tidak ada mekanisme paksa-refresh selain nunggu TTL. Kalau mau fresh diff, butuh endpoint `DELETE` cache.
- **GitHub token di User** — `has_github_token` boolean di `UserResource`, token never exposed. Token disimpan plaintext (nullable). Kalau ada security requirement enkripsi, perlu migration + mutator.
- **`GET /config`** adalah **inline closure** di routes, bukan controller. Kalau butuh logic tambahan (e.g. user-specific flags), refactor jadi dedicated controller.

## FE Proof traps
- **ContributionForm** reset proof & source_url di `handleClose` (state dikosongkan). Bila buka form edit contributions lama, pastikan field tidak terisi data basi.
- **`FieldErrors` type** di frontend: pas proof/source_url validasi error, key-nya `proof` dan `source_url` — sesuai field name, bukan `proof_path`/`source_url` (BE pakai nama field yang sama).
- **Lihat Diff** tombol hanya muncul jika `source_url` terisi dan feature flag aktif. Guard di `ContributionDetailPage.tsx`.
- **Syntax coloring** diff: `+` lines green, `-` lines red, `@@` lines cyan. Style inline di komponen (tidak pakai library eksternal).

## Invite & Join flow traps
- **`GET /teams/invite/{inviteCode}` publik** — endpoint TANPA auth. Response terbatas (tanpa invite_code, tanpa data sensitif). Tapi tetap bisa dipakai enumerasi invite code valid → rate limiter mungkin perlu dipertimbangkan.
- **Invite code uppercase** — BE normalisasi `strtoupper()`, FE juga kirim `inviteCode.toUpperCase()`. Keduanya harus sinkron. Jangan lupa strip spasi.
- **Redirect loop** — Guard di `JoinPage`: `if (!inviteCode) return navigate('/dashboard')`. AuthPage redirect balik setelah login. Pastikan tidak ada circular redirect (JoinPage → /login → /join → ...). Saat ini aman karena guard `!inviteCode` dulu baru `!user`.
- **`TeamPreview` local type** — JoinPage define `interface TeamPreview` secara lokal (bukan di `types/index.ts`). YAGNI: hanya dipakai 1 tempat. Jangan diekstrak tanpa alasan.
- **`animate-fade-in-up` bukan Tailwind built-in** — didefinisikan di `src/styles/globals.css` sebagai custom utility via `@layer utilities`. Kalau dihapus, animasi di JoinPage, DashboardPage, RevenueDetailPage, ContributionDetailPage, ShareInviteModal akan silent fail. Pastikan migrasi Tailwind v5 masih support pattern ini.

## UserAvatar traps
- **Jangan import `UserAvatar` dari path salah** — lokasi: `@/components/ui/UserAvatar`. File sudah ada.
- **`profile_photo_url` nullable** — `UserAvatar` handle null via `imgError` state. Tapi kalau BE kirim string kosong (`""`) bukan `null`, `img` tetap render dan trigger `onError` → fallback inisial. Aman, tapi boros 1 extra render.
- **`profile_photo_url` di equity_map** — ada di 2 tempat di `EquityController`: saat snapshot kosong (baris 49) dan saat snapshot ada (baris 69). Keduanya wajib diisi. Jangan tambah equity logic tanpa isi field ini.

## Share modal traps
- **`ShareInviteModal` pakai `createPortal`** — modal dirender di `document.body`. Kalau di-wrap `AnimatePresence`, pastikan `portal` container stabil.
- **Staggered animation** — 4 elemen dalam modal punya `animationDelay` bertahap (0ms, 80ms, 160ms, 240ms). Jumlah elemen hardcoded. Kalau tambah opsi share, delay perlu disesuaikan.
- **WA link tidak pakai International format validation** — `wa.me` API akan gagal silencenya kalau nomor tidak ada. Saat ini WA share kirim teks saja via `wa.me/?text=...` tanpa nomor — aman.

## RevenueDetailPage traps
- **Hanya team scope** — `RevenueDetailPage` fetch `GET /teams/{team}/revenues/{revenue}` (team scope). Tidak ada route untuk project-scoped revenue detail. Kalau user buka detail revenue dari project, data akan tetap tampil (karena endpoint team scope mencakup semua revenue tim). Tapi path URL tidak mencerminkan scope project.

## Realtime refresh traps (added 2026-07-21)
- **Jangan unmount komponen di realtime refresh** — Detail pages (ContributionDetailPage, RevenueDetailPage) dulunya render loading skeleton di setiap realtime event → skeleton unmount VotePanel/RevenueDetail, user kehilangan input. **Fix:** split jadi 2 state — `initialLoading` (skeleton, hanya untuk first fetch) + `refreshing` (spinner overlay, tidak unmount children). Lihat ARCHITECTURE.md pola split loading.
- **useEffect deps wajib include `page`** — RevenueTab pagination gak pernah fetch halaman >1 karena `page` absen dari dep array. Hook cuma liat perubahan `basePath`/`filter`, tapi `page` berubah tanpa trigger re-fetch. **Rule:** setiap state yang dipake dalam fetch callback harus di dep array — atau pake `useRef` kalau emang gak perlu re-fetch.
- **Scope change = reset ke page 1 sebelum fetch** — ContributionsTab dulunya pakai side-effect `prevBasePath` yang double-render dan stuck. **Fix:** fetch function terima `overridePage` parameter, effect tentuin `targetPage = isNewScope ? 1 : page` langsung, tanpa side-effect. **Rule:** kalau butuh reset state + fetch di perubahan dependency, pass target value langsung ke fetch function, jangan via side-effect setState.
- **`onCreated` callback harus explicit panggil fetch** — RevenueTab punya handler `onCreated` yang cuma close modal + toast, tapi lupa panggil `fetchRevenues()`. List tidak refresh tanpa navigasi manual. **Rule:** tiap mutation handler (create/update/delete), panggil fetch ulang data yang terdampak.

## Penemuan review dosen 2026-07-26

### 1. Filter & Search: Contribution + Audit Log
- **Contribution index** cuma punya filter `?status=` (PENDING/APPROVED/REJECTED) — belum ada search teks (`description` / `member.user.name`), filter `type` (CASH/TIME/IDEA/NETWORK/FACILITY/SALES), filter `member_id`, atau range `contribution_date`.
- **Audit log index** cuma punya filter `?filter=` (prefix match `action`, misal "contribution" → "contribution.created") + `?project_id=` — belum ada search teks atau filter lain.
- **FE ContributionsTab**: 4 tombol toggle status. **FE AuditLogTab**: 8 tombol toggle kategori action. Keduanya **tidak punya search input / date range / dropdown filter**.
- **Pagination 6/page** untuk keduanya — mungkin perlu opsi `per_page` biar gak nge-scroll terus.

### 2. Race condition + duplikat nama project
- **`ProjectController::store()`** pakai `DB::transaction`, tapi **TIDAK `lockForUpdate()`** — berbeda dari SEMUA write operation lain (`ContributionController::store`, `ApprovalController::vote`, `RevenueController::distribute`, `SlicingPieService::recalculate`) yang semuanya row-lock.
- Akibat nyata: jaringan lemot → user klik "Buat Project" berkali-kali → 5+ project dengan nama sama terbuat. **Dua masalah:**
  - Tidak ada `lockForUpdate()` → 5 request masuk transaksi barengan.
  - Tidak ada unique constraint `(team_id, name)` → DB gak nolak duplikat nama.
- **Fix butuh 3 lapis:** (a) migration unique constraint, (b) `Rule::unique` di form request, (c) `lockForUpdate()` di transaction.
- Lihat `DECISIONS.md` ADR-010 (pessimistic locking) — project creation adalah satu-satunya write path yang melanggar ADR ini.

### 3. Team logo/foto profil
- **Tabel `teams`** tidak punya kolom `logo_path` / `profile_photo_path`. `TeamController::update()` cuma handle name, description, approval_threshold — tidak ada upload foto.
- **FE TeamSettingsTab.tsx** tidak ada field upload foto tim. Tidak ada tampilkan logo tim di mana pun (DashboardPage, sidebar, TeamDetailPage).
- **User photo SUDAH ada** (`profile_photo_path` di `User.php`, upload di `AuthController::updateProfile`) — tinggal tiru pola yang sama: migration + accessor `logo_url` + endpoint upload + UI.
- Tim `$fillable` di model `Team.php` hanya: `owner_id, name, description, invite_code, approval_threshold, is_frozen, frozen_at`. Perlu tambah `logo_path`.

### 4. Revenue & distribusi diblokir untuk tim 1 anggota
- **Tidak ada validasi minimum anggota** — tim cuma berisi owner (1 anggota) bisa bikin revenue dan distribusi. Ini celah business logic.
- **Aturan bisnis:** Tim harus punya **minimal 2 active members** (owner + minimal 1 anggota tambahan) sebelum bisa bikin revenue atau distribusi.
- **Yang di-lock:** `RevenueController::store()` + `RevenueController::distribute()` — cek `$team->activeMembers()->count() < 2` → return 422.
- **Yang TIDAK di-lock:** `ContributionController::store()` — owner tetap boleh kontribusi meskipun tim sendiri. Auto-approve untuk 1 anggota tetap normal.
- **Tidak relevan dengan project member:** `project_members` count bukan acuan — validasi di level **tim**, bukan project.
- 
- ## UX Safety traps (added 2026-07-27 — commit `edaf35c`)
- - **Double-submit guard HARUS di handler, bukan cuma `disabled` button.** `disabled={loading}` cegah mouse click, tapi TIDAK cegah: (a) Enter key pada focused button sebelum React re-render, (b) programmatic `form.requestSubmit()`, (c) rapid double-tap touch device. **Rule:** tiap async submit handler WAJIB punya `if (loading) return;` di baris pertama, SEBELUM `setErrors({})` atau validasi lain.
- - **`onClick={handler}` beda dengan `onClick={() => handler()}`.** `onClick={handler}` → React pass `MouseEvent` sebagai argumen pertama. Kalo `handler` terima `(extra?: () => void)` dan panggil `extra?.()`, MouseEvent dicoba call sbg fungsi → throw. **Rule:** kalo handler terima optional callback, caller WAJIB `() => handler()` bukan `handler`.
- - **Realtime refresh bisa race dengan pagination effect.** RevenueTab & ContributionsTab punya 2 `useEffect`: satu untuk page/filter change, satu untuk realtime. Keduanya panggil fetch function yg sama. Yg selesai paling akhir nimpain data — bisa nampilin page 1 padahal user lagi di page 3. **Fix:** `fetchingRef` (useRef<bool>) — set `true` sebelum fetch di page effect, realtime effect skip kalo `fetchingRef.current === true`.
- - **setState setelah unmount = silent bug.** RevenueDetailPage, ContributionDetailPage, MemberDetailPage, DashboardPage punya realtime `useEffect` yg fetch data tanpa guard. User navigasi pergi → komponen unmount → fetch selesai → panggil `setRevenue`/`setContribution`/etc di komponen yg gak ada. **Fix:** `activeRef` (useRef<bool>) — cleanup set `false`, tiap fetch handler cek `if (!activeRef.current) return` di awal.
- - **Jangan polling localStorage.** `TeamContext.tsx` polling `seiris_teams_version` tiap 500ms (120×/menit). **Fix:** `window.addEventListener('storage', handler)` untuk cross-tab, `CustomEvent('seiris:teams-cleared')` + `window.dispatchEvent()` untuk same-tab. Nol polling.
- - **Frozen team + save button.** `TeamSettingsTab.tsx` save button tidak disabled saat `team.is_frozen`. User bisa submit approval_threshold → server 403 → "Gagal memperbarui tim" tanpa penjelasan. **Fix:** `disabled={saving || team.is_frozen}` + title tooltip.
- - **`|| ""` vs `?? ""` untuk angka.** `value={d.amount || ""}` → kalo `amount` = 0, `0 || ""` = `""` (karena 0 falsy). Input jadi kosong. **Rule:** untuk angka yang bisa `0`, selalu pake `?? ""` bukan `|| ""`.
- - **ConfirmModal confirm harus pake `animateClose`.** `onConfirm()` langsung skip exit animation (modal ilang instan, backdrop animasi). **Fix:** `animateClose(() => onConfirm())`.
- - **ProofPreviewModal X button vs backdrop.** Backdrop pake `animateClose(onClose)`, X button pake `onClose` langsung → skip exit anim. **Fix:** `onClick={() => animateClose(onClose)}`.
- - **`URL.revokeObjectURL()` timing.** Dipanggil langsung setelah `a.click()` — browser mungkin belum mulai download blobl. Fix: `setTimeout(() => URL.revokeObjectURL(url), 1000)`.
- - **`URL.createObjectURL()` leak.** Logo/foto preview bikin blob URL baru tanpa revoke yg lama. Kalau user gonta-ganti file tanpa upload, tiap pilihan leak 1 blob URL. **Fix:** `if (prevPreview) URL.revokeObjectURL(prevPreview)` sebelum set baru.
- - **useFocusTrap focus return bisa kena detached element.** `prev.focus()` di cleanup ngarah ke DOM node yg udah gak di document (trigger modal unmount). **Fix:** `if (document.body.contains(prev)) prev?.focus(); else document.querySelector<HTMLElement>('button, ...')?.focus()`.
- - **Escape handler stale closure.** TeamMembersTab exit modal punya `useEffect` depend `[showExit]` tapi panggil `exitCancel` yg didefinisikan inline. `exitCancel` dibuat tiap render, tapi efek pake yg lama sampe `showExit` berubah. **Fix:** `const fnRef = useRef(exitCancel); fnRef.current = exitCancel;` → handler panggil `fnRef.current()`.

