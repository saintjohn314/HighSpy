/* High Spy v2 — a trippy hidden-object game. */
(() => {
'use strict';
/* ================================================================== helpers */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtN = n => Math.round(n).toLocaleString('en-US');
const pct = (v, max) => (v / max * 100).toFixed(3) + '%';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function mulberry(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashStr = str => { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('highspy:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('highspy:' + k, JSON.stringify(v)); } catch (e) {} },
};
const reducedPref = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(3, window.devicePixelRatio || 1);
const SMALL = Math.min(screen.width, screen.height) < 700 || matchMedia('(max-width: 700px)').matches;

const DIFF = {
  chill:  { key: 'chill',  label: 'Chill',  n: 6,  scale: 1.16, pack: .98, decoys: 0, hints: 99, time: 0,   addT: 0, missT: 0, base: 100, show: 'pic',
            desc: 'Six things with pictures, nicely spread out. No clock, unlimited hints. Just vibes.' },
  baked:  { key: 'baked',  label: 'Baked',  n: 8,  scale: 1.0,  pack: .9,  decoys: 1, hints: 3,  time: 100, addT: 8, missT: 5, base: 120, show: 'name',
            desc: 'Eight things by name, look-alike decoys, 3 hints and a clock. Finds add 8 seconds, misses cost 5.' },
  blazed: { key: 'blazed', label: 'Blazed', n: 10, scale: .86,  pack: .82, decoys: 3, hints: 1,  time: 80,  addT: 6, missT: 8, base: 150, show: 'clue',
            desc: 'Ten things from riddle clues only, lots of look-alikes, 1 hint and a tight clock. Good luck.' },
};
const RANKS = [[0, 'Fresh Sprout'], [4, 'Casual Toker'], [10, 'Couch Captain'], [20, 'Cloud Chaser'], [34, 'Baked Legend'], [50, 'High Priest'], [72, 'Supreme High Spy']];
const LAYOUTS = {
  scatter: { pack: 1, size: 1 }, camo: { pack: .84, size: .9 }, float: { pack: 1.1, size: 1, shadow: 2.6 }, kaleido: { pack: .96, size: .9 },
  spiral: { pack: .9, size: 1 }, vortex: { pack: .9, size: .95 }, grid: { pack: .95, size: .92 }, waves: { pack: .94, size: .95 }, mound: { pack: .72, size: 1 },
};
const SURFACES = [['walnut', 'Coffee table'], ['marble', 'Marble'], ['shag', 'Shag rug'], ['soil', 'Soil'], ['tiedye', 'Tie-dye'], ['velvet', 'Velvet'], ['lawn', 'Lawn'],
  ['mandala', 'Mandala'], ['nebula', 'Nebula'], ['sky', 'Sunset sky'], ['opart', 'Op art'], ['lava', 'Lava'], ['candy', 'Candy'],
  ['ph:forest_leaves_04', 'Forest floor'], ['ph:leaves_forest_ground', 'Leaf pile'], ['ph:dry_river_pebbles', 'River rocks'], ['ph:coast_sand_01', 'Beach sand'],
  ['ph:sparse_grass', 'Real grass'], ['ph:wood_table_worn', 'Old desk'], ['ph:dirty_concrete', 'Garage floor'], ['ph:denim_fabric', 'Denim'], ['ph:granite_tile', 'Slate'], ['ph:dirty_carpet', 'Dorm carpet']];
// photo textures (CC0, Poly Haven), loaded on demand; size of one tile relative to the scene
const TEXK = { 'ph:wood_table_worn': 1.25, 'ph:denim_fabric': .9, 'ph:dry_river_pebbles': .95, 'ph:granite_tile': 1.1 };
const TEX = {};
const isPhoto = t => typeof t === 'string' && t.startsWith('ph:');
function ensureTex(t, q) {
  if (!isPhoto(t)) return Promise.resolve();
  q = q || (!SMALL && window.innerWidth * DPR >= 1400 ? 'hi' : 'md'); const k = t + '|' + q;
  if (!TEX[k]) TEX[k] = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => { TEX[k].img = im; res(im); };
    im.onerror = () => q === 'hi' ? ensureTex(t, 'md').then(res) : res(null);
    im.src = (q === 'hi' && CFG.hiBase ? CFG.hiBase + 'tex/' : 'assets/tex/') + `${t.slice(3)}_${q}.webp?v=${AV}`; });
  return TEX[k];
}
const texImg = t => (TEX[t + '|hi'] && TEX[t + '|hi'].img) || (TEX[t + '|md'] && TEX[t + '|md'].img) || null;
const STYLES = [['scatter', 'Scatter'], ['camo', 'Camo'], ['float', 'Floating'], ['kaleido', 'Kaleidoscope'], ['mirror', 'Mirror'], ['spiral', 'Spiral'], ['vortex', 'Vortex'],
  ['grid', 'Grid'], ['waves', 'Waves'], ['mound', 'Mound']];
const GROUPS = [['gear', 'Smoke gear'], ['munchies', 'Munchies'], ['lounge', 'Lounge'], ['garden', 'Garden'], ['cosmic', 'Cosmic'], ['sweets', 'Sweets'], ['green', 'Green things'], ['kitchen', 'Kitchen'],
  ['real', 'Real stuff'], ['tools', 'Tools'], ['fruit', 'Real food'], ['nature', 'Nature']];
const FXS = [['', 'None'], ['hue', 'Color drift'], ['breathe', 'Breathing']];
const STRAINS = ['Blue Dream', 'OG Kush', 'Sour Diesel', 'Purple Haze', 'Pineapple Express', 'Northern Lights', 'White Widow', 'Jack Herer', 'Granddaddy Purple',
  'GSC', 'GG4', 'Wedding Cake', 'Gelato', 'Durban Poison', 'Trainwreck', 'Super Lemon Haze', 'Bubba Kush', 'Maui Wowie', 'Strawberry Cough',
  'Tangie', 'Sunset Sherbet', 'Chemdawg', 'Cherry Pie', 'Blueberry', 'Ice Cream Cake', 'Purple Punch',
  'Lemon Haze', 'Mimosa', 'Apple Fritter', 'Biscotti', 'AK-47', 'Headband', 'Hindu Kush', 'Acapulco Gold', 'Cinderella 99', 'Platinum Kush', 'Green Crack'];
const ART_NAMES = ['Purple Haze Palace', 'Blue Dream Machine', 'Kush Kingdom', 'Haze Maze', 'Dank Dimension', 'Sativa Skies', 'Indica Island', 'Ganja Galaxy',
  'Mary Jane Lane', 'Reefer Reef', 'Nug Nebula', 'Stoney Island', 'Cloud Kush', 'The Hotbox', 'Bud Lagoon', 'Trichome Town', 'Doobie Dunes', 'Chronic Cosmos'];
const COMBO_WORD = ['', '', 'Puff', 'Puff puff', 'Pass!', 'Hotbox!'];

let DATA, SPR, SCENES, CHAPTERS, MASKS, ATL, PAGES = [];
let progress = store.get('progress', {}), sfxOn = !store.get('muted', false), musicOn = store.get('music', true), fxOn = store.get('fx', !reducedPref);
let diffKey = store.get('diff', 'chill'); if (!DIFF[diffKey]) diffKey = 'chill';
let mine = store.get('mine', []);
let stats = Object.assign({ games: 0, wins: 0, finds: 0, fam: {}, bestCombo: 0, bestScore: 0, perfect: 0, hints: 0, misses: 0, created: 0, shared: 0, initials: 0, played: {} }, store.get('stats', {}));
let ach = store.get('ach', {});
const saveStats = () => store.set('stats', stats);
const AV = '5'; // bump when assets change so week-long caches never mix old atlases with new data
const CFG = window.HS_CFG || {}; // the itch.io build sets api / site / hiBase here
const ITCH = 'https://woodstudioshq.itch.io/high-spy';
const SHARE = (CFG.site || location.origin).replace(/\/$/, '');
const FREE = new Set(['coffee']); // the free level
const CODE_H = 3324574055;
let full = !!store.get('full', false) || !!CFG.full;
const normCode = c => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
const paywalled = s => !full && !(s && !s.custom && FREE.has(s.id));
let ABASE = 'assets/';

/* ================================================================== loading */
async function boot() {
  const lbar = $('#lbar'), LT = ['Grinding the herb…', 'Packing the bowl…', 'Rolling it up…', 'Sparking up…', 'Taking a fat rip…']; let li = 0;
  const lt = setInterval(() => { const el = $('#ltext'); if (el) el.textContent = LT[++li % LT.length]; else clearInterval(lt); }, 900);
  DATA = await (await fetch('assets/data.json?v=' + AV)).json();
  SPR = DATA.sprites; SCENES = DATA.scenes; CHAPTERS = DATA.chapters;
  SCENES.forEach(s => { if (s.id === 'mirror') s.flip = true; });
  const MS = DATA.mask;
  MASKS = SPR.map(sp => { const bin = atob(sp.m), bits = new Uint8Array(MS * MS); for (let i = 0; i < MS * MS; i++) bits[i] = (bin.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1; return bits; });
  let done = 0;
  const loadPages = (atl, base) => Promise.all(atl.pages.map(p => new Promise((res, rej) => { const im = new Image(); im.onload = () => { done++; lbar.style.width = Math.min(100, done / atl.pages.length * 100) + '%'; res(im); }; im.onerror = rej; im.src = base + p.file + '?v=' + AV; })));
  if (!SMALL && window.innerWidth * DPR >= 1400) { const base = CFG.hiBase || 'assets/'; try { PAGES = await loadPages(DATA.atlas.hi, base); ATL = DATA.atlas.hi; ABASE = base; } catch (e) { PAGES = []; console.warn('High-res art unavailable, using standard art.'); } }
  if (!PAGES.length) { done = 0; ATL = DATA.atlas.md; ABASE = 'assets/'; PAGES = await loadPages(ATL, 'assets/'); }
  clearInterval(lt); $('#loading').remove();
  home.hidden = false; renderHome(); paintHero();
  if (!store.get('age21', false)) $('#gate').hidden = false;
  checkShared();
  const h = new Date().getHours(); if (h >= 2 && h < 5) unlock('nightowl'); if (h >= 6 && h < 9) unlock('wakebake');
}
const spriteLoc = g => { const per = ATL.per_row * ATL.per_row; return { pg: Math.floor(g / per), c: (g % per) % ATL.per_row, r: Math.floor((g % per) / ATL.per_row) }; };
function spriteCSS(g, size) {
  const { pg, c, r } = spriteLoc(g), CS = ATL.cell + 2 * ATL.pad, W = ATL.per_row * CS;
  if (typeof size === 'number') size = size + 'px';
  return `width:${size};height:${size};background-image:url('${ABASE}${ATL.pages[pg].file}?v=${AV}');background-size:${(W / ATL.cell * 100).toFixed(4)}% ${(W / ATL.cell * 100).toFixed(4)}%;background-position:${((c * CS + ATL.pad) / (W - ATL.cell) * 100).toFixed(4)}% ${((r * CS + ATL.pad) / (W - ATL.cell) * 100).toFixed(4)}%`;
}
function drawSprite(ctx, it, k, shadowK = 1) {
  const { pg, c, r } = spriteLoc(it.g), CS = ATL.cell + 2 * ATL.pad, size = it.s * k;
  ctx.save(); ctx.translate(it.x * k, it.y * k); ctx.rotate(it.r * Math.PI / 180); if (it.flip) ctx.scale(-1, 1);
  ctx.shadowColor = shadowK > 1.5 ? 'rgba(20,10,30,.32)' : 'rgba(12,6,0,.5)';
  ctx.shadowBlur = size * .055 * shadowK; ctx.shadowOffsetX = size * .018 * shadowK; ctx.shadowOffsetY = size * .04 * shadowK;
  ctx.drawImage(PAGES[pg], c * CS + ATL.pad, r * CS + ATL.pad, ATL.cell, ATL.cell, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/* ================================================================== surfaces */
function noiseFn(seed) {
  const R = mulberry(seed), p = new Uint8Array(512); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = (R() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), G = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const n = (x, y) => { const X = Math.floor(x), Y = Math.floor(y); x -= X; y -= Y; const xi = X & 255, yi = Y & 255, u = fade(x), v = fade(y), a = p[xi] + yi, b = p[xi + 1] + yi;
    const d = (h, x, y) => G[h & 7][0] * x + G[h & 7][1] * y; const l1 = d(p[a], x, y) + (d(p[b], x - 1, y) - d(p[a], x, y)) * u, l2 = d(p[a + 1], x, y - 1) + (d(p[b + 1], x - 1, y - 1) - d(p[a + 1], x, y - 1)) * u; return l1 + (l2 - l1) * v; };
  n.fbm = (x, y, o = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * n(x * f, y * f); a *= .5; f *= 2; } return s; };
  return n;
}
function grainPass(x, w, h, amt, R) { const im = x.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const v = (R() - .5) * amt; d[i] += v; d[i + 1] += v; d[i + 2] += v; } x.putImageData(im, 0, 0); }
function pixels(x, w, h, fn) { const im = x.createImageData(w, h), d = im.data; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const k = (j * w + i) * 4, c = fn(i, j); d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; } x.putImageData(im, 0, 0); }
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
function ramp(stops, t) { t = clamp(t, 0, .9999) * (stops.length - 1); const i = Math.floor(t), f = t - i; return lerp3(stops[i], stops[i + 1], f * f * (3 - 2 * f)); }
const surfCache = new Map();
function makeSurface(type, w, h, seed) {
  const key = type + w + 'x' + h + ':' + seed; if (surfCache.has(key)) return surfCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), R = mulberry(seed), u = w / 1000, n = noiseFn(seed);
  if (isPhoto(type)) {
    const im = texImg(type);
    if (!im) { x.fillStyle = '#5a4a3c'; x.fillRect(0, 0, w, h); return c; } // not cached: caller should await ensureTex first
    const T = Math.sqrt(w * h) * (TEXK[type] || 1), ox = -R() * T, oy = -R() * T;
    x.imageSmoothingQuality = 'high'; for (let yy = oy; yy < h; yy += T) for (let xx = ox; xx < w; xx += T) x.drawImage(im, xx, yy, T + .5, T + .5);
  } else if (type === 'walnut') {
    const base = [120, 80, 54]; let px = 0;
    while (px < w) { const pw = w * (.11 + R() * .07), v = (R() - .5) * 26;
      x.fillStyle = `rgb(${base[0] + v | 0},${base[1] + v * .8 | 0},${base[2] + v * .6 | 0})`; x.fillRect(px, 0, pw + 1, h);
      for (let i = 0; i < 34; i++) { const gx = px + R() * pw, amp = (1.5 + R() * 5) * u, fr = (.003 + R() * .009) / u, ph = R() * 6;
        x.beginPath(); for (let yy = 0; yy <= h; yy += 6 * u) { const xx = gx + Math.sin(yy * fr + ph) * amp + Math.sin(yy * fr * 3.1 + ph) * amp * .3; yy ? x.lineTo(xx, yy) : x.moveTo(xx, yy); }
        x.strokeStyle = R() < .55 ? `rgba(40,20,8,${.06 + R() * .14})` : `rgba(255,226,190,${.03 + R() * .07})`; x.lineWidth = (.6 + R() * 1.8) * u; x.stroke(); }
      x.fillStyle = 'rgba(20,10,4,.65)'; x.fillRect(px + pw - 1.5 * u, 0, 2.2 * u, h); px += pw; }
    grainPass(x, w, h, 12, R);
  } else if (type === 'marble') {
    const s = 3 / w; pixels(x, w, h, (i, j) => { const f = n.fbm(i * s * 2, j * s * 2, 5), vein = Math.abs(Math.sin((i * s * 1.6 + j * s * .9 + f * 3.2) * Math.PI));
      const v = Math.pow(1 - vein, 5) * .55 + Math.pow(1 - Math.abs(Math.sin((i * s * .7 - j * s * 1.3 + f * 2) * Math.PI)), 3) * .25, b = 238 + f * 12 - v * 70, wm = n(i * s * .5, j * s * .5) * 6; return [b + wm, b - 1, b - 4 - wm]; });
    grainPass(x, w, h, 6, R);
  } else if (type === 'shag') {
    const tile = document.createElement('canvas'); tile.width = tile.height = 384; const t = tile.getContext('2d');
    t.fillStyle = '#7a3d14'; t.fillRect(0, 0, 384, 384); const cols = ['#c8641e', '#e07b2a', '#a8521a', '#f0a04b', '#6e3510', '#d9862f'];
    for (let i = 0; i < 9000; i++) { const x0 = R() * 384, y0 = R() * 384, a = R() * Math.PI * 2, l = 5 + R() * 11; t.strokeStyle = cols[(R() * cols.length) | 0]; t.lineWidth = 1.6 + R() * 1.8; t.lineCap = 'round';
      t.beginPath(); t.moveTo(x0, y0); t.quadraticCurveTo(x0 + Math.cos(a + .6) * l * .6, y0 + Math.sin(a + .6) * l * .6, x0 + Math.cos(a) * l, y0 + Math.sin(a) * l); t.stroke(); }
    x.save(); x.scale(u * 1.4, u * 1.4); x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, w / (u * 1.4), h / (u * 1.4)); x.restore();
    for (let i = 0; i < 10; i++) { const cx = R() * w, cy = R() * h, r = (120 + R() * 260) * u, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, R() < .5 ? 'rgba(255,200,120,.12)' : 'rgba(40,10,0,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  } else if (type === 'soil') {
    const s = 6 / w; pixels(x, w, h, (i, j) => { const f = n.fbm(i * s, j * s, 5), g = R(); if (g > .9965) return [225, 222, 214]; const b = 48 + f * 40 + (g - .5) * 22; return [b + 8, b * .74, b * .52]; });
    for (let i = 0; i < w * h / 900; i++) { x.fillStyle = `rgba(${R() < .5 ? '20,12,6' : '120,90,60'},${.25 + R() * .35})`; x.beginPath(); x.arc(R() * w, R() * h, (1 + R() * 3) * u, 0, 7); x.fill(); }
  } else if (type === 'tiedye') {
    const s = 1 / w, cx = w * .42, cy = h * .5, cs = [[214, 40, 57], [247, 127, 0], [252, 191, 73], [42, 157, 143], [58, 134, 255], [131, 56, 236]];
    pixels(x, w, h, (i, j) => { const dx = (i - cx) * s, dy = (j - cy) * s, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) + r * 9 + n.fbm(i * s * 4, j * s * 4, 3) * 1.6;
      const t = ((a / (Math.PI * 2) * 6) % 1 + 1) % 1, ci = Math.floor(t * cs.length), f = (t * cs.length) % 1, m = f * f * (3 - 2 * f), c = lerp3(cs[ci], cs[(ci + 1) % cs.length], m);
      const wh = Math.pow(Math.abs(Math.sin(a * 6)), 30) * .7, wv = (Math.sin(i * .9) + Math.sin(j * .9)) * 4; return c.map(q => (q * .72 + 236 * .28) * (1 - wh) + 246 * wh + wv); });
  } else if (type === 'velvet') {
    const s = 2.5 / w; pixels(x, w, h, (i, j) => { const f = n.fbm(i * s, j * s * 1.6, 4), sh = Math.pow(clamp(.5 + f * 1.4, 0, 1), 2.2); return [46 + sh * 70, 20 + sh * 34, 66 + sh * 80]; });
    grainPass(x, w, h, 10, R);
  } else if (type === 'lawn') {
    const tile = document.createElement('canvas'); tile.width = tile.height = 512; const t = tile.getContext('2d');
    const g0 = t.createLinearGradient(0, 0, 0, 512); g0.addColorStop(0, '#2f5d22'); g0.addColorStop(1, '#264d1c'); t.fillStyle = g0; t.fillRect(0, 0, 512, 512);
    const layers = [['#1f4417', 3000, 1.2], ['#335f22', 3000, 1.3], ['#4b7d2c', 2600, 1.4], ['#6a9b3a', 1800, 1.3], ['#89b84c', 900, 1.1]];
    for (const [col, cnt, lw] of layers) { t.strokeStyle = col; t.lineWidth = lw; t.lineCap = 'round'; t.beginPath();
      for (let i = 0; i < cnt; i++) { const bx = R() * 512, by = R() * 512, l = 8 + R() * 16, a = (R() - .5) * 1.1; t.moveTo(bx, by); t.quadraticCurveTo(bx + Math.sin(a) * l * .4, by - l * .55, bx + Math.sin(a) * l, by - Math.cos(a) * l); } t.stroke(); }
    // clover
    for (let i = 0; i < 26; i++) { const bx = R() * 512, by = R() * 512; t.fillStyle = 'rgba(110,160,70,.85)'; for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + R(); t.beginPath(); t.arc(bx + Math.cos(a) * 4, by + Math.sin(a) * 4, 4, 0, 7); t.fill(); } }
    x.save(); x.scale(u * 1.2, u * 1.2); x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, w / (u * 1.2), h / (u * 1.2)); x.restore();
    for (let i = 0; i < 14; i++) { const cx = R() * w, cy = R() * h, r = (140 + R() * 300) * u, g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, R() < .5 ? 'rgba(220,255,150,.14)' : 'rgba(0,25,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
  } else if (type === 'mandala') {
    const cx = w / 2, cy = h / 2, s = 1 / Math.min(w, h), pal = [[38, 12, 66], [123, 44, 191], [247, 37, 133], [255, 159, 28], [255, 214, 10], [6, 214, 160], [17, 138, 178], [38, 12, 66]];
    pixels(x, w, h, (i, j) => { const dx = (i - cx) * s, dy = (j - cy) * s, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const petals = Math.cos(a * 12) * .5 + .5, rings = Math.sin(r * 46 - petals * 2.4) * .5 + .5, wob = n.fbm(dx * 3, dy * 3, 3);
      const t = ((r * 2.2 + petals * .18 + rings * .25 + wob * .3) % 1 + 1) % 1; const c = ramp(pal, t); const edge = Math.pow(Math.abs(Math.sin(r * 46 - petals * 2.4)), 18) * .5;
      return c.map(q => q * (1 - edge) * .86 + 30); });
  } else if (type === 'nebula') {
    const s = 2.2 / w; pixels(x, w, h, (i, j) => { const f = n.fbm(i * s, j * s, 5), g = n.fbm(i * s * .6 + 40, j * s * .6, 4);
      const a = clamp(.35 + f * 1.3, 0, 1), b = clamp(.4 + g * 1.4, 0, 1); const c = lerp3([8, 8, 26], [92, 30, 140], a * .9); return lerp3(c, [20, 140, 170], b * .55).map((q, k) => q + Math.pow(a * b, 3) * [180, 90, 140][k]); });
    for (let i = 0; i < w * h / 1100; i++) { const r = Math.pow(R(), 3) * 2.4 * u + .3 * u; x.fillStyle = `rgba(255,255,255,${.4 + R() * .6})`; x.beginPath(); x.arc(R() * w, R() * h, r, 0, 7); x.fill(); }
    for (let i = 0; i < 18; i++) { const sx = R() * w, sy = R() * h, r = (6 + R() * 10) * u, g = x.createRadialGradient(sx, sy, 0, sx, sy, r * 3); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.2, 'rgba(180,200,255,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(sx - r * 3, sy - r * 3, r * 6, r * 6); }
  } else if (type === 'sky') {
    const s = 1.6 / w; pixels(x, w, h, (i, j) => { const v = j / h, base = ramp([[120, 104, 214], [214, 128, 196], [255, 170, 150], [255, 214, 160]], v);
      const cl = clamp((n.fbm(i * s, j * s * 1.8, 5) - .02) * 3.2, 0, 1), sh = clamp((n.fbm(i * s + .02, j * s * 1.8 + .03, 5) - .05) * 3, 0, 1); return lerp3(base, lerp3([255, 248, 252], [226, 200, 236], sh * .6), cl * .85); });
  } else if (type === 'opart') {
    const cx = w / 2, cy = h / 2, s = 1 / Math.min(w, h);
    pixels(x, w, h, (i, j) => { let dx = (i - cx) * s, dy = (j - cy) * s; const r = Math.hypot(dx, dy), k = 1 + .55 * Math.exp(-r * r * 9) - .12 * Math.sin(r * 9); dx *= k; dy *= k;
      const N2 = 16, qx = dx * N2 + 100, qy = dy * N2 + 100, fx = qx - Math.floor(qx), fy = qy - Math.floor(qy), chk = (Math.floor(qx) + Math.floor(qy)) & 1;
      const e = Math.min(fx, 1 - fx, fy, 1 - fy) * 40, aa = clamp(e, 0, 1), on = chk ? 1 : 0, v = (on * aa + (1 - on) * (1 - aa)) * .0;
      const col = chk ? [238, 232, 220] : [24, 20, 28]; const soft = clamp(1 - e, 0, 1) * .5; return lerp3(col, [130, 125, 128], soft); });
  } else if (type === 'lava') {
    const blobs = Array.from({ length: 22 }, () => ({ x: R() * w, y: R() * h, r: (90 + R() * 220) * u, c: R() < .5 ? 0 : 1 }));
    pixels(x, w, h, (i, j) => { let f0 = 0, f1 = 0; for (const b of blobs) { const d2 = ((i - b.x) ** 2 + (j - b.y) ** 2) / (b.r * b.r); const v = Math.exp(-d2 * 1.6); if (b.c) f1 += v; else f0 += v; }
      const bg = lerp3([40, 10, 50], [70, 16, 70], j / h); const a = clamp(f0 * 1.6 - .5, 0, 1), b = clamp(f1 * 1.6 - .5, 0, 1);
      let c = lerp3(bg, [255, 110, 40], a); c = lerp3(c, [255, 60, 150], b * (1 - a * .5)); const glow = clamp((f0 + f1) * .5, 0, .6); return c.map((q, k) => q + glow * [60, 20, 40][k]); });
  } else if (type === 'candy') {
    const g0 = x.createLinearGradient(0, 0, w, h); g0.addColorStop(0, '#ffc6e0'); g0.addColorStop(1, '#ff9ecb'); x.fillStyle = g0; x.fillRect(0, 0, w, h);
    const cols = ['#ffffff', '#7bdff2', '#f7d6e0', '#ffd166', '#06d6a0', '#ef476f', '#9b5de5'];
    for (let i = 0; i < w * h / 700 * u; i++) { x.save(); x.translate(R() * w, R() * h); x.rotate(R() * 6.3); x.fillStyle = cols[(R() * cols.length) | 0]; const L = (6 + R() * 6) * u, T = 2.4 * u; x.beginPath(); x.roundRect ? x.roundRect(-L / 2, -T / 2, L, T, T / 2) : x.rect(-L / 2, -T / 2, L, T); x.fill(); x.restore(); }
    grainPass(x, w, h, 8, R);
  }
  if (surfCache.size > 10) surfCache.delete(surfCache.keys().next().value);
  surfCache.set(key, c); return c;
}

