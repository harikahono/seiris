# TODO: GitHub Integration

> Task list untuk implementasi integrasi GitHub di SEIRIS.
> Referensi arsitektur lengkap: `GITHUB_INTEGRATION.md`
> Status: **Belum dimulai**

---

## Phase 1: Foundation & Data Model

- [ ] **1.1** Install `laravel/socialite` via composer
- [ ] **1.2** Migration: tambah `github_id`, `github_username`, `github_email`, `github_token`, `github_refresh_token` ke `users`
- [ ] **1.3** Migration: tambah `source` (string, default 'manual') + `external_references` (json, nullable) ke `contributions`
- [ ] **1.4** Migration: bikin table `webhook_configs` (team_id, platform, repo_url, webhook_secret, settings, is_active)
- [ ] **1.5** Model `WebhookConfig` (HasUuids, casts, relationship ke Team)
- [ ] **1.6** Update `User` model: add `github_*` ke `$fillable`, casts
- [ ] **1.7** Update `Contribution` model: add casts untuk `external_references`, `source`
- [ ] **1.8** Config: tambah `'github' => [...]` di `config/services.php`
- [ ] **1.9** `.env.example`: tambah `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`

### Dependencies:
- Setup GitHub OAuth App di github.com/settings/developers
- Ngrok atau tunnel untuk testing webhook

---

## Phase 2: OAuth GitHub

- [ ] **2.1** Controller `GitHubAuthController` — `redirect()` method
  - Validasi `token` query param -> cari user via Sanctum
  - Sign JWT state: `{ user_id, exp }`
  - Redirect ke GitHub OAuth URL via Socialite with state
- [ ] **2.2** Controller `GitHubAuthController` — `callback()` method
  - Verify state JWT -> extract user_id
  - Exchange code -> access_token (Socialite)
  - Fetch GitHub user info
  - Update User model
  - AuditLog: `github.account_linked`
  - Redirect ke frontend `/settings?github=connected`
- [ ] **2.3** Controller `GitHubAuthController` — `disconnect()` method
  - Clear `github_*` fields on User
  - AuditLog: `github.account_unlinked`
- [ ] **2.4** Routes: `GET /api/auth/github/redirect`, `GET /api/auth/github/callback`, `POST /api/auth/github/disconnect`

### Frontend:
- [ ] **2.5** Settings page: tombol "Connect GitHub" -> buka popup OAuth
- [ ] **2.6** Settings page: tampil status connected (avatar, username GitHub)
- [ ] **2.7** Settings page: tombol "Disconnect"

---

## Phase 3: Webhook Processing

- [ ] **3.1** Controller `WebhookController` — `handleGitHub()` method
  - Read raw body
  - Verify HMAC-SHA256 signature
  - Find WebhookConfig by repo_url
  - Idempotency check via delivery_id
  - Dispatch `ProcessGitHubWebhook` job
  - Return 202 Accepted
- [ ] **3.2** Job `ProcessGitHubWebhook` (implements `ShouldQueue`, `ShouldBeUnique`)
  - Parse push event payload
  - Extract repo, ref, pusher, commits
  - Map GitHub user -> SEIRIS User
  - Find TeamMember by user_id + team_id
  - Create PENDING TIME contribution with `source='github'`, `value=0`, `external_references`
  - AuditLog: `contribution.created.github`
- [ ] **3.3** HMAC verification helper/utility (static method atau middleware)
- [ ] **3.4** Idempotency logic: skip kalo delivery_id sudah diproses
- [ ] **3.5** Routes: `POST /api/webhooks/github` (public, throttle:60,1)

### Contribution Edit:
- [ ] **3.6** PATCH endpoint: `/api/teams/{team}/contributions/{contribution}`
  - Authorization: PENDING status + creator only
  - Body: `{ hours: number }`
  - Recalculate: `value = hours x fmr`, `total_slices = value x multiplier`
  - AuditLog: `contribution.hours_updated`
- [ ] **3.7** Form Request `UpdateContributionRequest` untuk validasi edit
- [ ] **3.8** Routes: `PATCH /api/teams/{team}/contributions/{contribution}` (auth:sanctum + team.member)

### Webhook Config CRUD:
- [ ] **3.9** Controller methods: index, store, destroy untuk WebhookConfig
- [ ] **3.10** Routes: `GET/POST /api/teams/{team}/webhook-configs`, `DELETE /api/teams/{team}/webhook-configs/{config}`

---

## Phase 4: Frontend — Contributions

- [ ] **4.1** Contribution card: badge "GitHub" untuk `source === 'github'`
- [ ] **4.2** Contribution card: external link icon -> buka commit URL di tab baru
- [ ] **4.3** Contribution detail: tampilkan `external_references` (commit SHAs, URLs)
- [ ] **4.4** Contribution filter: filter by source (manual / github) di ContributionsTab
- [ ] **4.5** Modal "Isi Jam" di pending github contribution
  - Input hours (number, max 24)
  - Tombol Simpan -> PATCH endpoint
  - Refresh contribution list
- [ ] **4.6** Settings page: section "Webhook Config"
  - List webhook configs per team
  - Input repo URL + tombol "Tambah"
  - Tampilkan generated webhook endpoint URL (copy-able)
  - Tampilkan webhook secret (copy-able)
  - Tombol "Hapus"

---

## Phase 5: Testing & Polish

- [ ] **5.1** Unit test: HMAC verification helper
- [ ] **5.2** Feature test: OAuth redirect validates token
- [ ] **5.3** Feature test: OAuth callback + account linking
- [ ] **5.4** Feature test: Webhook HMAC mismatch -> 401
- [ ] **5.5** Feature test: Webhook valid -> 202 + job dispatched
- [ ] **5.6** Feature test: Idempotency — duplicate delivery_id -> 204
- [ ] **5.7** Feature test: PATCH edit hours — valid scenarios
- [ ] **5.8** Feature test: PATCH edit hours — unauthorized scenarios
- [ ] **5.9** Integration test: Full flow (webhook -> job -> PATCH -> vote -> equity)
- [ ] **5.10** Update AGENTS.md dengan route dan behavior baru

---

## Quick Reference

```bash
# Install
composer require laravel/socialite

# GitHub OAuth App setup
# 1. Buka https://github.com/settings/developers
# 2. New OAuth App
# 3. Authorization callback URL: http://localhost:8000/api/auth/github/callback

# .env
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/github/callback

# Webhook testing (development)
npx ngrok http 8000
# Copy URL ke GitHub repo -> Settings -> Webhooks
```
