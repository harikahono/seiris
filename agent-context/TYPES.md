# TYPES — SEIRIS

> Diambil dari kode per 2026-07-20. FE = `seiris-fe/src/types/index.ts`; BE = `seiris-be/app/Models/*` + `app/Http/Resources/*`.

## FE interfaces (`src/types/index.ts`)

Semua type ada di satu file. Yang sering dipakai:

| Interface | Field penting |
|-----------|---------------|
| `User` | id, name, email, avatar, created_at, **has_github_token** (`boolean\|undefined`), **profile_photo_url** (`string\|null`) |
| `Team` | id, name, description, invite_code, approval_threshold (`"50"\|"100"`), **commission_rate** (float, default 50), is_frozen, frozen_at, owner, members[], members_count |
| `TeamMember` | id, role (`"owner"\|"member"`), fmr, **project_fmr** (`number\|null`, per-project FMR), status (`"active"\|"exited"`), exited_at, user, joined_at |
| `ProjectItem` | id, team_id, name, description, is_frozen, frozen_at, created_at, updated_at |
| `Contribution` | id, **project_id** (`string\|null`), type (`ContributionType`), description, value, multiplier (`string`), total_slices, status (`"PENDING"\|"APPROVED"\|"REJECTED"`), contribution_date, deal_value/estimated_value/commission_rate (SALES), member, approvals[], approvals_count, hours?, **proof_url** (`string\|null`), **source_url** (`string\|null`) |
| `ContributionApproval` | id, vote (`"APPROVE"\|"REJECT"`), note, member, voted_at |
| `EquityData` | snapshot_id, **project_id** (`string\|null`), total_slices, equity_map (`EquityMemberEntry[]`), slices_by_type, is_frozen, calculated_at |
| `EquityMemberEntry` | member_id, name, role, slices, equity_pct, **profile_photo_url** (`string\|null`) |
| `Revenue` | id, **project_id** (`string\|null`), **distributable?** (`boolean`), description, amount, distributable_amount, deductions[], proof_url, revenue_date, status (`"pending"\|"distribute_requested"\|"distributed"`), is_distributed, distributed_at, recorded_by, distributions (`RevenueDistribution[]`) |
| `RevenueDistribution` | member, equity_pct, amount |
| `RevenueDeduction` | for, amount |
| `FmrProposal` | id, proposed_fmr, status (`"PENDING"\|"APPROVED"\|"REJECTED"`), member, reviewer, created_at, reviewed_at |
| `AuditLogItem` | id, action, actor, subject_type, subject_id, payload, ip_address, created_at |

Payload types: `LoginPayload`, `RegisterPayload`, `CreateTeamPayload` (**commission_rate?**: 0–100), `CreateContributionPayload` (proof?: `File`, source_url?: `string`), `VotePayload`, `CreateRevenuePayload` (proof?: `File`). Pagination: `PaginatedData<T> = { data, meta:{current_page,last_page,total} }`.

## BE models (12, semua `HasUuids`)

