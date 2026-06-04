# Nishan Kharel Portfolio — Backend API

A production-grade FastAPI backend that powers the contact form on
[nishankharel.com.np](https://nishankharel.com.np). It validates submissions,
stores them in PostgreSQL, emails you directly, and is hardened against
common web attacks.

## Features

- **FastAPI** with async routing
- **Pydantic v2** input validation + sanitization
- **SQLAlchemy 2 / PostgreSQL** (SQLite fallback for local dev)
- **SMTP email delivery** with HTML + plain-text parts
- **reCAPTCHA v3** server-side verification (optional)
- **slowapi** IP-based rate limiting
- **Security headers**: CSP, HSTS, X-Frame-Options, Referrer-Policy, etc.
- **CORS whitelist** (no wildcards)
- **TrustedHost** middleware
- **Multi-stage Docker build** → small, non-root image
- **Docker Compose** with Postgres, healthchecks, read-only filesystem

## Directory Layout

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entry + middleware wiring
│   ├── config.py            # Settings loaded from environment
│   ├── database.py          # SQLAlchemy engine + session
│   ├── models.py            # ContactMessage ORM model
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── middleware.py        # Custom security headers middleware
│   ├── routers/
│   │   ├── contact.py       # POST /api/contact
│   │   └── health.py        # GET  /api/health
│   └── services/
│       ├── email_service.py # SMTP delivery
│       └── recaptcha.py     # reCAPTCHA v3 verify
├── Dockerfile               # Multi-stage, non-root, healthcheck
├── docker-compose.yml       # api + postgres
├── requirements.txt
├── .env.example             # Template — copy to .env
├── .gitignore
└── README.md
```

## Quick start (local, without Docker)

```bash
cd backend

# 1. Create virtualenv
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 2. Install deps
pip install -r requirements.txt

# 3. Create config
cp .env.example .env
# Open .env and fill in SMTP_USERNAME + SMTP_PASSWORD (Gmail App Password)

# 4. Run
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open http://127.0.0.1:8000/api/docs for the interactive Swagger UI.

## Quick start (Docker)

```bash
cd backend
cp .env.example .env
# Edit .env with your SMTP credentials

# Build and start
docker compose up -d --build

# Tail logs
docker compose logs -f api

# Stop
docker compose down
```

The API is exposed on `127.0.0.1:8000` and Postgres on `127.0.0.1:5432`
— both bound to loopback, never public. In production, put a reverse
proxy (nginx / Caddy) in front with HTTPS.

## Gmail SMTP setup (one-time)

Gmail no longer accepts your login password for SMTP. You must create an
**App Password**:

1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Create an app password: https://myaccount.google.com/apppasswords
3. Copy the 16-character password into `.env` as `SMTP_PASSWORD`
4. Set `SMTP_USERNAME=nkharel57@gmail.com`

Test it:

```bash
curl -X POST http://127.0.0.1:8000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","subject":"Hello","message":"This is a test message from curl"}'
```

You should receive the email at `nkharel57@gmail.com` within seconds.

## reCAPTCHA v3 setup (recommended)

1. Register your site at https://www.google.com/recaptcha/admin/create
   - Label: `nishankharel.com.np`
   - Type: **reCAPTCHA v3**
   - Domains: `nishankharel.com.np`, `www.nishankharel.com.np`, `localhost`
2. Copy the **Site Key** and **Secret Key**.
3. In `.env`:
   ```
   RECAPTCHA_ENABLED=true
   RECAPTCHA_SECRET_KEY=<your_secret_key>
   RECAPTCHA_MIN_SCORE=0.5
   ```
4. In [../portfolio/main.js](../portfolio/main.js), set:
   ```js
   RECAPTCHA_SITE_KEY: '<your_site_key>',
   ```
5. In [../index.html](../index.html), uncomment the reCAPTCHA script tag
   near the bottom and replace `YOUR_SITE_KEY`.

## Security checklist

Before going to production, verify **every** item:

- [ ] `.env` is in `.gitignore` and never committed
- [ ] `SMTP_PASSWORD` is a Gmail **App Password**, not your real password
- [ ] `CORS_ORIGINS` lists only your real domains (no `*`)
- [ ] `TRUSTED_HOSTS` lists only your real domains
- [ ] `APP_ENV=production` → disables `/api/docs` and enables HSTS
- [ ] Database uses a strong password (not the default)
- [ ] Postgres port is bound to loopback only (`127.0.0.1:5432`)
- [ ] API runs behind nginx/Caddy with HTTPS (Let's Encrypt)
- [ ] reCAPTCHA v3 is enabled
- [ ] In EmailJS dashboard → Security → **add allowed domains** so your
      public EmailJS key can't be abused from other sites
- [ ] Server OS packages kept up to date (`apt upgrade`)
- [ ] UFW / iptables allows only 22, 80, 443
- [ ] SSH uses keys only, password login disabled
- [ ] Regular backups of the `postgres_data` volume

## Production deployment (nginx reverse proxy)

Example nginx config snippet:

```nginx
server {
    server_name api.nishankharel.com.np;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # TLS handled by certbot --nginx
    listen 443 ssl http2;
    ssl_certificate     /etc/letsencrypt/live/api.nishankharel.com.np/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nishankharel.com.np/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

Then update [../portfolio/main.js](../portfolio/main.js):

```js
API_URL: 'https://api.nishankharel.com.np',
```

## What to do if the backend is down

The frontend automatically falls back to **EmailJS** if it can't reach
the backend, so your contact form keeps working either way. Both paths
deliver messages to `nkharel57@gmail.com`.

## Endpoints

| Method | Path            | Description                  | Rate Limit |
|--------|-----------------|------------------------------|------------|
| GET    | `/`             | Service info                 | 60/min     |
| GET    | `/api/health`   | Liveness probe               | 60/min     |
| POST   | `/api/contact`  | Submit contact form          | 5/min      |
| GET    | `/api/docs`     | Swagger UI (dev only)        | —          |

## License

Private — © Nishan Kharel. All rights reserved.
