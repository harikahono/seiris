# DOMAIN_LOGIC — SEIRIS

> Sumber: `SLICING_PIE_RULES.md` + `CLAIMS_V2.md` (dikonsolidasi & **dibenerin**) + `app/Services/SlicingPieService.php`. Diambil dari kode per 2026-07-14.

## 1. Filosofi

> *"Your % share of the reward = Your % share of what's at risk."* (Mike Moyer, Slicing Pie)

Setiap kontribusi yang tak dibayar penuh = "bet". Ekuitas = proporsi total bet.

```
slice      = fair_market_value x multiplier
equity_%   = individual_slices / total_slices
```

## 2. Multiplier (TETAP)

| Tipe | Multiplier | Basis nilai | Formula value |
|------|-----------|-------------|---------------|
| `CASH` | ×4 | nominal uang | `amount` |
| `TIME` / `IDEA` / `NETWORK` | ×2 | jam × FMR | `round(hours * fmr)` |
| `FACILITY` | ×2 | nominal | `amount` |
| `SALES` | ×2 | komisi markup | `round(max(0, deal_value - estimated_value) * commission_rate / 100)` |

- FMV cap: `MAX_STUDENT_FMR` (default 150000 IDR/jam) dari `config/seiris.php`, divalidasi di controller (`StoreContributionRequest`, `UpdateFmrRequest`, `StoreFmrProposalRequest`) + hard 422 di `TeamController::updateFmr` & `ContributionController::store`.
- `FMR = 0` **memblokir** kontribusi `TIME`/`IDEA`/`NETWORK` (controller layer, `ContributionController`). `CASH`/`FACILITY`/`SALES` tetap boleh.
- `value` dihitung di `ContributionController::calculateValue`, lalu `SlicingPieService::calculateSlices(type, value)` → `total_slices = round(value * multiplier)`.

> **CORRECTION:** AGENTS.md & `SLICING_PIE_RULES.md` menyebut tipe `REVENUE` (`actual_amount - invoice_amount`). Itu **legacy** — di `types/index.ts` cuma sisa `invoice_amount`/`invoice_url` (komentar "Legacy REVENUE (data lama)"). Tipe sah sekarang: `CASH, TIME, IDEA, NETWORK, FACILITY, SALES`. Penjualan pakai `SALES`, bukan `REVENUE`.

## 3. Slicing Pie Beranak (nested pie)

- 1 Team induk → banyak Project (pie anak). Masing-masing scope (tim / project) → `EquitySnapshot` immutable (`project_id` null = tim, terisi = project).
- `recalculate($team)`: agregat tim-level (`project_id IS NULL`) + **semua** snapshot project terbaru → **zero-loss** (total tim = jumlah seluruh project).
- `recalculate($team, $contribution, $project)`: scope project; setelah snapshot project dibuat, **cascade** ke `recalculate($team)`.
- **Per-project FMR**: `project_members.fmr` menimpa `TeamMember.fmr` untuk anggota di roster project tertentu.

## 4. State machines (FSM)

### Contribution: `PENDING -> APPROVED | REJECTED`
Dikelola di `ApprovalController::checkAndUpdateStatus` (dalam `DB::transaction` + `lockForUpdate`):
- `PENDING -> APPROVED` bila `approvePct >= team.approval_threshold` (50/75/100).
- `PENDING -> REJECTED` bila `rejectPct > (100 - threshold)`.
- **Tie** (`approveCount == rejectCount` & semua voter sudah vote) → `handleTieBreaker`: owner casting vote menang; bila owner = creator → anggota tertua (tenure) yang memutuskan.
- Tim 1 voter → auto-APPROVED.
- Aturan: creator **tidak bisa** self-vote; tiap member 1 vote (no re-vote); hanya PENDING yg bisa divote; tim/project **frozen** blokir voting.
- Saat APPROVED → `SlicingPieService::recalculate()` (snapshot baru).

### Revenue: `pending -> distribute_requested -> distributed`
- `pending -> distribute_requested`: `requestDistribute`, sembarang anggota aktif.
- `pending -> distributed` ATAU `distribute_requested -> distributed`: owner `distribute` (request bersifat opsional). Butuh snapshot ekuitas valid untuk scope (`Revenue::distributableSnapshot()`), else 422.
- `is_distributed` = mirror `status == 'distributed'`.

### FmrProposal: `PENDING -> APPROVED | REJECTED`
- `approve` → `TeamMember.fmr` diupdate. `reject` → ditolak. Hanya owner. 1 pending per member.

### TeamMember: `active -> exited`
- `exitMember` (owner only): set `leaver_type` good/bad, hapus `project_members`, auto-REJECT kontribusi PENDING member, re-run recalc per project + tim. Role `owner` tak bisa di-exit.

### Freeze
- Team `is_frozen`: HANYA via `TeamController::freeze`, dan **diblokir bila masih ada project aktif** (Prinsip zero-loss).
- Project `is_frozen`: `ProjectController::freeze` (owner).
- Freeze memblokir: kontribusi baru, voting, FMR proposal baru, join, perubahan FMR anggota.

## 5. Append-only ledger

Model berikut **tidak bisa di-update/delete** (dijaga di `boot()`):
- `AuditLog` — INSERT ONLY (`$timestamps = false`).
- `EquitySnapshot` — hanya kolom `is_frozen` yg boleh berubah.
- `ProfitDistribution` — update + delete diblokir.
- `Contribution` — delete diblokir; `total_slices` immutable (setelah create tak bisa diubah).

> Implikasi: jangan bikin endpoint update/delete untuk model di atas.

## 6. Bad-leaver recovery

Di `recalculate()`, bila `TeamMember.isBadLeaver()` dan tipe != `CASH` → `slices = 0`. Slice cash tetap dihitung.

## 7. Concurrency

Voting & distribusi dibungkus `DB::transaction` + `DB::table('teams')->where('id',...)->lockForUpdate()` (pessimistic locking). **Butuh PostgreSQL** (row-level lock); di SQLite `lockForUpdate()` no-op / gagal.

## 8. Distribusi profit per-scope

`Revenue::distributableSnapshot()` memilih snapshot terbaru untuk scope revenue:
- `project_id` terisi → cari snapshot dengan `project_id` sama.
- `project_id` null → cari snapshot tim-level (`project_id IS NULL`).
- Return `null` bila `equity_map` kosong → revenue **belum bisa didistribusikan** (frontend gate tombol via `revenue.distributable`).
