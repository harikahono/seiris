# SEIRIS Version Notes — V2

## What Changed: V1 → V2

### Architecture
**Before (V1):** Single flat pie per team. All members vote on all contributions. Team-wide voting scope.

**After (V2):** Slicing Pie Beranak — hierarchical nested pies. Each Team has multiple Projects (child pies), each with its own `project_members` roster. Voting scoped per project. Aggregate team equity = sum of all project slices.

This follows Mike Moyer's principle: *" ventures with different participants should have different grunt funds"* — different people per project = different pies with scoped voting.

### Rate Limiting (New in V2)
Implemented Opsi C Full — 3 named limiters:
- `auth` — per-email 5/min + per-IP 60/min (brute-force protection)
- `write` — 30/min per user (mutation protection)
- `api` — 120/min per user (general protection)
Custom 429 JSON response with `Retry-After` headers.

### Security Fixes (V2)
| ID | Issue | Fix |
|----|-------|-----|
| C1 | Migration `->change()` needs doctrine/dbal | Added `doctrine/dbal:^4.0` to composer.json |
| C2 | Vote allowed after team freeze | `ApprovalController::vote()` checks `is_frozen` first |
| C3 | Project-scoped voting UI broken | ContributionDetailPage fetches team + project_id → project_fmr |
| H1 | IDOR on request-distribute | Authorization gate in RevenueController |
| H2 | Tie-breaker fires before all voted | Gated behind `allVotersVoted` check |
| M1 | EquitySnapshot mutable after creation | `booted()` guard blocks update/delete |
| M2 | Concurrent distribute race | Row lock + status check before distribute |
| M3 | equity/export not rate-limited | Added `throttle:write` |
| M4 | Seeder not atomic | Wrapped in `DB::transaction` |
| M5 | Axios no error toast on 429/5xx | Added interceptor for 429+5xx |
| M6 | usePusher member.info/member.id wrong | Fixed to `member.info` |
| LOW | TeamController NPE, exit_reason validation, dead fields | Fixed |

### Database Changes (V2)
- `revenues.type` enum REVENUE → string SALES
- `equity_pct` column removed (calculated dynamically)
- `leaver_type` added to team_members
- Projects + project_members tables added
- `project_id` FK added to contributions, approvals, equity_snapshots

### Key Files Changed
- `AppServiceProvider.php` — 3 rate limiters registered
- `bootstrap/app.php` — custom 429 handler
- `ApprovalController.php` — freeze lock + tie-breaker fix
- `RevenueController.php` — IDOR fix + distribute lock
- `EquitySnapshot.php` — booted guard
- `composer.json` — +doctrine/dbal
- `routes/api.php` — throttle policy assignments

---

## V2.1 — Contribution Proof & Diff Viewer (2026-07-18)

### What Changed
Added **bukti kontribusi** feature: file upload + GitHub link/source_url + diff viewer for contributions.

### New Endpoints
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/users/me/github-token` | Save/clear GitHub personal access token |
| GET | `/api/config` | Returns feature flags (`{features:{contribution_proof:bool}}`) |
| POST | `/api/teams/{team}/contributions/{contribution}/proof` | Attach proof file & source URL to a PENDING contribution |
| GET | `/api/teams/{team}/contributions/{contribution}/github-diff` | Fetch & cache diff from GitHub PR/commit URL |
| POST | `/api/teams/{team}/projects/{project}/contributions/{contribution}/proof` | (same, project-scoped) |
| GET | `/api/teams/{team}/projects/{project}/contributions/{contribution}/github-diff` | (same, project-scoped) |

### Database
- `contributions` — added `proof_path` (string, nullable), `source_url` (string, nullable)
- `users` — added `github_token` (string, nullable)

### Feature Flag
- `config/seiris.php`: `features.contribution_proof` (bool) — guards all proof/diff routes + FE UI

### Frontend Changes
- `ContributionForm.tsx` — proof file upload & source URL input (flagged)
- `ContributionDetailPage.tsx` — proof download link, GitHub link, diff viewer modal (with syntax coloring)
- `SettingsPage.tsx` — GitHub token input (show/hide, clear)
- `DashboardLayout.tsx` — sidebar link to "Pengaturan Akun"
- `App.tsx` — `/settings` route added
- `AuthContext.tsx` — `setUser` exposed for token update

### Key Technical Details
- Diff parser: `preg_split('/\ndiff --git /')` (bukan `explode`), handles multi-file diffs
- Diff cache: `Cache::remember` TTL 1 day, key `github_diff:<md5(url)>`
- GitHub auth: uses user's `github_token` if set (Bearer header) to fetch private repo diffs
- Upload: 5 MB limit, `public` disk, `contributions/` path
- Validation: `source_url` regex `/(pull\/\d+|commit\/[a-f0-9]+)$/` — supports both PRs and commits

### Bug Fixes
| ID | Issue | Fix |
|----|-------|-----|
| P1 | Commit hash regex `\d+` didn't match hex characters | Changed to `[a-f0-9]+` in both `StoreContributionRequest` and `attachProof` |
| P2 | Diff parser used `explode("\n\n")` — broke on multi-file diffs | Changed to `preg_split('/\ndiff --git /')` |
| P3 | `postJson()` used in file upload test — didn't send multipart | Changed to `post()` |
| P4 | Missing `AuthContext.setUser` export prevented FE token update | Exposed `setUser` from context |

---

## V2.3 — Pengaturan Akun Lengkap & Sidebar Refinement (2026-07-18)

### What Changed
- **Pengaturan Akun** (`/settings`) diperluas: edit nama, email, password (opsional), upload foto profil.
- **Team Settings** di sidebar disembunyikan untuk non-owner.

### New Endpoints
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/users/me/profile` | Update name, email, password (optional), profile photo (multipart) |

