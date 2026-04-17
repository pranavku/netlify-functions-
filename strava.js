const ICAL_URL = 'https://strautomator.com/api/calendar/150414250/9a4464acb7780960d48ddcc3/all.ics';

export async function onRequest(context) {
  try {
    const res = await fetch(ICAL_URL, {
      headers: { 'User-Agent': 'ApexTri-Dashboard/1.0' }
    });

    if (!res.ok) throw new Error(`Upstream error: ${res.status}`);
    const text = await res.text();

    return new Response(text, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
