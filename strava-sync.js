const ICAL_URL = 'https://calendar.google.com/calendar/ical/rbn1gj9q82dj1mfqvtdn96g23acbbcve%40import.calendar.google.com/public/basic.ics';

exports.handler = async () => {
  try {
    const res = await fetch(ICAL_URL);
    if (!res.ok) throw new Error(`iCal fetch failed: ${res.status}`);
    const raw = await res.text();
    const events = parseICal(raw);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const recent = events
      .filter(e => e.start >= cutoff && e.title && !e.title.toLowerCase().includes('test'))
      .sort((a, b) => b.start - a.start)
      .slice(0, 20);

    const stats = calcStats(recent);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ activities: recent.map(serializeEvent), stats, synced: new Date().toISOString() })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

function parseICal(raw) {
  const events = [];
  const blocks = raw.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return m ? m[1].trim() : null;
    };
    const title = get('SUMMARY');
    const desc = get('DESCRIPTION') || '';
    const startRaw = get('DTSTART');
    const endRaw = get('DTEND');
    if (!title || !startRaw) continue;
    const start = parseICalDate(startRaw);
    const end = endRaw ? parseICalDate(endRaw) : null;
    const durationMs = end && start ? end - start : 0;
    const durationMin = Math.round(durationMs / 60000);

    const dist = parseFloat((desc.match(/Distance:\s*([\d.]+)\s*mi/) || [])[1]) || 0;
    const avgHR = parseInt((desc.match(/Avg HR:\s*(\d+)\s*bpm/) || [])[1]) || 0;
    const maxHR = parseInt((desc.match(/Max HR:\s*(\d+)\s*bpm/) || [])[1]) || 0;
    const pace = (desc.match(/Avg pace:\s*([\d:]+)\s*\/mi/) || [])[1] || null;
    const elev = parseInt((desc.match(/Elevation gain:\s*(\d+)\s*ft/) || [])[1]) || 0;

    events.push({ title, start, end, durationMin, dist, avgHR, maxHR, pace, elev });
  }
  return events;
}

function parseICalDate(str) {
  if (!str) return null;
  const s = str.replace(/[TZ]/g, '').replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6');
  return new Date(s);
}

function getType(title) {
  const t = title.toLowerCase();
  if (t.includes('swim')) return 'swim';
  if (t.includes('run')) return 'run';
  if (t.includes('bike') || t.includes('cycl') || t.includes('ride')) return 'bike';
  if (t.includes('walk')) return 'walk';
  if (t.includes('weight') || t.includes('strength') || t.includes('train')) return 'strength';
  return 'other';
}

function getHRClass(hr) {
  if (!hr) return 'none';
  if (hr < 130) return 'low';
  if (hr < 160) return 'mid';
  return 'high';
}

function serializeEvent(e) {
  return {
    title: e.title,
    type: getType(e.title),
    start: e.start ? e.start.toISOString() : null,
    durationMin: e.durationMin,
    dist: e.dist,
    avgHR: e.avgHR,
    maxHR: e.maxHR,
    pace: e.pace,
    elev: e.elev,
    hrClass: getHRClass(e.avgHR),
    dateLabel: e.start ? e.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  };
}

function calcStats(events) {
  const swims = events.filter(e => getType(e.title) === 'swim');
  const runs = events.filter(e => getType(e.title) === 'run');
  const bikes = events.filter(e => getType(e.title) === 'bike');
  const others = events.filter(e => !['swim','run','bike'].includes(getType(e.title)));

  const totalDist = events.reduce((s, e) => s + (e.dist || 0), 0);
  const totalMin = events.reduce((s, e) => s + (e.durationMin || 0), 0);
  const swimDist = swims.reduce((s, e) => s + (e.dist || 0), 0);
  const runDist = runs.reduce((s, e) => s + (e.dist || 0), 0);
  const avgRunHR = runs.length ? Math.round(runs.reduce((s, e) => s + e.avgHR, 0) / runs.length) : 0;
  const avgSwimHR = swims.length ? Math.round(swims.reduce((s, e) => s + e.avgHR, 0) / swims.length) : 0;

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

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
    swimReady: swimDist > 0.47,
    runHRHigh: avgRunHR > 155,
    noRides: bikes.length === 0
  };
}
