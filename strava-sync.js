const https = require('https');
const http = require('http');

// Strautomator public iCal feed URL — fetched server-side, no CORS issues
// This is the same feed connected to Google Calendar
const ICAL_URL = process.env.ICAL_URL || '';

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    let data = '';
    const req = client.get(url, { headers: { 'User-Agent': 'ApexTri-Dashboard/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchURL(res.headers.location).then(resolve).catch(reject);
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache, no-store'
  };

  if (!ICAL_URL) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'ICAL_URL environment variable not set. Add it in Netlify → Site settings → Environment variables.' })
    };
  }

  try {
    const raw = await fetchURL(ICAL_URL);
    if (!raw || !raw.includes('BEGIN:VCALENDAR')) {
      throw new Error('Invalid iCal response — check ICAL_URL');
    }

    const events = parseICal(raw);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    const recent = events
      .filter(e => e.start && e.start >= cutoff && e.title && !e.title.toLowerCase().startsWith('test'))
      .sort((a, b) => b.start - a.start)
      .slice(0, 20);

    const stats = calcStats(recent);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        activities: recent.map(serialize),
        stats,
        synced: new Date().toISOString(),
        total: events.length
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

function parseICal(raw) {
  const events = [];
  const blocks = raw.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const get = (key) => {
      const m = b.match(new RegExp(key + '[^:\n]*:([^\r\n]+)'));
      return m ? m[1].trim() : null;
    };
    const title = get('SUMMARY');
    const startRaw = get('DTSTART');
    const endRaw = get('DTEND');
    const desc = (get('DESCRIPTION') || '').replace(/\\n/g, '\n');
    if (!title || !startRaw) continue;

    const start = parseDate(startRaw);
    const end = endRaw ? parseDate(endRaw) : null;
    const durMin = (start && end) ? Math.round((end - start) / 60000) : 0;

    const dist = parseFloat((desc.match(/Distance:\s*([\d.]+)\s*mi/) || [])[1]) || 0;
    const avgHR = parseInt((desc.match(/Avg HR:\s*(\d+)\s*bpm/) || [])[1]) || 0;
    const maxHR = parseInt((desc.match(/Max HR:\s*(\d+)\s*bpm/) || [])[1]) || 0;
    const pace = (desc.match(/Avg pace:\s*([\d:]+)\s*\/mi/) || [])[1] || null;
    const elev = parseInt((desc.match(/Elevation gain:\s*(\d+)\s*ft/) || [])[1]) || 0;

    events.push({ title, start, end, durMin, dist, avgHR, maxHR, pace, elev });
  }
  return events;
}

function parseDate(s) {
  if (!s) return null;
  try {
    // Handle TZID format: DTSTART;TZID=America/Chicago:20260408T183300
    const clean = s.replace(/^[^:]*:/, '').replace('Z','');
    const m = clean.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
    const d = clean.match(/(\d{4})(\d{2})(\d{2})/);
    if (d) return new Date(`${d[1]}-${d[2]}-${d[3]}`);
  } catch(e) {}
  return null;
}

function getType(title) {
  const t = title.toLowerCase();
  if (t.includes('swim')) return 'swim';
  if (t.includes('run') || t.includes('jog')) return 'run';
  if (t.includes('bike') || t.includes('cycl') || t.includes('ride') || t.includes('cycling')) return 'bike';
  if (t.includes('walk') || t.includes('hike')) return 'walk';
  if (t.includes('weight') || t.includes('strength') || t.includes('gym') || t.includes('train')) return 'strength';
  return 'other';
}

function serialize(e) {
  const hr = e.avgHR;
  return {
    title: e.title,
    type: getType(e.title),
    start: e.start ? e.start.toISOString() : null,
    durationMin: e.durMin,
    dist: e.dist,
    avgHR: hr,
    maxHR: e.maxHR,
    pace: e.pace,
    elev: e.elev,
    hrClass: !hr ? 'none' : hr < 130 ? 'low' : hr < 160 ? 'mid' : 'high',
    dateLabel: e.start ? e.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  };
}

function calcStats(events) {
  const byType = (t) => events.filter(e => getType(e.title) === t);
  const swims = byType('swim'), runs = byType('run'), bikes = byType('bike');
  const others = events.filter(e => !['swim','run','bike'].includes(getType(e.title)));

  const totalDist = events.reduce((s, e) => s + (e.dist || 0), 0);
  const totalMin  = events.reduce((s, e) => s + (e.durMin || 0), 0);
  const swimDist  = swims.reduce((s, e) => s + (e.dist || 0), 0);
  const runDist   = runs.reduce((s, e)  => s + (e.dist || 0), 0);
  const avgRunHR  = runs.length ? Math.round(runs.reduce((s,e) => s+e.avgHR,0)/runs.length) : 0;
  const avgSwimHR = swims.length ? Math.round(swims.reduce((s,e) => s+e.avgHR,0)/swims.length) : 0;
  const h = Math.floor(totalMin/60), m = totalMin%60;

  return {
    total: events.length,
    totalDist: totalDist.toFixed(1),
    totalTime: h > 0 ? `${h}h ${m}m` : `${m}m`,
    swimSessions: swims.length,
    swimDist: swimDist.toFixed(1),
    avgSwimHR,
    runSessions: runs.length,
    runDist: runDist.toFixed(1),
    avgRunHR,
    bikeSessions: bikes.length,
    otherSessions: others.length,
    swimReady: parseFloat(swimDist.toFixed(1)) > 0.47,
    runHRHigh: avgRunHR > 155,
    noRides: bikes.length === 0
  };
}
