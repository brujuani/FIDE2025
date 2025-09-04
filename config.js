// --- OPEN event PGN URLs ---
window.OPEN_PGN_URLS = [
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-1/xSCoiNg0.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-2/UnZivDF9.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-3/gLwN3kib.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-4/zmaKVsPL.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-5/ADzdjVmn.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-6/iAnC0jAl.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-7/xtmbmvSP.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-8/KaLeVROn.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-9/FpwTKfvI.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-10/ytyOPXN7.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--open/round-11/pAVa5HIv.pgn"
];

// --- WOMEN event PGN URLs ---
// TODO: PUT THE REAL URLS HERE (pattern below is typical but ids differ!)
window.WOMEN_PGN_URLS = [
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-1/SwdwlpSh.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-2/coXhoCAD.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-3/ImZ7d1yu.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-4/4Lt5EOtF.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-5/1RoZMMTf.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-6/aHqxYHex.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-7/MQgPbolc.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-8/2Wpc5t9J.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-9/oC3SZ5au.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-10/2DjnbSjo.pgn",
  "https://lichess.org/broadcast/fide-grand-swiss-2025--women/round-11/eOraDcpQ.pgn"
];

// Proxy versions (if you use server.js to bypass CORS)
window.OPEN_PGN_URLS_PROXY = window.OPEN_PGN_URLS.map(
  u => "http://localhost:3000/proxy-pgn?url=" + encodeURIComponent(u)
);
window.WOMEN_PGN_URLS_PROXY = window.WOMEN_PGN_URLS.map(
  u => "http://localhost:3000/proxy-pgn?url=" + encodeURIComponent(u)
);
