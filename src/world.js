// =====================================================================
//  NYÍLT VILÁG – térkép, kamera, ütközés, helyszínek, véletlen találkozások
//  A Purgatórium középen áll; körülötte hat bűn tája, északon a lezárt Kevélység.
//  A térkép rögzített magból épül (mindig ugyanaz a világ), a találkozások véletlenek.
// =====================================================================
const TS = 40, MW = 300, MH = 230, VIEW_H = H - 64, CHUNK = 16;
const CAM = { x: 0, y: 0 };
const K_GROUND = 0, K_ROCK = 1, K_LIQ = 2, K_SLOW = 3, K_ABYSS = 4, K_GATE = 5;
let WORLD = null;

function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash2(x, y, s = 0) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function makeNoise(seed) {
  const r = mulberry(seed), P = new Float32Array(65536); for (let i = 0; i < 65536; i++) P[i] = r();
  const v = (x, y) => P[((y & 255) << 8) | (x & 255)], sm = t => t * t * (3 - 2 * t);
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, a = v(xi, yi), b = v(xi + 1, yi), c = v(xi, yi + 1), d = v(xi + 1, yi + 1), u = sm(xf), w = sm(yf); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
  return (x, y, oct = 3) => { let s = 0, amp = 1, f = 1, tot = 0; for (let i = 0; i < oct; i++) { s += n(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2.03; } return s / tot; };
}

// tájak: ri 0..6 a bűnök, 7 a Purgatórium. tx, ty = középpont csempében
// a tájak a Purgatórium körüli szögcikkelyek: a Kevélység északon, a többi hat óramutató szerint
const CXT = 150, CYT = 116, ASP = 1.32, RS = 1.8;   // RS: a táj méretaránya
const REG_ANG = { 6: -Math.PI / 2 };
for (let k = 0; k < 6; k++) REG_ANG[k] = -Math.PI / 2 + (k + 1) * TAU / 7;
const REGIONS = [0, 1, 2, 3, 4, 5, 6].map(ri => ({ ri, tx: Math.round(CXT + Math.cos(REG_ANG[ri]) * 34 * RS * ASP), ty: Math.round(CYT + Math.sin(REG_ANG[ri]) * 34 * RS) }));
REGIONS.push({ ri: 7, tx: CXT, ty: CYT });
const PURG_R = 15;
// visszafogott, földszínű paletta tájanként: talaj, talaj2 (folt), szikla teteje, szikla oldala, folyadék
const BIOME = {
  7: { g: [76, 82, 94], g2: [82, 92, 76], rt: [138, 145, 160], rs: [72, 77, 92], liq: [70, 92, 118], slow: null, name: 'Purgatórium' },
  0: { g: [74, 46, 60], g2: [92, 56, 74], rt: [132, 92, 112], rs: [66, 40, 54], liq: [128, 58, 98], slow: null },
  1: { g: [60, 62, 38], g2: [74, 66, 38], rt: [118, 112, 80], rs: [60, 56, 36], liq: [70, 58, 30], slow: [84, 68, 36] },
  2: { g: [92, 76, 48], g2: [110, 92, 52], rt: [160, 136, 92], rs: [86, 68, 42], liq: null, slow: null },
  3: { g: [52, 60, 66], g2: [56, 70, 62], rt: [108, 120, 130], rs: [52, 60, 70], liq: [34, 52, 66], slow: [46, 60, 58] },
  4: { g: [56, 38, 32], g2: [66, 40, 32], rt: [96, 74, 68], rs: [40, 26, 24], liq: [224, 92, 32], slow: null },
  5: { g: [40, 64, 50], g2: [48, 78, 56], rt: [86, 124, 104], rs: [34, 56, 44], liq: [36, 96, 76], slow: null },
  6: { g: [70, 76, 98], g2: [168, 176, 198], rt: [160, 168, 196], rs: [76, 82, 110], liq: [120, 150, 196], slow: null },
};
// sötétítés és vérbe fordítás: minden táj színe besötétül és vörös felé húz
for (const k in BIOME) {
  const B = BIOME[k], dk = k === '7' ? 0.62 : 0.5;
  for (const f of ['g', 'g2', 'rt', 'rs', 'slow']) if (B[f]) B[f] = [B[f][0] * dk + 10, B[f][1] * dk * 0.78, B[f][2] * dk * 0.74];
  if (B.liq && k !== '4') B.liq = [B.liq[0] * 0.45 + 30, B.liq[1] * 0.3, B.liq[2] * 0.3];
}
BIOME[0].liq = [92, 8, 12]; BIOME[7].liq = [52, 10, 14];
const Hypot = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rgbS = (c, k = 1) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;
const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ---------- a világ felépítése ----------
function buildWorld() {
  const N = makeNoise(7771), N2 = makeNoise(4242), N3 = makeNoise(9090), WN = makeNoise(1357);
  const Kt = new Uint8Array(MW * MH), RG8 = new Uint8Array(MW * MH), NZ = new Float32Array(MW * MH), PATH = new Uint8Array(MW * MH), RG2 = new Uint8Array(MW * MH), BF = new Float32Array(MW * MH);
  const C = REGIONS.find(r => r.ri === 7);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const i = y * MW + x, rx = (x - C.tx) / ASP, ry = y - C.ty, rr = Math.hypot(rx, ry);
    const ang = Math.atan2(ry, rx) + (WN(x * 0.045, y * 0.045) - 0.5) * 0.55 * Math.min(1, rr / 30);
    const dp = Math.hypot(x - C.tx, y - C.ty) + (N(x * 0.15, y * 0.15) - 0.5) * 2.5;
    let a1 = 9, a2 = 9, r1 = 0, r2 = 0;
    for (let ri = 0; ri < 7; ri++) { const d = arcDiff(ang, REG_ANG[ri]); if (d < a1) { a2 = a1; r2 = r1; a1 = d; r1 = ri; } else if (d < a2) { a2 = d; r2 = ri; } }
    const gap = (a2 - a1) * rr;   // csempében mért távolság a határtól
    NZ[i] = N2(x * 0.09, y * 0.09);
    let reg = r1, k = K_GROUND;
    RG2[i] = r2; BF[i] = gap < 6 ? (1 - gap / 6) * 0.5 : 0;
    if (dp < PURG_R) { reg = 7; BF[i] = 0; }
    else if (dp < PURG_R + 2.2) { reg = dp < PURG_R + 1 ? 7 : r1; k = K_ROCK; }
    else if (gap < 2.2 + N(x * 0.2, y * 0.2) * 1.2) k = K_ROCK;
    if (reg !== 7 && rr > 51 * RS + (N(x * 0.06, y * 0.06) - 0.5) * 14) k = K_ABYSS;
    if (x < 3 || y < 3 || x >= MW - 3 || y >= MH - 3) k = K_ABYSS;
    if (k === K_GROUND && reg !== 7) {
      const rock = N3(x * 0.13, y * 0.13), liq = N(x * 0.07 + 90, y * 0.07 + 90);
      const B0 = BIOME[reg];
      if (rock > 0.68) k = K_ROCK;
      else if (B0.liq && liq > 0.7) k = K_LIQ;
      else if (B0.slow && liq > 0.6) k = K_SLOW;
    }
    Kt[i] = k; RG8[i] = reg;
  }
  const W0 = { K: Kt, RG: RG8, RG2, BF, NZ, PATH, pois: [], decor: [], dgrid: new Map(), chunks: new Map(), C, gateTiles: [], passes: {} };
  WORLD = W0;
  const carve = (x, y, r, path) => {
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (xx < 3 || yy < 3 || xx >= MW - 3 || yy >= MH - 3) continue;
      if (Math.hypot(xx - x, yy - y) > r) continue;
      const i = yy * MW + xx; if (Kt[i] === K_GATE) continue;
      Kt[i] = K_GROUND; if (path) PATH[i] = 1;
    }
  };
  const carveLine = (a, b, r, path, wig = 0, seed = 0) => {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 0.7), px = -(b.y - a.y) / (d || 1), py = (b.x - a.x) / (d || 1);
    for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI) * (N(t * 3 + seed, seed) - 0.5) * wig; carve(a.x + (b.x - a.x) * t + px * w, a.y + (b.y - a.y) * t + py * w, r, path); }
  };
  // Purgatórium: tiszta kőudvar
  carve(C.tx, C.ty, PURG_R - 0.5, false);
  // helyszínek tájanként (a src/levels.js termeiből)
  for (const R0 of REGIONS) {
    if (R0.ri === 7) continue;
    const ri = R0.ri, ux = R0.tx - C.tx, uy = R0.ty - C.ty, ul = Math.hypot(ux, uy), u = { x: ux / ul, y: uy / ul };
    const gateT = { x: C.tx + u.x * (PURG_R - 1.2), y: C.ty + u.y * (PURG_R - 1.2) };
    const E = { x: C.tx + u.x * (PURG_R + 5), y: C.ty + u.y * (PURG_R + 5) };
    const F = { x: R0.tx + u.x * 11, y: R0.ty + u.y * 11 };
    W0.passes[ri] = { gate: gateT, entry: E, u };
    carveLine({ x: C.tx + u.x * (PURG_R - 3), y: C.ty + u.y * (PURG_R - 3) }, E, 1.8, true);
    const lv = LEVELS[ri], rooms = lv && lv.rooms ? lv.rooms : [];
    // terem-sorrend: szélességi bejárás a starttól
    const key = r => r.x + ',' + r.y, byK = {}; rooms.forEach(r => byK[key(r)] = r);
    const st = rooms.find(r => r.type === 'start') || rooms[0], depth = {}, q = st ? [st] : [];
    if (st) depth[key(st)] = 0;
    while (q.length) { const r = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nb = byK[(r.x + dx) + ',' + (r.y + dy)]; if (nb && depth[key(nb)] === undefined) { depth[key(nb)] = depth[key(r)] + 1; q.push(nb); } } }
    // bolt, Égi Oltár és ereklyeoltár nincs: erősítést csak a bűnök hagynak maguk után
    const ordered = rooms.filter(r => r.type !== 'shop' && r.type !== 'treasure' && r.type !== 'shrine').sort((a, b) => (a.type === 'boss') - (b.type === 'boss') || (depth[key(a)] || 0) - (depth[key(b)] || 0));
    // jelölt pontok a táj belsejében, a Purgatóriumtól mért távolsággal
    const cands = [];
    for (let y = 4; y < MH - 4; y++) for (let x = 4; x < MW - 4; x++) {
      const ti = y * MW + x; if (RG8[ti] !== ri || BF[ti] > 0.02 || Kt[ti] === K_ABYSS) continue;
      const rr = Math.hypot((x - C.tx) / ASP, y - C.ty); if (rr < 26 || rr > 84) continue;
      cands.push({ x, y, rr, a: arcDiff(Math.atan2(y - C.ty, (x - C.tx) / ASP), REG_ANG[ri]) });
    }
    const n = ordered.length || 1, chosen = [];
    const far = cands.filter(q => q.rr > 74).sort((p1, p2) => p1.a - p2.a)[0] || cands.sort((p1, p2) => p2.rr - p1.rr)[0];
    for (let i = 0; i < n; i++) {
      const rd = ordered[i], isBoss = rd.type === 'boss';
      let best = far;
      if (!isBoss) {
        const target = 28 + (i / Math.max(1, n - 1)) * 44; let bs = -1e9;
        for (const q of cands) {
          const md = Math.min(Hypot(q, far) - 6, ...chosen.map(o => Hypot(q, o)));
          const sc = Math.min(md, 16) * 3 - Math.abs(q.rr - target) * 1.4 + hash2(q.x, q.y, 71) * 0.5;
          if (sc > bs) { bs = sc; best = q; }
        }
      }
      chosen.push(best);
    }
    let prev = E;
    const order = chosen.map((q, i) => ({ q, rd: ordered[i] }));
    order.forEach(({ q, rd }, i) => {
      const isBoss = rd.type === 'boss', px = q.x, py = q.y;
      const nearest = i === 0 ? E : order.slice(0, i).map(o => o.q).reduce((m, o) => Hypot(o, q) < Hypot(m, q) ? o : m, E);
      carveLine(nearest, { x: px, y: py }, 1.7, true, 4, ri * 13 + i);
      carve(px, py, isBoss ? 9 : rd.type === 'normal' ? 5 : 3.6, false);
      const poi = { id: ri + ':' + i, ri, def: rd, type: rd.type === 'normal' ? 'camp' : rd.type, x: (px + 0.5) * TS, y: (py + 0.5) * TS,
        title: rd.title || (isBoss ? BOSSES[ri].name : ''), waves: rd.waves, npc: rd.npc, enterTalk: rd.enterTalk };
      W0.pois.push(poi);
      prev = { x: px, y: py };
    });
  }
  // kijelölt helyek: démonbarlangok, romok (látványosság), bajba jutott lelkek, ereklyetartók
  W0.sites = [];
  const SITE_PLAN = [['lair', 9], ['ruin', 4], ['rescue', 2], ['cache', 3]];
  for (const R0 of REGIONS) {
    if (R0.ri === 7) continue;
    const ri = R0.ri, rnd = mulberry(ri * 131 + 17), taken = W0.pois.filter(o => o.ri === ri).map(o => ({ x: o.x / TS, y: o.y / TS }));
    const cands = [];
    for (let y = 4; y < MH - 4; y += 2) for (let x = 4; x < MW - 4; x += 2) { const ti = y * MW + x; if (RG8[ti] !== ri || BF[ti] > 0.02 || Kt[ti] === K_ABYSS) continue; const rr = Math.hypot((x - C.tx) / ASP, y - C.ty); if (rr < 24 || rr > 86) continue; cands.push({ x, y }); }
    for (const [type, cnt] of SITE_PLAN) for (let k = 0; k < cnt; k++) {
      let best = null, bs = -1;
      for (let t = 0; t < 60; t++) { const q = cands[Math.floor(rnd() * cands.length)]; if (!q) break; const md = Math.min(...taken.map(o => Hypot(o, q))); if (md > bs) { bs = md; best = q; } }
      if (!best || bs < 7) continue;
      const near = taken.reduce((m, o) => Hypot(o, best) < Hypot(m, best) ? o : m, taken[0]);
      carveLine(near, best, 1.4, true, 3, ri * 7 + k);
      carve(best.x, best.y, type === 'lair' ? 4.5 : 3, false);
      taken.push(best);
      W0.sites.push({ type, ri, x: (best.x + 0.5) * TS, y: (best.y + 0.5) * TS, v: k, title: type === 'ruin' ? RUIN_NAMES[ri][k % RUIN_NAMES[ri].length] : type === 'lair' ? LAIR_NAMES[ri][k % LAIR_NAMES[ri].length] : '' });
    }
  }
  // a bűnök tájai nem nyílnak egymásba: minden határt utólag is kőfallal zárunk le, csak a saját kapujukon át érhetők el
  for (let i = 0; i < MW * MH; i++) if (RG8[i] !== RG2[i] && RG8[i] !== 7 && BF[i] > 0.27 && Kt[i] !== K_ABYSS) Kt[i] = K_ROCK;
  for (let y = 3; y < MH - 4; y++) for (let x = 3; x < MW - 4; x++) {
    const i = y * MW + x, a = RG8[i]; if (a === 7) continue;
    for (const j of [i + 1, i + MW]) { const b = RG8[j]; if (b === 7 || b === a) continue; if (Kt[i] !== K_ABYSS) Kt[i] = K_ROCK; if (Kt[j] !== K_ABYSS) Kt[j] = K_ROCK; }
  }
  // a kapuk túloldala: ahol a hágó átlép a bűn tájára (itt zárul be a kapu a belépő mögött)
  for (let ri = 0; ri < 7; ri++) {
    const ps = W0.passes[ri]; let q = null;
    for (let d = PURG_R - 1; d < PURG_R + 6 && !q; d += 0.25) { const x = C.tx + ps.u.x * d, y = C.ty + ps.u.y * d; if (RG8[Math.round(y) * MW + Math.round(x)] === ri) q = { x, y }; }
    ps.seal = q || { x: C.tx + ps.u.x * (PURG_R + 1), y: C.ty + ps.u.y * (PURG_R + 1) };
  }
  // a Kevélység kapuja: lezárt kőfal a hágóban
  const pp = W0.passes[6];
  for (let k = -2.5; k <= 2.5; k += 0.5) { const x = Math.round(pp.gate.x + -pp.u.y * k), y = Math.round(pp.gate.y + pp.u.x * k); for (const yy of [y - 1, y, y + 1]) { const i = yy * MW + x; if (Kt[i] !== K_ABYSS) { Kt[i] = K_GATE; W0.gateTiles.push(i); } } }
  // díszletek (magas tárgyak), a csempe-hash alapján – mindig ugyanott
  for (let y = 4; y < MH - 4; y++) for (let x = 4; x < MW - 4; x++) {
    const i = y * MW + x; if (Kt[i] !== K_GROUND || PATH[i]) continue;
    const reg = RG8[i], h = hash2(x, y, 11);
    if (h > (reg === 7 ? 0.04 : 0.075)) continue;
    if (W0.pois.some(o => Math.hypot(o.x / TS - x, o.y / TS - y) < (o.type === 'boss' ? 10 : 6))) continue;
    if (reg === 7 && Math.hypot(x - C.tx, y - C.ty) < 8) continue;
    const kinds = DECOR_BY[reg], kind = kinds[Math.floor(hash2(x, y, 12) * kinds.length)];
    addDecor(kind, (x + 0.5) * TS + (hash2(x, y, 13) - 0.5) * 20, (y + 0.5) * TS + (hash2(x, y, 14) - 0.5) * 20, Math.floor(hash2(x, y, 15) * 3));
  }
  // a barlangok körül: karóba húzott tetemek, ketrecek, koponyahalmok
  for (const st of W0.sites) {
    if (st.type === 'lair') for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + st.v, rr = 90 + hash2(k, st.v, st.ri) * 50; addDecor(['impaled', 'cage', 'skulls', 'impaled', 'bonepile'][k], st.x + Math.cos(a) * rr, st.y + Math.sin(a) * rr * 0.8, k % 3); }
    if (st.type === 'ruin') { addDecor('ruinarch', st.x, st.y - 30, st.ri % 3); addDecor('pillar', st.x - 110, st.y + 20, 1); addDecor('pillar', st.x + 110, st.y + 30, 2); }
  }
  // Purgatórium: oszlopkör és ciprusok
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU + 0.11; if (REGIONS.some(r => r.ri !== 7 && Math.abs(((Math.atan2(r.ty - C.ty, r.tx - C.tx) - a + Math.PI * 3) % TAU) - Math.PI) < 0.32)) continue; addDecor(k % 2 ? 'cypress' : 'pillar', (C.tx + 0.5 + Math.cos(a) * 12.5) * TS, (C.ty + 0.5 + Math.sin(a) * 12.5) * TS, k % 3); }
  buildMinimap();
  return W0;
}
const DECOR_BY = {
  7: ['cypress', 'stone', 'pillar'], 0: ['rose', 'rose', 'statue', 'rose', 'impaled', 'deadtree'], 1: ['ribs', 'deadtree', 'urn', 'bonepile', 'gibbet'], 2: ['goldpile', 'goldpile', 'urn', 'statue', 'gibbet', 'skulls'],
  3: ['deadtree', 'reeds', 'reeds', 'stone', 'cage', 'bonepile'], 4: ['spire', 'spire', 'deadtree', 'impaled', 'skulls'], 5: ['crystal', 'crystal', 'mirror', 'cage', 'bonepile'], 6: ['icespike', 'icespike', 'statue', 'pillar', 'impaled', 'skulls'],
};
const RUIN_NAMES = {
  0: ['Az Összeforrt Szeretők Szobra', 'A Leomlott Nászkápolna', 'A Szél Hárfája', 'Didó Máglyája'],
  1: ['A Kiürült Lakomacsarnok', 'Kerberosz Csontvára', 'A Rothadó Kertek', 'Az Ezer Tál Oltára'],
  2: ['A Beomlott Pénzverde', 'Krőzus Sírja', 'A Mérlegek Temploma', 'Az Aranyborjú Talapzata'],
  3: ['A Félbehagyott Katedrális', 'Az Elsüllyedt Harangtorony', 'A Soha Fel Nem Gyújtott Máglya', 'Az Álmodók Kútja'],
  4: ['A Megtört Pajzsok Fala', 'Dísz Ledőlt Kapuja', 'A Vérmező Emlékköve', 'A Kihunyt Kohók'],
  5: ['A Bevarrt Szemű Szentek', 'A Tükörcsarnok Romjai', 'A Szomszéd Kertjének Kapuja', 'Káin Kútja'],
  6: ['A Lehullott Koronák Lépcsője', 'Bábel Csonkja', 'A Megfagyott Kórus', 'Az Első Bukás Helye'],
};
const LAIR_NAMES = {
  0: ['Kéjbarlang', 'A Selyemhurkok Odúja', 'Az Ölelő Tövisek'], 1: ['A Falánkok Ólja', 'A Csontrágók Gödre', 'A Dögkút'], 2: ['A Zsugoriak Rejteke', 'Az Elásott Adósok', 'A Pénzhegy Árnyéka'],
  3: ['A Mocsári Fészek', 'Az Elalvók Kriptája', 'A Lusták Vermei'], 4: ['A Vérmező', 'A Karók Erdeje', 'Az Égő Árok'], 5: ['A Leskelődők Fészke', 'A Zöld Szemek Barlangja', 'Az Irigyek Gödre'], 6: ['A Gőgösök Trónterme', 'A Jégbe Fagyottak', 'A Bukottak Tábora'],
};
const RUIN_TEXT = {
  0: ['„Itt kértük, hogy soha ne váljunk el. A szél meghallgatott minket.”', 'A vésett nevek fölött friss vér csorog. Valaki még mindig ide jár imádkozni.'],
  1: ['A kőasztalon ezer üres tál. Egyiken sincs morzsa. A falakon fogak nyoma.', '„Ettünk, hogy ne érezzük az ürességet. Most az üresség eszik minket.”'],
  2: ['A mérleg egyik serpenyőjében arany, a másikban egy emberi szív. A szív a nehezebb.', 'Egy kopott tábla: „Minden adósság megfizettetik. Kamatostul.”'],
  3: ['A katedrális sosem készült el. A kőművesek holtteste még ott ül a bontatlan kövek mellett.', '„Holnap” – ez az egyetlen szó, ami a falakon olvasható. Ezerszer.'],
  4: ['A kőbe vájt jelek egy csata nevét őrzik, amelyről senki sem tudja, miért vívták.', 'Karók sora, rajtuk sisakok. A sisakok alatt még mozog valami.'],
  5: ['A szentek szemét drótttal varrták be. A varratok között könny szivárog.', 'Minden tükörben más arc néz vissza – mindig olyan, akinek jobb sora volt.'],
  6: ['A lépcső minden fokán egy korona. A legfelső üres – arra vár, aki a legmagasabbra jut.', '„Nem szolgálok” – írták a kőbe. Alatta, apróbb betűkkel: „Mégis szolgáltam.”'],
};
function addDecor(kind, x, y, v) {
  const d = { kind, x, y, v, cr: DECOR_CR[kind] || 0 };
  WORLD.decor.push(d);
  const k = Math.floor(x / (CHUNK * TS)) + ',' + Math.floor(y / (CHUNK * TS));
  if (!WORLD.dgrid.has(k)) WORLD.dgrid.set(k, []);
  WORLD.dgrid.get(k).push(d);
}
const DECOR_CR = { impaled: 8, gibbet: 10, cage: 10, skulls: 18, bonepile: 0, ruinarch: 0, cypress: 10, pillar: 14, statue: 16, deadtree: 8, spire: 14, crystal: 13, mirror: 12, icespike: 12, goldpile: 18, ribs: 16, urn: 10, rose: 12, stone: 12, reeds: 0 };

