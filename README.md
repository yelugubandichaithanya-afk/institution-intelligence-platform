# Institution Intelligence Platform (IIP)

> One Search. One Profile. One Executive View.

College project: due-diligence platform for evaluating colleges as partnership candidates.
Search → Verify → Analyse 5-year performance → Compare → Identify risks → Assess commercial potential → Executive brief.

**Stack:** HTML / CSS / vanilla JS frontend · Flask API · Supabase (Postgres + Auth).
All data is fictional sample data.

## Architecture

```
Browser (HTML/CSS/JS)  ──Bearer token──▶  Flask API  ──service key──▶  Supabase Postgres
        │                                   │
        └── login / signup ──▶ /api/auth/* ─┴──▶ Supabase Auth
```

- Data lives only in Supabase, not in the frontend. Every data endpoint requires a signed-in user.
- Flask checks each access token with Supabase Auth (cached for 60 s).
- RLS is enabled on every table. Only the `authenticated` role can read, and only the server's service key can write.

## Setup

### 1. Database (once)
Either run `backend/supabase/schema.sql` in Supabase Dashboard → **SQL Editor**, or, with `DATABASE_URL` set in `.env`:
```bash
python supabase/apply_schema.py
```

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows   (source .venv/bin/activate on Mac/Linux)
pip install -r requirements.txt
copy .env.example .env            # then fill in your Supabase values
python seed/seed.py               # load the 4 sample institutions
python app.py                     # http://localhost:5000/api/health
```

### 3. Frontend
```bash
cd frontend
python -m http.server 5500        # http://localhost:5500
```

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | – | `{full_name, email, password}` |
| POST | `/api/auth/login` | – | `{email, password}` → session |
| POST | `/api/auth/refresh` | – | `{refresh_token}` → new session |
| POST | `/api/auth/logout` | ✅ | End session |
| GET | `/api/auth/me` | ✅ | Current user |
| GET | `/api/institutions?q=&field=` | ✅ | Search (`field`: all, name, university, aishe, city, promoter) |
| GET | `/api/institutions/<id>` | ✅ | Full profile |
| GET | `/api/institutions/compare?ids=a,b,c` | ✅ | 2–4 profiles |
| GET | `/api/health` | – | Health check |

## Structure

```
backend/
  app.py              Flask app, CORS, error handlers
  auth.py             Auth endpoints + @require_auth
  institutions.py     Data endpoints
  db.py               Supabase queries + row → profile mapping
  config.py           Environment variables
  supabase/schema.sql Tables, search view, RLS policies
  seed/               sample_data.js (source), seed_data.json, seed.py
frontend/
  login.html          Sign in / create account
  index.html          Search + pick colleges to compare
  institution.html    Full institution profile (9 modules)
  compare.html        Side-by-side comparison of 2–4 colleges
  js/config.js        API base URL (local vs deployed)
  js/auth.js          Session handling
  js/api.js           API client (auto-refreshes expired tokens)
  js/risk.js          Rule-based red-flag engine
  js/charts.js        SVG charts
```

## Evidence model

Every figure is stored as JSON `{ v, src, date, st }`, where `st` is one of `verified | govt | self | unverified | internal`.
The UI shows its source and verification status on hover.

## Deploy (later)
- Backend → Render: build `pip install -r requirements.txt`, start `gunicorn app:app`, root `backend`, same env vars as `.env`.
- Frontend → Vercel: static site from `frontend/`. Set `PROD_API` in `js/config.js` and add the Vercel URL to `FRONTEND_ORIGINS`.
- Supabase → Auth → URL Configuration: set Site URL to the Vercel URL.
