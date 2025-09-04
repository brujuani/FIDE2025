const statusEl = document.getElementById("status");
const resultContentEl = document.getElementById("resultContent");
const refreshBtn = document.getElementById("refresh");

/* -------- Teams (4 per side; Lu & Yip are women) -------- */
const teamBlue = [
  "Maghsoodloo, Parham",
  "Pranav, V",
  "Yuffa, Daniil",
  "Lu, Miaoyi"
];
const teamOrange = [
  "Sadhwani, Raunak",
  "Puranik, Abhimanyu",
  "Anton Guijarro, David",
  "Yip, Carissa"
];

const wantedPlayers = [...teamBlue, ...teamOrange];

/* -------- Flags -------- */
const countryMap = {
  "Maghsoodloo, Parham": "ir",
  "Pranav, V": "in",
  "Yuffa, Daniil": "es",
  "Lu, Miaoyi": "cn",
  "Sadhwani, Raunak": "in",
  "Puranik, Abhimanyu": "in",
  "Anton Guijarro, David": "es",
  "Yip, Carissa": "us"
};

let teamsChart = null;

/* ---------- PGN Utils ---------- */
function parseGamesFromPGN(pgnText) {
  const chunks = pgnText.split(/\n\n(?=\[Event\b)/).filter(Boolean);
  return chunks.map(ch => {
    const get = (tag) => {
      const m = ch.match(new RegExp('\\[' + tag + ' "([^"]*)"\\]'));
      return m ? m[1] : "";
    };
    return {
      headers: {
        White: get("White"),
        Black: get("Black"),
        WhiteElo: get("WhiteElo"),
        BlackElo: get("BlackElo"),
        Result: get("Result"),
        Round: get("Round"),
        Date: get("Date"),
        UTCDate: get("UTCDate"),
        UTCTime: get("UTCTime")
      }
    };
  });
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "Accept": "application/x-chess-pgn" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}`);
  return res.text();
}

function getPoints(player, game) {
  const h = game.headers;
  if (h.Result === "1-0") return player === h.White ? 1 : 0;
  if (h.Result === "0-1") return player === h.Black ? 1 : 0;
  if (h.Result === "1/2-1/2") return 0.5;
  return 0;
}
function fmtResult(result) {
  if (result === "1-0") return "1–0";
  if (result === "0-1") return "0–1";
  if (result === "1/2-1/2") return "½–½";
  if (!result || result === "*") return "Ongoing";
  return result;
}
function onlyRound(r) {
  if (!r) return "?";
  const s = String(r); const d = s.indexOf(".");
  return d === -1 ? s : s.slice(0, d);
}
function roundStartDate(games) {
  const arr = [];
  for (const g of games) {
    const h = g.headers;
    if (h.UTCDate) {
      const d = h.UTCDate.replace(/\./g, "-");
      const t = h.UTCTime || "00:00:00";
      const dt = new Date(`${d}T${t}Z`);
      if (!isNaN(dt)) arr.push(dt);
    } else if (h.Date) {
      const d = h.Date.replace(/\./g, "-");
      const dt = new Date(`${d}T00:00:00Z`);
      if (!isNaN(dt)) arr.push(dt);
    }
  }
  arr.sort((a,b)=>a-b);
  return arr[0] || null;
}

/* ---------- Chart ---------- */
function updateTeamsChart(labels, leftCum, rightCum) {
  const ctx = document.getElementById("teamsChart").getContext("2d");
  const rawMax = Math.max(...leftCum, ...rightCum, 1);
  const yMax = Math.ceil(rawMax * 2) / 2;

  if (teamsChart) {
    teamsChart.data.labels = labels;
    teamsChart.data.datasets[0].data = leftCum;
    teamsChart.data.datasets[1].data = rightCum;
    teamsChart.options.maintainAspectRatio = false;
    teamsChart.options.scales.x.offset = true;
    teamsChart.options.scales.x.bounds = "ticks";
    teamsChart.options.scales.y.beginAtZero = true;
    teamsChart.options.scales.y.suggestedMax = yMax + 0.5;
    teamsChart.options.scales.y.ticks.stepSize = 0.5;
    teamsChart.update();
    return;
  }

  teamsChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "BRU TEAM", data: leftCum, borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,0.1)", tension: 0.2, fill: false },
        { label: "JUANI TEAM", data: rightCum, borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", tension: 0.2, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      layout: { padding: { left: 8, right: 8 } },
      scales: {
        x: { offset: true, bounds: "ticks", title: { display: true, text: "Rounds played" } },
        y: { beginAtZero: true, suggestedMax: yMax + 0.5, ticks: { stepSize: 0.5 }, title: { display: true, text: "Cumulative points" } }
      }
    }
  });
}

/* ---------- Main ---------- */
async function tick() {
  try {
    statusEl.textContent = "Downloading PGNs…";

    // Decide URLs (proxy lists)
    const openURLs  = window.OPEN_PGN_URLS_PROXY?.length ? window.OPEN_PGN_URLS_PROXY  : window.OPEN_PGN_URLS;
    const womenURLs = window.WOMEN_PGN_URLS_PROXY?.length ? window.WOMEN_PGN_URLS_PROXY : window.WOMEN_PGN_URLS;

    const now = new Date();

    const playerInfo = {};
    const points = {};
    const gamesByPlayer = {};
    const roundSums = new Map(); // r -> {left,right}

    async function processList(urls) {
      for (let i = 0; i < urls.length; i++) {
        try {
          const pgn = await fetchText(urls[i]);
          const games = parseGamesFromPGN(pgn);
          if (!games.length) continue;

          const start = roundStartDate(games);
          if (start && start > now) continue;
          if (!start) {
            const any = games.some(g => g.headers.Result && g.headers.Result !== "*");
            if (!any) continue;
          }

          const rLab = onlyRound(games[0]?.headers?.Round);
          const rNum = Number.parseInt(rLab, 10) || (i + 1);
          let sumL = 0, sumR = 0;

          for (const g of games) {
            const h = g.headers;

            if (h.White) {
              if (!playerInfo[h.White]) playerInfo[h.White] = { elo: h.WhiteElo || "—" };
              const add = getPoints(h.White, g);
              if (teamBlue.includes(h.White)) sumL += add;
              if (teamOrange.includes(h.White)) sumR += add;
              if (wantedPlayers.includes(h.White)) {
                points[h.White] = (points[h.White] || 0) + add;
                (gamesByPlayer[h.White] ||= []).push({ rival: h.Black, color: "White", result: fmtResult(h.Result), round: onlyRound(h.Round) });
              }
            }
            if (h.Black) {
              if (!playerInfo[h.Black]) playerInfo[h.Black] = { elo: h.BlackElo || "—" };
              const add = getPoints(h.Black, g);
              if (teamBlue.includes(h.Black)) sumL += add;
              if (teamOrange.includes(h.Black)) sumR += add;
              if (wantedPlayers.includes(h.Black)) {
                points[h.Black] = (points[h.Black] || 0) + add;
                (gamesByPlayer[h.Black] ||= []).push({ rival: h.White, color: "Black", result: fmtResult(h.Result), round: onlyRound(h.Round) });
              }
            }
          }

          const cur = roundSums.get(rNum) || { left: 0, right: 0 };
          cur.left += sumL; cur.right += sumR;
          roundSums.set(rNum, cur);

        } catch (e) {
          console.warn("Round fetch failed:", urls[i], e);
        }
      }
    }

    await processList(openURLs);
    await processList(womenURLs);

    const rounds = [...roundSums.keys()].sort((a,b)=>a-b);
    const labels = rounds.map(String);
    const leftRound = rounds.map(r => roundSums.get(r).left);
    const rightRound = rounds.map(r => roundSums.get(r).right);

    // cumulative
    const leftCum = []; const rightCum = [];
    let accL = 0, accR = 0;
    for (let i = 0; i < labels.length; i++) {
      accL += leftRound[i] || 0; leftCum.push(accL);
      accR += rightRound[i] || 0; rightCum.push(accR);
    }

    // sort by points desc → ELO desc → name
    const byPointsThenElo = (a, b) => {
      const pa = points[a] || 0, pb = points[b] || 0;
      if (pb !== pa) return pb - pa;
      const ea = parseInt((playerInfo[a]?.elo || "").replace(/\D/g,""),10) || 0;
      const eb = parseInt((playerInfo[b]?.elo || "").replace(/\D/g,""),10) || 0;
      if (eb !== ea) return eb - ea;
      return a.localeCompare(b, "en");
    };

    const leftPlayers  = teamBlue.slice().sort(byPointsThenElo);
    const rightPlayers = teamOrange.slice().sort(byPointsThenElo);

    const fmtPts = n => (Number.isInteger(n) ? String(n) : (Math.round(n*2)/2).toFixed(1));
    const teamSum = arr => fmtPts(arr.reduce((s,p)=>s+(points[p]||0),0));

    function renderList(list) {
      return "<ul>" + list.map(p => {
        const elo = (playerInfo[p]?.elo) || "—";
        const pts = fmtPts(points[p] || 0);
        const code = countryMap[p] || "";
        const flag = code ? `<img src="https://flagcdn.com/24x18/${code}.png" alt="${code}" style="vertical-align:middle;margin-right:6px" /> ` : "";
        const games = (gamesByPlayer[p] || []).map(g => `<li>Round ${g.round}: ${g.color} vs ${g.rival} → ${g.result}</li>`).join("");
        return `
          <li class="player">
            <div class="player-header">${flag}${p} (${elo}) - ${pts} pts</div>
            <ul class="player-games hidden">${games}</ul>
          </li>`;
      }).join("") + "</ul>";
    }

    resultContentEl.innerHTML = `
      <div class="columns">
        <div class="col">
          <div class="team-title bru">BRU TEAM</div>
          ${renderList(leftPlayers)}
          <div class="team-total bru">Total: ${teamSum(teamBlue)} pts</div>
        </div>
        <div class="col">
          <div class="team-title juani">JUANI TEAM</div>
          ${renderList(rightPlayers)}
          <div class="team-total juani">Total: ${teamSum(teamOrange)} pts</div>
        </div>
      </div>`;

    statusEl.textContent = `Rounds played: ${labels.length} · Players: ${wantedPlayers.length}`;

    document.querySelectorAll(".player-header").forEach(el => {
      el.addEventListener("click", () => el.nextElementSibling?.classList.toggle("hidden"));
    });

    updateTeamsChart(labels, leftCum, rightCum);

  } catch (e) {
    statusEl.textContent = "Error: " + (e.message || e);
  }
}

refreshBtn.addEventListener("click", tick);
tick();
setInterval(tick, 20000);