### Database
- `users` — added `profile_photo_path` (string, nullable)

### Frontend Changes
- `SettingsPage.tsx` — form lengkap: nama, email, password + confirm, foto profil (preview via objectURL)
- `DashboardLayout.tsx` — menu "Pengaturan" (team) hanya tampil untuk owner (`visibleFeatures.filter`)
- `User` type — added `profile_photo_url` (string|null)

### Key Technical Details
- Multipart upload via `FormData` + `_method=PATCH` (Laravel convention)
- `password` field nullable — skip if empty
- Old profile photo auto-deleted on replacement (`Storage::disk('public')->delete`)
- Validation: email unique (ignore self), image max 5MB JPG/PNG/WebP

---

## V2.4 — Foto Profil, Undangan Tim, & Share Modal (2026-07-20)

### What Changed
- **Foto Profil** tampil di semua avatar anggota (UserAvatar reusable component — fallback inisial).
- **Undangan Tim** lewat link publik: preview tim sebelum join + Discord-style confirmation page.
- **Share Modal** YouTube-style: Copy link, WhatsApp, Gmail — portal, staggered animation.
- **Revenue Detail Page** halaman terpisah untuk detail revenue (konsisten dengan ContributionDetailPage).
- **UI/UX Audit** dan **WCAG 2.2 compliance mapping** terdokumentasi.

### New Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/teams/invite/{inviteCode}` | **Public** (tanpa auth) — preview info tim: nama, deskripsi, jumlah anggota, owner |
| GET | `/api/teams/{team}/revenues/{revenue}` | Detail revenue per-item |

### Frontend Changes
| Komponen | File | Fungsi |
|----------|------|--------|
| `UserAvatar` | `@/components/ui/UserAvatar.tsx` | Reusable avatar: img → fallback inisial (8 lokasi) |
| `ShareInviteModal` | `@/components/ui/ShareInviteModal.tsx` | Modal 3 opsi (Copy/WA/Gmail), portal + staggered animation |
| `JoinPage` | `@/pages/JoinPage.tsx` | Halaman publik konfirmasi join (Discord-style) |
| `AuthPage` | `@/pages/AuthPage.tsx` | Dukung `?redirect=` param untuk post-login redirect |
| `RevenueDetailPage` | `@/pages/teams/RevenueDetailPage.tsx` | Halaman detail revenue (stat box, distribusi, bukti) |

### Backend Changes
| File | Change |
|------|--------|
| `TeamController.php` | New `previewInvite()` — public, return preview data |
| `EquityController.php` | Equity_map sekarang include `profile_photo_url` per entry |
| `routes/api.php` | `GET /teams/invite/{inviteCode}` (public) + `GET /teams/{team}/revenues/{revenue}` |

### Types changes (`types/index.ts`)
- `EquityMemberEntry` — added `profile_photo_url: string | null`

### Documentation
| Doc | Status |
|-----|--------|
| `agent-context/UI_AUDIT.md` | **NEW** — UI affordance audit + WCAG 2.2 breakdown (P0–P3 priorities) |
| `agent-context/*.md` | 6 docs updated to 2026-07-20, aligned with codebase |

### Bug Fixes
| ID | Issue | Fix |
|----|-------|-----|
| U1 | Duplicate ` ``` ` in ARCHITECTURE.md after invite flow section | Removed extra backtick |

### Known WCAG Violations (unfixed in this patch)
| Level | Issue | Severity |
|-------|-------|----------|
| A | ~15 icon buttons without `aria-label` | P0 |
| A | 5 modals without focus trap | P0 |
| AA | Approve/reject FMR 3 inconsistent styles | P1 |
| AA | 2 icon buttons below 24px minimum touch target | P1 |
| — | Several usability/debt items (false hover, visual inconsistency) | P2-P3 |