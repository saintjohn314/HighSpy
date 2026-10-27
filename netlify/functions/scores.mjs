// High Spy arcade leaderboard. GET /api/scores?board=coffee-baked  -> top 10
//                              POST /api/scores {board, initials, score} -> saves, returns rank + top 10
// Each score is its own blob key (no read-modify-write), with the score inverted so keys sort best-first.
import { getStore } from "@netlify/blobs";

const BOARD_RE = /^[a-z0-9-]{1,48}$/;
const BLOCK = new Set(["ASS", "FUK", "FUC", "FCK", "FUQ", "CUM", "DIK", "DIC", "COK", "KKK", "NIG", "NGR", "FAG", "FGT", "SHT", "PIS", "TIT", "CNT", "KYS", "NAZ", "SUX", "WTF", "STD", "XXX"]);
const MAX_SCORE = 99999, KEEP = 100;
// open CORS so the itch.io build (served from itch's CDN) can use the same boards
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS } });

function parse(key) {
  const name = key.slice(key.indexOf("/") + 1), [inv, initials, ts] = name.split("~");
  return { key, s: 999999 - parseInt(inv, 10), i: initials, t: parseInt(ts, 36) };
}
async function board(store, b) {
  const { blobs } = await store.list({ prefix: b + "/" });
  return blobs.map(x => parse(x.key)).filter(x => Number.isFinite(x.s)).sort((a, b) => b.s - a.s || a.t - b.t);
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const store = getStore({ name: "highscores", consistency: "strong" });
  const url = new URL(req.url);
  try {
    if (req.method === "GET") {
      const b = url.searchParams.get("board") || "";
      if (!BOARD_RE.test(b)) return json({ error: "bad board" }, 400);
      const all = await board(store, b);
      return json({ board: b, top: all.slice(0, 10).map(({ i, s, t }) => ({ i, s, t })) });
    }
    if (req.method === "POST") {
      let body; try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
      const b = String(body.board || ""), initials = String(body.initials || "").toUpperCase(), score = Math.floor(Number(body.score));
      if (!BOARD_RE.test(b)) return json({ error: "bad board" }, 400);
      if (!/^[A-Z0-9]{3}$/.test(initials)) return json({ error: "initials must be 3 letters or numbers" }, 400);
      if (BLOCK.has(initials)) return json({ error: "pick different initials" }, 400);
      if (!Number.isFinite(score) || score < 1 || score > MAX_SCORE) return json({ error: "bad score" }, 400);
      const now = Date.now(), key = `${b}/${String(999999 - score).padStart(6, "0")}~${initials}~${now.toString(36)}`;
      await store.set(key, "1");
      const all = await board(store, b);
      const rank = all.findIndex(x => x.key === key) + 1;
      // keep each board small: drop everything past the top 100
      for (const x of all.slice(KEEP)) await store.delete(x.key);
      return json({ board: b, rank, top: all.slice(0, 10).map(({ i, s, t }) => ({ i, s, t })) });
    }
    return json({ error: "method not allowed" }, 405);
  } catch (err) {
    console.error("scores error", err);
    return json({ error: "leaderboard unavailable" }, 503);
  }
};

export const config = { path: "/api/scores" };
