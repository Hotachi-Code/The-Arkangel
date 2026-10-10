// =====================================================================
//  ELLENSÉGES MESTERSÉGES INTELLIGENCIA
//  Nincs töltényeső: minden démon néhány előre jelzett mozdulatból választ
//  (közelharc, távolsági, különleges). Az MI a távolság, a rálátás, a
//  saját állapota, a társai és egy kis véletlen alapján dönt; egyszerre csak
//  néhány démon támadhat, a többi kerülget és helyezkedik.
// =====================================================================

// ---------- mozdulatok ----------
// kind: melee | ranged | special ; min/max: távolság ; wind/act/rec: felkészülés / hatás / kifújás (mp) ; cd: újratöltés
// shape: arc (ív), circle (maga körül), line (roham), proj (lövedék), lob (célzott becsapódás), rain (több becsapódás),
//        blink (teleport), beam (sugár), summon (idézés), pull (csábítás), spin (pörgés), quake (repedés-sor)
const MOVES = {
  bite: { kind: 'melee', min: 0, max: 74, wind: 0.38, act: 0.14, rec: 0.45, cd: 1.3, shape: 'arc', r: 62, half: 0.75, dmg: 1.0, lunge: 260 },
  claw: { kind: 'melee', min: 0, max: 80, wind: 0.32, act: 0.12, rec: 0.35, cd: 1.0, shape: 'arc', r: 66, half: 0.9, dmg: 0.8, lunge: 160 },
  dart: { kind: 'melee', min: 20, max: 170, wind: 0.42, act: 0.3, rec: 0.5, cd: 2.2, shape: 'line', spd: 520, w: 24, dmg: 0.8 },
  swipe: { kind: 'melee', min: 0, max: 100, wind: 0.6, act: 0.14, rec: 0.6, cd: 1.8, shape: 'arc', r: 96, half: 1.1, dmg: 1.4, lunge: 120 },
  slam: { kind: 'melee', min: 0, max: 120, wind: 0.8, act: 0.12, rec: 0.8, cd: 3.2, shape: 'circle', r: 108, dmg: 1.8, shake: 8 },
  charge: { kind: 'melee', min: 130, max: 430, wind: 0.65, act: 0.6, rec: 0.7, cd: 4.2, shape: 'line', spd: 600, w: 46, dmg: 1.5, shake: 6 },
  belly: { kind: 'melee', min: 0, max: 95, wind: 0.6, act: 0.1, rec: 0.7, cd: 2.6, shape: 'circle', r: 84, dmg: 1.3 },
  backstab: { kind: 'melee', min: 0, max: 80, wind: 0.22, act: 0.12, rec: 0.5, cd: 1.6, shape: 'arc', r: 64, half: 0.8, dmg: 1.3, lunge: 200 },
  spit: { kind: 'ranged', min: 110, max: 470, wind: 0.5, act: 0.05, rec: 0.55, cd: 1.8, shape: 'proj', n: 1, spread: 0, spd: 270, br: 8, dmg: 0.85 },
  spread3: { kind: 'ranged', min: 140, max: 420, wind: 0.62, act: 0.05, rec: 0.7, cd: 3.6, shape: 'proj', n: 3, spread: 0.26, spd: 240, br: 7, dmg: 0.7 },
  fireball: { kind: 'ranged', min: 170, max: 500, wind: 0.55, act: 0.05, rec: 0.6, cd: 3.4, shape: 'proj', n: 1, spread: 0, spd: 230, br: 10, dmg: 1.0 },
  lob: { kind: 'ranged', min: 150, max: 500, wind: 0.42, act: 0.05, rec: 0.6, cd: 3.4, shape: 'lob', r: 62, delay: 1.0, dmg: 1.3 },
  orb: { kind: 'ranged', min: 150, max: 480, wind: 0.55, act: 0.05, rec: 0.6, cd: 3.0, shape: 'proj', n: 2, spread: 0.5, spd: 150, br: 9, dmg: 0.8, homing: 1.1, life: 4 },
  volley: { kind: 'ranged', min: 60, max: 520, wind: 0.6, act: 0.6, rec: 0.9, cd: 2.6, shape: 'proj', n: 1, spread: 0.06, spd: 300, br: 7, dmg: 0.7, burst: 3 },
  blink: { kind: 'special', min: 140, max: 640, wind: 0.4, act: 0.05, rec: 0.12, cd: 4.5, shape: 'blink', then: 'backstab' },
  retreat: { kind: 'special', min: 0, max: 120, wind: 0.15, act: 0.35, rec: 0.2, cd: 3.5, shape: 'hop' },
  howl: { kind: 'special', min: 0, max: 520, wind: 0.6, act: 0.05, rec: 0.4, cd: 9, shape: 'howl' },
  // ----- főellenségek -----
  whip: { kind: 'melee', min: 0, max: 150, wind: 0.55, act: 0.14, rec: 0.55, cd: 1.8, shape: 'arc', r: 140, half: 1.0, dmg: 1.4, lunge: 120 },
  combo: { kind: 'melee', min: 0, max: 140, wind: 0.42, act: 0.12, rec: 0.25, cd: 2.4, shape: 'arc', r: 128, half: 1.0, dmg: 1.2, lunge: 220, then: 'combo2' },
  combo2: { kind: 'melee', min: 0, max: 200, wind: 0.28, act: 0.12, rec: 0.6, cd: 0, shape: 'arc', r: 140, half: 1.2, dmg: 1.4, lunge: 260 },
  bcharge: { kind: 'melee', min: 140, max: 700, wind: 0.75, act: 0.8, rec: 0.8, cd: 4.5, shape: 'line', spd: 680, w: 70, dmg: 1.7, shake: 10 },
  bslam: { kind: 'melee', min: 0, max: 170, wind: 0.95, act: 0.12, rec: 0.9, cd: 4.0, shape: 'circle', r: 160, dmg: 2.0, shake: 12 },
  yawn: { kind: 'special', min: 0, max: 260, wind: 1.25, act: 0.12, rec: 1.0, cd: 7, shape: 'circle', r: 230, dmg: 1.4, slowP: 2.2, shake: 6 },
  hearts: { kind: 'ranged', min: 120, max: 600, wind: 0.6, act: 0.05, rec: 0.6, cd: 3.2, shape: 'proj', n: 3, spread: 0.35, spd: 190, br: 10, dmg: 0.9, homing: 0.9, life: 4.5, col: '#ff7ac0' },
  charm: { kind: 'special', min: 160, max: 650, wind: 0.6, act: 2.4, rec: 0.5, cd: 9, shape: 'pull' },
  flies: { kind: 'special', min: 0, max: 700, wind: 0.7, act: 0.05, rec: 0.5, cd: 10, shape: 'summon', what: 'fly', n: 3 },
  bile: { kind: 'ranged', min: 100, max: 600, wind: 0.6, act: 0.05, rec: 0.6, cd: 4, shape: 'rain', n: 3, r: 70, delay: 1.0, dmg: 1.1, slow: 1, around: 160 },
  coins: { kind: 'ranged', min: 100, max: 600, wind: 0.55, act: 0.05, rec: 0.6, cd: 3.2, shape: 'proj', n: 5, spread: 0.42, spd: 230, br: 8, dmg: 0.8, bounce: 1, col: '#ffd700' },
  goldfist: { kind: 'ranged', min: 0, max: 650, wind: 0.5, act: 0.05, rec: 0.7, cd: 4.2, shape: 'lob', r: 100, delay: 1.0, dmg: 1.8 },
  goldrain: { kind: 'ranged', min: 0, max: 700, wind: 0.8, act: 0.05, rec: 0.8, cd: 8, shape: 'rain', n: 6, r: 62, delay: 1.2, dmg: 1.2, around: 260 },
  turrets: { kind: 'special', min: 0, max: 800, wind: 0.8, act: 0.05, rec: 0.5, cd: 14, shape: 'summon', what: 'turret', n: 1 },
  sleep: { kind: 'ranged', min: 0, max: 600, wind: 0.8, act: 0.05, rec: 0.7, cd: 6, shape: 'lob', r: 120, delay: 1.1, dmg: 0.6, slow: 1, linger: 5 },
  roll: { kind: 'melee', min: 160, max: 700, wind: 0.9, act: 1.1, rec: 1.0, cd: 6, shape: 'line', spd: 430, w: 90, dmg: 1.6, shake: 10 },
  pillars: { kind: 'ranged', min: 0, max: 700, wind: 0.7, act: 0.05, rec: 0.6, cd: 6, shape: 'rain', n: 4, r: 66, delay: 1.0, dmg: 1.4, burn: 1, around: 200 },
  cleave: { kind: 'melee', min: 0, max: 160, wind: 0.62, act: 0.14, rec: 0.6, cd: 2.2, shape: 'arc', r: 150, half: 1.2, dmg: 1.6, lunge: 160 },
  fireballs: { kind: 'ranged', min: 150, max: 650, wind: 0.6, act: 0.05, rec: 0.7, cd: 3.6, shape: 'proj', n: 3, spread: 0.3, spd: 250, br: 11, dmg: 1.0, col: '#ff8a3a' },
  dive: { kind: 'special', min: 120, max: 800, wind: 0.6, act: 0.05, rec: 0.1, cd: 5.5, shape: 'blink', then: 'tail', dist: 90 },
  tail: { kind: 'melee', min: 0, max: 220, wind: 0.36, act: 0.16, rec: 0.7, cd: 0, shape: 'circle', r: 135, dmg: 1.5, shake: 8 },
  wave: { kind: 'ranged', min: 150, max: 700, wind: 0.75, act: 0.05, rec: 0.8, cd: 5, shape: 'proj', n: 1, spread: 0, spd: 200, br: 26, dmg: 1.4, col: '#5cf0a0', pierce: true },
  mirror: { kind: 'special', min: 0, max: 800, wind: 0.8, act: 0.05, rec: 0.5, cd: 14, shape: 'summon', what: 'shadow', n: 1 },
  starfall: { kind: 'ranged', min: 0, max: 800, wind: 0.8, act: 0.05, rec: 0.7, cd: 6, shape: 'rain', n: 6, r: 66, delay: 1.1, dmg: 1.4, around: 240 },
  wingslash: { kind: 'ranged', min: 120, max: 700, wind: 0.55, act: 0.05, rec: 0.6, cd: 3.2, shape: 'proj', n: 3, spread: 0.24, spd: 300, br: 9, dmg: 1.0, col: '#e0c0ff' },
  laser: { kind: 'ranged', min: 100, max: 900, wind: 1.0, act: 1.0, rec: 0.8, cd: 7, shape: 'beam', n: 1 },
  minions: { kind: 'special', min: 0, max: 900, wind: 0.8, act: 0.05, rec: 0.5, cd: 12, shape: 'summon', what: 'imp', n: 3 },
  supernova: { kind: 'special', min: 0, max: 320, wind: 1.3, act: 0.14, rec: 1.0, cd: 10, shape: 'circle', r: 260, dmg: 2.2, shake: 16 },
  teleslash: { kind: 'special', min: 160, max: 900, wind: 0.45, act: 0.05, rec: 0.1, cd: 6, shape: 'blink', then: 'combo2', dist: 100 },
};

