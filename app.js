const statusEl = document.getElementById("status");
const resultContentEl = document.getElementById("resultContent");
const refreshBtn = document.getElementById("refresh");

/* -------- Teams (4 per side) -------- */
const teamBlue = [
  "Maghsoodloo, Parham",
  "Pranav, V",
  "Yuffa, Daniil",
  "Lu, Miaoyi"         // new (women)
];

const teamOrange = [
  "Sadhwani, Raunak",
  "Puranik, Abhimanyu",
  "Anton Guijarro, David",
  "Yip, Carissa"       // new (women)
];

// For iteration and lookups
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

// Chart.js instance
let teamsChart = null;

/* ---------- PGN Utils ---------- */
function parseGamesFromPGN(pgnText) {
  const chunks = pgnText.split(/\n\n(?=\[Event\b)/).filter(Boolean);
  const games = [];
  for (const ch of chunks) {
    const get = (tag) => {
      const m = ch.match(new RegExp('\\[' + tag + ' "([^"]*)"\\]'));
      return m ? m[1] : "";
    };
    games.push({
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
    });
  }
  return games;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "Accept": "application/x-chess-pgn" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}`);
  return res.text();
}

function getPointsFromResult(player, game) {
  const h = game.headers;
  if (h.Result === "1-0") {
    if (player === h.White) return 1;
    if (player === h.Black) return 0;
  }
  if (h.Result === "0-1") {
    if (player === h.White) return 0;
    if (player === h.Black) return 1;
  }
  if (h.Result === "1/2-1/2") return 0.5;
  return 0;
}

function formatResult(result) {
  if (result === "1-0") return "1–0";
  if (result === "0-1") return "0–1";
  if (result === "1/2-1/2") return "½–½";
  if (!result || result === "*") return "Ongoing";
  return result;
}

// "1.13" -> "1"
function onlyRound(roundStr) {
  if (!roundStr) return "?";
  const s = String(roundStr);
  const dot = s.indexOf(".");
  return dot === -1 ? s : s.slice(0, dot);
}

/** Estimate round start datetime from headers. */
function getRoundStartDate(games) {
  const dates = [];
  for (const g of games) {
    const h = g.headers;
    let iso = "";
    if (h.UTCDate) {
      const d = h.UTCDate.replace(/\./g, "-");
      const t = h.UTCTime || "00:00:00";
      iso = `${d}T${t}Z`;
    } else if (h.Date) {
      const d = h.Date.replace(/\./g, "-");
      iso = `${d}T00:00:00Z`;
    }
    if (iso) {
      const dt = new Date(iso);
      if (!isNaN(dt)) dates.push(dt);
    }
  }
  if (!dates.length) return null;
  dates.sort((a, b) => a - b);
  return dates[0];
}

/* ---------- Chart ---------- */
function updateTeamsChart(labels, leftCumulative, rightCumulative) {
  const ctx = document.getElementById("teamsChart").getContext("2d");

  const rawMax = Math.max(...leftCumulative, ...rightCumulative, 1);
  const yMax = Math.ceil(rawMax * 2) / 2;

  if (teamsChart) {
    teamsChart.data.labels = labels;
    teamsChart.data.datasets[0].data = leftCumulative;
    teamsChart.data.datasets[1].data = rightCumulative;

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
        {
          label: "BRU TEAM",
          data: leftCumulative,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          tension: 0.2,
          fill: false
        },
        {
          label: "JUANI",
          data: rightCumulative,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          tension: 0.2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // canvas height controlled by CSS (.chart-wrap)
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      layout: { padding: { left: 8, right: 8 } },
      scales: {
        x: {
          offset: true,     // center when there is 1 label
          bounds: "ticks",
          title: { display: true, text: "Rounds played" }
        },
        y: {
          beginAtZero: true,
          suggestedMax: yMax + 0.5,
          ticks: { stepSize: 0.5 },
          title: { display: true, text: "Cumulative points" }
        }
      }
    }
  });
}

/* ---------- Main ---------- */
async function tick() {
  try {
    statusEl.textContent = "Downloading PGNs for all rounds…";

    // Choose proxied or direct URLs
    const openURLs  = (window.OPEN_PGN_URLS_PROXY  && window.OPEN_PGN_URLS_PROXY.length)
      ? window.OPEN_PGN_URLS_PROXY
      : window.OPEN_PGN_URLS;

    const womenURLs = (window.WOMEN_PGN_URLS_PROXY && window.WOMEN_PGN_URLS_PROXY.length)
      ? window.WOMEN_PGN_URLS_PROXY
      : window.WOMEN_PGN_URLS;

    const now = new Date();

    const playerInfo = {};   // {name: {elo}}
    const points = {};       // {name: number}
    const gamesByPlayer = {}; // {name: [{rival,color,result,round}]}

    // per-round sums across BOTH tournaments: { [roundNumber]: {left, right, included} }
    const roundSums = new Map();

    async function processTournament(urls) {
      for (let idx = 0; idx < urls.length; idx++) {
        const url = urls[idx];
        try {
          const pgn = await fetchText(url);
          const games = parseGamesFromPGN(pgn);
          if (!games.length) continue;

          const start = getRoundStartDate(games);
          if (start && start > now) continue;

          if (!start) {
            const anyStarted = games.some(g => g.headers.Result && g.headers.Result !== "*");
            if (!anyStarted) continue;
          }

          // detect round number
          let roundLabel = onlyRound(games[0]?.headers?.Round);
          let rNum = parseInt(roundLabel, 10);
          if (!Number.isFinite(rNum)) rNum = idx + 1; // fallback

          let sumLeft = 0;
          let sumRight = 0;

          for (const g of games) {
            const h = g.headers;

            if (h.White) {
              if (!playerInfo[h.White]) playerInfo[h.White] = { elo: h.WhiteElo || "—" };
              const addW = getPointsFromResult(h.White, g);

              if (teamBlue.includes(h.White))  sumLeft += addW;
              if (teamOrange.includes(h.White)) sumRight += addW;

              if (wantedPlayers.includes(h.White)) {
                points[h.White] = (points[h.White] || 0) + addW;
                if (!gamesByPlayer[h.White]) gamesByPlayer[h.White] = [];
                gamesByPlayer[h.White].push({
                  rival: h.Black, color: "White", result: formatResult(h.Result), round: onlyRound(h.Round)
                });
              }
            }

            if (h.Black) {
              if (!playerInfo[h.Black]) playerInfo[h.Black] = { elo: h.BlackElo || "—" };
              const addB = getPointsFromResult(h.Black, g);

              if (teamBlue.includes(h.Black))  sumLeft += addB;
              if (teamOrange.includes(h.Black)) sumRight += addB;

              if (wantedPlayers.includes(h.Black)) {
                points[h.Black] = (points[h.Black] || 0) + addB;
                if (!gamesByPlayer[h.Black]) gamesByPlayer[h.Black] = [];
                gamesByPlayer[h.Black].push({
                  rival: h.White, color: "Black", result: formatResult(h.Result), round: onlyRound(h.Round)
                });
              }
            }
          }

          // aggregate round sums across tournaments
          const cur = roundSums.get(rNum) || { left: 0, right: 0, included: false };
          cur.left += sumLeft;
          cur.right += sumRight;
          cur.included = true;
          roundSums.set(rNum, cur);

        } catch (err) {
          console.warn("Round fetch failed:", url, err);
        }
      }
    }

    // Process both tournaments
    if (Array.isArray(openURLs))  await processTournament(openURLs);
    if (Array.isArray(womenURLs)) await processTournament(womenURLs);

    // Build played rounds in order
    const playedRounds = [...roundSums.keys()].sort((a, b) => a - b)
      .filter(k => roundSums.get(k)?.included);

    // cumulative lines
    const labels = playedRounds.map(String);
    const leftRoundPoints = playedRounds.map(k => roundSums.get(k).left);
    const rightRoundPoints = playedRounds.map(k => roundSums.get(k).right);

    const leftCumulative = [];
    const rightCumulative = [];
    let accL = 0, accR = 0;
    for (let i = 0; i < labels.length; i++) {
      accL += leftRoundPoints[i] || 0;
      accR += rightRoundPoints[i] || 0;
      leftCumulative.push(accL);
      rightCumulative.push(accR);
    }

    // Sort: points desc -> ELO desc -> name
    const byPointsThenEloDesc = (a, b) => {
      const pa = points[a] || 0;
      const pb = points[b] || 0;
      if (pb !== pa) return pb - pa;

      const ea = parseInt(String(playerInfo[a]?.elo || "").replace(/\D/g, ""), 10) || 0;
      const eb = parseInt(String(playerInfo[b]?.elo || "").replace(/\D/g, ""), 10) || 0;
      if (eb !== ea) return eb - ea;

      return a.localeCompare(b, "en");
    };

    const leftPlayers  = teamBlue.slice().sort(byPointsThenEloDesc);
    const rightPlayers = teamOrange.slice().sort(byPointsThenEloDesc);

    // format & totals
    const fmtPts = (n) => (Number.isInteger(n) ? String(n) : (Math.round(n * 2) / 2).toFixed(1));
    const teamSum = (arr) => fmtPts(arr.reduce((acc, p) => acc + (points[p] || 0), 0));

    function renderList(list) {
      return "<ul>" + list.map(p => {
        const elo = (playerInfo[p]?.elo) || "—";
        const pts = fmtPts(points[p] || 0);
        const code = countryMap[p] || "";
        const flagHtml = code ? `<img src="https://flagcdn.com/24x18/${code}.png" alt="${code}" style="vertical-align:middle;margin-right:6px" /> ` : "";
        const games = (gamesByPlayer[p] || []).map(g =>
          `<li>Round ${g.round}: ${g.color} vs ${g.rival} → ${g.result}</li>`
        ).join("");
        return `
          <li class="player">
            <div class="player-header">${flagHtml}${p} (${elo}) - ${pts} pts</div>
            <ul class="player-games hidden">${games}</ul>
          </li>
        `;
      }).join("") + "</ul>";
    }

    // Render columns with team titles + totals
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
      </div>
    `;

    statusEl.textContent = `Rounds played: ${labels.length} · Players: ${wantedPlayers.length}`;

    // Toggle collapsibles
    document.querySelectorAll(".player-header").forEach(el => {
      el.addEventListener("click", () => {
        const gamesEl = el.nextElementSibling;
        if (gamesEl) gamesEl.classList.toggle("hidden");
      });
    });

    // Update chart
    updateTeamsChart(labels, leftCumulative, rightCumulative);

  } catch (e) {
    statusEl.textContent = "Error: " + (e.message || e);
  }
}

refreshBtn.addEventListener("click", tick);
tick();
setInterval(tick, 20000);