/* ================================================================== layouts */
// Virtual space has area 100x100 units; Wv/Hv follow the picture's aspect ratio.
function slotsFor(L, Wv, Hv, sizeMul, R, rnd) {
  const S = [], cx = Wv / 2, cy = Hv / 2;
  if (L === 'grid') {
    const c = 12.5 * sizeMul, nx = Math.ceil(Wv / c) + 1, ny = Math.ceil(Hv / c) + 1;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) S.push({ x: (i + .5) * c - (nx * c - Wv) / 2 + Math.sin(j * .9) * c * .22, y: (j + .5) * c - (ny * c - Hv) / 2 + Math.sin(i * .7) * c * .22, fs: c * .86, rot: ((i + j) % 4) * 45 });
  } else if (L === 'waves' || L === 'spiral' || L === 'vortex') {
    // a dense flow field: every spot gets an angle (and size) from the pattern, so the pile itself draws the shape
    const Rm = Math.hypot(Wv, Hv) / 2, arms = L === 'spiral' ? 3 : 5;
    for (let i = 0; i < 6000; i++) {
      const x = rnd(-3, Wv + 3), y = rnd(-3, Hv + 3), dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      if (L === 'waves') { const ph = y * .16, slope = Math.cos(x * .11 + ph) * 1.1, band = Math.sin(y * .32 + Math.sin(x * .11 + ph) * 1.6);
        S.push({ x, y, sc: .84 + band * .16, rot: Math.atan(slope) * 57.3 + (R() < .5 ? 0 : 180) }); continue; }
      const rn = r / Rm, sc = L === 'vortex' ? .5 + .62 * Math.pow(rn, .8) : .62 + .45 * rn;
      const twist = L === 'vortex' ? 5.2 : 3.4, armPh = arms * (th - Math.log(r + 4) * twist), onArm = Math.pow(Math.cos(armPh / 2), 2);
      if (R() > (L === 'spiral' ? .28 + .72 * onArm : .55 + .45 * onArm)) continue;
      const flow = th + Math.PI / 2 + Math.atan(1 / twist) * (L === 'vortex' ? 1 : .6);
      S.push({ x, y, sc, rot: flow * 57.3 + rnd(-18, 18) });
    }
  } else if (L === 'mound') {
    const Rm = Math.min(Wv, Hv) * .6, ax = Wv / Math.min(Wv, Hv) * .92;
    for (let i = 0; i < 1100; i++) { const r = Rm * Math.pow(R(), .7), a = R() * Math.PI * 2; S.push({ x: cx + Math.cos(a) * r * ax, y: cy + Math.sin(a) * r, sc: rnd(.86, 1.1) }); }
  }
  for (let i = S.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [S[i], S[j]] = [S[j], S[i]]; }
  return S;
}
function buildLayout(scene, cfg, A, seed, opts = {}) {
  const R = mulberry(seed), rnd = (a, b) => a + R() * (b - a), pickR = a => a[(R() * a.length) | 0];
  const Wv = 100 * Math.sqrt(A), Hv = 100 / Math.sqrt(A), cx = Wv / 2, cy = Hv / 2;
  const L = scene.layout || 'scatter', LY = LAYOUTS[L] || LAYOUTS.scatter, avoid = opts.avoid || [];
  const dens = scene.density == null ? 1 : scene.density, densPack = [1.14, 1, .86][dens], densSize = [1.06, 1, .93][dens];
  const sizeMul = cfg.scale * densSize * LY.size * (scene.tight ? .88 : 1), packK = cfg.pack * densPack * LY.pack * (scene.tight ? .9 : 1);
  const byFam = {}; scene.pool.forEach(g => (byFam[SPR[g].f] = byFam[SPR[g].f] || []).push(g));
  const allFam = {}; SPR.forEach((s, g) => (allFam[s.f] = allFam[s.f] || []).push(g));
  const noT = new Set(scene.noTarget || []), targets = [];
  if (!opts.noTargets) { const fams = Object.keys(byFam).filter(f => !noT.has(f)).sort(() => R() - .5); for (const f of fams) { if (targets.length >= cfg.n) break; targets.push({ g: pickR(byFam[f]), f }); } }
  const tFams = new Set(targets.map(t => t.f)), tG = new Set(targets.map(t => t.g));
  const fill = scene.pool.filter(g => !tG.has(g) && (cfg.decoys > 0 || noT.has(SPR[g].f) || !tFams.has(SPR[g].f)));
  const forced = []; for (const t of targets) { const o = allFam[t.f].filter(g => g !== t.g).sort(() => R() - .5); for (let i = 0; i < Math.min(cfg.decoys, o.length); i++) forced.push(o[i]); }
  const placed = [];
  const radOf = (g, s) => s * SPR[g].r * .94;
  const fits = (x, y, rr, k) => { for (const p of placed) { const dx = p.x - x, dy = p.y - y, m = (p.rr + rr) * k; if (dx * dx + dy * dy < m * m) return false; } return true; };
  const inAvoid = (x, y, rr) => avoid.some(a => x + rr > a[0] && x - rr < a[2] && y + rr > a[1] && y - rr < a[3]);
  const inside = (x, y, rr) => x > rr && y > rr && x < Wv - rr && y < Hv - rr;
  const rotOf = (g, base) => SPR[g].u ? rnd(-28, 28) : base == null ? rnd(-180, 180) : base + rnd(-12, 12);
  const sizeOf = (g, sc = 1, fs) => fs ? fs * (SPR[g].u ? .9 : 1) : SPR[g].s * sizeMul * sc;
  const slotL = ['grid', 'waves', 'spiral', 'vortex', 'mound'].includes(L);
  const slots = slotL ? slotsFor(L, Wv, Hv, sizeMul, R, rnd) : null;
  // 1. targets: placed first, fully inside, never under the zoom buttons
  for (const t of targets) {
    if (slotL) {
      let ok = false;
      for (let i = 0; i < slots.length && !ok; i++) { const sl = slots[i]; if (sl.used || (sl.sc && sl.sc < .68)) continue;
        const s = clamp(sizeOf(t.g, (sl.sc || 1) * rnd(.96, 1.04), sl.fs), 8, 21), rr = radOf(t.g, s);
        if (inside(sl.x, sl.y, rr) && !inAvoid(sl.x, sl.y, rr) && fits(sl.x, sl.y, rr, 1.02)) { sl.used = true; ok = true; placed.push({ g: t.g, x: sl.x, y: sl.y, s, rr, r: rotOf(t.g, sl.rot), t: SPR[t.g].f, z: rnd(.3, .9) }); } }
      if (ok) continue;
    }
    const s = clamp(SPR[t.g].s * sizeMul * rnd(.94, 1.06), 8, 21), rr = radOf(t.g, s); let x, y, tries = 0, k = 1.08;
    do { x = rnd(rr, Wv - rr); y = rnd(rr, Hv - rr); if (++tries % 400 === 0) k *= .92; } while ((!fits(x, y, rr, k) || inAvoid(x, y, rr)) && tries < 4000);
    placed.push({ g: t.g, x, y, s, rr, r: rotOf(t.g), t: SPR[t.g].f, z: rnd(.3, .9) });
  }
  // 2. look-alike decoys
  for (const g of forced) {
    if (slotL) { const sl = slots.find(q => !q.used && fits(q.x, q.y, radOf(g, sizeOf(g, q.sc || 1, q.fs)), packK)); if (sl) { sl.used = true; const s = sizeOf(g, sl.sc || 1, sl.fs); placed.push({ g, x: sl.x, y: sl.y, s, rr: radOf(g, s), r: rotOf(g, sl.rot), z: R() }); continue; } }
    const s = clamp(SPR[g].s * sizeMul * rnd(.94, 1.06), 7.5, 21), rr = radOf(g, s); let x, y, tries = 0;
    do { x = rnd(rr * .6, Wv - rr * .6); y = rnd(rr * .6, Hv - rr * .6); } while (!fits(x, y, rr, packK) && ++tries < 2500);
    placed.push({ g, x, y, s, rr, r: rotOf(g), z: R() });
  }
  // 3. the pile
  if (fill.length) {
    if (L === 'kaleido') {
      const n = scene.sym || 6, flip = !!scene.flip, Rm = Math.hypot(Wv, Hv) / 2 + 6, wedge = Math.PI * 2 / n, sinW = Math.sin(wedge / 2); let fails = 0;
      for (let it = 0; it < 14000 && fails < 1600; it++) {
        const g = pickR(fill), s = clamp(SPR[g].s * sizeMul * (fails > 500 ? rnd(.55, .8) : rnd(.85, 1.08)), 5.5, 22), rr = radOf(g, s);
        const r = rnd(Math.max(rr * .9, rr * packK / sinW), Rm), a = rnd(0, wedge), rot = rnd(-180, 180), copies = [];
        for (let k = 0; k < n; k++) { const ak = a + k * wedge, x = cx + Math.cos(ak) * r, y = cy + Math.sin(ak) * r; if (x < -rr || y < -rr || x > Wv + rr || y > Hv + rr) continue; copies.push({ x, y, r: rot + k * 360 / n, flip: flip && (k % 2 === 1) }); }
        if (!copies.length) continue;
        if (copies.every(c => fits(c.x, c.y, rr, packK))) { const z = R(); copies.forEach(c => placed.push({ g, x: c.x, y: c.y, s, rr, r: c.r, flip: c.flip, z })); fails = 0; } else fails++;
      }
    } else if (slotL) {
      for (const sl of slots) { if (sl.used) continue; const g = pickR(fill), s = clamp(sizeOf(g, sl.sc || 1, sl.fs), 4.5, 23), rr = radOf(g, s);
        if (fits(sl.x, sl.y, rr, packK)) placed.push({ g, x: sl.x, y: sl.y, s, rr, r: rotOf(g, sl.rot), z: R() }); }
    } else {
      let fails = 0;
      for (let it = 0; it < 9000 && fails < 700; it++) {
        const g = pickR(fill), shrink = fails > 250 ? rnd(.55, .8) : rnd(.86, 1.1), s = clamp(SPR[g].s * sizeMul * shrink, 5.5, 24), rr = radOf(g, s);
        const x = rnd(-rr * .35, Wv + rr * .35), y = rnd(-rr * .35, Hv + rr * .35);
        if (fits(x, y, rr, packK)) { placed.push({ g, x, y, s, rr, r: rotOf(g), z: R() }); fails = 0; } else fails++;
      }
    }
  }
  // nothing may hide the middle of a target
  for (const t of placed) if (t.t) for (const d of placed) if (d !== t && d.z > t.z && Math.hypot(d.x - t.x, d.y - t.y) < (d.rr + t.rr) * .8) d.z = t.z - .001 - R() * .05;
  return { Wv, Hv, items: placed.sort((a, b) => a.z - b.z), targets: placed.filter(p => p.t), shadowK: LY.shadow || 1 };
}
function drawItems(ctx, lay, k) { for (const it of lay.items) drawSprite(ctx, it, k, lay.shadowK); }
function finishPass(ctx, W, H) {
  const lg = ctx.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,236,205,.09)'); lg.addColorStop(.55, 'rgba(255,236,205,0)'); lg.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W * .5, H * .46, Math.min(W, H) * .32, W * .5, H * .5, Math.hypot(W, H) * .62); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
}
function renderFlat(cv, scene, lay, w, h, seed) {
  cv.width = Math.round(w); cv.height = Math.round(h); const ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
  const tw = Math.min(cv.width, 1800), th = Math.round(tw * cv.height / cv.width);
  ctx.drawImage(makeSurface(scene.surface, tw, th, seed), 0, 0, cv.width, cv.height); drawItems(ctx, lay, cv.width / lay.Wv); finishPass(ctx, cv.width, cv.height);
}