// ---------- démontípusok: viselkedés és mozdulatkészlet ----------
// pref: kedvelt távolság ; sight: észlelés ; agile: kitér a lövedékek elől ; flee: alacsony életerőnél visszahúzódik
const EDEF = {
  imp: { pref: [40, 120], sight: 400, moves: { bite: 3, dart: 1.5, spit: 0.7 }, agile: 0.35, flee: 0.22 },
  fly: { pref: [30, 90], sight: 360, moves: { dart: 3, claw: 1 }, fly: true },
  mini: { pref: [30, 80], sight: 360, moves: { bite: 3, dart: 1 } },
  spitter: { pref: [200, 330], sight: 460, moves: { spit: 3, spread3: 1.5, retreat: 1.2, claw: 0.6 } },
  brute: { pref: [40, 140], sight: 380, moves: { swipe: 3, slam: 1.6, charge: 1.6 }, heavy: true },
  wisp: { pref: [220, 360], sight: 480, moves: { orb: 2.5, lob: 2, retreat: 1.5 }, fly: true },
  splitter: { pref: [40, 120], sight: 360, moves: { belly: 2.5, bite: 1.5, lob: 0.8 } },
  turret: { pref: [0, 9999], sight: 520, moves: { volley: 3, lob: 1 }, still: true },
  teleporter: { pref: [140, 300], sight: 460, moves: { blink: 2.5, spit: 1.5, backstab: 2 }, agile: 0.5 },
  shadow: { pref: [60, 200], sight: 520, moves: { combo: 2, dart: 1.5, spit: 1.2, blink: 1 }, agile: 0.5 },
};
const BOSS_MOVES = {
  asmodeus: [{ whip: 3, hearts: 2.5, charge: 1.4, charm: 1.2 }, { whip: 3, hearts: 2.5, bcharge: 1.6, charm: 1.6, starfall: 0.6 }],
  beelzebub: [{ bslam: 2, bile: 2.5, flies: 1.2, swipe: 2 }, { bslam: 2.2, bile: 2.5, flies: 1.5, swipe: 2, bcharge: 1.2 }],
  mammon: [{ coins: 3, goldfist: 2, swipe: 2, turrets: 0.8 }, { coins: 3, goldfist: 2, goldrain: 1.6, swipe: 2, turrets: 1 }],
  belphegor: [{ sleep: 2, roll: 1.6, swipe: 2.5, yawn: 1 }, { sleep: 2.2, roll: 2, swipe: 2.5, yawn: 1.4, bslam: 1 }],
  satan: [{ cleave: 3, fireballs: 2, bcharge: 1.6, pillars: 1.4 }, { cleave: 3, fireballs: 2.2, bcharge: 2, pillars: 2 }],
  leviathan: [{ dive: 2, bite: 2, wave: 2, mirror: 0.8 }, { dive: 2.5, whip: 2, wave: 2.4, mirror: 1 }],
  lucifer: [{ combo: 3, wingslash: 2, starfall: 1.4 }, { combo: 3, wingslash: 2, starfall: 1.6, laser: 1.4, minions: 1, bcharge: 1.2 }, { combo: 3, wingslash: 2.2, starfall: 2, laser: 1.8, supernova: 1.2, teleslash: 1.6 }],
};

