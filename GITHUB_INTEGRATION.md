# GitHub Integration — SEIRIS

> Wacana integrasi GitHub untuk auto-track TIME contribution.
> Status: **Planning** — belum diimplementasi.

---

## 1. Latar Belakang

SEIRIS adalah sistem distributed equity management berbasis Slicing Pie.
Saat ini semua kontribusi TIME dimasukkan secara manual oleh anggota tim.
Integrasi GitHub memungkinkan **aktivitas coding (push/PR) otomatis terdeteksi**
dan dikonversi menjadi TIME contribution draft yang tinggal diisi hours-nya.

**Tujuan:**
- Mengurangi friction pencatatan kontribusi developer
- Menyediakan bukti kerja otomatis (link ke commits)
- Workflow semi-auto: system buat draft -> user isi hours -> vote -> equity recalculation

---

## 2. Glossary

| Istilah | Definisi |
|---------|----------|
| **Slicing Pie** | Metode equity distribution berbasis nilai kontribusi riil |
| **TIME contribution** | Kontribusi berupa jam kerja, dihitung `hours x FMR x 2` |
| **Source** | Asal kontribusi: `manual` (default) atau `github` |
| **External Reference** | Link ke resource eksternal (commit URL, PR URL, dll) |
| **WebhookConfig** | Konfigurasi webhook per team (repo URL, secret, dll) |
| **Delivery ID** | UUID dari header `X-GitHub-Delivery`, digunakan sebagai idempotency key |
| **State Token** | Signed token dikirim sebagai parameter `state` OAuth untuk mengidentifikasi user |

---

## 3. Arsitektur

```
+-----------+     Bearer Token      +----------------+     PostgreSQL     +----------+
|  React    | <------------------> |    Laravel     | <----------------> |    DB    |
|  SPA      |    Sanctum API       |    Backend     |                    |          |
| :5173     |                      | :8000          |                    +----------+
+-----+-----+                      +-------+--------+
      |                                    |
      |  OAuth redirect                     |  POST /api/webhooks/github
      |  + callback                         |  (HMAC verified, public)
      |                                    |
      v                                    v
+----------+                       +----------+
|  GitHub  |                       |  GitHub  |
|  OAuth   |                       |  Events  |
+----------+                       +----------+

Queue (database):
  ProcessGitHubWebhook job
    -> parse payload
    -> map GitHub user -> TeamMember
    -> create PENDING TIME contribution
```

### 3.1 Komponen Baru

| Komponen | Tipe | Fungsi |
|----------|------|--------|
| `WebhookConfig` | Model + Migration | Nyimpen konfigurasi webhook per team |
| `GitHubAuthController` | Controller | OAuth redirect, callback, disconnect |
| `WebhookController` | Controller | Terima webhook dari GitHub (public) |
| `ProcessGitHubWebhook` | Job (queued) | Parse event, bikin contribution |
| `source` field di `contributions` | Migration | `manual` / `github` |
| `external_references` field | Migration | JSON array of external links |
| `github_*` fields di `users` | Migration | `github_id`, `username`, `email`, `token` |

---

## 4. Keputusan Desain (ADRs)

### ADR-001: User Mapping via OAuth

**Keputusan:** Mapping GitHub user -> SEIRIS user via OAuth login flow.

**Konsekuensi:**
- Positif: akurat, user identity terverifikasi oleh GitHub
- Positif: bisa akses GitHub API untuk verifikasi repo
- Negatif: perlu setup GitHub OAuth App
- Negatif: flow lebih kompleks (redirect, callback, state token)

### ADR-002: 1 Push = 1 Contribution

**Keputusan:** Satu push event (bisa berisi banyak commits) dibuat jadi 1 contribution.

**Konsekuensi:**
- Positif: tidak spam, lebih rapi di-review
- Positif: user isi hours untuk 1 sesi kerja
- Negatif: kurang granular (susah tracking per-fiturnya)

### ADR-003: Semi-Auto Workflow

**Keputusan:** Webhook bikin PENDING contribution dengan value=0, user isi hours manual.