/* ================================================================== sound + music */
let actx = null, acted = false;
['pointerdown', 'keydown', 'touchend'].forEach(ev => addEventListener(ev, () => { acted = true; }, { capture: true, passive: true }));
const AC = () => { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; };
function tone(f, dur, type = 'sine', vol = .14, when = 0) {
  if (!sfxOn || !acted) return;
  try { const a = AC(), t = a.currentTime + when, o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .03); } catch (e) {}
}
const NOTE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
const sfx = {
  found(c) { const b = NOTE[Math.min(c - 1, 4)]; tone(b, .16, 'triangle', .17); tone(b * 1.5, .3, 'triangle', .13, .07); if (c > 1) tone(b * 2, .25, 'sine', .08, .12); },
  miss() { tone(180, .15, 'square', .045); tone(140, .2, 'square', .035, .06); },
  hint() { tone(523.25, .22, 'sine', .12); tone(783.99, .32, 'sine', .1, .1); },
  tick() { tone(1200, .05, 'square', .03); },
  count(i) { tone(i ? 660 : 990, i ? .12 : .3, 'triangle', .12); },
  win() { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, .42, 'triangle', .13, i * .1)); },
  lose() { [392, 349.2, 311.1, 261.6].forEach((f, i) => tone(f, .35, 'triangle', .11, i * .14)); },
  trophy() { [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(f, .3, 'sine', .12, i * .08)); },
};
// a mellow lo-fi loop: soft chords, bass, kick, hats and vinyl crackle
const Music = {
  playing: false, timer: 0, next: 0, step: 0, bus: null,
  chords: [[174.61, 220, 261.63, 329.63], [164.81, 196, 246.94, 293.66], [146.83, 174.61, 220, 261.63], [130.81, 164.81, 196, 246.94]],
  start() {
    if (this.playing || !musicOn || !acted) return;
    try {
      const a = AC(); this.bus = a.createGain(); this.bus.gain.value = 0; this.bus.connect(a.destination); this.bus.gain.linearRampToValueAtTime(.55, a.currentTime + 2.5);
      this.lp = a.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 1500; this.lp.connect(this.bus);
      const len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() < .0009 ? (Math.random() - .5) * .9 : 0) + (Math.random() - .5) * .012;
      this.crackle = a.createBufferSource(); this.crackle.buffer = buf; this.crackle.loop = true; const cg = a.createGain(); cg.gain.value = .5; this.crackle.connect(cg).connect(this.bus); this.crackle.start();
      this.noise = buf; this.playing = true; this.next = a.currentTime + .1; this.step = 0;
      this.timer = setInterval(() => this.tick(), 120);
    } catch (e) {}
  },
  stop() { if (!this.playing) return; clearInterval(this.timer); try { const a = AC(), b = this.bus; b.gain.linearRampToValueAtTime(0, a.currentTime + .8); setTimeout(() => { try { this.crackle.stop(); b.disconnect(); } catch (e) {} }, 900); } catch (e) {} this.playing = false; },
  tick() {
    const a = AC(), beat = 60 / 72 / 2; // eighth notes at 72 bpm
    while (this.next < a.currentTime + .5) {
      const t = this.next, st = this.step % 64, bar = Math.floor(st / 16), ch = this.chords[bar], s8 = st % 16;
      if (s8 === 0) ch.forEach((f, i) => this.pad(f, t + i * .03, beat * 15.5));
      if (s8 === 0 || s8 === 10) this.bass(ch[0] / 2, t, beat * 5);
      if (s8 % 8 === 0) this.kick(t);
      if (s8 % 8 === 4) this.snare(t);
      if (s8 % 2 === 1) this.hat(t, s8 % 4 === 3 ? .5 : .3);
      if (s8 === 6 || s8 === 12) this.pluck(ch[(s8 / 6 + bar) % 4] * 2, t);
      this.next += beat; this.step++;
    }
  },
  env(t, peak, att, dur) { const g = AC().createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(.0001, t + dur); return g; },
  pad(f, t, dur) { const a = AC(); for (const [type, det, v] of [['sine', 0, .05], ['triangle', 6, .025]]) { const o = a.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; const g = this.env(t, v, .5, dur); o.connect(g).connect(this.lp); o.start(t); o.stop(t + dur + .1); } },
  bass(f, t, dur) { const a = AC(), o = a.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = this.env(t, .16, .02, dur); o.connect(g).connect(this.bus); o.start(t); o.stop(t + dur + .1); },
  pluck(f, t) { const a = AC(), o = a.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = this.env(t, .03, .01, .9); o.connect(g).connect(this.lp); o.start(t); o.stop(t + 1); },
  kick(t) { const a = AC(), o = a.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(45, t + .18); const g = this.env(t, .22, .005, .3); o.connect(g).connect(this.bus); o.start(t); o.stop(t + .32); },
  snare(t) { const a = AC(), s = a.createBufferSource(); s.buffer = this.noise; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const g = this.env(t, .05, .003, .18); s.connect(f).connect(g).connect(this.bus); s.start(t, Math.random()); s.stop(t + .2); },
  hat(t, v) { const a = AC(), s = a.createBufferSource(); s.buffer = this.noise; const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const g = this.env(t, .02 * v * 2, .002, .06); s.connect(f).connect(g).connect(this.bus); s.start(t, Math.random()); s.stop(t + .08); },
};
const SND_ON = '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>';
const SND_OFF = '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>';
const MUS_ON = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>';
const MUS_OFF = '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M3 3l18 18"/>';
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

