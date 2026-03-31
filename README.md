# APEX Triathlon Intelligence

Pull real Strava workouts. Get brutally honest AI coaching from Claude.
Auto-deploys from GitHub — change a file, push, it's live in 30 seconds.

---

## Repo Structure

```
apex-triathlon/
├── index.html                    ← Main app (edit this to change anything)
├── netlify.toml                  ← Build config (don't touch)
├── netlify/
│   └── functions/
│       ├── analyze.js            ← Claude API proxy
│       └── strava-token.js       ← Strava OAuth proxy
└── README.md
```

---

## One-Time Setup (20 min total)

### 1. Create GitHub repo

```bash
cd apex-triathlon
git init
git add .
git commit -m "Initial APEX deploy"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/apex-triathlon.git
git push -u origin main
```

### 2. Connect Netlify to GitHub

1. Go to app.netlify.com → **Add new site → Import from Git**
2. Choose GitHub → select your `apex-triathlon` repo
3. Build settings are auto-detected from `netlify.toml`
4. Click **Deploy site**

Now every `git push` auto-deploys. No more manual file uploads.

### 3. Set Environment Variables in Netlify

Go to **Site settings → Environment variables** and add:

| Variable | Value | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | console.anthropic.com |
| `STRAVA_CLIENT_ID` | `123456` | strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | `abc...` | strava.com/settings/api |

After adding variables → **Trigger deploy** (Deploys tab → Trigger deploy → Deploy site).

### 4. Configure Strava App

Go to **strava.com/settings/api** and set:

- **Authorization Callback Domain**: your Netlify domain (e.g. `apex-triathlon.netlify.app` or `apex-triathlon.pranav-kumar.com`)

### 5. Add Your Client ID to index.html

Find this line in `index.html`:
```javascript
const clientId = window.STRAVA_CLIENT_ID || '{{STRAVA_CLIENT_ID}}';
```

Replace with your actual Client ID (it's public, safe in frontend):
```javascript
const clientId = '123456';
```

Commit and push — deploys automatically.

---

## Making Changes

```bash
# Edit index.html (or any file)
git add .
git commit -m "Update analysis prompt"
git push
# Netlify auto-deploys in ~30 seconds
```

---

## How Auth Works

```
Browser → Strava OAuth → redirect back with ?code=...
App → POST /.netlify/functions/strava-token (with code)
Netlify Function → Strava API (using secret from env var, never exposed)
← access_token + refresh_token stored in localStorage
Token auto-refreshes when expired (6hr expiry handled silently)
```

Claude API calls similarly go through `/.netlify/functions/analyze` — your `ANTHROPIC_API_KEY` never touches the browser.

---

## Athlete Profile

Edit the `ATHLETE` constant in `index.html` to update your context:

```javascript
const ATHLETE = {
  name: 'Pranav',
  goals: 'Sprint Triathlon (August 3, 2026) and Full Marathon (October 11, 2026)',
  ftp: 245,           // Update after next FTP test
  weight: 188,
  trainingPhase: 'Base Building → Tri Build',
};
```
