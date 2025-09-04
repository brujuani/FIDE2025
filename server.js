import express from "express";
import fetch from "node-fetch";

const app = express();

// sirve estáticos
app.use(express.static("."));

// proxy
app.get("/proxy-pgn", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("Falta ?url=");
  try {
    const r = await fetch(target, { headers: { "Accept": "application/x-chess-pgn" } });
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.set("Access-Control-Allow-Origin", "*");
    res.type("application/x-chess-pgn; charset=utf-8");
    res.send(await r.text());
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.listen(3000, () => console.log("👉 Abre http://localhost:3000"));
