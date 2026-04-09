# Apex Triathlon Dashboard
**Live training dashboard for Pranav Kumar**
🌐 [apex-triathlon.pranav-kumar.com](https://apex-triathlon.pranav-kumar.com)

## What this is
A live triathlon training dashboard that automatically pulls workout data from Strava via Strautomator and displays it at a glance — no login required, no app needed.

## Features
- **Live Strava sync** — fetches latest activities on every page load via Strautomator iCal feed
- **Race countdowns** — Sprint Tri (Aug 2, 2026) · Chicago Marathon (Oct 11, 2026) · Half Tri (Sept 2027)
- **Discipline breakdown** — swim, run, bike stats with avg HR and distance
- **HR zone tracking** — run heart rate vs Zone 2 target (150 bpm ceiling)
- **Sprint Tri readiness** — swim / run / bike readiness scores updated from real data
- **Activity feed** — last 14 days of Strava activities with duration, distance, pace, HR
- **Weekly training plan** — current week's prescribed workouts
- **↺ Refresh button** — re-fetches live Strava data on demand

## Tech stack
- Pure HTML/CSS/JS — no framework, no build step
- Chart.js for activity volume and HR charts
- Strautomator iCal feed as the Strava data source
- CORS proxy (allorigins.win) to fetch iCal in-browser
- Hosted on Netlify, deployed via GitHub

## How data flows
```
Strava → Strautomator → iCal feed → Dashboard (browser fetch on load)
```
Every time the page loads or Refresh is clicked, the browser fetches the latest iCal from Strautomator, parses the last 14 days of activities, and renders everything live.

## Races
| Race | Date | Distance |
|------|------|----------|
| Sprint Triathlon | Aug 2, 2026 | 750m swim / 20km bike / 5km run |
| Chicago Marathon | Oct 11, 2026 | 26.2 miles |
| Half Triathlon (70.3) | Sept 2027 | 1.2mi swim / 56mi bike / 13.1mi run |

## Training plan
16-week Sprint Tri block starting Apr 13, 2026. Phases: Base (4 wks) → Build (5 wks) → Peak (4 wks) → Taper (2 wks) → Race Week.

## Daily briefing
A recurring 7am Google Calendar event triggers a daily AI coaching briefing in Claude at [claude.ai](https://claude.ai). Type `morning briefing` to get a personalized daily analysis based on latest Strava data and calendar availability.

## Deployment
Push to `main` branch → Netlify auto-deploys to `apex-triathlon.pranav-kumar.com` within ~60 seconds.

## Local dev
No build process — just open `index.html` in a browser. iCal fetch may be blocked locally due to CORS; use a local proxy or test on the deployed URL.