/* ================================================================== progress, ranks, chapters */
const pkey = (sid, d) => sid + ':' + d;
function totalStars() { let t = 0; for (const k in progress) if (!k.startsWith('u-')) t += progress[k].stars || 0; return t; }
function rankOf(stars) { let i = 0; for (let j = 0; j < RANKS.length; j++) if (stars >= RANKS[j][0]) i = j; const nx = RANKS[i + 1]; return { i, name: RANKS[i][1], at: RANKS[i][0], next: nx ? nx[0] : null, nextName: nx ? nx[1] : null }; }
const chUnlocked = ch => totalStars() >= (CHAPTERS.find(c => c.n === ch) || { need: 0 }).need;
const dateKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const todayKey = () => dateKey(new Date());
const dailyNum = () => Math.floor((new Date(todayKey() + 'T12:00:00') - new Date('2026-10-17T12:00:00')) / 864e5) + 1;
const dailySeed = () => hashStr('highspy' + todayKey());
const dailyScene = () => SCENES[dailySeed() % SCENES.length];
const dailyStrain = () => STRAINS[(dailySeed() >>> 8) % STRAINS.length];

/* ================================================================== achievements */
const MEDAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';
const ACH = [
  ['first', 'First Hit', 'Finish your first round.'], ['combo3', 'Combo Toker', 'Hit a ×3 combo.'], ['combo5', 'Hot Box', 'Max out the combo at ×5.'],
  ['perfect', 'Eagle Eye', 'Finish a round without a single miss.'], ['riddler', 'Riddle Master', 'Beat Blazed without using the hint.'],
  ['speed', 'Speed Racer', 'Finish Baked or Blazed with a minute or more on the clock.'], ['clutch', 'Clutch', 'Win with 3 seconds or less left.'],
  ['lifted', 'Fully Lifted', 'Get 3 stars on Blazed.'], ['sesh', 'The Sesh Is Done', 'Get stars on every Chapter 1 spot.'], ['blazeit', 'Blaze It', 'Finish with a score that ends in 420.'],
  ['hidef', 'Hi-Def', 'Unlock the Hi-Def chapter.'], ['wayup', 'Way Up', 'Unlock the Way Up chapter.'], ['lost', 'Lost in It', 'Unlock the Lost in It chapter.'], ['wrongweed', 'Wrong Kind of Weed', 'Find the wrong kind of weed.'], ['grandpa', 'Grandpa Approved', 'Beat Grandpa\'s Desk on Blazed.'], ['night', 'Night Vision', 'Beat Northern Lights.'],
  ['camo', 'Camo Expert', 'Beat the Kush Jungle.'], ['twins', 'Twin Finder', 'Beat the Mirror Maze.'], ['cosmic', 'Space Cadet', 'Beat Space Cake.'], ['express', 'All Aboard', 'Beat Pineapple Express.'],
  ['pyro', 'Pyro', 'Find 25 lighters.'], ['buds', 'Bud Hunter', 'Find 42 buds.'], ['munch', 'Munchie Monster', 'Find 50 snacks.'], ['spot100', 'Seasoned Spotter', 'Find 100 things.'], ['spot500', 'Third Eye', 'Find 500 things.'],
  ['roller', 'High Roller', 'Score 10,000 points in one round.'], ['daily', 'Daily Toker', 'Finish a Daily Sesh.'], ['streak3', 'Habit Forming', 'Play the Daily Sesh 3 days in a row.'],
  ['fourtwenty', '4:20', 'Finish a round at 4:20.'], ['wakebake', 'Wake and Bake', 'Play between 6 and 9 a.m.'], ['nightowl', 'Night Owl', 'Play between 2 and 5 a.m.'], ['artist', 'Artist', 'Save your own artscape.'],
  ['sharer', 'Spread the Love', 'Copy a share link.'], ['supporter', 'Real One', 'Unlock the full game.'], ['fame', 'Hall of Famer', 'Put your initials on a high score board.'], ['supreme', 'Supreme High Spy', 'Reach the top rank.'],
];
let achQ = [], achShowing = false;
function unlock(id) {
  if (ach[id]) return; ach[id] = Date.now(); store.set('ach', ach);
  const a = ACH.find(x => x[0] === id); if (!a) return; achQ.push(a); if (!achShowing) showAch();
}
function showAch() {
  const a = achQ.shift(); if (!a) { achShowing = false; return; } achShowing = true;
  const el = document.createElement('div'); el.className = 'ach'; el.setAttribute('role', 'status');
  el.innerHTML = `<div class="medal">${MEDAL}</div><div><small>Trophy unlocked</small><b>${a[1]}</b></div>`; document.body.appendChild(el); sfx.trophy();
  setTimeout(() => { el.remove(); showAch(); }, 3000);
}
const SNACKS = new Set(['brownie', 'gummy', 'cookie', 'donut', 'pizza', 'chips', 'soda', 'cereal', 'popcorn', 'worm', 'ramen']);

/* ================================================================== home */
const home = $('#home'), game = $('#game');
function allScenesFor(ch) { return SCENES.filter(s => s.ch === ch); }
function nextScene() { if (!full) return SCENES.find(s => FREE.has(s.id)) || SCENES[0]; for (const c of CHAPTERS) { if (!chUnlocked(c.n)) break; const s = allScenesFor(c.n).find(s => !(progress[pkey(s.id, diffKey)] || {}).stars); if (s) return s; } return SCENES[0]; }
function tileHTML(s, extra = '') {
  const p = progress[pkey(s.id, diffKey)] || {}, pay = paywalled(s), locked = !pay && s.ch && !chUnlocked(s.ch), need = s.ch ? CHAPTERS.find(c => c.n === s.ch).need : 0;
  const st = [0, 1, 2].map(k => `<span class="${k < (p.stars || 0) ? 'on' : ''}">★</span>`).join('');
  const tags = [s.layout && s.layout !== 'scatter' ? (STYLES.find(x => x[0] === (s.flip ? 'mirror' : s.layout)) || [0, s.layout])[1] : '', s.dark ? 'Lights out' : '', s.fx ? 'Trippy' : '', isPhoto(s.surface) ? 'Hi-Def' : ''].filter(Boolean);
  return `<button class="tile ${pay ? 'paywall' : locked ? 'locked' : ''}" data-sid="${esc(s.id)}" aria-label="${pay ? 'Full game: ' : locked ? 'Locked: ' : 'Play '}${esc(s.name)}"><div class="thumb"><canvas data-th="${esc(s.id)}"></canvas>${pay ? `<span class="lockpill pay"><svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Full game</span>` : ''}${locked ? `<span class="lockpill"><svg class="i" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>${need} ★ to unlock</span>` : ''}${extra}</div>
    <div class="tile-info"><div class="tile-row"><div class="tile-name">${esc(s.name)}</div><div class="stars" aria-label="${p.stars || 0} of 3 stars">${st}</div></div>
    <div class="tile-blurb">${esc(s.blurb || '')}</div>${tags.length ? `<div class="tagrow">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    <div class="best">${p.best ? 'Best ' + fmtN(p.best) + ' pts' : 'Not played on ' + DIFF[diffKey].label + ' yet'}</div></div></button>`;
}
function renderHome() {
  $$('#seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === diffKey)));
  $('#diffDesc').textContent = DIFF[diffKey].desc;
  const ts = totalStars(), rk = rankOf(ts);
  $('#rankBadge').textContent = rk.i + 1; $('#rankName').textContent = rk.name;
  $('#rankSub').textContent = rk.next ? `${ts} stars · ${rk.next - ts} more to ${rk.nextName}` : `${ts} stars · top rank. Respect.`;
  $('#rankBar').style.width = (rk.next ? (ts - rk.at) / (rk.next - rk.at) * 100 : 100) + '%';
  const dres = store.get('daily:' + todayKey(), null), streak = store.get('streak', { n: 0, last: '' });
  $('#dailyTitle').textContent = `Daily Sesh #${dailyNum()}`;
  $('#dailySub').textContent = dres ? `Done today: ${fmtN(dres.score)} points, ${dres.found}/${dres.of} found.` : `Strain of the day: ${dailyStrain()}. ${dailyScene().name}, Baked. Same pile for everyone.`;
  $('#dailyLbl').textContent = dres ? 'Daily done ✓' : `Daily Sesh #${dailyNum()}`;
  $('#streak').textContent = streak.n > 1 ? `${streak.n}-day streak` : '';
  $('#playName').textContent = nextScene().name; $('#buyBtn').hidden = full;
  $('#chapters').innerHTML = CHAPTERS.map(c => {
    const list = allScenesFor(c.n), got = list.reduce((a, s) => a + ((progress[pkey(s.id, diffKey)] || {}).stars || 0), 0), open = chUnlocked(c.n), pay = list.every(paywalled);
    return `<section class="chapter"><div class="ch-head"><h2><small>Chapter ${c.n}</small>${esc(c.name)}</h2><span>${pay ? 'Full game · $1' : open ? `${DIFF[diffKey].label} · ${got} / ${list.length * 3} stars` : `Locked · earn ${c.need} ★ total (you have ${ts})`}</span></div>
      <div class="shelf">${list.map(s => tileHTML(s)).join('')}</div></section>`;
  }).join('');
  $('#mineShelf').innerHTML = `<button class="newtile" id="newArt"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>New artscape</button>` +
    mine.map(s => tileHTML(s, `<span class="del" data-del="${esc(s.id)}" role="button" aria-label="Delete ${esc(s.name)}"><svg class="i" viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M6 6l12 12M18 6L6 18"/></svg></span>`)).join('');
  paintThumbs();
}
let thumbJob = 0;
function paintThumbs() {
  const job = ++thumbJob, cvs = $$('[data-th]'); let i = 0;
  (function paint() {
    if (job !== thumbJob || home.hidden) return; const cv = cvs[i]; if (!cv) return;
    const s = findScene(cv.dataset.th); i++;
    if (!s) return setTimeout(paint, 16);
    ensureTex(s.surface, 'md').then(() => { if (job !== thumbJob || !cv.isConnected) return; const r = cv.getBoundingClientRect(), k = Math.min(2, DPR), w = Math.max(260, r.width), h = Math.max(160, r.height);
      renderFlat(cv, s, buildLayout(s, DIFF.chill, w / h, hashStr(s.id) + 7, { noTargets: true }), w * k, h * k, hashStr(s.id)); setTimeout(paint, 16); });
  })();
}
function paintHero() {
  const cv = $('#heroCv'), r = $('#hero').getBoundingClientRect(), k = Math.min(2, DPR), s = { surface: 'walnut', pool: SCENES[0].pool };
  renderFlat(cv, s, buildLayout(s, { ...DIFF.baked, scale: .95 }, r.width / r.height, 4242, { noTargets: true }), r.width * k, r.height * k, 11);
}
const findScene = id => SCENES.find(s => s.id === id) || mine.map(customScene).find(s => s.id === id);
$('#seg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; diffKey = b.dataset.d; store.set('diff', diffKey); renderHome(); });
document.addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) { e.stopPropagation(); const id = del.dataset.del; if (del.dataset.armed) { mine = mine.filter(m => m.id !== id); store.set('mine', mine); renderHome(); } else { del.dataset.armed = '1'; del.style.background = '#ff5a5f'; del.style.color = '#fff'; toast('Tap the X again to delete it.'); } return; }
  const t = e.target.closest('.tile[data-sid]'); if (t && !home.hidden) { const s = findScene(t.dataset.sid); if (!s) return; if (paywalled(s)) { openBuy(s.name); return; } if (s.ch && !chUnlocked(s.ch)) { toast(`Earn ${CHAPTERS.find(c => c.n === s.ch).need} stars to unlock Chapter ${s.ch}.`); return; } startGame(s, diffKey); }
  if (e.target.closest('#newArt')) { if (!full) return openBuy('The Artscape Studio'); openStudio(null); }
});
$('#playBtn').addEventListener('click', () => startGame(nextScene(), diffKey));
$('#dailyBtn').addEventListener('click', () => full ? startGame(dailyScene(), 'baked', true) : openBuy('The Daily Sesh'));
$('#studioBtn').addEventListener('click', () => full ? openStudio(null) : openBuy('The Artscape Studio'));
$('#buyBtn').addEventListener('click', () => openBuy());
$('#gateYes').addEventListener('click', () => { store.set('age21', true); $('#gate').hidden = true; });
$('#gateNo').addEventListener('click', () => { $('#gateMsg').hidden = false; });