**Konsekuensi:**
- Positif: tetap ada human review sebelum equity berubah
- Positif: hours diisi oleh yang paling tahu (developer sendiri)
- Negatif: butuh endpoint PATCH contribution untuk edit hours

### ADR-004: Webhook Response 202 + Queue

**Keputusan:** Webhook endpoint return 202 Accepted, processing di background job.

**Konsekuensi:**
- Positif: response cepat, ga blocking
- Positif: retry otomatis kalo gagal (queue)
- Negatif: ada delay sebelum contribution muncul

### ADR-005: State-encoded OAuth (No Sessions)

**Keputusan:** Parameter `state` OAuth berisi signed JWT `{ user_id, exp }`, diverifikasi pakai APP_KEY.

**Konsekuensi:**
- Positif: ga perlu session di API routes
- Positif: stateless, gampang di-scale
- Negatif: state token perlu expiry (max 10 menit)

---

## 5. Flow Detail

### 5.1 OAuth — Link GitHub Account

```
1. User klik "Connect GitHub" di Settings
2. Frontend buka popup ke:
   GET /api/auth/github/redirect?token=<sanctum_token>
3. Backend:
   a. Validasi token -> cari user_id
   b. Sign JWT: { user_id, exp = now + 10min }
   c. Redirect ke GitHub:
      https://github.com/login/oauth/authorize
      ?client_id=xxx
      &redirect_uri=http://localhost:8000/api/auth/github/callback
      &state=<jwt>
      &scope=read:user
4. User authorize di GitHub
5. GitHub redirect ke callback:
   GET /api/auth/github/callback?code=xxx&state=<jwt>
6. Backend:
   a. Verify JWT state -> extract user_id
   b. Exchange code -> access_token (via Socialite)
   c. Fetch GitHub user info (id, login, email)
   d. Update User: github_id, github_username, github_email, github_token
   e. AuditLog: github.account_linked
   f. Redirect ke frontend:
      http://localhost:5173/settings?github=connected
7. Popup detect redirect -> close -> parent refresh
```

### 5.2 Webhook — Auto-track Push

```
1. GitHub kirim POST ke /api/webhooks/github
   Headers:
     X-GitHub-Event: push
     X-GitHub-Delivery: <uuid>
     X-Hub-Signature-256: sha256=<hmac>
   Body: push event payload (JSON)

2. Backend WebhookController:
   a. Read raw body
   b. Verify HMAC-SHA256 pakai webhook_secret dari WebhookConfig
   c. HMAC mismatch -> 401
   d. Find WebhookConfig by repo_url dari payload
   e. Ga ketemu -> 404 (webhook not configured)
   f. Cek idempotency: delivery_id udah diproses? -> skip (204)
   g. Dispatch ProcessGitHubWebhook job
   h. Return 202 Accepted

3. ProcessGitHubWebhook job (queued):
   a. Parse push event
   b. Extract:
      - repo: owner/name
      - ref: refs/heads/main
      - pusher: { id, username, email }
      - commits: [{ sha, url, message }]
   c. Map GitHub user -> SEIRIS User via github_id or github_username
   d. Find TeamMember by user_id + team_id
   e. Buat Contribution:
      - type: TIME
      - value: 0 (temporary, user isi nanti)
      - multiplier: 2 (default TIME)
      - total_slices: 0 (calculated after hours input)
      - description: "GitHub: owner/repo - {commit subjects}"
      - source: 'github'
      - status: PENDING
      - member_id: matched TeamMember
      - external_references: [{ platform, event_type, delivery_id, repo, ref, commits }]
   f. AuditLog: contribution.created.github
```

### 5.3 Edit Hours — PENDING Contribution

```
PATCH /api/teams/{team}/contributions/{contribution}
Authorization: Bearer <token>
Body: { hours: 5 }

Authorization:
  - Contribution harus PENDING
  - Authenticated user harus creator (member_id == auth.member.id)

Logic:
  1. Get member's current FMR
  2. value = hours x fmr
  3. multiplier = contribution.multiplier (fixed from creation)
  4. total_slices = value x multiplier
  5. Save contribution
  6. AuditLog: contribution.hours_updated
```