// ---------- létrehozás ----------
function mkEnemy(type, x, y, ri) {
  const d = ET[type], lv = G.lvl, m = 1 + 0.45 * lv;
  return { type, x, y, r: d.r, hp: d.hp * m, maxHp: d.hp * m, spd: d.spd * (1 + 0.04 * lv), t: rand(0, 2), st: 0, stT: rand(0.8, 2),
    flash: 0, spawn: 0.6, burn: 0, orbCd: 0, alpha: 1, ghost: false, side: Math.random() < 0.5 ? 1 : -1, spin: rand(0, TAU), shT: 0, boss: false, dead: false,
    ri: ri !== undefined ? ri : (G.hub ? 7 : G.ring), home: { x, y }, aggro: false, cds: {}, act: null, think: rand(0, 0.4), sideT: rand(1, 3), wander: null, face: rand(0, TAU), dodgeCd: 0 };
}
function spawnBoss(x, y) {
  const ri = G.ring, bd = BOSSES[ri], bhp = bd.key === 'lucifer' ? bd.hp : BOSS_HP[Math.min(5, G.lvl)];
  const f = findFree(x, y, 40);
  const b = mkEnemy('imp', f.x, f.y, ri);
  Object.assign(b, { type: 'boss', key: bd.key, bd, boss: true, r: bd.r, hp: bhp, maxHp: bhp, spd: bd.spd * 1.15, spawn: 0, intro: 2.2, aggro: true,
    phase: 1, sm: 1 + G.lvl * 0.04, inv: 0, trail: [], atk: null, home: { x, y } });
  G.enemies.push(b); G.boss = b; G.bossAlive = true;
  G.banner = { title: bd.name, sub: bd.title, line: bd.line, t: 0, dur: 3.4, col: RINGS[ri].col };
  sfx('roar'); G.shake = 10;
}

// ---------- útkeresés: szélességi mező a játékos körül ----------
const FF = { R: 22, d: new Int16Array(45 * 45), ox: 0, oy: 0, t: 0 };
function updateFlowField(dt) {
  if ((FF.t -= dt) > 0) return; FF.t = 0.3;
  const p = G.p, R = FF.R, N = 2 * R + 1, ptx = Math.floor(p.x / TS), pty = Math.floor(p.y / TS);
  FF.ox = ptx - R; FF.oy = pty - R; FF.d.fill(-1);
  const q = new Int16Array(N * N * 2); let qh = 0, qt = 0;
  const si = R * N + R; FF.d[si] = 0; q[qt++] = R; q[qt++] = R;
  while (qh < qt) {
    const x = q[qh++], y = q[qh++], dv = FF.d[y * N + x];
    for (let k = 0; k < 4; k++) {
      const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = y + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx; if (FF.d[j] >= 0) continue;
      const tk = tileAt((FF.ox + nx + 0.5) * TS, (FF.oy + ny + 0.5) * TS);
      if (blocksWalk(tk)) { FF.d[j] = 32000; continue; }
      FF.d[j] = dv + 1; q[qt++] = nx; q[qt++] = ny;
    }
  }
}
function flowDir(e) {
  const N = 2 * FF.R + 1, tx = Math.floor(e.x / TS) - FF.ox, ty = Math.floor(e.y / TS) - FF.oy;
  if (tx < 0 || ty < 0 || tx >= N || ty >= N) return null;
  let best = FF.d[ty * N + tx], bx = 0, by = 0; if (best < 0 || best >= 32000) best = 9999;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= N || y >= N) continue;
    const v = FF.d[y * N + x]; if (v >= 0 && v < best) { if (dx && dy && (FF.d[ty * N + x] >= 32000 || FF.d[y * N + tx] >= 32000)) continue; best = v; bx = dx; by = dy; }
  }
  if (!bx && !by) return null;
  return Math.atan2((ty + by - ty) * 1, (tx + bx - tx) * 1);
}