// drifting smoke over the hero
(function smoke() {
  const cv = $('#smoke'), ctx = cv.getContext('2d'), hero = $('#hero'); let W = 0, H = 0, P = [];
  const puff = () => ({ x: Math.random() * W, y: H + 60, r: 60 + Math.random() * 120, vx: (Math.random() - .5) * .25, vy: -(.25 + Math.random() * .45), life: 0, max: 500 + Math.random() * 500, rot: Math.random() * 6 });
  function step() {
    if (!home.hidden && !reducedPref) {
      if (cv.width !== Math.round(hero.clientWidth) || cv.height !== Math.round(hero.clientHeight)) { W = hero.clientWidth; H = hero.clientHeight; cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
      if (P.length < 26 && Math.random() < .08) P.push(puff());
      ctx.clearRect(0, 0, W, H); ctx.globalCompositeOperation = 'lighter';
      for (const p of P) { p.life++; p.x += p.vx + Math.sin(p.life * .01 + p.rot) * .25; p.y += p.vy; p.r += .18; const a = Math.sin(Math.PI * Math.min(1, p.life / p.max)) * .07;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, `rgba(235,225,240,${a})`); g.addColorStop(1, 'rgba(235,225,240,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      P = P.filter(p => p.life < p.max); ctx.globalCompositeOperation = 'source-over';
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

/* ================================================================== game */
const view = $('#view'), world = $('#world'), cv = $('#cv'), bgc = $('#bgc'), fx = $('#fx'), dark = $('#dark');
const S = { running: false, z: 1, tx: 0, ty: 0, W: 0, H: 0 };
if (/[?&]debug\b/.test(location.search)) { window.__S = S; window.__G = { startGame, findScene, openStudio, DIFF, scenes: () => SCENES }; }
const thumbPx = () => matchMedia('(max-width: 860px)').matches ? 32 : 40;
function boardId(scene, dk, daily) { return daily ? 'daily-' + todayKey() : scene.custom ? null : `${scene.id}-${dk}`; }

function startGame(scene, dk, daily = false) {
  const cfg = DIFF[dk];
  closeSheets(); home.hidden = true; game.hidden = false; $('#endOv').hidden = true;
  const seed = daily ? dailySeed() : (Math.random() * 2 ** 32) >>> 0;
  Object.assign(S, { scene, cfg, dk, daily, seed, found: new Set(), misses: 0, hintsUsed: 0, hintsLeft: cfg.hints, hintFor: {}, score: 0, shown: 0, combo: 0, maxCombo: 0,
    lastFind: 0, comboBonus: 0, elapsed: 0, timeLeft: cfg.time * 1000, running: false, over: false, penalty: 0, board: boardId(scene, dk, daily) });
  $('#score').textContent = '0'; $('#gName').textContent = scene.name;
  $('#gSub').textContent = (daily ? `Daily Sesh #${dailyNum()} · ${dailyStrain()} · ` : scene.custom ? 'Your artscape · ' : '') + cfg.label;
  $('#ispySub').textContent = cfg.show === 'clue' ? 'Riddle clues only. Names appear when you find them.' : cfg.show === 'name' ? 'Names only. Pictures appear when you find them.' : 'Find these in the pile.';
  $('#tips').textContent = scene.dark ? 'Lights out: move your mouse or finger to aim the flashlight. Tap what you spy.' : 'Scroll or pinch to zoom, drag to look around. Keys: H hint, + and − zoom, 0 whole picture.';
  document.title = scene.name + ' · High Spy';
  $('#finds').innerHTML = Array.from({ length: cfg.n }, () => `<li class="find ${cfg.show === 'clue' ? 'clue' : ''}" style="visibility:hidden"><span class="th"></span><span class="wd">${cfg.show === 'clue' ? 'A wiggly pink and yellow candy for you' : 'placeholder'}</span></li>`).join('');
  const vw = view.clientWidth, vh = view.clientHeight;
  S.A = clamp(vw / Math.max(1, vh), .5, 2.2);
  const W0 = Math.min(vw, vh * S.A), H0 = W0 / S.A, ox = (vw - W0) / 2, oy = (vh - H0) / 2, Wv = 100 * Math.sqrt(S.A), Hv = 100 / Math.sqrt(S.A);
  const toV = (x0, y0, x1, y1) => [(x0 - ox) / W0 * Wv, (y0 - oy) / H0 * Hv, (x1 - ox) / W0 * Wv, (y1 - oy) / H0 * Hv];
  Object.assign(S, buildLayout(scene, cfg, S.A, seed, { avoid: [toV(vw - 74, vh - 180, vw, vh), toV(0, vh - 54, 70, vh)] }));
  renderList(); fx.textContent = '';
  bgc.className = 'bgc' + (fxOn && scene.fx ? ' fx-' + scene.fx : '');
  dark.hidden = !scene.dark; if (scene.dark) { const r = Math.round(clamp(Math.min(vw, vh) * .2, 85, 170)); dark.style.setProperty('--lr', r + 'px'); setLight(vw / 2, vh / 2); }
  fit(true); updateHud();
  const busy = $('#busy'); busy.hidden = false; const token = S.token = {};
  const texReady = ensureTex(scene.surface);
  requestAnimationFrame(() => setTimeout(() => texReady.then(() => { if (S.token !== token) return; paintScene(); busy.hidden = true; countdown(token); }), 30));
  stats.played[scene.id] = 1; saveStats();
  if (musicOn) Music.start();
}
function renderList() {
  const cfg = S.cfg;
  $('#finds').innerHTML = S.targets.map(t => {
    const sp = SPR[t.g], label = `<span class="wd">${esc(cfg.show === 'clue' ? sp.c : sp.n)}</span>`, th = cfg.show === 'pic' ? `<span class="spr" style="${spriteCSS(t.g, thumbPx())}"></span>` : `<span class="q">?</span>`;
    return `<li class="find ${cfg.show === 'clue' ? 'clue' : ''}" data-id="${t.t}"><span class="th">${th}</span>${label}<span class="ck"><svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span></li>`;
  }).join('');
}
function countdown(token) {
  const intro = $('#intro'), big = $('#introBig'), sub = $('#introSub');
  intro.hidden = false; sub.textContent = `Find ${S.targets.length} things`;
  const steps = ['4', '2', '0', 'High Spy!']; let k = 0;
  const next = () => { if (S.token !== token) return;
    if (k >= steps.length) { intro.hidden = true; S.running = true; S.last = performance.now(); return; }
    big.textContent = steps[k]; big.classList.toggle('word', k === 3); big.style.animation = 'none'; void big.offsetWidth; big.style.animation = ''; sfx.count(k < 3 ? 1 : 0); k++; setTimeout(next, k === steps.length ? 520 : 600); };
  next();
}
function fit(reset) {
  const vw = view.clientWidth, vh = view.clientHeight; let W = Math.min(vw, vh * S.A), H = W / S.A; const changed = Math.abs(W - S.W) > 1 || Math.abs(H - S.H) > 1;
  if (reset) S.z = 1; else if (changed && S.W) { const cx = (vw / 2 - S.tx) / (S.W * S.z), cy = (vh / 2 - S.ty) / (S.H * S.z); S.W = W; S.H = H; S.tx = vw / 2 - cx * W * S.z; S.ty = vh / 2 - cy * H * S.z; }
  S.W = W; S.H = H; world.style.width = W + 'px'; world.style.height = H + 'px'; world.style.setProperty('--u', (W / S.Wv).toFixed(4) + 'px');
  if (reset) { S.tx = (vw - W) / 2; S.ty = (vh - H) / 2; } apply(); return changed;
}
function paintScene() {
  const budget = SMALL ? 9e6 : 16e6, px = S.W * S.H * DPR * DPR, R = Math.min(2.6, Math.sqrt(budget / px)), w = Math.round(S.W * DPR * R), h = Math.round(S.H * DPR * R);
  cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.clearRect(0, 0, w, h); drawItems(ctx, S, w / S.Wv);
  const tw = Math.min(w, SMALL ? 1600 : 2600), th = Math.round(tw * h / w); bgc.width = tw; bgc.height = th;
  const b = bgc.getContext('2d'); b.drawImage(makeSurface(S.scene.surface, tw, th, S.seed), 0, 0);
}
let repaintTimer;
const onResize = () => { if (game.hidden || !S.scene) return; if (fit(false)) { clearTimeout(repaintTimer); repaintTimer = setTimeout(paintScene, 220); } };
window.addEventListener('resize', onResize);
if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(view);

const ZMAX = 5;
function clampT() { const vw = view.clientWidth, vh = view.clientHeight, ww = S.W * S.z, wh = S.H * S.z; S.tx = ww <= vw ? (vw - ww) / 2 : clamp(S.tx, vw - ww, 0); S.ty = wh <= vh ? (vh - wh) / 2 : clamp(S.ty, vh - wh, 0); }
function apply() {
  clampT(); world.style.transform = `translate3d(${S.tx}px,${S.ty}px,0) scale(${S.z})`; world.style.setProperty('--z', S.z.toFixed(3));
  view.classList.toggle('zoomed', S.z > 1.01); $('#zlevel').textContent = (Math.round(S.z * 10) / 10) + '×';
  $('#zIn').disabled = S.z >= ZMAX - .01; $('#zOut').disabled = $('#zFit').disabled = S.z <= 1.01;
}
function zoomAt(nz, px, py) { nz = clamp(nz, 1, ZMAX); const k = nz / S.z; S.tx = px - (px - S.tx) * k; S.ty = py - (py - S.ty) * k; S.z = nz; apply(); }
let tween = 0;
function animateTo(z, tx, ty, ms = 260) { cancelAnimationFrame(tween); const z0 = S.z, x0 = S.tx, y0 = S.ty, t0 = performance.now();
  const step = now => { const t = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - t, 3); S.z = z0 + (z - z0) * e; S.tx = x0 + (tx - x0) * e; S.ty = y0 + (ty - y0) * e; apply(); if (t < 1) tween = requestAnimationFrame(step); }; tween = requestAnimationFrame(step); }
function zoomBy(f) { const vw = view.clientWidth, vh = view.clientHeight, nz = clamp(S.z * f, 1, ZMAX), k = nz / S.z; animateTo(nz, vw / 2 - (vw / 2 - S.tx) * k, vh / 2 - (vh / 2 - S.ty) * k); }
function centerOn(vx, vy, z) { const vw = view.clientWidth, vh = view.clientHeight; animateTo(z, vw / 2 - vx / S.Wv * S.W * z, vh / 2 - vy / S.Hv * S.H * z, 420); }
$('#zIn').addEventListener('click', () => zoomBy(1.7)); $('#zOut').addEventListener('click', () => zoomBy(1 / 1.7));
$('#zFit').addEventListener('click', () => animateTo(1, (view.clientWidth - S.W) / 2, (view.clientHeight - S.H) / 2));
view.addEventListener('wheel', e => { e.preventDefault(); cancelAnimationFrame(tween); const r = view.getBoundingClientRect(), dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1); zoomAt(S.z * Math.exp(-dy * (e.ctrlKey ? .012 : .0022)), e.clientX - r.left, e.clientY - r.top); }, { passive: false });

function setLight(x, y) { dark.style.setProperty('--lx', x + 'px'); dark.style.setProperty('--ly', y + 'px'); S.lx = x; S.ly = y; }
const ptrs = new Map(); let gest = null;
view.addEventListener('pointerdown', e => {
  if (e.target.closest('.zoomctl') || (e.pointerType === 'mouse' && e.button !== 0)) return;
  cancelAnimationFrame(tween); try { view.setPointerCapture(e.pointerId); } catch (_) {}
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (S.scene && S.scene.dark) { const r = view.getBoundingClientRect(); setLight(e.clientX - r.left, e.clientY - r.top); }
  if (ptrs.size === 1) gest = { type: 'tap', sx: e.clientX, sy: e.clientY, tx: S.tx, ty: S.ty, kind: e.pointerType };
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], r = view.getBoundingClientRect(); gest = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: S.z, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top, tx0: S.tx, ty0: S.ty }; }
});
view.addEventListener('pointermove', e => {
  if (S.scene && S.scene.dark && (e.pointerType === 'mouse' || ptrs.has(e.pointerId))) { const r = view.getBoundingClientRect(); setLight(e.clientX - r.left, e.clientY - r.top); }
  if (!ptrs.has(e.pointerId) || !gest) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gest.type === 'pinch' && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], r = view.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top, nz = clamp(gest.z0 * d / gest.d0, 1, ZMAX), k = nz / gest.z0;
    S.z = nz; S.tx = mx - (gest.mx - gest.tx0) * k; S.ty = my - (gest.my - gest.ty0) * k; apply(); }
  else if (gest.type === 'tap' || gest.type === 'pan') { const dx = e.clientX - gest.sx, dy = e.clientY - gest.sy;
    if (gest.type === 'tap' && Math.hypot(dx, dy) > (gest.kind === 'mouse' ? 5 : 10)) { gest.type = 'pan'; view.classList.add('dragging'); }
    if (gest.type === 'pan') { S.tx = gest.tx + dx; S.ty = gest.ty + dy; apply(); } }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (gest && gest.type === 'tap' && e.type === 'pointerup' && ptrs.size === 0) tap(e.clientX, e.clientY, gest.kind);
  if (ptrs.size === 0) { gest = null; view.classList.remove('dragging'); }
  else if (ptrs.size === 1 && gest && gest.type === 'pinch') { const p = [...ptrs.values()][0]; gest = { type: 'pan', sx: p.x, sy: p.y, tx: S.tx, ty: S.ty, kind: 'touch' }; }
}
view.addEventListener('pointerup', endPtr); view.addEventListener('pointercancel', endPtr);