// ---------- lekérdezések ----------
const tileAt = (x, y) => { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return K_ABYSS; return WORLD.K[ty * MW + tx]; };
const regionAt = (x, y) => { const tx = clamp(Math.floor(x / TS), 0, MW - 1), ty = clamp(Math.floor(y / TS), 0, MH - 1); return WORLD.RG[ty * MW + tx]; };
const blocksWalk = k => k === K_ROCK || k === K_LIQ || k === K_ABYSS || k === K_GATE;
const blocksShot = k => k === K_ROCK || k === K_GATE;
function walkable(x, y, r = 12) { for (const [dx, dy] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) if (blocksWalk(tileAt(x + dx, y + dy))) return false; return true; }
function decorNear(x, y, f) {
  const cx = Math.floor(x / (CHUNK * TS)), cy = Math.floor(y / (CHUNK * TS));
  for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) { const l = WORLD.dgrid.get(i + ',' + j); if (l) for (const d of l) f(d); }
}
// körös test kiszorítása a falakból és a díszletekből
function collideObst(c) {
  const r = c.r || 12, tx0 = Math.floor((c.x - r) / TS), tx1 = Math.floor((c.x + r) / TS), ty0 = Math.floor((c.y - r) / TS), ty1 = Math.floor((c.y + r) / TS);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const k = (tx < 0 || ty < 0 || tx >= MW || ty >= MH) ? K_ABYSS : WORLD.K[ty * MW + tx];
    if (!blocksWalk(k) || (c.fly && k !== K_ROCK && k !== K_GATE && k !== K_ABYSS)) continue;
    const o = { x: tx * TS, y: ty * TS, w: TS, h: TS }, h = circRect(c, o, r);
    if (!h) continue;
    if (h.d > 0.001) { c.x += h.dx / h.d * (r - h.d); c.y += h.dy / h.d * (r - h.d); }
    else { const l = c.x - o.x, rr = o.x + o.w - c.x, t = c.y - o.y, bb = o.y + o.h - c.y, m = Math.min(l, rr, t, bb); if (m === l) c.x = o.x - r; else if (m === rr) c.x = o.x + o.w + r; else if (m === t) c.y = o.y - r; else c.y = o.y + o.h + r; }
    c.hitWall = true;
  }
  decorNear(c.x, c.y, d => { if (!d.cr) return; const dx = c.x - d.x, dy = c.y - d.y, dd = Math.hypot(dx, dy), m = d.cr + r * 0.8; if (dd < m && dd > 0.01) { c.x = d.x + dx / dd * m; c.y = d.y + dy / dd * m; c.hitWall = true; } });
  if (c.arena) { const a = c.arena, dx = c.x - a.x, dy = c.y - a.y, dd = Math.hypot(dx, dy); if (dd > a.r - r) { c.x = a.x + dx / dd * (a.r - r); c.y = a.y + dy / dd * (a.r - r); c.hitWall = true; } }
}
function clampRoom(c) { collideObst(c); }
function losClear(a, b) {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 24);
  for (let i = 1; i < n; i++) { const t = i / n; if (blocksShot(tileAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))) return false; }
  return true;
}
// szabad hely keresése egy pont körül
function findFree(x, y, r = 14, maxR = 200) {
  if (walkable(x, y, r)) return { x, y };
  for (let rad = 20; rad <= maxR; rad += 20) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + rad; const qx = x + Math.cos(a) * rad, qy = y + Math.sin(a) * rad; if (walkable(qx, qy, r)) return { x: qx, y: qy }; }
  return { x, y };
}
function freePos(margin = 40, minD = 200) {
  const p = G.p, c = G.arena || { x: p.x, y: p.y, r: 360 };
  for (let i = 0; i < 60; i++) { const a = rand(0, TAU), d = rand(minD * 0.6, c.r - margin); const q = { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d }; if (walkable(q.x, q.y, margin * 0.5) && dist(q, p) >= minD * 0.7) return q; }
  return findFree(c.x, c.y - 120);
}

