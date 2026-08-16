# API_CONTRACTS — SEIRIS

> Diambil dari `routes/api.php` (asli) per 2026-07-20. Ini versi **koreksi** — AGENTS.md kehilangan seluruh subtree project + `/api/broadcasting/auth`. Base prefix: `/api`. Semua route (kecuali `/ping`, invite preview, auth) butuh `Authorization: Bearer <token>`.

## Konvensi
- Pagination: `{ data[], meta:{ current_page, last_page, total } }` (kecuali disebutkan).
- Error: `422` validasi (`{message:'Data tidak valid.', errors:{...}}`, pesan Indonesia), `403` forbidden, `409` conflict, `413`/file-too-big, `401` unauth, `502` (GitHub diff fetch gagal).
- Throttle: `api`=120/menit, `write`=30/menit, `auth`=5/email + 60/ip per menit (definisi di `AppServiceProvider::RateLimiter`, BUKAN `config/auth.php`).
- Middleware scope: `team.member` (EnsureTeamMember) / `project.member` (EnsureProjectMember, write-tier wajib roster project). Route tanpa `{team}` param (vote/distribute/request-distribute/fmr approve-reject) cek membership manual di controller.

## Public
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/ping` | health check (`{status:'ok', app, time}`) |
| GET | `/teams/invite/{inviteCode}` | preview undangan (tanpa auth) → `{data:{name,description,members_count,owner_name,created_at}}` / 404 |

> `inviteCode` di-normalize ke uppercase via `strtoupper()` di controller. FE juga kirim uppercase (`inviteCode.toUpperCase()`).

## Auth
| Method | Path | Throttle | Body | Res |
|--------|------|----------|------|-----|
| POST | `/auth/register` | auth | name, email, password, password_confirmation | 201 `{message, token, user:UserResource}` |
| POST | `/auth/login` | auth | email, password | `{message, token, user}` / 401 `Email atau password salah.` |
| POST | `/auth/logout` | write | — | `{message:'Logout berhasil.'}` |
| GET | `/auth/me` | — | — | `{user:UserResource}` |
| PATCH | `/users/me/profile` | write | name, email, password? (nullable, min:8, confirmed), profile_photo? (file, image, max 5MB) | 200 `{message, user:UserResource}` |
| PATCH | `/users/me/github-token` | write | `github_token` (nullable string, max:255, empty → clear) | 200 `{message, user:UserResource}` |
| POST | `/broadcasting/auth` | write | channel_name | respon Pusher auth (presence) |

## Config
| Method | Path | Res |
|--------|------|-----|
| GET | `/config` | `{ features: { contribution_proof: bool } }` — feature flags (inline closure, no controller) |

> `UserResource` sekarang punya field `has_github_token: bool` (bukan token itu sendiri).

## Dashboard
| Method | Path | Res |
|--------|------|-----|
| GET | `/my-dashboard` | `{user, summary:{total_teams,total_pending_to_review}, teams:[DashboardTeamItem]}` |

## Teams (tanpa {team})
| Method | Path | Throttle | Body | Res |
|--------|------|----------|------|-----|
| POST | `/teams` | write | name, description?, approval_threshold?(50/100), fmr?(0..MAX) | 201 `{message, data:TeamResource}` |
| GET | `/teams` | — | — | `{data:TeamResource[]}` (tidak paginasi) |
| POST | `/teams/join` | write | invite_code(8) | 201 `{message, data:TeamMemberResource}` / 404 / 403 frozen / 409 already member |

## Teams scoped (`team.member`)
| Method | Path | Throttle | Body | Res / Error |
|--------|------|----------|------|-------------|
| GET | `/teams/{team}` | — | `project_id?` (lampirkan project_fmr) | `{data:TeamResource}` / 403 |
| PUT | `/teams/{team}` | write | name?, description?, approval_threshold?, commission_rate?, fmr? | 200 `{message, data}` / 403 (bukan owner) / 422 |
| PUT | `/teams/{team}/members/{member}/fmr` | write | fmr(0..MAX), project_id? | 200 `{message, data}` / 404 / 403 inactive / 409 project frozen |
| POST | `/teams/{team}/freeze` | write | — | 200 `{message, data}` / 409 already frozen atau ada project aktif / 422 |
| POST | `/teams/{team}/members/{member}/exit` | write | exit_reason?, leaver_type(good\|bad) | 200 `{message}` / 403 owner / 409 already exited |

> NOTE: AGENTS.md salah tulis `exit` sebagai **PUT**; aslinya **POST**.

## Contributions (`team.member`)
| Method | Path | Throttle | Body | Res |
|--------|------|----------|------|-----|
| GET | `/teams/{team}/contributions` | — | `status?`, `page` | paginasi ContributionResource |
| POST | `/teams/{team}/contributions` | write | type, description, contribution_date, proof? (file, pdf/jpg/png max 5MB), source_url? (regex: github PR/commit URL), + per-type (TIME/IDEA/NETWORK: hours; CASH/FACILITY: amount; SALES: deal_value,estimated_value) | 201 `{message, data}` / 403 frozen / 422 FMR=0 (TIME/IDEA/NETWORK) |
| GET | `/teams/{team}/contributions/{contribution}` | — | — | `{data:ContributionResource}` / 404 |
| POST | `/teams/{team}/contributions/{contribution}/proof` | write | proof? (file), source_url? (regex) | 200 `{data:ContributionResource}` / 422 not PENDING / 403 unauthorized |
| GET | `/teams/{team}/contributions/{contribution}/github-diff` | — | — | `{files:[{filename,patch}]}` (cached 1 hari) / 422 no source_url / 502 GitHub unreachable |

> Routes `proof` dan `github-diff` hanya terdaftar bila `config('seiris.features.contribution_proof') === true`. `source_url` regex: `/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/(pull\/\d+|commit\/[a-f0-9]+)$/`.

## Voting (TANPA team.member — cek manual)
| Method | Path | Throttle | Body | Res / Error |
|--------|------|----------|------|-------------|
| POST | `/contributions/{contribution}/vote` | write | vote(APPROVE\|REJECT), note? | 200 `{message, data}` / 403 bukan member/self-vote/bukan roster / 409 not PENDING / frozen / already voted |

## Revenues (`team.member` untuk index/show/store; distribute/request TANPA team.member)
| Method | Path | Throttle | Body | Res / Error |
|--------|------|----------|------|-------------|
| GET | `/teams/{team}/revenues` | — | `page` | paginasi RevenueResource |
| GET | `/teams/{team}/revenues/{revenue}` | — | — | `{data:RevenueResource}` (detail — dipakai `RevenueDetailPage`) |
| POST | `/teams/{team}/revenues` | write | description, amount, distributable_amount?, revenue_date, proof?(pdf/jpg/png max 5120KB), deductions?[] | 201 `{message, data}` / 403 bukan owner / 422 |
| POST | `/revenues/{revenue}/request-distribute` | write | — | 200 `{message, data}` / 403 / 409 already distributed / already requested |
| POST | `/revenues/{revenue}/distribute` | write | — | 200 `{message, data:RevenueResource(distributions)}` / 403 bukan owner / 409 distributed / 422 no equity snapshot |

## FMR Proposals (`team.member` untuk store/index; approve/reject TANPA team.member)
| Method | Path | Throttle | Body | Res |
|--------|------|----------|------|-----|
| POST | `/teams/{team}/fmr-proposals` | write | proposed_fmr(0..MAX) | 201 `{message, data}` / 403 frozen / 409 pending exists |
| GET | `/teams/{team}/fmr-proposals` | — | `filter?` | paginasi FmrProposalResource |
| POST | `/fmr-proposals/{proposal}/approve` | write | — | 200 `{message, data}` / 403 / 409 not PENDING |
| POST | `/fmr-proposals/{proposal}/reject` | write | — | 200 `{message, data}` / 403 / 409 not PENDING |

## Equity (`team.member`)
| Method | Path | Throttle | Res |
|--------|------|----------|------|
| GET | `/teams/{team}/equity` | — | inline `{snapshot_id, total_slices, equity_map[], slices_by_type, is_frozen, calculated_at}` (TIDAK pakai resource) |
| GET | `/teams/{team}/equity/history` | — | paginasi snapshot inline |
| GET | `/teams/{team}/equity/export` | write | **PDF download** (`application/pdf`, `SEIRIS_*.pdf`) / 404 bila tak ada snapshot |

## Audit Log (`team.member`)
| Method | Path | Res |
|--------|------|-----|
| GET | `/teams/{team}/audit-logs` | paginasi `{id, action, actor, subject_type, subject_id, payload, ip_address, created_at}`; query `project_id?` (filter via payload), `filter?` (prefix action) |

## Projects — Slicing Pie Beranak (`team.member` luar, `project.member` dalam)
| Method | Path | Throttle | Body | Res / Error |
|--------|------|----------|------|-------------|
| GET | `/teams/{team}/projects` | — | — | `{data:ProjectResource[]}` |
| POST | `/teams/{team}/projects` | write | name, description? | 201 `{message, data}` / 403 bukan owner (auto-add owner ke roster) |
| GET | `/teams/{team}/projects/{project}` | project.member | — | `{data:ProjectResource}` (load contributions, revenues) |
| POST | `/teams/{team}/projects/{project}/freeze` | write | — | 200 `{message, data}` / 403 / 409 already frozen / 422 |
| GET | `/teams/{team}/projects/{project}/contributions` | project.member | `status?`,`page` | paginasi ContributionResource (scope project) |
| POST | `/teams/{team}/projects/{project}/contributions` | write | spt contribution tim (commission_rate diabaikan dari client, pakai team setting) | 201 `{message, data}` / 403 bukan roster |
| GET | `/teams/{team}/projects/{project}/contributions/{contribution}` | project.member | — | `{data:ContributionResource}` |
| POST | `/teams/{team}/projects/{project}/contributions/{contribution}/proof` | write | proof? (file), source_url? (regex) | 200 `{data:ContributionResource}` / 422 / 403 |
| GET | `/teams/{team}/projects/{project}/contributions/{contribution}/github-diff` | — | — | `{files:[{filename,patch}]}` (cached) / 422 / 502 |
| GET | `/teams/{team}/projects/{project}/revenues` | project.member | `page` | paginasi RevenueResource (scope project) |
| POST | `/teams/{team}/projects/{project}/revenues` | write | spt revenue tim | 201 `{message, data}` / 403 bukan roster |
| GET | `/teams/{team}/projects/{project}/equity` | project.member | — | inline equity scope project |
| GET | `/teams/{team}/projects/{project}/equity/history` | project.member | — | paginasi snapshot scope project |
| POST | `/teams/{team}/projects/{project}/members` | write | member_id | 200 `{message}` / 403 / 409 frozen / 404 not in team / 403 inactive |
| DELETE | `/teams/{team}/projects/{project}/members/{member}` | write | — | 200 `{message}` / 404 / 409 frozen |

> `project.member` middleware: GET boleh sembarang anggota tim; POST/PUT/DELETE wajib ada di roster `project_members`.
