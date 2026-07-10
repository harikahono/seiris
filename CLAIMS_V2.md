# SEIRIS v2 — Defensible Claims

## Arsitektur & Model Domain
1. **Slicing Pie Beranak** — equity dinamis hierarkis: 1 Tim induk → banyak Project (pie anak), masing-masing scope menghasilkan EquitySnapshot immutable. Agregat tim = totalitas semua project (zero-loss principle). ✅
2. Multiplier Moyer: CASH×4, TIME/IDEA/NETWORK/FACILITY/SALES×2. ✅
3. SALES redesign: model komisi markup `(deal−estimasi)×rate`, bukan REVENUE murni. ✅
4. Setiap scope (tim/project) menghasilkan `EquitySnapshot` immutable. ✅
5. `Contribution.total_slices` immutable post-creation (blocked via model `booted()` guard). ✅

## Voting & Governance
6. Kontribusi PENDING→APPROVED/REJECTED; threshold konfigurable (50/75/100%). ✅
7. **Self-vote dilarang** — pembuat gak bisa vote kontribusinya sendiri. ✅
8. **Voting dipagar per-project** — hanya `project_members` roster yang boleh vote/kontribusi di project tersebut. ✅ *(Model B: nested pies)*
9. Tie-breaker: owner casting vote; fallback tenure terlama; **hanya menentukan saat semua voter sudah vote**. ✅ *(fix H2)*
10. **Freeze mengunci pie** — vote & kontribusi baru diblokir setelah freeze. ✅ *(fix C2)*
11. Pessimistic locking (`lockForUpdate` + DB transaction) cegah race condition voting. ✅ *(BUT: requires PostgreSQL)*

## Security
12. Auth via Laravel Sanctum (Bearer token), semua route terproteksi `auth:sanctum`. ✅
13. **Rate limiting Opsi C Full**: login/register per-email 5/menit + per-IP 60/menit; endpoint tulis 30/user/menit; read 120/user/menit. ✅ *(anti brute-force + abuse)*
14. **IDOR request-distribute tertutup** — hanya member tim yang boleh ajukan distribusi. ✅ *(fix H1)*
15. Append-only ledger: AuditLog (no update/delete), EquitySnapshot, ProfitDistribution (no update/delete). ✅
16. Validasi input via FormRequest di semua write endpoint; FMR dibatasi `MAX_STUDENT_FMR` (150.000) di validation layer. ✅

## Revenue & Distribution
17. Alur distribusi: member ajukan → owner setujui → bagi per `equity_pct` snapshot saat distribusi. ✅
18. Concurrent distribute aman (row lock + status guard). ✅ *(fix M2)*
19. Bad-leaver recovery: slices non-cash hilang untuk leaver "bad". ✅

## Real-time & UX
20. Pusher real-time broadcast: `equity.updated`, `contribution.created`, `team.updated` via PresenceChannel. ✅
21. Online member count tracking via Pusher presence. ✅
22. FE: dashboard, 5 tab tim, voting panel project-scoped, PDF equity export. ✅

## Database & Deploy
23. PostgreSQL-only features: `gen_random_uuid()`, `lockForUpdate()` row-level locking. ✅ *(SQLite tidak поддерживает)*
24. Doctrine DBAL diperlukan untuk 2 migration yang pakai `->change()` (enum→string). ✅ *(composer.json updated)*
25. PDF export via barryvdh/laravel-dompdf dengan DejaVu Sans. ✅

## ⚠️ Caveats — Jangan Over-claim di Defense
- **#11 & #23**: Pessimistic locking butuh PostgreSQL. Deploy di SQLite = lock no-op (bukan thread-safe).
- **Tes otomatis**: hanya 2 stub test (ExampleTest). Jangan bilang "teruji komprehensif" → "sudah melalui review kode, PHP lint, pnpm build, dan static analysis."
- Rate limiter = config statis, bukan WAF/adaptive. Cukup untuk skala mahasiswa.
- FMR cap dienforce di **validation layer** (FormRequest), bukan di service.
- Tidak ada CAPTCHA/step-up auth (sesuai scope TA mahasiswa).
- Freezing = owner action, tidak ada forced freeze mechanism.

## v1 → v2 Migration Notes
- `REVENUE` enum → `SALES` string (model komisi markup)
- `equity_pct` kolom dihapus dari teams (dihitung dinamis dari snapshot)
- Distribution safeguard: unique constraint + status guard
- Semua FK pakai `foreignUuid`, model pakai `HasUuids`
- Audit log append-only; contribution.total_slices immutable

---
*Generated after P0/P1/P2 fixes + rate limiter implementation (Session 2026-07-11)*