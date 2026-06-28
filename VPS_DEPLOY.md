# VPS Deployment — SEIRIS

> **Server:** `http://72.61.215.209`
> **User:** `sysadmin`
> **Project path:** `/var/www/seiris`

---

## Stack

| Komponen | Versi | Catatan |
|----------|-------|---------|
| OS | Ubuntu 24.04 | — |
| Web Server | Nginx | Reverse proxy + static file |
| PHP | 8.4 + PHP-FPM | Backend via `artisan serve` (built-in) |
| Node | 22 | Build frontend |
| pnpm | 11 | Package manager FE |
| Composer | latest | Package manager BE |
| Database | SQLite (dev) / MySQL (prod) | Lihat `.env` |

---

## Arsitektur Nginx

```
Request → Nginx (port 80)
           ├── / → /var/www/seiris/seiris-fe/dist/   (SPA static files)
           ├── /api/* → proxy_pass http://127.0.0.1:8000  (Laravel artisan serve)
           └── /storage/* → alias /var/www/seiris/seiris-be/storage/app/public/
```

Config: `/etc/nginx/sites-available/seiris`

---

## Backend Systemd Service

Laravel `artisan serve` jalan sebagai systemd service biar auto-start + auto-restart.

**Service file:** `/etc/systemd/system/seiris-backend.service`

```ini
[Unit]
Description=SEIRIS Laravel Backend (artisan serve)
After=network.target

[Service]
User=sysadmin
WorkingDirectory=/var/www/seiris/seiris-be
ExecStart=/usr/bin/php artisan serve --host=127.0.0.1 --port=8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Perintah service

| Aksi | Command |
|------|---------|
| **Cek status** | `sudo systemctl status seiris-backend` |
| **Restart** | `sudo systemctl restart seiris-backend` |
| **Stop** | `sudo systemctl stop seiris-backend` |
| **Start** | `sudo systemctl start seiris-backend` |
| **Lihat log** | `sudo journalctl -u seiris-backend -f` |

---

## Deployment (Update code)

### 1. Tarik code terbaru

```bash
cd /var/www/seiris
git pull origin main
```

> **Catatan:** Lo biasanya push ke branch `dev`, lalu merge ke `main` di GitHub sebelum pull di sini.

### 2. Update Backend

```bash
cd /var/www/seiris/seiris-be
composer install --no-dev --optimize-autoloader
php artisan migrate
php artisan config:cache
php artisan route:cache
php artisan storage:link
```

### 3. Build Frontend

```bash
cd /var/www/seiris/seiris-fe
pnpm install
pnpm build
```

### 4. Restart Backend

```bash
sudo systemctl restart seiris-backend
```

### 5. Tes

```bash
# API
curl http://127.0.0.1:8000/api/ping

# Website via Nginx
curl -s -o /dev/null -w "%{http_code}" http://localhost/
```

Kalo balik `200`, sukses.

---

## Troubleshooting umum

### `artisan serve` mati

```bash
sudo systemctl restart seiris-backend
sudo journalctl -u seiris-backend -n 20
```

### Nginx error

```bash
sudo nginx -t                # test config
sudo systemctl reload nginx  # reload kalo valid
```

### Frontend blank (404 di SPA route)

Pastikan Nginx config punya `try_files $uri $uri/ /index.html;` — itu yg bikin routing React work.

### Permission storage

```bash
cd /var/www/seiris/seiris-be
php artisan storage:link
sudo chown -R sysadmin:sysadmin storage
sudo chmod -R 775 storage
```

---

## Files & Paths Penting

| Path | Fungsi |
|------|--------|
| `/var/www/seiris/` | Root project |
| `/var/www/seiris/seiris-be/` | Laravel backend |
| `/var/www/seiris/seiris-fe/` | React frontend |
| `/var/www/seiris/seiris-fe/dist/` | Hasil build FE (di-serve Nginx) |
| `/var/www/seiris/seiris-be/storage/app/public/` | File upload (di-alias `/storage/`) |
| `/etc/nginx/sites-available/seiris` | Konfigurasi Nginx |
| `/etc/nginx/sites-enabled/seiris` | Symlink ke config |
| `/etc/systemd/system/seiris-backend.service` | Systemd service backend |

---

## Awal mula (first-time setup)

Kalo suatu saat harus setup dari 0 di server baru:

```bash
# Clone project
git clone https://github.com/harikahono/seiris.git /var/www/seiris
cd /var/www/seiris

# Backend
cd seiris-be
cp .env.example .env
nano .env  # set DB, APP_URL, dll
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --seed
php artisan storage:link

# Frontend
cd ../seiris-fe
pnpm install
pnpm build
```

### Setup Nginx

Bikin file `/etc/nginx/sites-available/seiris` dengan isi:

```nginx
server {
    listen 80;
    server_name 72.61.215.209;

    root /var/www/seiris/seiris-fe/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /storage/ {
        alias /var/www/seiris/seiris-be/storage/app/public/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/seiris /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Setup Systemd Service

Bikin file `/etc/systemd/system/seiris-backend.service` — isinya liat section **Backend Systemd Service** di atas.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now seiris-backend
```
