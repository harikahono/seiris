# SEIRIS v2 — User Manual
**Equity & Cap-Table Platform for Founding Teams**

*Document version: v2.0 · For end users and external parties (investors, advisors)*

---

## Table of Contents
1. What is SEIRIS
2. Glossary
3. Getting Started: Account & Login
4. Dashboard
5. Teams: Create, Join, Invite
6. Members & FMR
7. Projects (Slicing Pie Beranak)
8. Contributions
9. Equity & Freeze
10. Revenue & Profit Distribution
11. Audit Log
12. Real-Time & Collaboration
13. FAQ & Troubleshooting
14. Appendix: Formulas & Rules

---

## 1. What is SEIRIS
SEIRIS is an equity-splitting system based on the **Slicing Pie** method — a fair model for teams whose contributions cannot be predicted up front. Each person "pays" the team through contributions (time, cash, ideas, network, sales, facilities) and is rewarded with **slices**, which are later translated into ownership percentage.

For investors, the key advantage is that every equity change leaves an **immutable snapshot** that can be exported to a **PDF cap table** at any time.

## 2. Glossary
| Term | Meaning |
|---|---|
| **Slices** | Unit of ownership. Total slices determines the split %. |
| **Equity %** | `member slices ÷ total slices × 100`. |
| **FMR** | *Fair Market Rate* — reasonable hourly value for time-based contributions. |
| **Contribution** | A logged contribution (CASH/TIME/IDEA/NETWORK/FACILITY/SALES). |
| **Snapshot** | A point-in-time photo of equity (append-only, cannot be changed). |
| **Freeze** | Locking the equity calculation of a scope (project or team). |
| **Cap table** | Final ownership list (aggregates all projects + team). |

## 3. Getting Started: Account & Login
**Register** (`/register`):
- Full name, Email, Password (min. 8 characters), Password confirmation.
- Email is validated; password must match and be ≥ 8 characters.
- On success → automatically lands on the Dashboard.

**Login** (`/login`):
- Email + Password. The session is stored as a Bearer token in the browser.
- Token expires → prompted to log in again automatically.

> Security: passwords are never displayed; every API request requires the token.

### 3.1 Account Settings (`/settings`)
After login, you can access **Pengaturan Akun** from the sidebar:
- **Profil**: update nama, email, password (opsional), dan foto profil (JPG/PNG/WebP, maks 5 MB).
- **GitHub Token**: optional personal access token (classic, with `repo` scope) used to fetch private repo diffs for contribution proof. You can show/hide the token or clear it.

> **Team Settings** (Pengaturan Tim) hanya terlihat oleh **owner** tim pada sidebar. Anggota biasa tidak melihat menu tersebut.



## 4. Dashboard
Main screen after login:
- **"My Equity" card** — your %, your slices, total team slices.
- **Team list** — each team shows its status (🔒 if the team is frozen), your equity %, and an open button.
- Actions: **Create New Team** or **Join Team** (using an invite code).

## 5. Teams: Create, Join, Invite
- **Create Team** → you become the **Owner** (full rights).
- **Join Team** → enter the `invite_code` (6–8 characters) from the owner.
- **Invite members** → owner shares the `invite_code`; members join on their own (no automatic email invite).
- **Roles**: `owner` (one person) and `member`.

## 6. Members & FMR
FMR determines the value of time-based contributions. Rules:
- **Owner** can set FMR directly via the pencil icon in the Members tab.
- A **member** whose FMR is not set may only create `CASH` / `FACILITY` / `SALES` contributions (cannot do TIME/IDEA/NETWORK).
- **Propose FMR** (non-owner): appears in the *Pending FMR Proposals* panel; owner **Approves** or **Rejects**.
- **Remove member** (owner): choose *Good Leaver* (all slices kept) or *Bad Leaver* (non-cash slices forfeited, cash recalculated without multiplier). Equity is recomputed automatically.
- **FMR cap**: maximum **Rp 150,000/hour** (config `MAX_STUDENT_FMR`).

## 7. Projects (Slicing Pie Beranak)
SEIRIS supports a **team with multiple projects**, each with its own pie:
- **Create Project** (owner) → project becomes a "child" of the team; the owner is auto-added to the project roster.
- **Scope Selector** at the top of the page: switch between **Team (parent)** ↔ **a specific Project**. All data (contributions, equity, revenue) follows the selected scope.
- **Project FMR** can differ from the team FMR (`project_fmr`).
- 🔒 next to a project name = the project is frozen.

> Aggregation: the team cap table = team-level contributions + **all** slices from every project (active and frozen alike). No slices are ever lost.

## 8. Contributions
### 8.1 Types & slice calculation
| Type | Input needed | Value | Multiplier | Slices |
|---|---|---|---|---|
| `CASH` | Amount | `amount` | ×4 | `amount × 4` |
| `FACILITY` | Amount | `amount` | ×2 | `amount × 2` |
| `TIME` | Hours | `hours × FMR` | ×2 | `hours × FMR × 2` |
| `IDEA` | Hours | `hours × FMR` | ×2 | `hours × FMR × 2` |
| `NETWORK` | Hours | `hours × FMR` | ×2 | `hours × FMR × 2` |
| `SALES` | Deal & Estimate & Rate | `markup × rate%` (commission) | ×2 | `commission × 2` |