// ---------- fő MI-ciklus ----------
function attackersNow() { let n = 0; for (const e of G.enemies) if (!e.boss && e.act && e.act.ph !== 'rec') n++; return n; }
function updEnemy(e, dt) {
  if (e.dead) return;
  const p = G.p;
  if (e.flash > 0) e.flash -= dt;
  if (e.orbCd > 0) e.orbCd -= dt;
  if (e.dodgeCd > 0) e.dodgeCd -= dt;
  e.t += dt;
  if (e.burn > 0) {
    e.burn -= dt; e.hp -= p.dmg * 0.4 * Math.max(1, p.burn) * dt;
    if (Math.random() < 0.3) G.parts.push({ x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), vx: 0, vy: -60, life: 0.4, max: 0.4, col: '#ffb060', size: 3 });
    if (e.hp <= 0) { killEnemy(e); return; }
  }
  if (e.spawn > 0) { e.spawn -= dt; return; }
  if (e.kbx || e.kby) { e.x += e.kbx * dt; e.y += e.kby * dt; const f = Math.pow(0.002, dt); e.kbx *= f; e.kby *= f; if (Math.abs(e.kbx) + Math.abs(e.kby) < 8) e.kbx = e.kby = 0; }
  if (e.slowT > 0) e.slowT -= dt;
  for (const k in e.cds) if (e.cds[k] > 0) e.cds[k] -= dt * (e.boss && e.phase > 1 ? 1.25 : 1);
  if (!e.boss && G.ring === 4 && !G.hub && !e.rage && e.hp < e.maxHp * 0.5 && e.ri === 4) { e.rage = true; e.spd *= 1.4; floatText(e.x, e.y - e.r - 12, 'DÜH!', '#ff4a24', 0.8, 14); }
  const d = dist(e, p);
  e.hitWall = false;
  if (e.boss) bossPhase(e);
  if (e.stun > 0 && !e.boss) { e.stun -= dt; if (e.act && e.act.ph === 'wind') e.act = null; }
  else if (e.act) runAct(e, dt, d);
  else think(e, dt, d);
  collideObst(e);
  if (e.boss && e.key === 'leviathan') { e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 60) e.trail.pop(); }
}
function think(e, dt, d) {
  const p = G.p, def = EDEF[e.type] || EDEF.imp, sp = e.spd * (e.slowT > 0 ? 0.45 : 1) * (e.rage ? 1.15 : 1);
  // észlelés
  if (!e.aggro) {
    if (!G.dying && d < (def.sight || 400) && (d < 140 || losClear(e, p))) aggroOn(e);
    else { wander(e, dt, sp * 0.45); return; }
  }
  // póráz: ne kövesse a világ végéig
  const home = e.enc ? e.enc : e.home, hd = Math.hypot(e.x - home.x, e.y - home.y);
  if (!e.boss && (hd > 1300 || (d > 900 && !e.enc))) { e.aggro = false; e.wander = { x: home.x, y: home.y, t: 4 }; return; }
  if (G.dying || state !== 'play') { wander(e, dt, sp * 0.3); return; }
  e.face = angTo(e, p);
  // kitérés a baráti lövedékek elől
  if (def.agile && e.dodgeCd <= 0) for (const b of G.bullets) { if (!b.f || b.dead) continue; const bd = Math.hypot(b.x - e.x, b.y - e.y); if (bd < 110 && bd > 30) { const ba = Math.atan2(b.vy, b.vx); if (arcDiff(ba, Math.atan2(e.y - b.y, e.x - b.x)) < 0.4) { e.dodgeCd = 2.4; if (Math.random() < def.agile) { const s = Math.random() < 0.5 ? 1 : -1; e.kbx = Math.cos(ba + s * Math.PI / 2) * 380; e.kby = Math.sin(ba + s * Math.PI / 2) * 380; } break; } } }
  // döntés: támadás
  e.think -= dt;
  if (e.think <= 0) {
    e.think = rand(0.12, 0.3);
    const maxTok = 2 + Math.floor(G.lvl / 2), can = e.boss || attackersNow() < maxTok;
    const mv = can ? chooseMove(e, d) : null;
    if (mv) { startAct(e, mv); return; }
  }
  if (def.still) return;
  // mozgás: a kedvelt távolság felé, közben kerülget
  const [pmin, pmax] = e.boss ? [90, 220] : def.pref, los = d < 160 || losClear(e, p);
  e.sideT -= dt; if (e.sideT <= 0 || e.hitWall) { e.sideT = rand(1.2, 3); if (Math.random() < 0.6) e.side *= -1; }
  let a, s = sp;
  const low = def.flee && e.hp < e.maxHp * def.flee && e.t % 6 < 2;
  if (low) { a = angTo(p, e); s = sp * 1.1; }
  else if (!los || d > pmax + 60) { const fa = !los ? flowDir(e) : null; a = fa !== null ? fa : angTo(e, p); }
  else if (d > pmax) a = angTo(e, p) + e.side * 0.5;
  else if (d < pmin) { a = angTo(p, e) + e.side * 0.4; s = sp * 0.85; }
  else { a = angTo(e, p) + e.side * Math.PI / 2 + Math.sin(e.t * 1.7) * 0.3; s = sp * 0.7; }
  // ne torlódjanak egymásra
  for (const o of G.enemies) { if (o === e || o.dead || o.boss) continue; const dx = e.x - o.x, dy = e.y - o.y, dd = dx * dx + dy * dy; if (dd < 3600 && dd > 1) { a = Math.atan2(Math.sin(a) + dy / Math.sqrt(dd) * 0.6, Math.cos(a) + dx / Math.sqrt(dd) * 0.6); } }
  e.x += Math.cos(a) * s * dt; e.y += Math.sin(a) * s * dt; e.moving = s;
}
function wander(e, dt, sp) {
  if (EDEF[e.type] && EDEF[e.type].still) return;
  if (e.guard) return;
  if (!e.wander || (e.wander.t -= dt) <= 0 || Math.hypot(e.wander.x - e.x, e.wander.y - e.y) < 12) {
    const h = e.home; e.wander = { x: h.x + rand(-160, 160), y: h.y + rand(-160, 160), t: rand(2, 4) }; e.idle = rand(0.5, 1.8);
  }
  if (e.idle > 0) { e.idle -= dt; e.moving = 0; return; }
  const a = Math.atan2(e.wander.y - e.y, e.wander.x - e.x); e.face = a;
  e.x += Math.cos(a) * sp * dt; e.y += Math.sin(a) * sp * dt; e.moving = sp;
  if (e.hitWall) e.wander.t = 0;
}
function aggroOn(e) {
  if (e.aggro) return; e.aggro = true; e.think = rand(0.3, 0.7);
  floatText(e.x, e.y - e.r - 14, '!', '#ffcf6a', 0.7, 16);
  for (const o of G.enemies) if (!o.aggro && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 280) { o.aggro = true; o.think = rand(0.4, 0.9); }
}
on('hit', e => { if (e && !e.aggro) aggroOn(e); });
function moveSet(e) { return e.boss ? BOSS_MOVES[e.key][Math.min(BOSS_MOVES[e.key].length, e.phase) - 1] : (EDEF[e.type] || EDEF.imp).moves; }
function chooseMove(e, d) {
  const p = G.p, set = moveSet(e); let best = null, bs = 0, los = null;
  for (const id in set) {
    const m = MOVES[id]; if (!m || (e.cds[id] || 0) > 0) continue;
    if (d < m.min || d > m.max) continue;
    if (m.kind === 'ranged' || m.shape === 'blink') { if (los === null) los = losClear(e, p); if (!los) continue; }
    if (m.shape === 'summon' && G.enemies.filter(o => !o.dead && o.summoner === e).length >= 4) continue;
    let s = set[id] * rand(0.55, 1.45);
    if (m.kind === 'melee' && d < 90) s *= 1.6;
    if (m.kind === 'ranged' && d > 220) s *= 1.3;
    if (m.shape === 'hop' && d < 90) s *= 2;
    if (m.shape === 'hop' && d > 90) continue;
    if (e.lastMove === id) s *= 0.6;
    if (s > bs) { bs = s; best = id; }
  }
  // időnként csak helyezkedik, nem támad
  if (best && !e.boss && Math.random() < 0.18) return null;
  return best;
}
function startAct(e, id) {
  const m = MOVES[id], p = G.p;
  e.act = { id, m, ph: 'wind', t: 0, a: angTo(e, p), tx: p.x + p.vx * 0.25, ty: p.y + p.vy * 0.25, hit: false, n: 0 };
  e.lastMove = id; e.cds[id] = m.cd * (e.boss ? 0.85 : 1) * rand(0.85, 1.2); e.atk = id;
  if (m.shape === 'lob' || m.shape === 'rain') windMarks(e, m);
  if (m.shape === 'beam') { e.act.beam = { o: e, ang: e.act.a, rot: (Math.random() < 0.5 ? 1 : -1) * 0.25, warn: m.wind, life: m.act, w: 26 }; G.beams.push(e.act.beam); sfx('laser'); }
  if (m.shape === 'pull') { G.charm = m.wind + m.act; }
  if (e.boss) sfx('charge');
}
function windMarks(e, m) {
  const p = G.p, dmg = eDmg() * m.dmg;
  const mk = (x, y) => { const f = findFree(x, y, 6, 60); G.hazards.push({ x: f.x, y: f.y, r: m.r, type: 'blast', warn: m.delay + m.wind, warn0: m.delay + m.wind, life: m.linger || 0.3, dmg, slow: m.slow, burn: m.burn, col: RINGS[e.ri].col }); };
  if (m.shape === 'lob') mk(e.act.tx, e.act.ty);
  else { mk(p.x + p.vx * 0.3, p.y + p.vy * 0.3); for (let i = 1; i < m.n; i++) { const a = rand(0, TAU), r = rand(70, m.around); mk(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } }
}
function runAct(e, dt, d) {
  const A = e.act, m = A.m, p = G.p;
  A.t += dt;
  if (A.ph === 'wind') {
    // felkészülés közben követi a célt (a vége felé már nem – így ki lehet térni)
    if (A.t < m.wind * 0.65 && m.shape !== 'line') { A.a = angTo(e, p); A.tx = p.x; A.ty = p.y; }
    else if (A.t < m.wind * 0.5) A.a = angTo(e, p);
    e.face = A.a;
    if (A.t >= m.wind) { A.ph = 'act'; A.t = 0; actStart(e, A, m); }
    return;
  }
  if (A.ph === 'act') {
    actTick(e, A, m, dt);
    if (A.t >= m.act || A.stop) { A.ph = 'rec'; A.t = 0; if (m.shape === 'pull') G.charm = 0; }
    return;
  }
  if (A.t >= m.rec * (e.boss && e.phase > 1 ? 0.75 : 1)) {
    e.act = null; e.atk = null;
    if (m.then) { startAct(e, m.then); e.act.t = 0; }
  }
}
function pHitCheck(fn) { const p = G.p; if (G.dying || p.dashT > 0) return false; return fn(p); }
function actStart(e, A, m) {
  const p = G.p, dmg = eDmg() * m.dmg * (e.boss ? 1.25 : 1) * (e.elite ? 1.3 : 1);
  switch (m.shape) {
    case 'arc':
      if (pHitCheck(q => { const dd = dist(e, q); return dd < m.r + q.r && (dd < e.r + q.r + 6 || arcDiff(angTo(e, q), A.a) <= m.half); })) hurtPlayer(dmg, e);
      sfx('slash'); vfx.spark(e.x + Math.cos(A.a) * m.r * 0.6, e.y + Math.sin(A.a) * m.r * 0.6, A.a, m.half, '#e8d8c8', 6, 260, 0.3, 2);
      if (m.lunge) A.lunge = m.lunge;
      break;
    case 'circle':
      if (pHitCheck(q => dist(e, q) < m.r + q.r * 0.6)) { hurtPlayer(dmg, e); if (m.slowP) p.slow = Math.max(p.slow, m.slowP); }
      vfx.ring(e.x, e.y, e.r, m.r, RINGS[e.ri].col, 0.4, 8); vfx.burst(e.x, e.y, '#c8b8a8', 18, 260, 0.5, 3); if (m.shake) vfx.shake(m.shake); sfx('boom');
      break;
    case 'proj': A.shots = m.burst || 1; A.next = 0; break;
    case 'line': A.hitDone = false; sfx('charge'); break;
    case 'blink': {
      const back = Math.atan2(p.vy || Math.sin(p.face), p.vx || Math.cos(p.face)) + Math.PI, dd = m.dist || 70;
      vfx.burst(e.x, e.y, RINGS[e.ri].col, 14, 160, 0.4, 3);
      const f = findFree(p.x + Math.cos(back) * dd, p.y + Math.sin(back) * dd, e.r, 120); e.x = f.x; e.y = f.y;
      vfx.burst(e.x, e.y, RINGS[e.ri].col, 14, 160, 0.4, 3); sfx('dash');
      break;
    }
    case 'hop': { const a = angTo(p, e) + rand(-0.5, 0.5); e.kbx = Math.cos(a) * 520; e.kby = Math.sin(a) * 520; break; }
    case 'howl': for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 300) { o.rage = true; o.spd *= 1.1; } floatText(e.x, e.y - 30, 'ÜVÖLTÉS', RINGS[e.ri].col, 0.8, 13); break;
    case 'summon':
      for (let i = 0; i < m.n; i++) { if (G.enemies.length > 34) break; const f = findFree(e.x + Math.cos(i * 2.1) * 90, e.y + Math.sin(i * 2.1) * 90); const s = mkEnemy(m.what, f.x, f.y, e.ri); s.aggro = true; s.summoner = e; s.enc = e.enc || G.arenaPoi || null; G.enemies.push(s); }
      sfx('roar'); break;
  }
}
function actTick(e, A, m, dt) {
  const p = G.p, dmg = eDmg() * m.dmg * (e.boss ? 1.25 : 1) * (e.elite ? 1.3 : 1);
  if (A.lunge) { const k = Math.max(0, 1 - A.t / m.act); e.x += Math.cos(A.a) * A.lunge * k * dt; e.y += Math.sin(A.a) * A.lunge * k * dt; }
  if (m.shape === 'line') {
    e.x += Math.cos(A.a) * m.spd * dt; e.y += Math.sin(A.a) * m.spd * dt;
    if (Math.random() < 0.6) G.parts.push({ x: e.x, y: e.y + e.r * 0.6, vx: rand(-40, 40), vy: rand(-40, 0), life: 0.4, max: 0.4, col: '#7a6a5a', size: 4 });
    if (!A.hitDone && pHitCheck(q => dist(e, q) < e.r + q.r + m.w * 0.25)) { A.hitDone = true; hurtPlayer(dmg, e); const ka = A.a; p.kbT = 0.15; p.x += Math.cos(ka) * 26; p.y += Math.sin(ka) * 26; }
    if (e.hitWall && A.t > 0.08) { A.stop = true; if (m.shake) vfx.shake(m.shake); vfx.burst(e.x, e.y, '#b8a898', 16, 220, 0.4, 3); sfx('boom'); if (e.boss) e.stun = 0; }
  } else if (m.shape === 'proj') {
    A.next -= dt;
    if (A.shots > 0 && A.next <= 0) {
      A.shots--; A.next = 0.16; const a0 = angTo(e, p);
      const col = m.col || RINGS[e.ri].col;
      for (let i = 0; i < m.n; i++) { const a = a0 + (m.n > 1 ? (i - (m.n - 1) / 2) * m.spread : rand(-m.spread, m.spread)); eBullet(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, a, m.spd * (e.sm || 1), { r: m.br, dmg: dmg * 0.9, col, homing: m.homing, life: m.life || 3.5, bounce: m.bounce, pierceP: m.pierce, big: m.br > 14 }); }
      sfx('shoot');
    }
    if (A.shots <= 0 && !m.burst) A.stop = true;
  } else if (m.shape === 'pull') {
    if (Math.random() < 0.3) G.parts.push({ x: p.x + rand(-20, 20), y: p.y + rand(-20, 20), vx: (e.x - p.x) * 0.8, vy: (e.y - p.y) * 0.8, life: 0.5, max: 0.5, col: '#ff9ad0', size: 3 });
  }
}
// főellenség fázisai
function bossPhase(b) {
  if (b.intro > 0) return;
  if (b.inv > 0) b.inv -= 1 / 60;
  const max = BOSS_MOVES[b.key].length, ph = max === 3 ? (b.hp < b.maxHp * 0.33 ? 3 : b.hp < b.maxHp * 0.66 ? 2 : 1) : (b.hp < b.maxHp * 0.5 ? 2 : 1);
  if (ph > b.phase) {
    b.phase = ph; b.inv = 1.2; b.act = null; G.charm = 0; G.beams.length = 0; G.shake = 16; sfx('roar'); b.spd *= 1.12;
    for (const k in b.cds) b.cds[k] = Math.min(b.cds[k], 1);
    part(b.x, b.y, RINGS[b.ri].col, 60, 360, 1, 4);
    if (b.key === 'lucifer') G.banner = { title: 'LUCIFER', sub: ph === 2 ? 'A Hajnalcsillag haragja' : 'A Bukott Fény utolsó lángja', line: ph === 2 ? '„Én vagyok a Fényhozó! Előttem a csillagok is meghajolnak!”' : '„Ha nem uralkodhatom a Mennyben, akkor semmi se maradjon!”', t: 0, dur: 3, col: '#c08bff' };
    else G.banner = { title: b.bd.name, sub: 'feldühödött', line: '', t: 0, dur: 1.8, col: RINGS[b.ri].col };
  }
}
function updBoss(b, dt) { if (b.intro > 0) b.intro -= dt; }

