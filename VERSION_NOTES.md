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
*V2 tagged after P0/P1/P2 fixes + rate limiter + docs cleanup*