// ---------- kamera ----------
function updateCamera(dt, snap) {
  const p = G.p, tx = clamp(p.x - W / 2 + p.vx * 0.18, 0, MW * TS - W), ty = clamp(p.y - VIEW_H / 2 + p.vy * 0.18, 0, MH * TS - VIEW_H);
  const k = snap ? 1 : Math.min(1, dt * 6);
  CAM.x += (tx - CAM.x) * k; CAM.y += (ty - CAM.y) * k;
  L = CAM.x; R = CAM.x + W; T = CAM.y; B = CAM.y + VIEW_H;
}
const wmouse = () => ({ x: mouse.x + CAM.x, y: mouse.y - 64 + CAM.y });

// ---------- futam indítása, régiók követése ----------
function worldStart() {
  if (!WORLD) buildWorld();
  // a kapuk állapota futamonként visszaáll
  for (const i of WORLD.gateTiles) WORLD.K[i] = K_GATE;
  WORLD.chunks.clear();
  G.pois = WORLD.pois.map(o => Object.assign({}, o, { cleared: false, active: false, waveI: 0, talked: false, taken: false, found: false, items: null, enterTalked: false }));
  G.pickupsAll = [];
  G.regionObjs = {};
  for (let ri = 0; ri <= 7; ri++) G.regionObjs[ri] = { type: 'world', ri, pickups: G.pickupsAll, items: [], obst: [], cleared: true };
  G.fog = new Uint8Array(MW * MH); FOGG.fillStyle = '#000'; FOGG.globalCompositeOperation = 'source-over'; FOGG.fillRect(0, 0, MW, MH);
  G.seenReg = {}; G.dir = { t: 25, n: 0 }; G.encs = [];
  G.curReg = 7; G.hub = true; G.room = G.regionObjs[7];
  spawnSites();
  const C = WORLD.C;
  G.p.x = (C.tx + 0.5) * TS; G.p.y = (C.ty + 4.6) * TS;
  updateCamera(0, true);
  G.hubNpc = { x: (C.tx + 0.5) * TS, y: (C.ty + 1.6) * TS, name: (LEVELS.hub && LEVELS.hub.guide) || 'Vergiliusz', look: 'guide' };
  const ids = Object.keys(WEAPONS).sort((a, b) => (WEAPONS[a].kind === 'melee' ? 0 : 1) - (WEAPONS[b].kind === 'melee' ? 0 : 1));
  G.peds = ids.map((w, i) => ({ w, x: (C.tx + 0.5) * TS + (i - (ids.length - 1) / 2) * 92 + (WEAPONS[w].kind === 'melee' ? -16 : 16), y: (C.ty + 3.2) * TS }));
  G.banner = { title: 'PURGATÓRIUM', sub: 'A tisztulás hegye', line: 'Válassz fegyvert, aztán indulj el egy kapun át.', t: 0, dur: 4.2, col: PURG.col };
}
function regionEnter(ri) {
  G.curReg = ri; G.hub = ri === 7; G.room = G.regionObjs[ri]; G.lvl = G.defeated.length;
  if (ri === 7) { emit('hubEnter', null); return; }
  G.ring = ri;
  if (!G.defeated.includes(ri)) sealGate(ri);
  const first = !G.seenReg[ri]; G.seenReg[ri] = true;
  if (first) { ringBanner(); sfx('holy'); emit('ringEnter', ri); const lv = LEVELS[ri]; if (lv && lv.intro) startTalk(lv.intro); }
  else G.banner = { title: RINGS[ri].name.toUpperCase(), sub: G.defeated.includes(ri) ? 'Megtisztítva' : RINGS[ri].latin, line: '', t: 0, dur: 2.2, col: RINGS[ri].col };
}
// ha belépsz egy kapun, mögötted bezárul: csak a bűn halála után jöhetsz ki
function sealGate(ri) {
  if (G.sealed === ri) return;
  G.sealed = ri; G.sealPos = { x: G.p.x, y: G.p.y }; G.sealT = 0;
  const q = WORLD.passes[ri].seal, x = (q.x + 0.5) * TS, y = (q.y + 0.5) * TS;
  vfx.ring(x, y, 10, 160, RINGS[ri].col, 0.7, 8); vfx.shake(6); sfx('door');
  later0(G.seenReg[ri] ? 0.1 : 5.6, () => { if (G.sealed === ri) G.banner = { small: true, title: 'A KAPU BEZÁRULT MÖGÖTTED', sub: `Csak ${BOSSES[ri].name} halála nyitja meg`, line: '', t: 0, dur: 2.8, col: RINGS[ri].col }; });
}
function later0(t, fn) { addFx({ upd(dt) { t -= dt; if (t <= 0) { fn(); return false; } return true; } }); }
function sealUpdate(dt) {
  const p = G.p, ri = G.sealed;
  if (ri === undefined || ri === null) return;
  if (G.defeated.includes(ri)) { G.sealed = null; return; }
  if (regionAt(p.x, p.y) === ri) { G.sealPos = { x: p.x, y: p.y }; return; }
  p.x = G.sealPos.x; p.y = G.sealPos.y; p.vx = 0; p.vy = 0;
  if ((G.sealT -= dt) <= 0) { G.sealT = 1.6; sfx('block'); floatText(p.x, p.y - 44, `A kapu zárva — győzd le ${BOSSES[ri].name}-t`, RINGS[ri].col, 1.4, 14); }
}
// teszteléshez / visszatéréshez: a régió bejáratához ugrik
function enterRing(ri) {
  const ps = WORLD.passes[ri]; if (!ps) return;
  if (ri === 6) unlockPrideGate(true);
  G.p.x = (ps.entry.x + 0.5) * TS; G.p.y = (ps.entry.y + 0.5) * TS; const f = findFree(G.p.x, G.p.y); G.p.x = f.x; G.p.y = f.y;
  G.sealed = null; updateCamera(0, true); regionEnter(ri);
}
function unlockPrideGate(silent) {
  if (!WORLD.gateTiles.length || WORLD.K[WORLD.gateTiles[0]] !== K_GATE) return;
  for (const i of WORLD.gateTiles) WORLD.K[i] = K_GROUND;
  WORLD.chunks.clear();
  if (!silent) { const g = WORLD.passes[6].gate; vfx.ring((g.x + 0.5) * TS, (g.y + 0.5) * TS, 20, 300, '#c08bff', 1, 12); vfx.shake(14); sfx('unlock'); }
}
// főellenség után: vissza a Purgatóriumba, a hágó kapujához
function nextRing() {
  const ri = G.ring;
  if (!G.defeated.includes(ri)) G.defeated.push(ri);
  G.sealed = null;
  G.p.hp = Math.min(G.p.maxHp, G.p.hp + 25);
  G.enemies.length = 0; G.bullets.length = 0; G.hazards.length = 0; G.beams.length = 0; G.fx.length = 0; G.arena = null; G.p.arena = null; G.portal = null;
  const ps = WORLD.passes[ri], C = WORLD.C;
  G.p.x = (C.tx + 0.5 + ps.u.x * 8) * TS; G.p.y = (C.ty + 0.5 + ps.u.y * 8) * TS;
  updateCamera(0, true); G.fade = 1;
  regionEnter(7);
  G.flags.hubTalk2 = false;
  const bd = BOSSES[ri], left = 6 - G.defeated.filter(i => i < 6).length;
  G.banner = { title: `${bd.name} ELBUKOTT`, sub: left > 0 ? `Egy lakat lehullott a Kevélység kapujáról. Még ${left} maradt.` : 'Az utolsó lakat is lehullott.',
    line: left > 0 ? 'Válassz újabb utat.' : '„A Kevélység kapuja nyitva áll. Lucifer vár.”', t: 0, dur: 4.6, col: RINGS[ri].col };
  const lp = lockPos(ri); if (lp) { part(lp.x, lp.y, RINGS[ri].col, 60, 260, 1.2, 4); part(lp.x, lp.y, '#ffffff', 20, 160, 0.8, 3); }
  G.shake = 8; sfx('unlock');
  if (left <= 0) unlockPrideGate(false);
  emit('hubEnter', ri);
}
function lockPos(k) {
  if (!WORLD) return null; const ps = WORLD.passes[6], a = Math.atan2(ps.u.y, ps.u.x) + Math.PI + (k - 2.5) * 0.36;
  const gx = (ps.gate.x + 0.5) * TS, gy = (ps.gate.y + 0.5) * TS;
  return { x: gx + Math.cos(a + Math.PI) * 70, y: gy + Math.sin(a + Math.PI) * 70 };
}

