// Vercel Serverless Function: /api/proxy-pgn
export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).send("Missing url");

  try {
    const r = await fetch(url, { headers: { "Accept": "application/x-chess-pgn" } });
    const text = await r.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/x-chess-pgn; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=300");

    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).send(String(e));
  }
}
