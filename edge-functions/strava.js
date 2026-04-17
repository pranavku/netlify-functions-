const ICAL_URL = 'https://strautomator.com/api/calendar/150414250/9a4464acb7780960d48ddcc3/all.ics';

export default async (request) => {
  try {
    const res = await fetch(ICAL_URL, {
      headers: { 'User-Agent': 'ApexTri-Dashboard/1.0' }
    });

    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const text = await res.text();

    return new Response(text, {
      headers: {
        'Content-Type': 'text/calendar',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};

export const config = { path: '/api/strava' };