---

## 6. Data Model Changes

### 6.1 Migration — `users`

```php
Schema::table('users', function (Blueprint $table) {
    $table->string('github_id')->nullable()->unique();
    $table->string('github_username')->nullable();
    $table->string('github_email')->nullable();
    $table->text('github_token')->nullable();      // encrypted
    $table->text('github_refresh_token')->nullable();
});
```

Update `$fillable` di User model.

### 6.2 Migration — `contributions`

```php
Schema::table('contributions', function (Blueprint $table) {
    $table->string('source')->default('manual');            // manual | github
    $table->json('external_references')->nullable();         // [{ platform, event_type, delivery_id, repo, ref, commits }]
});
```

### 6.3 Migration — `webhook_configs` (table baru)

```php
Schema::create('webhook_configs', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
    $table->string('platform');                 // 'github'
    $table->string('repo_url');                 // 'https://github.com/owner/repo'
    $table->string('webhook_secret');           // random string
    $table->json('settings')->nullable();        // future-proof
    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->unique(['team_id', 'repo_url']);
});
```

#### Model: `WebhookConfig`

```php
class WebhookConfig extends Model
{
    use HasUuids;

    protected $fillable = [
        'team_id', 'platform', 'repo_url',
        'webhook_secret', 'settings', 'is_active',
    ];

    protected $casts = [
        'settings'   => 'array',
        'is_active'  => 'boolean',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
```

---

## 7. Routes (Baru/Diubah)

### Auth (OAuth)
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/api/auth/github/redirect` | public (validates token query param) | Redirect ke GitHub OAuth |
| GET | `/api/auth/github/callback` | public | Terima callback dari GitHub |
| POST | `/api/auth/github/disconnect` | `auth:sanctum` | Unlink GitHub account |

### Webhook
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| POST | `/api/webhooks/github` | `throttle:60,1` (public) | Terima webhook GitHub |

### Contribution Edit
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| PATCH | `/api/teams/{team}/contributions/{contribution}` | `auth:sanctum` + `team.member` | Edit hours PENDING contribution |

### Webhook Config (CRUD)
| Method | Path | Middleware | Action |
|--------|------|-----------|--------|
| GET | `/api/teams/{team}/webhook-configs` | `auth:sanctum` + `team.member` | List webhook configs |
| POST | `/api/teams/{team}/webhook-configs` | `auth:sanctum` + `team.member` | Create webhook config |
| DELETE | `/api/teams/{team}/webhook-configs/{config}` | `auth:sanctum` + `team.member` | Delete webhook config |

---

## 8. Security

| Aspek | Implementasi |
|-------|-------------|
| **HMAC Verification** | Setiap webhook request diverifikasi pakai `sha256=` HMAC, compare pake `hash_equals()` |
| **State Token** | Signed JWT dengan `APP_KEY`, expiry 10 menit |
| **Token Storage** | `github_token` di-encrypt pake Laravel encryption |
| **Rate Limiting** | Webhook endpoint: 60 req/min; API routes: default throttle |
| **Authorization** | PATCH contribution: hanya creator sendiri, hanya PENDING status |
| **Idempotency** | Cek delivery_id sebelum process, skip kalo udah ada |

---

## 9. Audit Log Actions

| Action | Trigger |
|--------|---------|
| `github.account_linked` | User connect GitHub OAuth |
| `github.account_unlinked` | User disconnect GitHub |
| `contribution.created.github` | Webhook bikin contribution baru |
| `contribution.hours_updated` | User edit hours di pending contribution |

---

## 10. Testing Strategy

| Scope | Approach |
|-------|----------|
| **OAuth flow** | Mock Socialite `stateless()` + fake GitHub response |
| **Webhook HMAC** | Generate valid HMAC di test, verifikasi endpoint |
| **Webhook processing** | Queue fake + assert contribution created |
| **Edit hours** | PATCH endpoint test with various scenarios |
| **Idempotency** | Kirim webhook 2x dengan delivery_id sama, assert 1 contribution |
| **Authorization** | Test PATCH dengan user lain, assert 403 |