| Model | Kolom kunci | Status / enum | Catatan |
|-------|-------------|---------------|---------|
| `User` | name, email, password | — | |
| `Team` | owner_id, name, invite_code (8 char), approval_threshold (default 50), is_frozen, frozen_at | — | `activeMembers()` scope |
| `TeamMember` | team_id, user_id, role, fmr, status, exited_at, leaver_type (`good\|bad\|null`), exit_reason | role `owner\|member`, status `active\|exited` | helper isGoodLeaver/isBadLeaver/isOwner/isActive |
| `Project` | team_id, name, description, is_frozen, frozen_at | — | `members()` BelongsToMany TeamMember via `project_members` (pivot `fmr`) |
| `ProjectMember` | project_id, team_member_id, fmr | — | pivot murni, unique [project_id, team_member_id] |
| `Contribution` | team_id, member_id, **project_id** (null), type, value, multiplier, **total_slices (immutable)**, status, hours, deal_value, estimated_value, commission_rate | status `PENDING\|APPROVED\|REJECTED` | boot(): total_slices immutable, delete diblokir |
| `ContributionApproval` | contribution_id, member_id, vote (`APPROVE\|REJECT`), note | — | 1 vote/member (cek di controller) |
| `EquitySnapshot` | team_id, **project_id** (null), triggered_by_contribution, total_slices, equity_map (`{memberId:{slices,equity_pct}}`), is_frozen | — | boot(): hanya `is_frozen` yg mutable, delete diblokir (append-only) |
| `Revenue` | team_id, **project_id** (null), recorded_by, amount, distributable_amount, deductions, proof_path, revenue_date, is_distributed, status | status `pending\|distribute_requested\|distributed` | punya `distributableSnapshot()` |
| `ProfitDistribution` | revenue_id, member_id, equity_pct_snapshot, amount | — | boot(): update+delete diblokir (append-only) |
| `FmrProposal` | team_id, member_id, proposed_fmr, status, reviewed_by, reviewed_at | status `PENDING\|APPROVED\|REJECTED` | 1 pending/member |
| `AuditLog` | team_id, actor_id, action, subject_type, subject_id, payload, ip_address | — | `$timestamps=false`, boot(): update+delete diblokir (INSERT ONLY) |

## BE Resources (8 class di `app/Http/Resources/`)

| Resource | Field diekspor |
|----------|---------------|
| `UserResource` | id, name, email, created_at, **has_github_token** (`bool`), **profile_photo_url** (`string\|null`) |
| `TeamMemberResource` | id, team_id, role, fmr, **project_fmr**, status, exited_at, user, joined_at |
| `TeamResource` | id, name, description, invite_code, approval_threshold, is_frozen, frozen_at, owner, members[], members_count, created_at |
| `ContributionResource` | id, type, description, value, multiplier, total_slices, status, contribution_date, deal_value/estimated_value/commission_rate (SALES), member, approvals[], approvals_count, created_at, hours (TIME/IDEA/NETWORK), **proof_url** (`string\|null`), **source_url** (`string\|null`) |
| `ContributionApprovalResource` | id, vote, note, member, voted_at |
| `RevenueResource` | id, **project_id**, **distributable** (`bool = !!distributableSnapshot()`), description, amount, distributable_amount, deductions, proof_url, revenue_date, status, is_distributed, distributed_at, recorded_by, distributions[], created_at |
| `FmrProposalResource` | id, proposed_fmr, status, member, reviewer, created_at, reviewed_at |
| `ProjectResource` | id, team_id, name, description, is_frozen, frozen_at, created_at, updated_at |

> **TIDAK ADA `EquitySnapshotResource`** — endpoint equity (`EquityController`) balikin array inline, bukan resource.

## FE inline type (tidak di types/index.ts)

JoinPage punya `interface TeamPreview` lokal (digunakan untuk response `GET /teams/invite/{inviteCode}`):

| Field | Type |
|-------|------|
| name | `string` |
| description | `string\|null` |
| members_count | `number` |
| owner_name | `string` |
| created_at | `string` |

> Tidak perlu diekstrak ke `types/index.ts` selama cuma dipakai 1 tempat (YAGNI).

## Mapping nama FE <-> BE (GANTI biar gak bingung)

| Konsep | FE type | BE model |
|--------|---------|----------|
| Snapshot ekuitas | `EquityData` | `EquitySnapshot` |
| Distribusi profit | `RevenueDistribution` | `ProfitDistribution` |
| Project | `ProjectItem` | `Project` (+ `ProjectMember`) |
| Anggota tim | `TeamMember` | `TeamMember` (sama) |

Catatan: FE tidak punya interface `ProjectMember`/`ProfitDistribution`/`EquitySnapshot` — pakai `ProjectItem`, `RevenueDistribution`, `EquityData`.