function onTarget(t, vx, vy, tol) {
  const MS = DATA.mask, dx = vx - t.x, dy = vy - t.y, d = Math.hypot(dx, dy);
  if (d < t.s * .12 + tol) return d; if (d > t.s * .75 + tol) return -1;
  const a = t.r * Math.PI / 180; let lx = dx * Math.cos(a) + dy * Math.sin(a); const ly = -dx * Math.sin(a) + dy * Math.cos(a); if (t.flip) lx = -lx;
  const u = Math.floor((lx / t.s + .5) * MS), v = Math.floor((ly / t.s + .5) * MS), pad = Math.ceil(tol / t.s * MS), mk = MASKS[t.g];
  for (let y = v - pad; y <= v + pad; y++) for (let x = u - pad; x <= u + pad; x++) if (x >= 0 && y >= 0 && x < MS && y < MS && mk[y * MS + x]) return d;
  return -1;
}
function tap(cx, cy, kind) {
  if (!S.running) return;
  const r = view.getBoundingClientRect(), wx = (cx - r.left - S.tx) / S.z, wy = (cy - r.top - S.ty) / S.z;
  if (wx < 0 || wy < 0 || wx > S.W || wy > S.H) return;
  const vx = wx / S.W * S.Wv, vy = wy / S.H * S.Hv, tol = (kind === 'mouse' ? 3 : 10) / (S.W / S.Wv * S.z);
  let best = null, bd = Infinity;
  for (const t of S.targets) { if (S.found.has(t.t)) continue; const d = onTarget(t, vx, vy, tol); if (d >= 0 && d < bd) { best = t; bd = d; } }
  if (best) found(best); else miss(vx, vy);
}
function addFx(cls, x, y, css) { const el = document.createElement('div'); el.className = cls; el.style.cssText = `left:${pct(x, S.Wv)};top:${pct(y, S.Hv)};` + (css || ''); fx.appendChild(el); return el; }
const COMBO_MS = 6000;
function found(t) {
  const now = performance.now();
  S.combo = (S.lastFind && now - S.lastFind <= COMBO_MS) ? Math.min(5, S.combo + 1) : 1; S.lastFind = now; S.maxCombo = Math.max(S.maxCombo, S.combo);
  const pts = S.cfg.base * S.combo; S.score += pts; if (S.combo > 1) S.comboBonus += pts - S.cfg.base;
  if (S.cfg.time) S.timeLeft += S.cfg.addT * 1000;
  S.found.add(t.t);
  stats.finds++; stats.fam[t.t] = (stats.fam[t.t] || 0) + 1; saveStats();
  if (t.t === 'gardenweed') unlock('wrongweed');
  if (S.combo >= 3) unlock('combo3'); if (S.combo >= 5) unlock('combo5');
  fx.querySelectorAll(`.hint[data-t="${t.t}"]`).forEach(h => h.remove());
  addFx('ring', t.x, t.y, `width:calc(var(--u) * ${(t.rr * 2.25).toFixed(2)})`);
  addFx('spr pop', t.x, t.y, `--r:${t.r.toFixed(1)}deg;` + (t.flip ? 'scale:-1 1;' : '') + spriteCSS(t.g, `calc(var(--u) * ${t.s.toFixed(3)})`));
  const g = addFx('gain', t.x, t.y - t.s * .55); g.innerHTML = `<b>+${pts}</b>` + (S.combo > 1 ? `<span>${COMBO_WORD[S.combo]} ×${S.combo}</span>` : ''); setTimeout(() => g.remove(), 1150);
  if (!reducedPref) for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, dd = t.s * (.9 + Math.random() * .6); const sp = addFx('spark', t.x, t.y, `--dx:calc(var(--u) * ${(Math.cos(a) * dd).toFixed(2)});--dy:calc(var(--u) * ${(Math.sin(a) * dd).toFixed(2)})`); setTimeout(() => sp.remove(), 850); }
  sfx.found(S.combo); buzz(25);
  const li = document.querySelector(`.find[data-id="${t.t}"]`);
  if (li) { li.classList.add('got'); li.querySelector('.th').innerHTML = `<span class="spr" style="${spriteCSS(t.g, thumbPx())}"></span>`;
    if (S.cfg.show === 'clue') li.querySelector('.wd').innerHTML = `${esc(SPR[t.g].n)}<em>${esc(SPR[t.g].c)}</em>`;
    li.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedPref ? 'auto' : 'smooth' }); }
  updateHud();
  if (S.found.size === S.targets.length) finish(true);
}
function miss(x, y) {
  S.misses++; S.score = Math.max(0, S.score - 25); S.penalty += 25; S.combo = 0; S.lastFind = 0; stats.misses++;
  if (S.cfg.time) S.timeLeft -= S.cfg.missT * 1000;
  const m = addFx('miss', x, y); setTimeout(() => m.remove(), 750);
  const g = addFx('gain neg', x, y - 3); g.innerHTML = `<b>−25${S.cfg.time ? ` · −${S.cfg.missT}s` : ''}</b>`; setTimeout(() => g.remove(), 1150);
  sfx.miss(); buzz([30, 40, 30]); updateHud();
}
function useHint() {
  if (!S.running || S.hintsLeft <= 0) return;
  const left = S.targets.filter(t => !S.found.has(t.t)); if (!left.length) return;
  const t = left.find(q => S.hintFor[q.t]) || left[(Math.random() * left.length) | 0], n = (S.hintFor[t.t] = (S.hintFor[t.t] || 0) + 1);
  S.hintsUsed++; S.hintsLeft--; stats.hints++; const cost = S.dk === 'chill' ? 50 : 150; S.score = Math.max(0, S.score - cost); S.penalty += cost; S.combo = 0; S.lastFind = 0;
  const R = t.rr * (n === 1 ? 3 : n === 2 ? 2 : 1.3), off = n === 1 ? Math.random() * R * .45 : n === 2 ? Math.random() * R * .25 : 0, a = Math.random() * Math.PI * 2;
  const cx = clamp(t.x + Math.cos(a) * off, 0, S.Wv), cy = clamp(t.y + Math.sin(a) * off, 0, S.Hv);
  fx.querySelectorAll('.hint').forEach(h => h.remove());
  const h = addFx('hint', cx, cy, `width:calc(var(--u) * ${(R * 2).toFixed(2)})`); h.dataset.t = t.t; setTimeout(() => h.remove(), 4300);
  const px = S.tx + cx / S.Wv * S.W * S.z, py = S.ty + cy / S.Hv * S.H * S.z;
  if (S.z > 1.01) { const vw = view.clientWidth, vh = view.clientHeight; if (px < 40 || py < 40 || px > vw - 40 || py > vh - 40) centerOn(cx, cy, S.z); }
  if (S.scene.dark) setLight(px, py);
  toast(S.cfg.show === 'clue' ? `Look inside the circle: "${SPR[t.g].c}"` : `Look inside the circle for the ${SPR[t.g].n}.`, py < view.clientHeight / 2);
  sfx.hint(); updateHud();
}
$('#hintBtn').addEventListener('click', useHint); $('#hintBtn2').addEventListener('click', useHint);
function updateHud() {
  const n = S.targets.length, f = S.found.size;
  $('#pfill').style.width = (f / n * 100) + '%'; $('#pcount').textContent = `${f} of ${n}`;
  $('#hintLeft').textContent = S.hintsLeft > 20 ? `(−${S.dk === 'chill' ? 50 : 150} pts)` : `${S.hintsLeft} left`; $('#hintLeft2').textContent = S.hintsLeft > 20 ? '' : S.hintsLeft;
  $('#hintBtn').disabled = $('#hintBtn2').disabled = S.hintsLeft <= 0;
  $('#sndIcon').innerHTML = sfxOn ? SND_ON : SND_OFF; $('#soundBtn').setAttribute('aria-label', sfxOn ? 'Sound on' : 'Sound off');
  $('#musIcon').innerHTML = musicOn ? MUS_ON : MUS_OFF; $('#musicBtn').setAttribute('aria-label', musicOn ? 'Music on' : 'Music off');
  drawClock();
}
function drawClock() { const timed = !!S.cfg.time; $('#timer').textContent = fmt(timed ? S.timeLeft : S.elapsed); $('#clock').classList.toggle('low', timed && S.running && S.timeLeft <= 10000); }
$('#soundBtn').addEventListener('click', () => { sfxOn = !sfxOn; store.set('muted', !sfxOn); updateHud(); if (sfxOn) sfx.hint(); });
$('#musicBtn').addEventListener('click', () => { musicOn = !musicOn; store.set('music', musicOn); musicOn ? Music.start() : Music.stop(); updateHud(); });

let lastTick = 0;
(function loop(now) {
  if (!game.hidden && S.scene) {
    const dt = now - (S.last || now); S.last = now;
    if (S.running && !document.hidden) {
      S.elapsed += dt;
      if (S.cfg.time) { S.timeLeft -= dt; const sec = Math.ceil(S.timeLeft / 1000); if (S.timeLeft <= 10000 && sec !== lastTick && sec > 0) { lastTick = sec; sfx.tick(); } if (S.timeLeft <= 0) { S.timeLeft = 0; finish(false); } }
      drawClock();
    }
    if (S.shown !== S.score) { S.shown += (S.score - S.shown) * .2; if (Math.abs(S.score - S.shown) < 1) S.shown = S.score; $('#score').textContent = fmtN(S.shown); }
    const c = $('#combo'), left = S.lastFind ? Math.max(0, COMBO_MS - (now - S.lastFind)) : 0, on = S.running && left > 0 && S.combo >= 1 && S.found.size < S.targets.length;
    c.classList.toggle('on', on); $('#comboX').textContent = '×' + (on ? Math.min(5, S.combo + 1) : 1); $('#comboBar').style.width = (on ? left / COMBO_MS * 100 : 0) + '%';
  }
  requestAnimationFrame(loop);
})(performance.now());

/* ================================================================== end of round + high scores */
const PRAISE = ['Nailed it!', 'Eagle eyes!', 'Sharp, even lifted.', 'Spy level: high.', 'Smooth.', 'Far out!', 'Dank work!', 'Top shelf spotting!', 'Blazed right through it!', 'That was fire.', 'Certified kush.', 'Highly skilled.'];
const LOSE = ['Up in smoke!', 'Time\'s up!', 'Got too baked.', 'Smoked out!'];
const API = CFG.api || '/api/scores';
const localBoard = b => store.get('lb:' + b, []);
function pushLocal(b, entry) { const l = localBoard(b); l.push(entry); l.sort((x, y) => y.s - x.s || x.t - y.t); store.set('lb:' + b, l.slice(0, 10)); return l.indexOf(entry) + 1; }
async function fetchBoard(b) { if (!b) return null; try { const r = await fetch(API + '?board=' + encodeURIComponent(b), { cache: 'no-store' }); if (!r.ok) return null; const j = await r.json(); return Array.isArray(j.top) ? j.top : null; } catch (e) { return null; } }
async function postScore(b, initials, score) { try { const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ board: b, initials, score }) }); const j = await r.json(); return r.ok ? j : { error: j.error || 'Could not save' }; } catch (e) { return { error: 'offline' }; } }
function lbHTML(list, me) { if (!list || !list.length) return '<li class="empty">No scores yet. Be the first.</li>';
  return list.map((x, i) => `<li class="${me && x.s === me.s && x.i === me.i && (!me.t || Math.abs((x.t || 0) - me.t) < 5000) ? 'me' : ''}"><span class="r">${i + 1}</span><span class="n">${esc(x.i)}</span><span class="s">${fmtN(x.s)}</span></li>`).join(''); }