// ---------- járőrök, táborok, találkozások ----------
function spawnSites() {
  for (const st of WORLD.sites) {
    if (st.type === 'lair') {
      const types = RINGS[st.ri].enemies, n = 3 + (st.v % 3);
      for (let k = 0; k < n; k++) { const f = findFree(st.x + Math.cos(k * 1.7) * 70, st.y + Math.sin(k * 1.7) * 60); const e = mkEnemy(k === 0 && st.v % 3 === 2 ? 'brute' : choice(types), f.x, f.y, st.ri); e.spawn = 0; e.lair = st; e.home = { x: st.x, y: st.y }; G.enemies.push(e); }
    } else if (st.type === 'rescue') {
      const types = RINGS[st.ri].enemies;
      const enc = { type: 'normal', kind: 'soul', x: st.x, y: st.y, ri: st.ri, title: 'Bajba jutott lélek', fixed: true, npc: { name: 'Elveszett lélek', look: 'soul', talk: choice(LOST_LINES).map(t => ({ who: 'Elveszett lélek', text: t, col: '#9fd0dc' })) } };
      for (let k = 0; k < 4; k++) { const f = findFree(st.x + Math.cos(k * 1.6) * 95, st.y + Math.sin(k * 1.6) * 85); const e = mkEnemy(choice(types), f.x, f.y, st.ri); e.spawn = 0; e.enc = enc; e.guard = true; G.enemies.push(e); }
      G.encs.push(enc);
    } else if (st.type === 'cache') G.encs.push({ type: 'cache', kind: 'cache', x: st.x, y: st.y, ri: st.ri, taken: false, cursed: st.v % 2 === 1, fixed: true });
    else if (st.type === 'ruin') G.encs.push({ type: 'ruin', kind: 'ruin', x: st.x, y: st.y, ri: st.ri, title: st.title, read: false, fixed: true, text: RUIN_TEXT[st.ri][st.v % RUIN_TEXT[st.ri].length] });
  }
}
function spawnPatrolsOld() {
  const rnd = mulberry(424242);
  for (let ri = 0; ri <= 6; ri++) {
    const R0 = REGIONS[ri];
    for (let g = 0; g < 7; g++) {
      for (let tries = 0; tries < 20; tries++) {
        const x = (R0.tx + (rnd() - 0.5) * 44) * TS, y = (R0.ty + (rnd() - 0.5) * 40) * TS;
        if (regionAt(x, y) !== ri || !walkable(x, y, 18)) continue;
        if (G.pois.some(o => Math.hypot(o.x - x, o.y - y) < 420)) continue;
        const n = 2 + Math.floor(rnd() * 2), types = RINGS[ri].enemies;
        for (let k = 0; k < n; k++) { const f = findFree(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 120); const e = mkEnemy(types[Math.floor(rnd() * types.length)], f.x, f.y, ri); e.spawn = 0; e.patrol = true; G.enemies.push(e); }
        break;
      }
    }
  }
}
function campSpawn(poi) {
  const wave = poi.waves[poi.waveI] || [];
  for (const [type, tx, ty] of wave) {
    if (!ET[type]) continue;
    const f = findFree(poi.x + (tx - 13.5) * 21 + rand(-8, 8), poi.y + (ty - 7.5) * 21 + rand(-8, 8), 14, 160);
    const e = mkEnemy(type, f.x, f.y, poi.ri); e.enc = poi; e.aggro = true; G.enemies.push(e);
  }
  if (poi.waveI > 0) G.banner = { title: `${poi.waveI + 1}. HULLÁM`, sub: poi.title || '', line: '', t: 0, dur: 1.6, col: RINGS[poi.ri].col };
}
function encEnemies(enc) { return G.enemies.filter(e => e.enc === enc && !e.dead); }
function startEncounter(enc) { G.room = enc; enc.pickups = G.pickupsAll; enc.items = enc.items || []; enc.obst = []; emit('roomEnter', enc); }
function endEncounter(enc) {
  enc.cleared = true; enc.active = false; sfx('door'); emit('roomClear', enc);
  for (let i = 0; i < 3 + randi(0, 3); i++) dropPickup('soul', enc.x, enc.y);
  if (Math.random() < 0.35) dropPickup('heart', enc.x, enc.y);
  if (G.room === enc) G.room = G.regionObjs[G.curReg];
}
// a megmentett lelkek és a ládák csak lelket és életerőt adnak – erősítést nem
function soulGift(x, y, n) { for (let i = 0; i < n; i++) dropPickup('soul', x, y); dropPickup('heart', x, y); }
const LOST_LINES = [
  ['Köszönöm, fénylő idegen… már azt hittem, örökre itt maradok.', 'Vedd ezt. Nekem már úgysincs szükségem rá.'],
  ['Láttam, ahogy jöttél. Mint egy hajnal, ami eltévedt idelent.', 'Fogadd el ezt a keveset, amit megőriztem.'],
  ['Ne nézz rám így. Én választottam ezt az utat… de te kivezettél belőle egy percre.', 'Áldás kísérjen.'],
  ['A démonok azt mondták, senki sem jön. Hazudtak.', 'Ezt egy angyal hagyta itt rég. Talán épp neked.'],
];
function director(dt) {
  return; // nincs véletlen ellenségszülés: a démonok kijelölt helyeken (barlangok, táborok) várnak
  const p = G.p, d = G.dir;
  if (G.hub || G.arena || state !== 'play') return;
  const combat = G.enemies.some(e => e.aggro && !e.dead && dist(e, p) < 750);
  if (combat) return;
  d.t -= dt * (Math.hypot(p.vx, p.vy) > 30 ? 1 : 0.35);
  if (d.t > 0) return;
  d.t = rand(20, 34) * (G.defeated.includes(G.curReg) ? 1.7 : 1);
  if (G.enemies.length > 26) return;
  const ri = G.curReg, types = RINGS[ri].enemies, r = Math.random();
  const ahead = Math.hypot(p.vx, p.vy) > 30 ? Math.atan2(p.vy, p.vx) : rand(0, TAU);
  const spotAt = (a, dd) => { for (let k = 0; k < 10; k++) { const aa = a + rand(-0.6, 0.6), q = { x: p.x + Math.cos(aa) * dd, y: p.y + Math.sin(aa) * dd }; if (regionAt(q.x, q.y) === ri && walkable(q.x, q.y, 18)) return q; } return null; };
  if (r < 0.42) { // les
    const enc = { type: 'normal', kind: 'ambush', x: p.x, y: p.y, ri, title: 'Les' }; let n = 0;
    for (let k = 0; k < 3 + Math.min(3, Math.floor(G.lvl / 2)) + randi(0, 1); k++) { const q = spotAt(rand(0, TAU), rand(470, 560)); if (!q) continue; const e = mkEnemy(choice(types), q.x, q.y, ri); e.enc = enc; e.aggro = true; G.enemies.push(e); n++; }
    if (n) { G.encs.push(enc); startEncounter(enc); G.banner = { title: 'LES!', sub: 'A démonok körbevettek', line: '', t: 0, dur: 1.8, col: RINGS[ri].col }; sfx('roar'); }
  } else if (r < 0.66) { // vándorló csapat
    const q = spotAt(ahead, 640); if (!q) return;
    for (let k = 0; k < 2 + randi(0, 2); k++) { const f = findFree(q.x + rand(-80, 80), q.y + rand(-80, 80)); const e = mkEnemy(choice(types), f.x, f.y, ri); e.patrol = true; G.enemies.push(e); }
  } else if (r < 0.86) { // bajba jutott lélek
    const q = spotAt(ahead, 560); if (!q) return;
    const enc = { type: 'normal', kind: 'soul', x: q.x, y: q.y, ri, title: 'Bajba jutott lélek', npc: { name: 'Elveszett lélek', look: 'soul', talk: choice(LOST_LINES).map(t => ({ who: 'Elveszett lélek', text: t, col: '#8fe8ff' })), reward: Math.random() < 0.5 ? 'treasure' : null } };
    for (let k = 0; k < 3 + randi(0, 1); k++) { const f = findFree(q.x + Math.cos(k * 2.1) * 90, q.y + Math.sin(k * 2.1) * 90); const e = mkEnemy(choice(types), f.x, f.y, ri); e.enc = enc; e.guard = true; G.enemies.push(e); }
    G.encs.push(enc); floatText(q.x, q.y - 50, 'Segítség…!', '#8fe8ff', 2.5, 16);
  } else { // elátkozott ereklyetartó
    const q = spotAt(ahead, 420); if (!q) return;
    G.encs.push({ type: 'cache', kind: 'cache', x: q.x, y: q.y, ri, taken: false, cursed: Math.random() < 0.45 });
  }
}
function worldUpdate(dt) {
  const p = G.p;
  G.lvl = G.defeated.length;
  // lezárt kapu: amíg a bűn él, nem hagyhatod el a tájat
  sealUpdate(dt);
  // régióváltás
  const reg = regionAt(p.x, p.y);
  if (reg !== G.curReg && !G.dying) regionEnter(reg);
  // köd felfedése
  if ((G.fogT = (G.fogT || 0) - dt) <= 0) {
    G.fogT = 0.25; const tx = Math.floor(p.x / TS), ty = Math.floor(p.y / TS), rr = 11;
    for (let y = ty - rr; y <= ty + rr; y++) for (let x = tx - rr; x <= tx + rr; x++) { if (x < 0 || y < 0 || x >= MW || y >= MH) continue; const i = y * MW + x; if (!G.fog[i] && (x - tx) ** 2 + (y - ty) ** 2 <= rr * rr) { G.fog[i] = 1; FOGG.clearRect(x, y, 1, 1); } }
  }
  if (G.msgT > 0) G.msgT -= dt;
  // Purgatórium: talapzatok, Vergiliusz, a lezárt kapu
  if (G.hub) {
    for (const pd of G.peds) if (Math.hypot(p.x - pd.x, p.y - pd.y) < 26 && G.weapon !== pd.w) swapWeapon(pd.w);
    const hn = G.hubNpc;
    if (!G.flags.hubTalk2 && G.defeated.length > 0 && Math.hypot(p.x - hn.x, p.y - hn.y) < 70) {
      G.flags.hubTalk2 = true; const l = LEVELS.hub && LEVELS.hub.after && LEVELS.hub.after[Math.min(LEVELS.hub.after.length - 1, G.defeated.length - 1)];
      if (l) startTalk(l);
    }
  }
  const g6 = WORLD.passes[6].gate, gx = (g6.x + 0.5) * TS, gy = (g6.y + 0.5) * TS;
  if (WORLD.K[WORLD.gateTiles[0]] === K_GATE && Math.hypot(p.x - gx, p.y - gy) < 110 && G.msgT <= 0) { G.msgT = 2; sfx('block'); floatText(gx, gy - 90, `${6 - G.defeated.filter(i => i < 6).length} lakat zárja még`, '#c08bff', 1.6, 16); }
  // helyszínek
  for (const o of G.pois) {
    const d = Math.hypot(p.x - o.x, p.y - o.y);
    if (!o.found && d < 460) { o.found = true; if (o.title && o.type !== 'start') G.banner = { small: true, title: o.title, sub: { camp: 'Helyszín', boss: BOSSES[o.ri].title }[o.type] || '', line: '', t: 0, dur: 2.4, col: RINGS[o.ri].col }; }
    if (o.type === 'camp') {
      if (!o.cleared && !o.active && d < 380 && !G.arena) {
        o.active = true; o.waveI = 0; startEncounter(o);
        if (o.enterTalk && !o.enterTalked) { o.enterTalked = true; startTalk(o.enterTalk, () => campSpawn(o)); } else campSpawn(o);
      }
      if (o.active) {
        if (d > 1250) { for (const e of encEnemies(o)) e.dead = true; o.active = false; if (G.room === o) G.room = G.regionObjs[G.curReg]; }
        else if (state === 'play' && encEnemies(o).length === 0 && !(o.enterTalk && state === 'talk')) {
          if (o.waveI < o.waves.length - 1) { o.waveI++; campSpawn(o); } else endEncounter(o);
        }
      }
      if (o.cleared && o.npc && !o.talked && d < 90) { o.talked = true; const npc = o.npc; startTalk(npc.talk, () => { soulGift(o.x, o.y + 30, 5); emit('talkEnd', o); }); }
    } else if (o.type === 'boss') {
      const done = G.defeated.includes(o.ri);
      if (!done && !G.arena && d < 7 * TS && !G.dying) startBossArena(o);
    }
  }
  // véletlen találkozások
  for (const enc of G.encs) {
    if (enc.cleared) continue;
    const d = Math.hypot(p.x - enc.x, p.y - enc.y);
    if (enc.kind === 'soul') {
      if (!enc.active && d < 360) { enc.active = true; startEncounter(enc); for (const e of encEnemies(enc)) e.aggro = true; }
      if (enc.active && encEnemies(enc).length === 0) { endEncounter(enc); enc.done = true; }
      if (enc.done && !enc.talked && d < 90) { enc.talked = true; startTalk(enc.npc.talk, () => soulGift(enc.x, enc.y, 6)); }
      if (d > 1800 && !enc.fixed) enc.cleared = true;
    } else if (enc.kind === 'ruin') {
      if (!enc.found && d < 420) { enc.found = true; G.banner = { small: true, title: enc.title, sub: 'Látványosság', line: '', t: 0, dur: 2.6, col: RINGS[enc.ri].col }; }
      if (!enc.read && d < 80) { enc.read = true; startTalk([{ who: enc.title, text: enc.text, col: '#d8c8a8' }], () => { for (let i = 0; i < 3; i++) dropPickup('soul', enc.x, enc.y + 40); }); }
    } else if (enc.kind === 'ambush') {
      if (encEnemies(enc).length === 0) endEncounter(enc);
    } else if (enc.kind === 'cache') {
      if (!enc.taken && d < 34) {
        enc.taken = true;
        if (enc.cursed) {
          floatText(enc.x, enc.y - 40, 'ÁTKOZOTT!', '#ff5a5a', 1.6, 18); sfx('roar'); vfx.shake(8);
          const sub = { type: 'normal', kind: 'ambush', x: enc.x, y: enc.y, ri: enc.ri, onClear: () => soulGift(enc.x, enc.y, 8) };
          const types = RINGS[enc.ri].enemies;
          for (let k = 0; k < 3; k++) { const f = findFree(enc.x + Math.cos(k * 2.1) * 120, enc.y + Math.sin(k * 2.1) * 120); const e = mkEnemy(k ? choice(types) : 'brute', f.x, f.y, enc.ri); e.enc = sub; e.aggro = true; if (!k) { e.elite = true; e.hp *= 1.6; e.maxHp = e.hp; } G.enemies.push(e); }
          G.encs.push(sub); startEncounter(sub);
        } else { for (let i = 0; i < 7; i++) dropPickup('soul', enc.x, enc.y); if (Math.random() < 0.5) dropPickup('heart', enc.x, enc.y); sfx('coin'); floatText(enc.x, enc.y - 40, 'Elrejtett lelkek', '#8fe8ff', 1.4, 15); }
        enc.cleared = true;
      }
      if (d > 2000 && !enc.fixed) enc.cleared = true;
    }
    if (enc.cleared && enc.onClear) { const f = enc.onClear; enc.onClear = null; f(); }
  }
  G.encs = G.encs.filter(e => e.kind === 'ruin' || !(e.cleared && (!e.npc || e.talked || (!e.fixed && Math.hypot(p.x - e.x, p.y - e.y) > 1800))));
  // távoli, nem harcoló démonok eltüntetése
  for (const e of G.enemies) if (!e.boss && !e.enc && !e.lair && !e.aggro && Math.hypot(e.x - p.x, e.y - p.y) > 2600) e.dead = true;
  director(dt);
  // főellenség-aréna, portál
  if (G.afterBoss > 0) { G.afterBoss -= dt; if (G.afterBoss <= 0) openChoice('boss', () => (UPG.afterSin || (f => f()))(() => { G.portal = { x: G.arenaPoi.x, y: G.arenaPoi.y, t: 0 }; G.arena = null; G.p.arena = null; sfx('holy'); })); }
  if (G.winT > 0) { G.winT -= dt; if (G.winT <= 0) { saveBest(true); startTalk(LEVELS.epilogue, () => { state = 'win'; gt = 0; }); } }
  if (G.portal) { G.portal.t += dt; if (dist(G.portal, p) < 34 && G.portal.t > 0.6 && !G.dying) nextRing(); }
  // felszedhető tárgyak: egy perc után elhalványulnak
  for (const k of G.pickupsAll) { if (k.t > 60) k.gone = true; if (!walkable(k.x, k.y, 4)) { k.vx *= -0.5; k.vy *= -0.5; } }
}
function startBossArena(o) {
  G.arenaPoi = o; G.arena = { x: o.x, y: o.y, r: 8.4 * TS }; G.p.arena = G.arena; G.room = o; o.pickups = G.pickupsAll; o.items = []; o.obst = [];
  emit('roomEnter', o);
  for (const e of G.enemies) if (!e.boss && Math.hypot(e.x - o.x, e.y - o.y) < 900) e.dead = true;
  const go = () => spawnBoss(o.x, o.y - 120);
  const lv = LEVELS[o.ri];
  if (lv && lv.bossTalk && !o.bossTalked) { o.bossTalked = true; startTalk(lv.bossTalk, go); } else go();
}