// ---------- támadásjelzések (a démonok alatt) ----------
function drawTelegraph(e) {
  const A = e.act; if (!A || A.ph !== 'wind') return;
  const m = A.m, k = clamp(A.t / m.wind, 0, 1), col = e.boss ? '#ff5a3a' : '#ff8a5a';
  ctx.save();
  if (m.shape === 'arc') {
    const r = m.r + (m.lunge ? m.lunge * 0.18 : 0);
    ctx.fillStyle = hexA(col, 0.10 + 0.22 * k); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, r, A.a - m.half, A.a + m.half); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(col, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, r * k, A.a - m.half, A.a + m.half); ctx.stroke();
  } else if (m.shape === 'circle') {
    ctx.fillStyle = hexA(col, 0.08 + 0.18 * k); ctx.beginPath(); ctx.arc(e.x, e.y, m.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, m.r * k, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(e.x, e.y, m.r, 0, TAU); ctx.stroke();
  } else if (m.shape === 'line') {
    const len = m.spd * m.act * 0.9;
    ctx.translate(e.x, e.y); ctx.rotate(A.a);
    ctx.fillStyle = hexA(col, 0.1 + 0.2 * k); ctx.fillRect(0, -m.w / 2, len, m.w);
    ctx.fillStyle = hexA(col, 0.45); ctx.fillRect(0, -m.w / 2, len * k, 3); ctx.fillRect(0, m.w / 2 - 3, len * k, 3);
  } else if (m.shape === 'proj') {
    ctx.strokeStyle = hexA(col, 0.25 + 0.35 * k); ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(A.a) * 160, e.y + Math.sin(A.a) * 160); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = hexA(m.col || RINGS[e.ri].col, 0.4 + 0.5 * k); ctx.beginPath(); ctx.arc(e.x + Math.cos(A.a) * (e.r + 6), e.y + Math.sin(A.a) * (e.r + 6), 3 + k * 5, 0, TAU); ctx.fill();
  } else if (m.shape === 'blink') {
    ctx.globalAlpha = 0.5 * k; ctx.strokeStyle = RINGS[e.ri].col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1.6 - k * 0.6), 0, TAU); ctx.stroke();
  } else if (m.shape === 'pull' || m.shape === 'summon' || m.shape === 'howl') {
    ctx.strokeStyle = hexA(RINGS[e.ri].col, 0.5 * k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 10 + k * 20, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// ---------- démonok rajza: tompított színek, sötét kontúr, kevés fény ----------
function drawEnemy(e) {
  if (e.boss) { drawBoss(e); return; }
  const rg = RINGS[e.ri] || RINGS[0], col = rg.col, fl = e.flash > 0, r = e.r;
  const a = e.face || 0, bob = Math.sin(e.t * (e.moving ? 10 : 3)) * (e.moving ? 1.6 : 0.8), sq = 1 + Math.sin(e.t * (e.moving ? 10 : 3)) * 0.04;
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.spawn > 0) ctx.globalAlpha = 1 - e.spawn / 0.6;
  ctx.globalAlpha *= e.alpha;
  // talajárnyék
  ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 1.05, r * 0.36, 0, 0, TAU); ctx.fill();
  if (!G.hub && e.ri === 6 && e.spawn <= 0) { // csábító aura (Kevélység)
    const d = dist(e, G.p); ctx.strokeStyle = 'rgba(230,170,240,0.28)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -gt * 30; ctx.beginPath(); ctx.arc(0, 0, 115, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (d < 115) { ctx.strokeStyle = 'rgba(255,150,220,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(G.p.x - e.x, G.p.y - e.y); ctx.stroke(); }
  }
  ctx.translate(0, -bob); ctx.scale(1 / sq, sq);
  const dark = hexA(rg.body, 1), mid = col;
  const body = fl ? '#ffffff' : null;
  const gr = ctx.createLinearGradient(-r, -r, r * 0.6, r);
  gr.addColorStop(0, fl ? '#fff' : shade(mid, 0.75)); gr.addColorStop(1, fl ? '#fff' : shade(rg.body, 0.8));
  ctx.lineWidth = 2; ctx.strokeStyle = '#140a10'; ctx.fillStyle = gr;
  const eyes = (sp = 0.36, ey = -0.15, es = 0.13, ec = '#ffd36a') => { const ox = Math.cos(a) * r * 0.16, oy = Math.sin(a) * r * 0.1; ctx.fillStyle = '#1a0a08'; ctx.beginPath(); ctx.arc(-r * sp + ox, r * ey + oy, r * es * 1.5, 0, TAU); ctx.arc(r * sp + ox, r * ey + oy, r * es * 1.5, 0, TAU); ctx.fill(); ctx.fillStyle = ec; ctx.beginPath(); ctx.arc(-r * sp + ox, r * ey + oy, r * es, 0, TAU); ctx.arc(r * sp + ox, r * ey + oy, r * es, 0, TAU); ctx.fill(); };
  const horns = (k = 1) => { ctx.fillStyle = fl ? '#fff' : '#2a1a14'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.45, -r * 0.6); ctx.quadraticCurveTo(s * r * 1.1 * k, -r * 1.1, s * r * 0.9 * k, -r * 1.55 * k); ctx.lineTo(s * r * 0.2, -r * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke(); } ctx.fillStyle = gr; };
  switch (e.type) {
    case 'imp': case 'mini': {
      horns(0.9);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.5, r * 0.5); ctx.lineTo(s * r * 0.75, r * 1.1); ctx.lineTo(s * r * 0.3, r * 0.75); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.35, r * 0.4, 0, TAU); ctx.fill();
      eyes(); ctx.strokeStyle = '#1a0806'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(Math.cos(a) * 2, r * 0.25, r * 0.35, 0.2, Math.PI - 0.2); ctx.stroke(); break;
    }
    case 'fly': {
      const wf = Math.sin(gt * 40) * 0.5; ctx.fillStyle = 'rgba(210,220,200,0.35)'; ctx.beginPath(); ctx.ellipse(-r, -r * 0.6, r * 0.9, r * 0.38, -0.5 + wf, 0, TAU); ctx.ellipse(r, -r * 0.6, r * 0.9, r * 0.38, 0.5 - wf, 0, TAU); ctx.fill();
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke(); eyes(0.34, -0.1, 0.22, '#ff5a40'); break;
    }
    case 'spitter': {
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.05, 0, 0, TAU); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 4; i++) { const q = -0.9 + i * 0.6; ctx.beginPath(); ctx.arc(Math.cos(q) * r * 0.55, -r * 0.2 + Math.sin(q) * r * 0.5, 2.5, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill(); }
      ctx.fillStyle = '#160606'; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.4 + 3, r * 0.34, r * 0.24 + (e.act ? 3 : Math.sin(e.t * 6)), a, 0, TAU); ctx.fill();
      eyes(0.33, -0.38, 0.12); break;
    }
    case 'brute': {
      horns(1.2);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * 1.05, r * 0.15, r * 0.38, r * 0.5, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r, -r * 0.9, r * 2, r * 1.9, r * 0.5) : ctx.rect(-r, -r * 0.9, r * 2, r * 1.9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-r * 0.7, r * 0.1, r * 1.4, r * 0.12);
      eyes(0.38, -0.25, 0.11, '#ff7a4a'); ctx.fillStyle = '#e8e0c8'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * 0.3, r * 0.35); ctx.lineTo(s * r * 0.4, r * 0.05); ctx.lineTo(s * r * 0.18, r * 0.35); ctx.fill(); } break;
    }
    case 'wisp': {
      ctx.beginPath(); ctx.moveTo(0, -r * 1.6 - Math.sin(e.t * 9) * 3); ctx.quadraticCurveTo(r * 1.2, -r * 0.3, r, r * 0.3); ctx.quadraticCurveTo(r * 0.5, r * 1.2, 0, r * 0.7); ctx.quadraticCurveTo(-r * 0.5, r * 1.2, -r, r * 0.3); ctx.quadraticCurveTo(-r * 1.2, -r * 0.3, 0, -r * 1.6 - Math.sin(e.t * 9) * 3);
      ctx.globalAlpha *= 0.85; ctx.fill(); ctx.stroke(); ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.85); eyes(0.3, 0.1, 0.13, '#f0f0ff'); break;
    }
    case 'splitter': {
      const wob = Math.sin(e.t * 6) * 0.07; ctx.beginPath(); ctx.ellipse(0, 0, r * (1 + wob), r * (1 - wob), 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(-r * 0.4, r * 0.3, r * 0.2, 0, TAU); ctx.arc(r * 0.45, r * 0.2, r * 0.14, 0, TAU); ctx.fill();
      ctx.fillStyle = '#120404'; ctx.beginPath(); ctx.ellipse(0, r * 0.35, r * 0.5, r * 0.2 + (e.act ? 4 : 0), 0, 0, TAU); ctx.fill(); eyes(0.34, -0.32, 0.13); break;
    }
    case 'turret': {
      ctx.fillStyle = '#2a2430'; ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 1.1, r * 0.5, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = gr;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU + e.spin * 0.2; ctx.lineTo(Math.cos(q) * r, Math.sin(q) * r * 0.9 - 4); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a0a08'; ctx.beginPath(); ctx.ellipse(0, -4, r * 0.55, r * 0.32, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = e.act ? '#fff2c0' : '#ffcf5a'; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.2, -4 + Math.sin(a) * r * 0.1, r * 0.17, 0, TAU); ctx.fill(); break;
    }
    case 'teleporter': {
      ctx.beginPath(); ctx.moveTo(0, -r * 1.5); ctx.lineTo(r * 1.1, r); ctx.quadraticCurveTo(0, r * 1.4, -r * 1.1, r); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0a0608'; ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.55, r * 0.5, 0, 0, TAU); ctx.fill(); eyes(0.2, -0.25, 0.1, shade(col, 1.2)); break;
    }
    case 'shadow': ctx.restore(); drawAngel(e.x, e.y, a, e.t, true, e.alpha * (fl ? 0.6 : 1)); return;
  }
  if (e.elite) { ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.translate(e.x, e.y);
  if (e.burn > 0) { ctx.fillStyle = '#ffa040'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(0, -r - 4, 3, 5 + Math.sin(gt * 20), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  if (e.stun > 0) { ctx.fillStyle = PAL.gold; for (let i = 0; i < 3; i++) { const q = gt * 6 + i * TAU / 3; ctx.beginPath(); ctx.arc(Math.cos(q) * r * 0.8, -r - 8 + Math.sin(q) * 3, 2.5, 0, TAU); ctx.fill(); } }
  if (e.slowT > 0) { ctx.globalAlpha = 0.3; ctx.fillStyle = PAL.frost; ctx.beginPath(); ctx.arc(0, 0, r * 1.1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  if (e.loot) { ctx.textAlign = 'center'; ctx.font = `bold 12px ${SANS}`; ctx.fillStyle = '#000'; ctx.fillText(`◈${e.loot}`, 1, -r - 15); ctx.fillStyle = '#ffd700'; ctx.fillText(`◈${e.loot}`, 0, -r - 16); }
  ctx.restore();
  if (e.hp < e.maxHp) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(e.x - 16, e.y - r - 12, 32, 4); ctx.fillStyle = shade(col, 0.95); ctx.fillRect(e.x - 16, e.y - r - 12, 32 * Math.max(0, e.hp / e.maxHp), 4); }
}
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c[0]},${c[1]},${c[2]})`; }