function finish(won) {
  if (S.over) return; S.over = true; S.running = false;
  const cfg = S.cfg, timeBonus = won ? (cfg.time ? Math.round(S.timeLeft / 1000) * 15 : Math.max(0, 240 - Math.round(S.elapsed / 1000)) * 5) : 0;
  S.score += timeBonus;
  const stars = !won ? 0 : (S.hintsUsed === 0 && S.misses <= 3) ? 3 : (S.hintsUsed <= 1 && S.misses <= 7) ? 2 : 1;
  const key = pkey(S.scene.id, S.dk), prev = progress[key] || {}, newBest = S.score > (prev.best || 0), before = totalStars();
  stats.games++; if (won) stats.wins++; stats.bestCombo = Math.max(stats.bestCombo, S.maxCombo); stats.bestScore = Math.max(stats.bestScore, S.score); if (won && !S.misses) stats.perfect++; saveStats();
  if (!S.daily) { progress[key] = { stars: Math.max(stars, prev.stars || 0), best: Math.max(S.score, prev.best || 0) }; store.set('progress', progress); }
  else { store.set('daily:' + todayKey(), { score: S.score, found: S.found.size, of: S.targets.length, stars });
    const st = store.get('streak', { n: 0, last: '' }), yk = dateKey(new Date(Date.now() - 864e5));
    if (st.last !== todayKey()) { const nn = st.last === yk ? st.n + 1 : 1; store.set('streak', { n: nn, last: todayKey() }); if (nn >= 3) unlock('streak3'); } if (won) unlock('daily'); }
  // trophies
  if (won) { unlock('first'); if (!S.misses) unlock('perfect'); if (S.dk === 'blazed' && !S.hintsUsed) unlock('riddler'); if (cfg.time && S.timeLeft >= 60000) unlock('speed'); if (cfg.time && S.timeLeft <= 3000) unlock('clutch');
    if (S.dk === 'blazed' && stars === 3) unlock('lifted'); const id = S.scene.id; if (id === 'lightsout') unlock('night'); if (id === 'greenroom') unlock('camo'); if (id === 'mirror') unlock('twins'); if (id === 'cosmic') unlock('cosmic'); if (id === 'vortex') unlock('express'); if (id === 'desk' && S.dk === 'blazed') unlock('grandpa');
    const d = new Date(); if ((d.getHours() === 4 || d.getHours() === 16) && d.getMinutes() === 20) unlock('fourtwenty'); }
  if (S.score >= 10000) unlock('roller'); if (stats.finds >= 100) unlock('spot100'); if (stats.finds >= 500) unlock('spot500');
  if ((stats.fam.lighter || 0) >= 25) unlock('pyro'); if ((stats.fam.bud || 0) >= 42) unlock('buds'); if (S.score % 1000 === 420) unlock('blazeit'); if (Object.entries(stats.fam).reduce((a, [f, n]) => a + (SNACKS.has(f) ? n : 0), 0) >= 50) unlock('munch');
  if (allScenesFor(1).every(s => ['chill', 'baked', 'blazed'].some(d => (progress[pkey(s.id, d)] || {}).stars))) unlock('sesh');
  const after = totalStars(); if (chUnlocked(2)) unlock('hidef'); if (chUnlocked(3)) unlock('wayup'); if (chUnlocked(4)) unlock('lost'); const rk = rankOf(after); if (!rk.next) unlock('supreme');
  const rankUp = rankOf(before).i < rk.i, newCh = CHAPTERS.find(c => before < c.need && after >= c.need);
  setTimeout(() => {
    $('#endStars').innerHTML = [0, 1, 2].map(k => `<span class="${k < stars ? 'on' : ''}" style="animation-delay:${.15 + k * .15}s">★</span>`).join('');
    $('#endTitle').textContent = won ? (S.score % 1000 === 420 ? 'Blaze it!' : PRAISE[(Math.random() * PRAISE.length) | 0]) : LOSE[(Math.random() * LOSE.length) | 0];
    $('#endSub').textContent = `${S.scene.name} · ${cfg.label} · ${S.found.size}/${S.targets.length} found${won ? ' in ' + fmt(S.elapsed) : ''}`;
    $('#endScore').textContent = fmtN(S.score);
    $('#endBadge').innerHTML = newCh ? `<span class="badge">Chapter ${newCh.n} unlocked: ${esc(newCh.name)}!</span>` : rankUp ? `<span class="badge">Rank up: ${rk.name}!</span>` : (newBest && !S.daily && S.score > 0 ? '<span class="badge">New best score</span>' : '');
    $('#endBreak').innerHTML = `<div>Finds (${S.found.size} × ${cfg.base})<b>${fmtN(S.found.size * cfg.base)}</b></div><div>Combo bonus<b>+${fmtN(S.comboBonus)}</b></div>` +
      `<div>${cfg.time ? 'Time left bonus' : 'Speed bonus'}<b>+${fmtN(timeBonus)}</b></div><div>Misses and hints<b>−${fmtN(S.penalty)}</b></div>`;
    $('#endRank').textContent = rk.name + ` · ${after} ★`; $('#endRankNext').textContent = rk.next ? `${rk.next - after} to ${rk.nextName}` : 'Top rank';
    $('#endRankBar').style.width = '0%'; setTimeout(() => $('#endRankBar').style.width = (rk.next ? (after - rk.at) / (rk.next - rk.at) * 100 : 100) + '%', 200);
    const p = progress[key] || {};
    const upNext = S.dk !== 'blazed' && p.stars === 3;
    $('#nextBtn').textContent = S.daily || S.scene.custom ? 'Back to menu' : !won ? 'Try again' : upNext ? `Try ${DIFF[S.dk === 'chill' ? 'baked' : 'blazed'].label}` : !full ? 'Unlock every level' : 'Next spot';
    $('#againBtn').textContent = S.daily ? 'Practice this spot' : 'Play again';
    $('#shareBtn').hidden = !S.daily;
    setupInitials(won);
    $('#endOv').hidden = false;
    if (won) { sfx.win(); confetti(); } else sfx.lose();
  }, won ? 850 : 300);
}
function setupInitials(won) {
  const box = $('#initBox'), wrap = $('#endLbWrap'), list = $('#endLb'), b = S.board, lbKey = b || ('u-' + S.scene.id + '-' + S.dk);
  box.hidden = true; wrap.hidden = true; S.saved = null;
  if (!won || S.score <= 0) return;
  const loc = localBoard(lbKey), qLocal = loc.length < 10 || S.score > loc[loc.length - 1].s;
  const show = (glob) => {
    const qGlob = glob && (glob.length < 10 || S.score > glob[glob.length - 1].s);
    if ((qLocal || qGlob) && !S.saved) {
      box.hidden = false; $('#initTitle').textContent = qGlob ? 'You made the worldwide top 10!' : 'New high score!';
      $('#initSub').textContent = qGlob ? 'Put your initials on the board for everyone to see.' : 'Put your initials on this device\'s board.';
      const inp = $('#initIn'); inp.value = store.get('initials', ''); setTimeout(() => { try { inp.focus({ preventScroll: true }); inp.select(); } catch (e) {} }, 400);
    }
    wrap.hidden = false; $('#endLbTitle').textContent = glob ? 'Worldwide top 10' : 'Top 10 on this device'; list.innerHTML = lbHTML(glob || loc);
  };
  show(null);
  if (b) fetchBoard(b).then(glob => { if (!S.saved && glob && !$('#endOv').hidden) show(glob); S.glob = glob; });
  $('#initSave').onclick = async () => {
    const inp = $('#initIn'), ini = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    if (ini.length !== 3) { toast('Three letters or numbers, like ACE.'); inp.focus(); return; }
    store.set('initials', ini); const entry = { i: ini, s: S.score, t: Date.now() }; S.saved = entry;
    pushLocal(lbKey, entry); box.hidden = true; unlock('fame'); stats.initials++; saveStats();
    if (b) { const r = await postScore(b, ini, S.score);
      if (r && r.top) { list.innerHTML = lbHTML(r.top, entry); $('#endLbTitle').textContent = r.rank && r.rank <= 10 ? `Worldwide: you're #${r.rank}!` : 'Worldwide top 10'; }
      else { list.innerHTML = lbHTML(localBoard(lbKey), entry); $('#endLbTitle').textContent = r && r.error && r.error !== 'offline' ? r.error : 'Saved on this device'; } }
    else { list.innerHTML = lbHTML(localBoard(lbKey), entry); $('#endLbTitle').textContent = 'Top 10 on this device'; }
  };
  $('#initIn').onkeydown = e => { if (e.key === 'Enter') $('#initSave').click(); e.stopPropagation(); };
  $('#initIn').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); };
}
$('#againBtn').addEventListener('click', () => startGame(S.scene, S.daily ? 'baked' : S.dk));
$('#nextBtn').addEventListener('click', () => {
  if (S.daily || S.scene.custom) return goHome();
  const won = S.found.size === S.targets.length; if (!won) return startGame(S.scene, S.dk);
  const p = progress[pkey(S.scene.id, S.dk)] || {};
  if (S.dk !== 'blazed' && p.stars === 3) { diffKey = S.dk === 'chill' ? 'baked' : 'blazed'; store.set('diff', diffKey); return startGame(S.scene, diffKey); }
  const i = SCENES.indexOf(S.scene); let nx = SCENES[(i + 1) % SCENES.length]; if (paywalled(nx)) return openBuy(); if (nx.ch && !chUnlocked(nx.ch)) nx = SCENES[0];
  startGame(nx, S.dk);
});
$('#menuBtn').addEventListener('click', goHome); $('#backBtn').addEventListener('click', goHome);
$('#shareBtn').addEventListener('click', async () => { const d = store.get('daily:' + todayKey(), null); if (!d) return;
  copyText(`High Spy Daily #${dailyNum()} (${dailyStrain()}): ${d.found}/${d.of} found, ${fmtN(d.score)} pts ${'★'.repeat(d.stars)}${'☆'.repeat(3 - d.stars)}\n${SHARE}/`, 'Copied. Go flex on your friends.'); });
function goHome() { S.running = false; S.token = null; game.hidden = true; $('#endOv').hidden = true; closeSheets(); home.hidden = false; document.title = 'High Spy'; Music.stop(); renderHome(); }
async function copyText(txt, ok) { try { await navigator.clipboard.writeText(txt); toast(ok); } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(ok); } catch (_) { toast('Copy this: ' + txt); } ta.remove(); } }