// ---------- minitérkép és köd ----------
const MAPC = document.createElement('canvas'); MAPC.width = MW; MAPC.height = MH;
const FOGC = document.createElement('canvas'); FOGC.width = MW; FOGC.height = MH;
const FOGG = FOGC.getContext('2d');
function buildMinimap() {
  const g = MAPC.getContext('2d'), img = g.createImageData(MW, MH);
  for (let i = 0; i < MW * MH; i++) {
    const k = WORLD.K[i], b = BIOME[WORLD.RG[i]]; let c;
    if (k === K_ABYSS) c = [8, 6, 12]; else if (k === K_ROCK) c = mixC(b.rs, [0, 0, 0], 0.2); else if (k === K_LIQ) c = b.liq || b.g; else if (k === K_GATE) c = [192, 139, 255];
    else c = mixC(b.g, [255, 255, 255], WORLD.PATH[i] ? 0.28 : 0.08);
    img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
const POI_ICON = { camp: ['⚔', '#ff8a6a'], boss: ['☠', '#ff3348'], start: ['▲', '#e8dcc8'] };
function drawMinimap(x0, y0, w, h, sc, full) {
  const p = G.p, ptx = p.x / TS, pty = p.y / TS;
  let sx = full ? 0 : ptx - w / sc / 2, sy = full ? 0 : pty - h / sc / 2;
  const sw = full ? MW : w / sc, sh = full ? MH : h / sc;
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
  ctx.fillStyle = '#05040a'; ctx.fillRect(x0, y0, w, h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(MAPC, sx, sy, sw, sh, x0, y0, w, h);
  ctx.globalAlpha = full ? 0.92 : 0.85; ctx.drawImage(FOGC, sx, sy, sw, sh, x0, y0, w, h); ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true;
  const toS = (tx, ty) => [x0 + (tx - sx) * w / sw, y0 + (ty - sy) * h / sh];
  ctx.textAlign = 'center';
  for (const o of G.pois) {
    if (!o.found) continue; const [x, y] = toS(o.x / TS, o.y / TS), ic = POI_ICON[o.type]; if (!ic) continue;
    const done = (o.type === 'camp' && o.cleared) || (o.type === 'boss' && G.defeated.includes(o.ri));
    ctx.font = `bold ${full ? 13 : 9}px ${SANS}`; ctx.fillStyle = done ? '#6a6470' : ic[1]; ctx.fillText(ic[0], x, y + (full ? 5 : 3));
  }
  if (full) for (const r of REGIONS) { if (r.ri !== 7 && !G.seenReg[r.ri]) continue; const [x, y] = toS(r.tx, r.ty); ctx.font = `700 14px ${SERIF}`; ctx.fillStyle = hexA(r.ri === 7 ? PURG.col : RINGS[r.ri].col, 0.9); ctx.fillText(r.ri === 7 ? 'Purgatórium' : `${ROMAN[r.ri]}. ${RINGS[r.ri].name}`, x, y - 30); }
  const [px, py] = toS(ptx, pty);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, py, full ? 5 : 3, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawWorldMap() {
  ctx.fillStyle = 'rgba(4,3,8,0.92)'; ctx.fillRect(0, 0, W, H);
  const sc = Math.min((W - 80) / MW, (H - 110) / MH), w = MW * sc, h = MH * sc, x0 = (W - w) / 2, y0 = 70;
  ctx.textAlign = 'center'; ctx.font = `900 28px ${SERIF}`; ctx.fillStyle = '#ffe27a'; ctx.fillText('A POKOL TÉRKÉPE', CX, 48);
  drawMinimap(x0, y0, w, h, sc, true);
  ctx.strokeStyle = 'rgba(255,215,94,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 - 0.5, y0 - 0.5, w + 1, h + 1);
  ctx.font = `12px ${SANS}`; ctx.fillStyle = '#bbb';
  ctx.fillText('⚔ helyszín   ☠ a bűn démona (csak ő hagy kísértést)     •     ' + (touch.on ? 'érintés: vissza' : 'N / Esc: vissza'), CX, H - 14);
}

// ---------- terep-darabok (chunk) előrajzolása ----------
function getChunk(cx, cy) {
  const k = cx + ',' + cy, ch = WORLD.chunks;
  if (ch.has(k)) { const c = ch.get(k); ch.delete(k); ch.set(k, c); return c; }
  const c = paintChunk(cx, cy); ch.set(k, c);
  if (ch.size > 16) ch.delete(ch.keys().next().value);
  return c;
}
function paintChunk(cx, cy) {
  const S = CHUNK * TS, c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d'), x0 = cx * CHUNK, y0 = cy * CHUNK, Wd = WORLD;
  g.translate(-x0 * TS, -y0 * TS);
  const K = (x, y) => (x < 0 || y < 0 || x >= MW || y >= MH) ? K_ABYSS : Wd.K[y * MW + x];
  // 1. talaj
  for (let ty = y0 - 1; ty <= y0 + CHUNK; ty++) for (let tx = x0 - 1; tx <= x0 + CHUNK; tx++) {
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
    const i = ty * MW + tx, k = Wd.K[i], b = BIOME[Wd.RG[i]], px = tx * TS, py = ty * TS;
    if (k === K_ABYSS) { g.fillStyle = '#07060b'; g.fillRect(px, py, TS, TS); if (hash2(tx, ty, 3) < 0.06) { g.fillStyle = 'rgba(255,120,60,0.35)'; g.fillRect(px + hash2(tx, ty, 4) * TS, py + hash2(tx, ty, 5) * TS, 2, 2); } continue; }
    let base = mixC(b.g, b.g2, clamp((Wd.NZ[i] - 0.45) * 3, 0, 1));
    if (Wd.BF[i] > 0) { const b2 = BIOME[Wd.RG2[i]]; base = mixC(base, mixC(b2.g, b2.g2, 0.3), Wd.BF[i]); }
    if (k === K_SLOW && b.slow) base = b.slow;
    if (Wd.PATH[i]) base = mixC(base, [150, 140, 120], 0.14);
    g.fillStyle = rgbS(base); g.fillRect(px, py, TS, TS);
    for (let sy = 0; sy < 5; sy++) for (let sx = 0; sx < 5; sx++) {
      const hv = hash2(tx * 5 + sx, ty * 5 + sy, 7); if (hv > 0.55) continue;
      g.fillStyle = rgbS(base, hv < 0.27 ? 0.95 : 1.05); g.fillRect(px + sx * 8, py + sy * 8, 8, 8);
    }
    if (k === K_LIQ && b.liq) {
      const lava = Wd.RG[i] === 4;
      g.fillStyle = rgbS(b.liq, 0.9); g.fillRect(px, py, TS, TS);
      g.strokeStyle = lava ? 'rgba(255,200,80,0.55)' : 'rgba(255,255,255,0.12)'; g.lineWidth = lava ? 2 : 1.2;
      g.beginPath(); const ox = hash2(tx, ty, 8) * 20; g.moveTo(px + ox, py + 12); g.quadraticCurveTo(px + ox + 10, py + 8, px + ox + 20, py + 13); g.stroke();
      if (lava) { g.fillStyle = 'rgba(80,20,10,0.5)'; g.beginPath(); g.ellipse(px + hash2(tx, ty, 9) * TS, py + hash2(tx, ty, 10) * TS, 7, 4, 0, 0, TAU); g.fill(); }
    }
  }
  // 1b. nagy, lágy foltok (egy csempénél nem nagyobbak, így a darabok határán sem törnek)
  for (let ty = y0 - 1; ty <= y0 + CHUNK; ty++) for (let tx = x0 - 1; tx <= x0 + CHUNK; tx++) {
    if (K(tx, ty) !== K_GROUND && K(tx, ty) !== K_SLOW) continue;
    const h = hash2(tx, ty, 51); if (h > 0.3) continue;
    g.fillStyle = h < 0.15 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.035)';
    g.beginPath(); g.ellipse(tx * TS + 20 + (hash2(tx, ty, 52) - 0.5) * 20, ty * TS + 20 + (hash2(tx, ty, 53) - 0.5) * 20, 18 + hash2(tx, ty, 54) * 20, 10 + hash2(tx, ty, 55) * 12, hash2(tx, ty, 56) * 3, 0, TAU); g.fill();
  }
  // 2. folyadékpartok, szakadékperem
  for (let ty = y0 - 1; ty <= y0 + CHUNK; ty++) for (let tx = x0 - 1; tx <= x0 + CHUNK; tx++) {
    const k = K(tx, ty); if (k === K_ABYSS || k === K_ROCK) continue;
    const px = tx * TS, py = ty * TS;
    if (K(tx, ty + 1) === K_ABYSS) { const gr = g.createLinearGradient(0, py + TS - 4, 0, py + TS + 26); gr.addColorStop(0, 'rgba(30,22,26,1)'); gr.addColorStop(1, 'rgba(7,6,11,1)'); g.fillStyle = gr; g.fillRect(px, py + TS - 2, TS, 28); }
    if (k !== K_LIQ) for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (K(tx + dx, ty + dy) === K_LIQ) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(px + (dx > 0 ? TS - 5 : 0), py + (dy > 0 ? TS - 5 : 0), dx ? 5 : TS, dy ? 5 : TS); }
  }
  // 3. apró díszek a talajon
  for (let ty = y0; ty < y0 + CHUNK; ty++) for (let tx = x0; tx < x0 + CHUNK; tx++) {
    if (K(tx, ty) !== K_GROUND) continue;
    const i = ty * MW + tx, reg = Wd.RG[i], h = hash2(tx, ty, 21); if (h > 0.5) continue;
    const px = tx * TS + hash2(tx, ty, 22) * 30 + 5, py = ty * TS + hash2(tx, ty, 23) * 30 + 5, v = hash2(tx, ty, 24);
    groundDetail(g, reg, px, py, v, h);
  }
  // 3b. gore: alvadt vér, csontok, koponyák, belsőségek, vércsíkok
  for (let ty = y0; ty < y0 + CHUNK; ty++) for (let tx = x0; tx < x0 + CHUNK; tx++) {
    if (K(tx, ty) !== K_GROUND && K(tx, ty) !== K_SLOW) continue;
    const h = hash2(tx, ty, 71); if (h > (Wd.RG[ty * MW + tx] === 7 ? 0.08 : 0.26)) continue;
    goreDetail(g, tx * TS + 6 + hash2(tx, ty, 72) * 28, ty * TS + 6 + hash2(tx, ty, 73) * 28, hash2(tx, ty, 74), h, tx * 131 + ty);
  }
  // 4. Purgatórium: mozaik a középpontban
  const C = Wd.C, ccx = (C.tx + 0.5) * TS, ccy = (C.ty + 0.5) * TS;
  if (Math.abs(ccx - (x0 + CHUNK / 2) * TS) < CHUNK * TS && Math.abs(ccy - (y0 + CHUNK / 2) * TS) < CHUNK * TS) {
    g.save(); g.translate(ccx, ccy);
    g.fillStyle = 'rgba(210,214,224,0.10)'; g.beginPath(); g.arc(0, 0, 9.5 * TS, 0, TAU); g.fill();
    for (let r = 1; r <= 9; r++) { g.strokeStyle = `rgba(230,232,240,${0.06 + (r % 3 === 0 ? 0.08 : 0)})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * TS, 0, TAU); g.stroke(); }
    g.strokeStyle = 'rgba(240,226,180,0.28)'; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k <= 7; k++) { const a = -Math.PI / 2 + k * TAU * 3 / 7; k ? g.lineTo(Math.cos(a) * 4.5 * TS, Math.sin(a) * 4.5 * TS) : g.moveTo(Math.cos(a) * 4.5 * TS, Math.sin(a) * 4.5 * TS); }
    g.stroke();
    for (let k = 0; k < 7; k++) { const R0 = REGIONS[k], a = Math.atan2(R0.ty - C.ty, R0.tx - C.tx); g.fillStyle = hexA(RINGS[k].col, 0.35); g.beginPath(); g.arc(Math.cos(a) * 5.4 * TS, Math.sin(a) * 5.4 * TS, 9, 0, TAU); g.fill(); }
    g.restore();
  }
  // 5. sziklák: szabálytalan kőtömbök sötét oldallappal – soronként, hogy a lentebbiek takarják a fentieket
  const poly = (cx, cy, rad, seed, sx = 1, sy = 1) => { g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + hash2(seed, k, 61) * 0.5, r = rad * (0.78 + hash2(seed, k, 62) * 0.32); const x = cx + Math.cos(a) * r * sx, y = cy + Math.sin(a) * r * sy; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
  for (let ty = y0 - 2; ty <= y0 + CHUNK + 1; ty++) for (let tx = x0 - 1; tx <= x0 + CHUNK; tx++) {
    if (K(tx, ty) !== K_ROCK) continue;
    const b = BIOME[Wd.RG[clamp(ty, 0, MH - 1) * MW + clamp(tx, 0, MW - 1)]], px = tx * TS + TS / 2, py = ty * TS + TS / 2;
    const open = K(tx, ty + 1) !== K_ROCK, j = (hash2(tx, ty, 31) - 0.5) * 0.14, seed = tx * 977 + ty;
    const rad = TS * (0.66 + hash2(tx, ty, 32) * 0.16), ox = (hash2(tx, ty, 34) - 0.5) * 8;
    if (open) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(px + 4, py + TS * 0.62, rad * 1.05, 9, 0, 0, TAU); g.fill(); }
    g.fillStyle = rgbS(b.rs, 0.95 + j); poly(px + ox, py + (open ? 10 : 6), rad, seed, 1.05, 0.95); g.fill();
    g.fillStyle = rgbS(b.rt, 0.84 + j); poly(px + ox, py - 2, rad * 0.94, seed + 1, 1, 0.82); g.fill();
    g.fillStyle = rgbS(b.rt, 1.02 + j); poly(px + ox - 5, py - 7, rad * 0.55, seed + 2, 1, 0.75); g.fill();
    g.strokeStyle = rgbS(b.rs, 0.7); g.lineWidth = 1; poly(px + ox, py - 2, rad * 0.94, seed + 1, 1, 0.82); g.stroke();
  }
  return c;
}
function goreDetail(g, x, y, v, h, seed) {
  if (h < 0.09) { // alvadt vértócsa
    const r = 8 + v * 16; g.fillStyle = 'rgba(58,4,6,0.72)'; g.beginPath();
    for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rr = r * (0.65 + hash2(seed, k, 81) * 0.55); k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6); }
    g.closePath(); g.fill(); g.fillStyle = 'rgba(110,10,12,0.4)'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.1, r * 0.4, r * 0.2, 0, 0, TAU); g.fill();
    for (let k = 0; k < 4; k++) { g.fillStyle = 'rgba(70,6,8,0.7)'; g.beginPath(); g.arc(x + (hash2(seed, k, 82) - 0.5) * r * 3, y + (hash2(seed, k, 83) - 0.5) * r * 1.6, 1 + hash2(seed, k, 84) * 2, 0, TAU); g.fill(); }
  } else if (h < 0.14) { // vércsík (húzásnyom)
    g.strokeStyle = 'rgba(60,4,6,0.55)'; g.lineWidth = 3 + v * 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - 14, y - 4); g.quadraticCurveTo(x, y + 6 * (v - 0.5), x + 16, y + 3); g.stroke();
  } else if (h < 0.18) { // koponya
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + 4, 7, 3, 0, 0, TAU); g.fill();
    g.fillStyle = '#b8ac90'; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); g.fillRect(x - 3.5, y + 2, 7, 4);
    g.fillStyle = '#1a0c0a'; g.beginPath(); g.arc(x - 2, y, 1.6, 0, TAU); g.arc(x + 2, y, 1.6, 0, TAU); g.fill(); g.fillRect(x - 0.5, y + 2, 1, 2);
    g.fillStyle = 'rgba(90,8,10,0.6)'; g.beginPath(); g.arc(x + 3, y - 3, 2.4, 0, TAU); g.fill();
  } else if (h < 0.22) { // szétszórt csontok
    g.strokeStyle = '#a89c80'; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let k = 0; k < 3; k++) { const a = hash2(seed, k, 85) * 3, cx = x + (hash2(seed, k, 86) - 0.5) * 18, cy = y + (hash2(seed, k, 87) - 0.5) * 10; g.beginPath(); g.moveTo(cx - Math.cos(a) * 6, cy - Math.sin(a) * 3); g.lineTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 3); g.stroke(); }
  } else { // húscafat, belsőség
    g.fillStyle = 'rgba(50,4,6,0.6)'; g.beginPath(); g.ellipse(x, y + 2, 8, 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#6a1a18'; g.beginPath(); g.ellipse(x, y, 5 + v * 3, 3, v * 3, 0, TAU); g.fill();
    g.fillStyle = '#8a3a30'; g.beginPath(); g.ellipse(x - 1, y - 1, 2.5, 1.4, v * 3, 0, TAU); g.fill();
  }
}
function groundDetail(g, reg, x, y, v, h) {
  if (h < 0.18) { g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(x, y + 2, 4, 2, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,110,105,0.25)'; g.beginPath(); g.ellipse(x, y, 3.5, 2.4, 0, 0, TAU); g.fill(); return; }
  if (h < 0.3) { g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x - 2, y + 3); g.lineTo(x + 6, y - 1); g.stroke(); return; }
  switch (reg) {
    case 7: case 3: g.strokeStyle = reg === 7 ? 'rgba(130,150,110,0.55)' : 'rgba(90,120,100,0.55)'; g.lineWidth = 1.2; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(x + k * 3, y + 3); g.lineTo(x + k * 4 + (v - 0.5) * 4, y - 5); g.stroke(); } break;
    case 0: g.fillStyle = v < 0.5 ? 'rgba(120,30,40,0.6)' : 'rgba(150,40,50,0.45)'; g.beginPath(); g.ellipse(x, y, 3, 1.6, v * 3, 0, TAU); g.fill(); break;
    case 1: g.strokeStyle = 'rgba(220,210,180,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y + (v - 0.5) * 4); g.stroke(); break;
    case 2: g.fillStyle = 'rgba(150,110,40,0.55)'; g.beginPath(); g.ellipse(x, y, 3, 2, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,80,20,0.6)'; g.fillRect(x - 1, y - 0.5, 2, 1); break;
    case 4: g.fillStyle = v < 0.3 ? 'rgba(255,110,40,0.55)' : 'rgba(20,10,8,0.45)'; g.beginPath(); g.arc(x, y, 2 + v * 2, 0, TAU); g.fill(); break;
    case 5: g.fillStyle = 'rgba(60,110,80,0.4)'; g.beginPath(); g.moveTo(x, y - 5); g.lineTo(x + 2.5, y + 2); g.lineTo(x - 2.5, y + 2); g.fill(); break;
    case 6: g.fillStyle = 'rgba(150,150,170,0.25)'; g.beginPath(); g.ellipse(x, y, 8 + v * 6, 3, 0, 0, TAU); g.fill(); break;
  }
}

// ---------- magas díszletek: előre megrajzolt képek, mélység szerint rendezve ----------
const SPR = {};
function decorSprite(kind, v) {
  const k = kind + v; if (SPR[k]) return SPR[k];
  const c = document.createElement('canvas'); c.width = 120; c.height = 150; const g = c.getContext('2d'), r = mulberry(kind.length * 31 + v * 7 + 3);
  g.translate(60, 140);
  const shadow = (w) => { g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0, 0, w, w * 0.32, 0, 0, TAU); g.fill(); };
  const lg = (x0, x1, c0, c1) => { const q = g.createLinearGradient(x0, 0, x1, 0); q.addColorStop(0, c0); q.addColorStop(1, c1); return q; };
  switch (kind) {
    case 'cypress': shadow(16); g.fillStyle = '#3a2c20'; g.fillRect(-3, -14, 6, 14); g.fillStyle = lg(-14, 14, '#2e4a32', '#1a2c1e'); g.beginPath(); g.moveTo(0, -112 - v * 8); g.quadraticCurveTo(18, -60, 12, -12); g.quadraticCurveTo(0, -6, -12, -12); g.quadraticCurveTo(-18, -60, 0, -112 - v * 8); g.fill(); g.strokeStyle = 'rgba(120,160,110,0.25)'; g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(-6, -20 - i * 15); g.lineTo(2, -28 - i * 15); g.stroke(); } break;
    case 'pillar': shadow(18); { const h = 70 + v * 18, broken = v === 1; g.fillStyle = '#6c7182'; g.fillRect(-16, -10, 32, 10); g.fillStyle = lg(-12, 12, '#d4d8e2', '#8a90a2'); g.fillRect(-12, -h, 24, h - 10); g.strokeStyle = 'rgba(0,0,0,0.18)'; for (let i = -8; i <= 8; i += 5) { g.beginPath(); g.moveTo(i, -h); g.lineTo(i, -10); g.stroke(); } if (!broken) { g.fillStyle = '#b8bdca'; g.fillRect(-16, -h - 8, 32, 8); } else { g.fillStyle = '#8a90a2'; g.beginPath(); g.moveTo(-12, -h); g.lineTo(-4, -h - 10); g.lineTo(4, -h - 2); g.lineTo(12, -h - 8); g.lineTo(12, -h); g.fill(); } } break;
    case 'stone': shadow(16); g.fillStyle = '#5c6070'; g.beginPath(); g.ellipse(0, -8, 16, 11, 0, 0, TAU); g.fill(); g.fillStyle = '#7c8192'; g.beginPath(); g.ellipse(-3, -11, 11, 7, 0, 0, TAU); g.fill(); break;
    case 'rose': shadow(18); g.strokeStyle = '#2a1a1e'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo((r() - 0.5) * 30, -20, (r() - 0.5) * 40, -18 - r() * 26); g.stroke(); } g.fillStyle = '#3b2430'; g.beginPath(); g.ellipse(0, -18, 20, 14, 0, 0, TAU); g.fill(); for (let i = 0; i < 6; i++) { const x = (r() - 0.5) * 32, y = -10 - r() * 30; g.fillStyle = '#9c2a4a'; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); g.fillStyle = '#d8507a'; g.beginPath(); g.arc(x - 1, y - 1, 2.2, 0, TAU); g.fill(); } break;
    case 'statue': shadow(18); g.fillStyle = '#4c4e5a'; g.fillRect(-16, -16, 32, 16); g.fillStyle = lg(-12, 12, '#b9bcc8', '#6e7282'); g.beginPath(); g.moveTo(-10, -16); g.lineTo(-12, -60); g.quadraticCurveTo(0, -70, 12, -60); g.lineTo(10, -16); g.fill(); g.beginPath(); g.arc(0, -72, 8, 0, TAU); g.fill(); g.fillStyle = '#9ea2b0'; g.beginPath(); g.moveTo(-12, -58); g.quadraticCurveTo(-30, -66 - v * 6, -26, -40); g.quadraticCurveTo(-18, -48, -12, -46); g.fill(); g.beginPath(); g.moveTo(12, -58); g.quadraticCurveTo(30, -66 - v * 6, 26, -40); g.quadraticCurveTo(18, -48, 12, -46); g.fill(); g.fillStyle = 'rgba(40,30,50,0.6)'; g.fillRect(-3, -73, 2, 6); g.fillRect(2, -73, 2, 6); break;
    case 'deadtree': shadow(14); g.strokeStyle = '#2e2420'; g.lineCap = 'round'; const br = (x, y, a, l, w) => { if (l < 6) return; const x2 = x + Math.cos(a) * l, y2 = y + Math.sin(a) * l; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); br(x2, y2, a - 0.4 - r() * 0.3, l * 0.68, w * 0.65); br(x2, y2, a + 0.35 + r() * 0.3, l * 0.62, w * 0.65); }; br(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.3, 34 + v * 6, 7); break;
    case 'reeds': for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * 24; g.strokeStyle = r() < 0.5 ? '#5c6e52' : '#46583e'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + (r() - 0.5) * 10, -18, x + (r() - 0.5) * 14, -30 - r() * 14); g.stroke(); } break;
    case 'ribs': shadow(22); g.strokeStyle = '#d8d0b8'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-26, -6); g.lineTo(26, -6); g.stroke(); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 10, -6); g.quadraticCurveTo(i * 10 - 10, -40, i * 10 + 4, -46 + Math.abs(i) * 6); g.stroke(); } break;
    case 'urn': shadow(12); g.fillStyle = lg(-12, 12, '#a07a50', '#5a3e24'); g.beginPath(); g.moveTo(-6, -36); g.quadraticCurveTo(-16, -22, -10, -2); g.lineTo(10, -2); g.quadraticCurveTo(16, -22, 6, -36); g.fill(); g.fillStyle = '#3e2a18'; g.fillRect(-7, -40, 14, 5); g.strokeStyle = 'rgba(255,220,140,0.35)'; g.beginPath(); g.moveTo(-10, -20); g.lineTo(10, -20); g.stroke(); break;
    case 'goldpile': shadow(24); for (let i = 0; i < 26; i++) { const x = (r() - 0.5) * 44 * (1 - i / 34), y = -2 - i * 1.2 - r() * 3; g.fillStyle = r() < 0.5 ? '#d8a830' : '#f0c850'; g.beginPath(); g.ellipse(x, y, 5, 3, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(110,70,10,0.6)'; g.lineWidth = 0.8; g.stroke(); } if (v === 2) { g.fillStyle = '#6a4424'; g.fillRect(-12, -30, 24, 14); g.fillStyle = '#c89838'; g.fillRect(-12, -32, 24, 4); } break;
    case 'spire': shadow(16); g.fillStyle = lg(-14, 14, '#4e3a36', '#1e1412'); g.beginPath(); g.moveTo(-14, 0); g.lineTo(-4, -70 - v * 14); g.lineTo(4, -58 - v * 10); g.lineTo(14, 0); g.fill(); g.strokeStyle = 'rgba(255,110,40,0.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -8); g.lineTo(-2, -30); g.lineTo(2, -44); g.stroke(); break;
    case 'crystal': shadow(16); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.32, h = 26 + r() * 30, x = (i - 2) * 6; g.fillStyle = i % 2 ? '#3a8a64' : '#56b888'; g.beginPath(); g.moveTo(x - 6, 0); g.lineTo(x + Math.cos(a) * h, Math.sin(a) * h); g.lineTo(x + 6, 0); g.fill(); g.fillStyle = 'rgba(220,255,235,0.35)'; g.beginPath(); g.moveTo(x - 2, -2); g.lineTo(x + Math.cos(a) * h * 0.9, Math.sin(a) * h * 0.9); g.lineTo(x + 1, -2); g.fill(); } break;
    case 'mirror': shadow(14); g.fillStyle = '#3a2c22'; g.fillRect(-16, -62, 32, 58); g.fillStyle = lg(-12, 12, '#7aa898', '#2e4a40'); g.fillRect(-12, -58, 24, 50); g.strokeStyle = 'rgba(230,255,245,0.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, -50); g.lineTo(2, -30); g.lineTo(-4, -16); g.moveTo(2, -30); g.lineTo(10, -40); g.stroke(); g.fillStyle = '#3a2c22'; g.fillRect(-4, -4, 8, 4); break;
    case 'impaled': { shadow(14); g.strokeStyle = '#3a2618'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(-2, -104); g.stroke(); g.strokeStyle = '#1a0e08'; g.lineWidth = 1; g.stroke();
      const lean = (r() - 0.5) * 0.4; g.save(); g.translate(-1, -64); g.rotate(lean);
      g.fillStyle = '#6a3a30'; g.strokeStyle = '#140808'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(0, 0, 9, 16, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#5a2a22'; g.beginPath(); g.arc(-2, -20, 7, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#5a2a22'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(-7, -8); g.lineTo(-14, 10); g.moveTo(7, -8); g.lineTo(13, 8); g.moveTo(-4, 14); g.lineTo(-6, 34); g.moveTo(4, 14); g.lineTo(7, 32); g.stroke();
      g.fillStyle = 'rgba(110,8,8,0.9)'; g.beginPath(); g.ellipse(0, 4, 5, 9, 0, 0, TAU); g.fill(); g.restore();
      g.fillStyle = '#d8ceb0'; g.beginPath(); g.moveTo(-4, -104); g.lineTo(-2, -116); g.lineTo(0, -104); g.fill();
      g.strokeStyle = 'rgba(110,8,8,0.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-1, -40); g.lineTo(-1, -2); g.stroke(); g.fillStyle = 'rgba(80,4,4,0.7)'; g.beginPath(); g.ellipse(0, 0, 14, 5, 0, 0, TAU); g.fill(); break; }
    case 'gibbet': { shadow(14); g.strokeStyle = '#2e2014'; g.lineWidth = 5; g.beginPath(); g.moveTo(-14, 0); g.lineTo(-14, -112); g.lineTo(18, -112); g.stroke(); g.lineWidth = 1.2; g.strokeStyle = '#5a5048'; g.beginPath(); g.moveTo(12, -112); g.lineTo(12, -86); g.stroke();
      g.fillStyle = '#5a3a30'; g.strokeStyle = '#140808'; g.beginPath(); g.ellipse(12, -66, 8, 18, 0.1, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#4a2a22'; g.beginPath(); g.arc(12, -88, 6, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#4a2a22'; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, -50); g.lineTo(7, -30); g.moveTo(15, -50); g.lineTo(16, -32); g.stroke(); g.fillStyle = 'rgba(80,4,4,0.6)'; g.beginPath(); g.ellipse(12, 0, 10, 3, 0, 0, TAU); g.fill(); break; }
    case 'cage': { shadow(16); g.strokeStyle = '#2e2014'; g.lineWidth = 4; g.beginPath(); g.moveTo(-20, 0); g.lineTo(-20, -118); g.lineTo(4, -118); g.stroke();
      g.strokeStyle = '#4a4440'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -118); g.lineTo(0, -96); g.stroke();
      g.fillStyle = 'rgba(40,20,16,0.6)'; g.beginPath(); g.ellipse(0, -70, 14, 26, 0, 0, TAU); g.fill();
      g.fillStyle = '#d8ceb0'; g.beginPath(); g.arc(-2, -62, 5, 0, TAU); g.fill(); g.fillRect(-5, -56, 6, 14);
      g.strokeStyle = '#5a5450'; g.lineWidth = 1.6; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 6, -96); g.quadraticCurveTo(i * 9, -70, i * 6, -44); g.stroke(); } g.beginPath(); g.ellipse(0, -96, 13, 3, 0, 0, TAU); g.ellipse(0, -44, 13, 3, 0, 0, TAU); g.stroke(); break; }
    case 'skulls': { shadow(24); for (let i = 0; i < 16; i++) { const row = i < 7 ? 0 : i < 12 ? 1 : i < 15 ? 2 : 3, cnt = [7, 5, 3, 1][row], j = (i - [0, 7, 12, 15][row]), x = (j - (cnt - 1) / 2) * 11 + (r() - 0.5) * 2, y = -6 - row * 9;
        g.fillStyle = r() < 0.5 ? '#d8ceb0' : '#bfb498'; g.strokeStyle = '#2a2018'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#1a1410'; g.fillRect(x - 3, y - 1, 2, 2); g.fillRect(x + 1, y - 1, 2, 2); g.fillRect(x - 1, y + 2, 2, 1.5); }
      g.fillStyle = 'rgba(90,6,6,0.6)'; g.beginPath(); g.ellipse(4, -2, 10, 3, 0, 0, TAU); g.fill(); break; }
    case 'bonepile': { shadow(20); for (let i = 0; i < 12; i++) { const x = (r() - 0.5) * 34, y = -2 - r() * 10, a = r() * 3; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#cfc4a6'; g.fillRect(-8, -1.2, 16, 2.4); g.beginPath(); g.arc(-8, 0, 2, 0, TAU); g.arc(8, 0, 2, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = '#d8ceb0'; g.beginPath(); g.arc(6, -12, 5, 0, TAU); g.fill(); g.fillStyle = '#1a1410'; g.fillRect(3, -13, 2, 2); g.fillRect(7, -13, 2, 2); break; }
    case 'ruinarch': { shadow(40); g.fillStyle = lg(-50, 50, '#6a6470', '#3a3640'); g.strokeStyle = '#141018'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-48, 0); g.lineTo(-48, -88); g.quadraticCurveTo(-48, -128, 0, -132); g.lineTo(0, -116); g.quadraticCurveTo(-32, -110, -32, -84); g.lineTo(-32, 0); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(48, 0); g.lineTo(48, -70); g.lineTo(40, -84); g.lineTo(32, -76); g.lineTo(32, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#4a4450'; for (let i = 0; i < 6; i++) { g.fillRect(-46 + r() * 10, -10 - i * 14, 10, 2); }
      g.fillStyle = 'rgba(90,6,6,0.55)'; g.beginPath(); g.moveTo(-44, -60); g.lineTo(-40, -20); g.lineTo(-36, -60); g.fill();
      g.fillStyle = '#5a5460'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(-10 + i * 12 + (r() - 0.5) * 6, -4, 8, 5, r(), 0, TAU); g.fill(); } break; }
    case 'icespike': shadow(14); for (let i = 0; i < 3; i++) { const x = (i - 1) * 9, h = 34 + r() * 34; g.fillStyle = lg(x - 7, x + 7, '#e8eeff', '#8a98c8'); g.beginPath(); g.moveTo(x - 7, 0); g.lineTo(x + (r() - 0.5) * 6, -h); g.lineTo(x + 7, 0); g.fill(); } break;
  }
  SPR[k] = c; return c;
}
function drawDecor(d) { const c = decorSprite(d.kind, d.v); ctx.drawImage(c, d.x - 60, d.y - 140); }

// ---------- helyszínek rajza ----------
function drawPoi(o) {
  const col = RINGS[o.ri].col, t = gt;
  if (o.type === 'camp') {
    // tábortüzek a helyszín körül
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + o.ri, x = o.x + Math.cos(a) * 130, y = o.y + Math.sin(a) * 90; brazier(x, y, o.cleared ? '#8a8070' : col, !o.cleared); }
    if (o.npc && !o.talked) drawNpc({ x: o.x + 40, y: o.y - 10, name: o.npc.name, look: o.npc.look || 'soul' }, o.cleared);
  } else if (o.type === 'start') {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 4, 22, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#54586a'; ctx.beginPath(); ctx.moveTo(o.x - 12, o.y + 2); ctx.lineTo(o.x - 8, o.y - 64); ctx.lineTo(o.x, o.y - 74); ctx.lineTo(o.x + 8, o.y - 64); ctx.lineTo(o.x + 12, o.y + 2); ctx.fill();
    ctx.fillStyle = '#7a7f92'; ctx.beginPath(); ctx.moveTo(o.x - 8, o.y - 64); ctx.lineTo(o.x, o.y - 74); ctx.lineTo(o.x, o.y + 2); ctx.lineTo(o.x - 12, o.y + 2); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = `700 13px ${SERIF}`; ctx.fillStyle = col; ctx.fillText(ROMAN[o.ri], o.x, o.y - 34);
  } else if (o.type === 'boss') {
    const done = G.defeated.includes(o.ri), r0 = 8.4 * TS;
    ctx.strokeStyle = hexA(col, done ? 0.12 : 0.28); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(o.x, o.y, r0 - 20, 0, TAU); ctx.stroke();
    ctx.beginPath(); for (let k = 0; k <= 5; k++) { const a = -Math.PI / 2 + k * TAU * 2 / 5; const x = o.x + Math.cos(a) * (r0 - 40), y = o.y + Math.sin(a) * (r0 - 40); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; brazier(o.x + Math.cos(a) * (r0 + 6), o.y + Math.sin(a) * (r0 + 6), done ? '#7a7280' : col, !done && !!G.arena); }
    if (G.arena && G.arenaPoi === o) { ctx.strokeStyle = hexA(col, 0.5 + Math.sin(t * 6) * 0.15); ctx.lineWidth = 5; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 40; ctx.beginPath(); ctx.arc(o.x, o.y, G.arena.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
  }
}
function brazier(x, y, col, lit) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 12, 4, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a3440'; ctx.fillRect(x - 3, y - 14, 6, 18); ctx.fillStyle = '#56505e'; ctx.beginPath(); ctx.ellipse(x, y - 15, 10, 4, 0, 0, TAU); ctx.fill();
  if (lit) { const f = 1 + Math.sin(gt * 12 + x) * 0.15; ctx.fillStyle = hexA(col, 0.85); ctx.beginPath(); ctx.ellipse(x, y - 22, 5, 9 * f, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff2d0'; ctx.beginPath(); ctx.ellipse(x, y - 20, 2.2, 4.5 * f, 0, 0, TAU); ctx.fill(); }
}
function drawEncs() {
  for (const enc of G.encs) {
    if (enc.kind === 'soul' && enc.npc && !enc.talked) drawNpc({ x: enc.x, y: enc.y, name: enc.npc.name, look: 'soul' }, !!enc.done);
    if (enc.kind === 'cache' && !enc.taken) {
      const x = enc.x, y = enc.y;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 10, 22, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a3e26'; ctx.fillRect(x - 18, y - 12, 36, 22); ctx.fillStyle = '#7a5634'; ctx.fillRect(x - 18, y - 18, 36, 8);
      ctx.fillStyle = '#c8a050'; ctx.fillRect(x - 3, y - 10, 6, 8); ctx.fillRect(x - 18, y - 4, 36, 2);
      ctx.font = `11px ${SANS}`; ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc8'; ctx.fillText('Ereklyetartó', x, y + 28);
    }
  }
}
// a Purgatórium kapui (dísz) és a Kevélység lezárt kapuja
function drawGates() {
  const C = WORLD.C;
  for (let ri = 0; ri <= 6; ri++) {
    const ps = WORLD.passes[ri], x = (ps.gate.x + 0.5) * TS, y = (ps.gate.y + 0.5) * TS;
    if (Math.abs(x - G.p.x) > 900 || Math.abs(y - G.p.y) > 700) continue;
    drawGate({ ri, x, y: y - 10 });
  }
  drawSeal();
}
// a bezárult kapu: izzó rácsok a hágóban, a bűn táján belül
function drawSeal() {
  const ri = G.sealed; if (ri === undefined || ri === null) return;
  const ps = WORLD.passes[ri], x = (ps.seal.x + 0.5) * TS, y = (ps.seal.y + 0.5) * TS, col = RINGS[ri].col;
  if (Math.abs(x - G.p.x) > 900 || Math.abs(y - G.p.y) > 700) return;
  const px = -ps.u.y, py = ps.u.x, half = 2.6 * TS, t = gt;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = hexA(col, 0.35); ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x - px * half, y - py * half); ctx.lineTo(x + px * half, y + py * half); ctx.stroke();
  for (let k = -5; k <= 5; k++) {
    const bx = x + px * k * half / 5.5, by = y + py * k * half / 5.5;
    ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(bx, by + 10); ctx.lineTo(bx, by - 52); ctx.stroke();
    ctx.strokeStyle = hexA(col, 0.75 + Math.sin(t * 4 + k) * 0.2); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by + 8); ctx.lineTo(bx, by - 50); ctx.stroke();
  }
  ctx.fillStyle = col; ctx.font = `700 13px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('LEZÁRVA', x, y - 64);
  ctx.restore();
}
function drawGate(g) {
  const ri = g.ri, rg = RINGS[ri], big = ri === 6, done = G.defeated.includes(ri), locked = big && WORLD.K[WORLD.gateTiles[0]] === K_GATE;
  const w = big ? 40 : 30, top = g.y - (big ? 40 : 28), base = g.y + 28;
  const arch = r => { ctx.beginPath(); ctx.moveTo(g.x - r, base); ctx.lineTo(g.x - r, top); ctx.arc(g.x, top, r, Math.PI, 0); ctx.lineTo(g.x + r, base); ctx.closePath(); };
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(g.x, base + 2, w + 16, 8, 0, 0, TAU); ctx.fill();
  const sg = ctx.createLinearGradient(g.x - w - 10, 0, g.x + w + 10, 0); sg.addColorStop(0, '#454b5c'); sg.addColorStop(0.5, done ? '#6a7080' : '#9aa2b4'); sg.addColorStop(1, '#3a4050');
  ctx.fillStyle = sg; arch(w + 9); ctx.fill();
  ctx.save(); arch(w); ctx.clip();
  if (locked) { ctx.fillStyle = '#1c1428'; ctx.fillRect(g.x - w, top - w, w * 2, base - top + w); }
  else { const ig = ctx.createLinearGradient(0, top - w, 0, base); ig.addColorStop(0, hexA(rg.col, done ? 0.15 : 0.45)); ig.addColorStop(1, 'rgba(10,8,14,0.9)'); ctx.fillStyle = ig; ctx.fillRect(g.x - w, top - w, w * 2, base - top + w); }
  ctx.restore();
  if (locked) {
    ctx.strokeStyle = '#5a5468'; ctx.lineWidth = 4; ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(g.x - w, top); ctx.lineTo(g.x + w, base - 6); ctx.moveTo(g.x + w, top); ctx.lineTo(g.x - w, base - 6); ctx.stroke(); ctx.setLineDash([]);
    for (let k = 0; k < 6; k++) {
      if (G.defeated.includes(k)) continue;
      const a = Math.PI + (k + 0.5) / 6 * Math.PI, x = g.x + Math.cos(a) * (w + 14), y = top + Math.sin(a) * (w + 14), c = RINGS[k].col;
      ctx.strokeStyle = '#c8c8d0'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - 4, 5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(x - 7, y - 4, 14, 11); ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y, 2, 4);
    }
  }
  ctx.textAlign = 'center'; ctx.font = `700 ${big ? 15 : 13}px ${SERIF}`; ctx.fillStyle = done ? '#7a8090' : rg.col;
  ctx.fillText(`${ROMAN[ri]}. ${rg.name}`, g.x, top - w - (big ? 30 : 14));
}