*Example:* Budi logs 10 hours at FMR Rp 50,000 → value 500,000 × 2 = **1,000,000 slices**. Sari contributes cash Rp 1,000,000 → × 4 = **4,000,000 slices**. Total 5,000,000 → Budi 20%, Sari 80%.

### 8.2 Creating a contribution
1. Select the scope (team/project) via the selector.
2. Click **Create Contribution** → choose type → fill details → **Submit**.
3. Initial status: **PENDING**.

### 8.3 Voting & approval
- Only **other members** (not the creator, and must belong to the scope) may vote **Approve/Reject**.
- **Threshold**: 50 (majority), 75 (supermajority), 100 (unanimous) — set by the owner.
- **Tie-breaker**: the **Owner's** deciding vote; if the owner is the creator, falls back to the longest-tenured member.
- Each member may vote only once (no revote).
- An **APPROVED** contribution → the system creates a **new equity snapshot** (without overwriting the previous one).

### 8.4 When the scope is frozen
The **Create Contribution** button is automatically **disabled + 🔒**, and a banner appears:
> *"This project is locked — no further changes can be made."*

(Revenue is still allowed — see §10.)

### 8.5 Bukti Kontribusi (Proof & GitHub Link)
When creating a contribution you can optionally add:
- **File bukti** (PDF, JPG, PNG up to 5 MB) — e.g. receipt, contract, screenshot.
- **Link GitHub** (PR or commit URL) — e.g. `https://github.com/owner/repo/pull/123` or `https://github.com/owner/repo/commit/abc123`.

Only the **creator** or **owner** can attach proof, and only while the contribution is still **PENDING** (before approval/rejection).

On the Contribution Detail page, you'll see:
- **Proof file** → click to download.
- **GitHub link** → click to open on GitHub.
- **Lihat Diff** (if GitHub link is set) → opens an inline diff viewer with syntax coloring (green = added, red = removed, cyan = code context).

### 8.6 Diff Cache
The GitHub diff is **cached for 1 day** on the server. Subsequent views load instantly. To fetch a fresh diff, wait for the cache to expire.

## 9. Equity & Freeze
### 9.1 Equity tab
Pie chart, member table (% & slices), and breakdown by contribution type. An **Export PDF** button produces the cap table (useful for investors).

### 9.2 Freeze Project (owner)
Locks the project's pie → automatically aggregated into the parent team. After freeze:
- Add/Remove project member ❌
- Edit project FMR ❌
- New contributions & votes ❌ (UI locked + 🔒)

### 9.3 Freeze Team (owner)
Only possible once **every project is already frozen**. This "bakes" the entire final cap table.

### 9.4 Why revenue is still allowed after freeze
Freeze only locks the **split %**. Money (revenue) can still come in and be distributed according to the matured cap table — ideal for a finished project that is still collecting payment.

## 10. Revenue & Profit Distribution
1. **Record Revenue** (owner): amount, optional deductions, date, proof (PDF/image).
2. **Request Distribution** (member): requests from the owner.
3. **Approve & Distribute** (owner): profit split by equity % (latest snapshot).
4. Each distribution is recorded **append-only** (cannot be edited or deleted) → clean audit trail for investors.

## 11. Audit Log
The Audit tab shows the **full history of actions** (immutable): contributions, votes, freezes, distributions, FMR changes, etc. Read-only — full transparency.

## 12. Real-Time & Collaboration
- Updates (equity, votes, freezes, revenue) appear **live without refresh** via Pusher.
- Toast notifications + online-member indicator.
- If someone freezes a project while you have it open, the buttons will **lock immediately** in real time.

## 13. FAQ & Troubleshooting
**Q: I can't create a TIME/IDEA/NETWORK contribution.**
A: Your FMR is not set. Ask the owner to set it in the Members tab.

**Q: The "Create Contribution"/vote button is dead and shows 🔒?**
A: The scope (project/team) is frozen. Wait for the owner to reopen it, or finalize via the cap table.

**Q: Can I edit an already-approved contribution?**
A: No. Equity snapshots are append-only; to correct, create a new contribution (with a fresh vote).

**Q: What's the difference between freezing a project vs the team?**
A: Freezing a project locks one project's pie; freezing the team locks the entire cap table (all projects must be frozen first).

**Q: The diff viewer shows "Failed to Fetch Diff" — what now?**
A: For **private repos**, set your GitHub Personal Access Token in Pengaturan Akun → GitHub Token. The token must have `repo` scope. For public repos, no token is needed.

**Q: I attached the wrong file — can I replace it?**
A: Yes, as long as the contribution is still PENDING. Just upload again — the old file is replaced.

**Q: Can I add a GitHub link after creating the contribution?**
A: Yes. Open the contribution detail page and use the attach form (PENDING only). Both file and link can be added or updated.

**Q: How does an investor see ownership?**
A: Export the PDF cap table from the Equity tab (team scope).

## 14. Appendix: Formulas & Rules
- **Slices** = `value × multiplier` (rounded).
- **Multiplier**: CASH ×4; everything else ×2.
- **Equity %** = `slices ÷ total slices × 100`.
- **FMR cap**: Rp 150,000/hour.
- **Bad Leaver**: non-cash slices = 0.
- **Voting**: threshold 50/75/100; tie-breaker owner → longest-tenured member.
- **Immutability**: snapshots, audit log, and distributions cannot be edited or deleted.
- **Concurrency**: the team row is locked (`lockForUpdate`) during voting/approval to prevent race conditions.