/* ================================================================== studio (make your own artscape) */
const ST = { id: null, name: '', surface: 'mandala', style: 'kaleido', groups: ['gear', 'cosmic'], density: 1, fx: 'hue', dark: 0, seed: 1 };
function customScene(c) {
  const style = c.style || 'scatter', layout = style === 'mirror' ? 'kaleido' : style;
  let pool = []; (c.groups && c.groups.length ? c.groups : ['gear']).forEach(g => pool.push(...(DATA.groups[g] || [])));
  const fams = new Set(pool.map(g => SPR[g].f)); if (fams.size < 12) pool.push(...DATA.groups.gear, ...DATA.groups.munchies);
  pool = [...new Set(pool)];
  const leaf = SPR.map((s, g) => s.f === 'leaf' ? g : -1).filter(g => g >= 0);
  const scene = { id: c.id || 'u-preview', custom: true, name: c.name || 'Untitled artscape', surface: c.surface, layout, sym: style === 'mirror' ? 8 : 6, flip: style === 'mirror', fx: c.fx || '', dark: !!c.dark, density: c.density == null ? 1 : c.density, pool, blurb: 'Your own artscape.', seed: c.seed };
  if (layout === 'camo') { for (let i = 0; i < 6; i++) scene.pool = scene.pool.concat(leaf); scene.noTarget = ['leaf']; }
  return scene;
}
function openStudio(c) {
  Object.assign(ST, c ? { ...c } : { id: null, name: '', surface: 'mandala', style: 'kaleido', groups: ['gear', 'cosmic'], density: 1, fx: 'hue', dark: 0, seed: (Math.random() * 1e9) | 0 });
  home.hidden = true; $('#studio').hidden = false; $('#studio').scrollTop = 0;
  $('#stName').value = ST.name; $('#stName').placeholder = ST.sugg = ART_NAMES[(Math.random() * ART_NAMES.length) | 0]; $('#stDensity').value = ST.density;
  $('#stSurface').innerHTML = SURFACES.map(([k, l]) => `<button data-v="${k}" aria-pressed="${ST.surface === k}"><canvas width="168" height="112" data-sw="${k}"></canvas><span>${l}</span></button>`).join('');
  $('#stLayout').innerHTML = STYLES.map(([k, l]) => `<button data-v="${k}" aria-pressed="${ST.style === k}">${l}</button>`).join('');
  $('#stGroups').innerHTML = GROUPS.map(([k, l]) => `<button data-v="${k}" aria-pressed="${ST.groups.includes(k)}">${l}</button>`).join('');
  $('#stFx').innerHTML = FXS.map(([k, l]) => `<button data-v="${k}" aria-pressed="${ST.fx === k}">${l}</button>`).join('');
  $$('#stDark button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === ST.dark)));
  let i = 0; const sws = $$('[data-sw]'); (function sw() { const c2 = sws[i++]; if (!c2 || $('#studio').hidden) return; ensureTex(c2.dataset.sw, 'md').then(() => { c2.getContext('2d').drawImage(makeSurface(c2.dataset.sw, 336, 224, 3), 0, 0, 168, 112); setTimeout(sw, 10); }); })();
  previewStudio();
}
let pvTimer;
function previewStudio() {
  clearTimeout(pvTimer); const want = ST.surface; pvTimer = setTimeout(() => ensureTex(want, 'md').then(() => {
    if (ST.surface !== want) return; const c = $('#pvc'), r = c.getBoundingClientRect(), k = Math.min(2, DPR), sc = customScene(ST);
    $('#pvName').textContent = ST.name || ST.sugg || 'Untitled artscape';
    renderFlat(c, sc, buildLayout(sc, DIFF.baked, r.width / r.height, ST.seed, { noTargets: true }), r.width * k, r.height * k, ST.seed);
    const pv = $('#preview'); pv.querySelector('canvas').className = fxOn && ST.fx ? 'fx-' + ST.fx : '';
  }), 60);
}
function studioPick(sel, key, multi) {
  $(sel).addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.v;
    if (multi) { const s = new Set(ST[key]); s.has(v) ? s.delete(v) : s.add(v); if (!s.size) s.add(v); ST[key] = [...s]; $$(sel + ' button').forEach(x => x.setAttribute('aria-pressed', String(s.has(x.dataset.v)))); }
    else { ST[key] = key === 'dark' ? +v : v; $$(sel + ' button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
    previewStudio(); });
}
studioPick('#stSurface', 'surface'); studioPick('#stLayout', 'style'); studioPick('#stGroups', 'groups', true); studioPick('#stFx', 'fx'); studioPick('#stDark', 'dark');
$('#stName').addEventListener('input', e => { ST.name = e.target.value.slice(0, 24); $('#pvName').textContent = ST.name || ST.sugg || 'Untitled artscape'; });
$('#stDensity').addEventListener('input', e => { ST.density = +e.target.value; previewStudio(); });
$('#stShuffle').addEventListener('click', () => { ST.seed = (Math.random() * 1e9) | 0; previewStudio(); });
function saveArt() { if (!ST.id) ST.id = 'u-' + Date.now().toString(36); const rec = { ...ST, name: ST.name || ST.sugg || 'Untitled artscape' }; delete rec.sugg; const i = mine.findIndex(m => m.id === ST.id); if (i >= 0) mine[i] = rec; else mine.unshift(rec); store.set('mine', mine.slice(0, 30)); unlock('artist'); stats.created++; saveStats(); return rec; }
$('#stSave').addEventListener('click', () => { saveArt(); toast('Saved. It\'s on your home screen under "Made by you".'); });
$('#stPlay').addEventListener('click', () => { const rec = saveArt(); $('#studio').hidden = true; startGame(customScene(rec), diffKey); });
const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
$('#stShare').addEventListener('click', () => { const c = { n: ST.name || ST.sugg || 'Untitled artscape', s: ST.surface, l: ST.style, g: ST.groups, d: ST.density, f: ST.fx, k: ST.dark, e: ST.seed };
  copyText(`${SHARE}/#a=${b64u(JSON.stringify(c))}`, 'Link copied. Send it to a friend.'); unlock('sharer'); stats.shared++; saveStats(); });
$('#studioBack').addEventListener('click', () => { $('#studio').hidden = true; home.hidden = false; renderHome(); });
function checkShared() {
  const m = location.hash.match(/^#a=([\w-]+)/); if (!m) return;
  try { const c = JSON.parse(unb64u(m[1])); const rec = { id: 'u-s' + hashStr(m[1]).toString(36), name: String(c.n || 'Shared artscape').slice(0, 24), surface: SURFACES.some(x => x[0] === c.s) ? c.s : 'mandala',
      style: STYLES.some(x => x[0] === c.l) ? c.l : 'scatter', groups: (Array.isArray(c.g) ? c.g : ['gear']).filter(g => DATA.groups[g]), density: clamp(+c.d || 0, 0, 2) | 0, fx: ['', 'hue', 'breathe'].includes(c.f) ? c.f : '', dark: c.k ? 1 : 0, seed: (+c.e || 1) >>> 0 };
    history.replaceState(null, '', location.pathname + location.search);
    $('#sharedSub').textContent = `"${rec.name}". Play it or remix it in the Studio.`; $('#sharedOv').hidden = false;
    ensureTex(rec.surface, 'md').then(() => { const c2 = $('#sharedCv'), r = c2.getBoundingClientRect(), sc = customScene(rec); renderFlat(c2, sc, buildLayout(sc, DIFF.baked, r.width / r.height, rec.seed, { noTargets: true }), r.width * 2, r.height * 2, rec.seed); });
    $('#sharedPlay').onclick = () => { $('#sharedOv').hidden = true; if (!full) return openBuy('Playing shared artscapes'); if (!mine.some(x => x.id === rec.id)) { mine.unshift(rec); store.set('mine', mine); } startGame(customScene(rec), diffKey); };
    $('#sharedEdit').onclick = () => { $('#sharedOv').hidden = true; if (!full) return openBuy('The Artscape Studio'); openStudio({ ...rec, id: null }); };
    $('#sharedClose').onclick = () => { $('#sharedOv').hidden = true; };
  } catch (e) { console.warn('bad share link', e); }
}

/* ================================================================== trophies, high scores, settings */
function closeSheets() { ['#trophies', '#hof', '#settings', '#studio'].forEach(s => $(s).hidden = true); }
$$('[data-close]').forEach(b => b.addEventListener('click', () => { closeSheets(); home.hidden = false; renderHome(); }));
function openSheet(id) { home.hidden = true; $(id).hidden = false; $(id).scrollTop = 0; }
$('#navTrophies').addEventListener('click', () => {
  const got = ACH.filter(a => ach[a[0]]).length; $('#trophyCount').textContent = `${got} / ${ACH.length}`;
  const st = [[stats.games, 'Rounds played'], [stats.wins, 'Rounds won'], [stats.finds, 'Things found'], [stats.bestCombo ? '×' + stats.bestCombo : '—', 'Best combo'], [fmtN(stats.bestScore), 'Best score'], [totalStars(), 'Stars'], [stats.perfect, 'Perfect rounds'], [stats.fam.bud || 0, 'Buds found']];
  $('#statGrid').innerHTML = st.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('');
  $('#trophyGrid').innerHTML = ACH.map(a => `<div class="trophy ${ach[a[0]] ? 'got' : ''}"><div class="medal">${MEDAL}</div><div><b>${a[1]}</b><span>${a[2]}</span></div></div>`).join('');
  openSheet('#trophies');
});
let hofDiff = 'baked';
async function renderHof() {
  const sid = $('#hofScene').value, b = sid === 'daily' ? 'daily-' + todayKey() : `${sid}-${hofDiff}`;
  $('#hofDiff').style.visibility = sid === 'daily' ? 'hidden' : 'visible';
  $$('#hofDiff button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.d === hofDiff)));
  $('#hofLocal').innerHTML = lbHTML(localBoard(b)); $('#hofGlobal').innerHTML = '<li class="empty">Loading…</li>';
  const g = await fetchBoard(b); $('#hofGlobal').innerHTML = g ? lbHTML(g) : '<li class="empty">Worldwide board is offline right now.</li>';
}
$('#navHof').addEventListener('click', () => {
  $('#hofScene').innerHTML = `<option value="daily">Today's Daily Sesh</option>` + SCENES.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  hofDiff = diffKey; openSheet('#hof'); renderHof();
});
$('#hofScene').addEventListener('change', renderHof);
$('#hofDiff').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; hofDiff = b.dataset.d; renderHof(); });
function setSwitch(id, on) { $(id).setAttribute('aria-pressed', String(on)); }
$('#navSettings').addEventListener('click', () => {
  setSwitch('#setSfx', sfxOn); setSwitch('#setMusic', musicOn); setSwitch('#setFx', fxOn); fullRow();
  const dump = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('highspy:')) dump[k] = localStorage.getItem(k); } } catch (e) {}
  $('#saveCode').value = 'HS1.' + b64u(JSON.stringify(dump)); $('#loadCode').value = ''; openSheet('#settings');
});
$('#setSfx').addEventListener('click', () => { sfxOn = !sfxOn; store.set('muted', !sfxOn); setSwitch('#setSfx', sfxOn); });
$('#setMusic').addEventListener('click', () => { musicOn = !musicOn; store.set('music', musicOn); setSwitch('#setMusic', musicOn); });
$('#setFx').addEventListener('click', () => { fxOn = !fxOn; store.set('fx', fxOn); setSwitch('#setFx', fxOn); });
$('#copySave').addEventListener('click', () => copyText($('#saveCode').value, 'Save code copied. Keep it somewhere safe.'));
$('#loadSave').addEventListener('click', () => {
  const v = $('#loadCode').value.trim(); if (!v.startsWith('HS1.')) { toast('That does not look like a High Spy save code.'); return; }
  try { const dump = JSON.parse(unb64u(v.slice(4))); Object.keys(localStorage).filter(k => k.startsWith('highspy:')).forEach(k => localStorage.removeItem(k)); Object.entries(dump).forEach(([k, val]) => { if (k.startsWith('highspy:')) localStorage.setItem(k, val); }); toast('Save loaded. Reloading…'); setTimeout(() => location.reload(), 900); }
  catch (e) { toast('Could not read that save code.'); }
});
$('#resetAll').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to erase'; b.style.background = '#ff5a5f'; return; }
  try { Object.keys(localStorage).filter(k => k.startsWith('highspy:') && k !== 'highspy:age21').forEach(k => localStorage.removeItem(k)); } catch (_) {} location.reload(); });

/* ================================================================== full game unlock */
function fullRow() { $('#fullSub').textContent = full ? 'Unlocked. Thanks for supporting High Spy!' : 'Coffee Table is free. Unlock the rest with the code you get on itch.io.'; $('#setUnlock').hidden = full; }
function openBuy(what) {
  $('#buySub').textContent = (what ? `${what} is part of the full game. ` : '') + 'Coffee Table is on the house. Everything else is $1, one time.';
  $('#buyList').innerHTML = [`All ${SCENES.length} levels across ${CHAPTERS.length} chapters`, 'Hi-Def photo-real scenes and trippy worlds', 'Camo levels and Northern Lights flashlight mode', 'The Daily Sesh, the Artscape Studio and every trophy'].map(t => `<li>${esc(t)}</li>`).join('');
  $('#buyGo').href = CFG.buy || ITCH; $('#codeIn').value = ''; const m = $('#codeMsg'); m.textContent = ''; m.className = 'codemsg';
  $('#buyOv').hidden = false;
}
function tryCode() {
  const v = normCode($('#codeIn').value), m = $('#codeMsg');
  if (!v) { m.textContent = 'Type the code from your itch.io download.'; m.className = 'codemsg bad'; return; }
  if (hashStr('hs-unlock:' + v) !== CODE_H) { m.textContent = "That code didn't work. Check it and try again."; m.className = 'codemsg bad'; buzz([30, 40, 30]); return; }
  full = true; store.set('full', true); m.textContent = 'Unlocked! Enjoy the whole stash.'; m.className = 'codemsg ok'; sfx.win(); unlock('supporter'); fullRow();
  setTimeout(() => { $('#buyOv').hidden = true; if (!home.hidden) renderHome(); confetti(); }, 900);
}
$('#buyClose').addEventListener('click', () => { $('#buyOv').hidden = true; });
$('#codeGo').addEventListener('click', tryCode);
$('#codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') tryCode(); e.stopPropagation(); });
$('#setUnlock').addEventListener('click', () => openBuy());

/* ================================================================== misc */
function confetti() {
  if (reducedPref) return; const c = $('#confetti'), ctx = c.getContext('2d'), dpr = Math.min(2, DPR), W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr; c.hidden = false; const cols = ['#f7b733', '#f26b38', '#8fd16a', '#b8326f', '#7a4fd1', '#ffffff'];
  const P = Array.from({ length: 170 }, () => ({ x: W / 2 + (Math.random() - .5) * 280, y: H * .3, vx: (Math.random() - .5) * 20, vy: -4 - Math.random() * 12, r: Math.random() * 6, vr: (Math.random() - .5) * .5, w: 6 + Math.random() * 5, h: 9 + Math.random() * 7, c: cols[(Math.random() * cols.length) | 0] }));
  const t0 = performance.now();
  (function frame(now) { const t = now - t0; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = Math.max(0, 1 - t / 3200);
    for (const p of P) { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; const sh = Math.abs(Math.cos(p.r * 1.7)); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2 * sh, p.w, p.h * sh); ctx.restore(); }
    if (t < 3200) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, W, H); c.hidden = true; } })(t0);
}
let toastTimer;
function toast(msg, bottom) {
  $$('.toast').forEach(t => t.remove()); const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
  if (bottom && !game.hidden) { const r = view.getBoundingClientRect(); t.style.top = 'auto'; t.style.bottom = (innerHeight - r.bottom + 16) + 'px'; }
  document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3200);
}
document.addEventListener('keydown', e => {
  if (game.hidden || e.metaKey || e.ctrlKey || e.altKey || e.target.tagName === 'INPUT') return; const k = e.key;
  if (k === 'h' || k === 'H') useHint(); else if (k === '+' || k === '=') zoomBy(1.7); else if (k === '-' || k === '_') zoomBy(1 / 1.7);
  else if (k === '0') $('#zFit').click(); else if (k === 'm' || k === 'M') $('#soundBtn').click(); else if (k === 'Escape' && $('#endOv').hidden) goHome();
});
window.addEventListener('resize', () => { if (!home.hidden) { clearTimeout(window.__ht); window.__ht = setTimeout(paintHero, 250); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) Music.stop(); else if (!game.hidden && musicOn) Music.start(); });
window.addEventListener('hashchange', checkShared);
boot().catch(err => { console.error(err); $('#ltext').textContent = 'Could not load the game. Please reload the page.'; });
})();
