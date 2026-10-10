// =====================================================================
//  FEGYVEREK – hat égi fegyver (3 közelharci, 3 távolsági)
//  Égi Penge · Lélekarató Kasza · Ítélet Pörölye · Szeráf Íja · Jerikói Harsona · Az Ige Könyve
//  Minden belső segédfüggvény egy zárt hatókörben él, hogy ne ütközzön más részekkel.
// =====================================================================
(() => {
  // ---------- közös segédek ----------
  const WL = id => (G && G.wlv && G.wlv[id]) || 0;
  const MO = id => (G && G.morph && G.morph[id]) || null;
  const DM = id => 1 + (WL(id) >= 1 ? 0.2 : 0);                // 1. szint: +20% sebzés
  const sizeK = p => clamp(p.size / 5, 0.6, 2.5);
  const rangeK = p => clamp(p.range / 0.85, 0.5, 2.5);
  const spdK = p => clamp(p.shotSpd / 560, 0.5, 2.5);
  const partOK = (n = 1300) => G.parts.length < n;
  const fxN = tag => { let n = 0; for (const f of G.fx) if (f.tag === tag && !f.dead) n++; return n; };
  const ease = k => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  // a mozgás egy részének visszavétele (tartás, feszítés, pörgés közben lassabb az angyal)
  function slowMove(p, dt, k) { if (p.dashT > 0) return; p.x -= p.vx * dt * (1 - k); p.y -= p.vy * dt * (1 - k); }
  // sugár hossza a terem faláig
  function rayLen(x, y, a, max = 1200) {
    const c = Math.cos(a), s = Math.sin(a); let t = max;
    if (c > 1e-6) t = Math.min(t, (R - x) / c); else if (c < -1e-6) t = Math.min(t, (L - x) / c);
    if (s > 1e-6) t = Math.min(t, (B - y) / s); else if (s < -1e-6) t = Math.min(t, (T - y) / s);
    return Math.max(0, t);
  }
  // ellenséges lövedékek törlése, a pozíciókat visszaadva (visszaverés)
  function cutWhere(pred, col) {
    const out = [];
    for (const b of G.bullets) if (!b.f && !b.dead && pred(b)) { b.dead = true; out.push({ x: b.x, y: b.y }); if (partOK()) part(b.x, b.y, col || '#fff2b0', 3, 100, 0.25, 2); }
    return out;
  }
  const inArc = (b, x, y, r, a, half) => { const d = Math.hypot(b.x - x, b.y - y); return d < r + b.r && (d < 14 || arcDiff(Math.atan2(b.y - y, b.x - x), a) <= half); };
  // sarló alakú fénycsík (suhintásnyom): a0 = farok, a1 = fej
  function crescent(c, cx, cy, r, a0, a1, w, n = 14) {
    c.beginPath();
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    for (let i = n; i >= 0; i--) { const t = i / n, a = a0 + (a1 - a0) * t, rr = r - w * Math.sin(Math.PI * t) * (0.35 + 0.65 * t); c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    c.closePath();
  }
  // suhintás-effekt: o = { a, half, r, w, dir, col, col2, dur, x?, y? (különben az angyalt követi), under? }
  function swingFx(o) {
    let t = 0; const p = G.p;
    const geo = () => { const k = t / o.dur, head = Math.min(1, k / 0.38), tail = Math.max(0, (k - 0.18) / 0.82), s0 = o.a - o.dir * o.half, sp = 2 * o.half * o.dir;
      return { k, a0: s0 + sp * tail, a1: s0 + sp * head, x: o.x !== undefined ? o.x : p.x, y: o.y !== undefined ? o.y : p.y, ok: head > tail + 0.01 }; };
    return addFx({ tag: 'swing', upd(dt) { t += dt; return t < o.dur; },
      drw() { const g = geo(); if (!g.ok) return; const al = 1 - g.k * g.k;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = al * 0.45; ctx.fillStyle = o.col; crescent(ctx, g.x, g.y, o.r + 4, g.a0, g.a1, o.w * 1.25); ctx.fill();
        ctx.globalAlpha = al * 0.85; crescent(ctx, g.x, g.y, o.r, g.a0, g.a1, o.w * 0.7); ctx.fill();
        ctx.globalAlpha = al; ctx.fillStyle = o.col2 || '#ffffff'; crescent(ctx, g.x, g.y, o.r, g.a0, g.a1, o.w * 0.22); ctx.fill();
        ctx.globalAlpha = al * 0.7; ctx.strokeStyle = o.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.x, g.y, o.r + 6, g.a0, g.a1, g.a1 < g.a0); ctx.stroke();
        ctx.restore(); },
      glw() { const g = geo(); if (!g.ok) return; gctx.globalAlpha = 0.8 * (1 - g.k); gctx.strokeStyle = o.col; gctx.lineWidth = o.w;
        gctx.beginPath(); gctx.arc(g.x, g.y, o.r - o.w * 0.3, g.a0, g.a1, g.a1 < g.a0); gctx.stroke(); } });
  }
  // villám: cikcakkos töréspontok
  function boltPts(x1, y1, x2, y2, jit, n) {
    const pts = [[x1, y1]], a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    for (let i = 1; i < n; i++) { const k = i / n, j = rand(-jit, jit) * Math.sin(Math.PI * k); pts.push([lerp(x1, x2, k) + nx * j, lerp(y1, y2, k) + ny * j]); }
    pts.push([x2, y2]); return pts;
  }
  function strokePts(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke(); }
  function boltFx(x1, y1, x2, y2, col, dur = 0.22, w = 3) {
    let t = 0, pts = boltPts(x1, y1, x2, y2, 14, 9), rt = 0;
    return addFx({ tag: 'bolt', upd(dt) { t += dt; rt -= dt; if (rt <= 0) { rt = 0.045; pts = boltPts(x1, y1, x2, y2, 14, 9); } return t < dur; },
      drw() { const al = 1 - t / dur; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        ctx.globalAlpha = al * 0.5; ctx.strokeStyle = col; ctx.lineWidth = w * 3; strokePts(ctx, pts);
        ctx.globalAlpha = al; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 0.8; strokePts(ctx, pts); ctx.restore(); },
      glw() { gctx.globalAlpha = 0.9 * (1 - t / dur); gctx.strokeStyle = col; gctx.lineWidth = w * 4; strokePts(gctx, pts); } });
  }
  // fénycsík (sugár-utókép)
  function beamFx(x1, y1, x2, y2, w, col, dur = 0.4, core = '#ffffff') {
    let t = 0;
    return addFx({ tag: 'beam', upd(dt) { t += dt; return t < dur; },
      drw() { const k = t / dur, al = 1 - k, ww = w * (1 - k * 0.6); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        ctx.globalAlpha = al * 0.18; ctx.strokeStyle = col; ctx.lineWidth = ww * 2.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.globalAlpha = al * 0.55; ctx.lineWidth = ww; ctx.stroke();
        ctx.globalAlpha = al; ctx.strokeStyle = core; ctx.lineWidth = Math.max(1, ww * 0.22); ctx.stroke();
        // fény-gyűrűk a sugár mentén
        const len = Math.hypot(x2 - x1, y2 - y1), an = Math.atan2(y2 - y1, x2 - x1), nr = Math.min(10, Math.floor(len / 70));
        ctx.globalAlpha = al * 0.6; ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        for (let i = 1; i <= nr; i++) { const d = (i / (nr + 1)) * len + k * 40, cx = x1 + Math.cos(an) * d, cy = y1 + Math.sin(an) * d; ctx.beginPath(); ctx.ellipse(cx, cy, 3 + k * 4, ww * (0.7 + k), an, 0, TAU); ctx.stroke(); }
        ctx.restore(); },
      glw() { gctx.globalAlpha = 0.5 * (1 - t / dur); gctx.strokeStyle = col; gctx.lineWidth = w * 1.3; gctx.lineCap = 'round'; gctx.beginPath(); gctx.moveTo(x1, y1); gctx.lineTo(x2, y2); gctx.stroke(); } });
  }
  // kitáguló gyűrű, saját színnel és vastagsággal (lighter)
  function ringFx(x, y, r0, r1, col, dur, w, under) {
    let t = 0;
    return addFx({ tag: 'ring', under: !!under, upd(dt) { t += dt; return t < dur; },
      drw() { const k = ease(t / dur); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - t / dur) * 0.9; ctx.strokeStyle = col; ctx.lineWidth = w * (1 - k) + 1;
        ctx.beginPath(); ctx.arc(x, y, r0 + (r1 - r0) * k, 0, TAU); ctx.stroke(); ctx.restore(); },
      glw() { const k = ease(t / dur); gctx.globalAlpha = 0.6 * (1 - t / dur); gctx.strokeStyle = col; gctx.lineWidth = w * 1.5; gctx.beginPath(); gctx.arc(x, y, r0 + (r1 - r0) * k, 0, TAU); gctx.stroke(); } });
  }
  // csillag alakú villanás
  function starFx(x, y, r, col, dur = 0.25, rot = 0) {
    let t = 0;
    return addFx({ tag: 'star', upd(dt) { t += dt; return t < dur; },
      drw() { const k = t / dur, rr = r * (0.5 + k * 0.8); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.translate(x, y); ctx.rotate(rot + k * 0.6); ctx.fillStyle = col;
        ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? rr * 0.18 : rr; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, rr * 0.18, 0, TAU); ctx.fill(); ctx.restore(); },
      glw() { glowDot(x, y, r * 0.9, col, 0.7 * (1 - t / dur)); } });
  }
  // ki melyik fegyverrel sebzett utoljára (ölés-hatásokhoz)
  const KILL = {};
  on('hit', (e, d, o) => { if (o && o.tag) { e._wt = o.tag; e._wtT = G.time; } });
  // saját égés (a mag égése csak a p.burn áldással sebez): o.wburn mp-ig ég a démon
  on('hit', (e, d, o) => { if (o && o.wburn) { e.wBurn = Math.max(e.wBurn || 0, o.wburn); e.burn = Math.max(e.burn || 0, 0.2); } });
  on('tick', dt => {
    if (!G || G.hub) return; const p = G.p;
    for (const e of G.enemies) { if (!(e.wBurn > 0) || e.dead) continue; e.wBurn -= dt; if (e.burn < 0.1) e.burn = 0.1;
      if (!canHit(e)) continue; e.hp -= p.dmg * 0.45 * dt; if (e.hp <= 0) killEnemy(e); }
  });
  on('kill', e => { if (!e || !e._wt || G.time - e._wtT > 0.6) return; const f = KILL[e._wt]; if (f) f(e); });

  // ---------- hangok ----------
  Object.assign(SFX, {
    wBlade1: () => { noise(0.1, 0.08, 5200); tone(1150, 0.08, 'triangle', 0.035, -620); },
    wBlade2: () => { noise(0.1, 0.08, 4300); tone(880, 0.09, 'triangle', 0.035, -480); },
    wThrust: () => { noise(0.14, 0.1, 3200); tone(480, 0.16, 'sawtooth', 0.035, 900); tone(1568, 0.25, 'sine', 0.03, 0, 0.05); },
    wWhirl: () => { noise(0.3, 0.1, 2600); tone(660, 0.3, 'triangle', 0.04, 500); tone(1320, 0.3, 'sine', 0.025, 0, 0.1); },
    wParry: () => { tone(2093, 0.2, 'sine', 0.05); tone(3136, 0.14, 'sine', 0.03, 0, 0.03); },
    wFlame: () => { noise(0.35, 0.1, 800); tone(120, 0.3, 'sawtooth', 0.03, 60); },
    wScy: () => { noise(0.32, 0.09, 1600); tone(330, 0.32, 'sine', 0.05, -160); },
    wSpin: () => { noise(0.14, 0.05, 1200); tone(240, 0.14, 'triangle', 0.025, 90); },
    wReap: () => { noise(0.45, 0.12, 900); tone(180, 0.45, 'sawtooth', 0.04, -90); tone(720, 0.4, 'sine', 0.03, -300, 0.05); },
    wSoul: () => { tone(880, 0.22, 'sine', 0.035, 620); tone(1320, 0.18, 'sine', 0.02, 400, 0.05); },
    wMoon: () => { noise(0.25, 0.06, 2400); tone(520, 0.25, 'sine', 0.03, 260); },
    wWind: () => { tone(130, 0.38, 'sawtooth', 0.04, 260); noise(0.3, 0.04, 600); },
    wSlam: () => { noise(0.5, 0.3, 170); tone(52, 0.65, 'sine', 0.26, -22); noise(0.25, 0.12, 2600, 0.02); },
    wThunder: () => { noise(0.7, 0.24, 650); noise(0.12, 0.2, 4200); tone(85, 0.5, 'sawtooth', 0.06, -35); },
    wQuake: () => { noise(0.9, 0.25, 110); tone(38, 0.9, 'sine', 0.22, -10); },
    wArrow: () => { tone(1400, 0.05, 'triangle', 0.03, -700); noise(0.05, 0.04, 6200); },
    wDraw: () => { tone(240, 0.55, 'triangle', 0.028, 280); },
    wFull: () => { tone(1760, 0.14, 'sine', 0.04); tone(2637, 0.1, 'sine', 0.02, 0, 0.04); },
    wLance: () => { tone(1250, 0.5, 'sawtooth', 0.045, -900); tone(2500, 0.4, 'sine', 0.04, -1300); noise(0.3, 0.12, 5200); },
    wStars: () => { [1568, 1760, 2093, 2637].forEach((f, i) => tone(f, 0.3, 'sine', 0.025, 0, i * 0.07)); },
    wHorn: () => { tone(233, 0.28, 'sawtooth', 0.055, 8); tone(349, 0.28, 'square', 0.02); noise(0.2, 0.05, 900); },
    wFanfare: () => { [233, 294, 349, 466].forEach((f, i) => tone(f, 0.5 - i * 0.05, 'sawtooth', 0.05, 0, i * 0.06)); tone(116, 0.6, 'square', 0.03); noise(0.4, 0.1, 700); },
    wWall: () => { tone(98, 0.5, 'square', 0.03, 10); noise(0.4, 0.06, 300); },
    wPage: () => { noise(0.08, 0.05, 7200); tone(660, 0.12, 'sine', 0.022, 240); },
    wGlyph: () => { tone(523, 0.3, 'triangle', 0.04, -220); noise(0.18, 0.09, 2400); tone(1046, 0.2, 'sine', 0.025); },
    wCherub: () => tone(1760 + Math.random() * 400, 0.07, 'sine', 0.022, 300),
  });

  // =================================================================
  //  1. ÉGI PENGE
  // =================================================================
  const BLADE = {
    base: { col: '#ffe9a8', col2: '#ffffff', edge: '#fff6d6', guard: '#e3b54a', spark: '#fff2b0' },
    blade_flame: { col: '#ff7a2a', col2: '#ffe08a', edge: '#ffd27a', guard: '#9a3a1a', spark: '#ffb04a' },
    blade_justice: { col: '#9fdcff', col2: '#ffffff', edge: '#e8f8ff', guard: '#d9e6ff', spark: '#cfefff' },
  };
  const bPal = () => BLADE[MO('blade')] || BLADE.base;
  function bladeReach(p) { return (66 + p.size * 2.6 + (rangeK(p) - 1) * 55 + (spdK(p) - 1) * 25) * (WL('blade') >= 2 ? 1.15 : 1); }
  function flameTrail(pts) {
    if (fxN('flame') >= 6) return;
    let t = 0, tick = 0; const dur = 1.7, skip = new Set(), p = G.p;
    addFx({ tag: 'flame', under: true, upd(dt) {
        t += dt; tick -= dt;
        if (tick <= 0) { tick = 0.25; skip.clear(); for (const q of pts) hitCircle(q.x, q.y, 20, p.dmg * 0.2, { wburn: 2.5, tag: 'blade', silentNum: true }, skip); }
        if (partOK(1100) && Math.random() < 0.6) { const q = choice(pts); G.parts.push({ x: q.x + rand(-10, 10), y: q.y + rand(-8, 8), vx: rand(-15, 15), vy: rand(-90, -40), life: 0.5, max: 0.5, col: Math.random() < 0.5 ? '#ff7a2a' : '#ffd27a', size: rand(2, 3.5) }); }
        return t < dur; },
      drw() { const al = Math.min(1, (dur - t) * 1.5); ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (const q of pts) { const fl = 1 + Math.sin(gt * 20 + q.x) * 0.15;
          ctx.globalAlpha = al * 0.35; ctx.fillStyle = '#ff4a1a'; ctx.beginPath(); ctx.ellipse(q.x, q.y, 20 * fl, 12 * fl, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = al * 0.6; ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.ellipse(q.x, q.y - 2, 10 * fl, 6, 0, 0, TAU); ctx.fill(); }
        ctx.restore(); },
      glw() { for (const q of pts) glowDot(q.x, q.y, 22, '#ff7a2a', 0.45 * Math.min(1, dur - t)); } });
  }
  // igazság hulláma: repülő fény-sarló (baráti lövedék, saját rajzzal)
  function justiceWave(p, a, big) {
    const pl = BLADE.blade_justice, sp = (big ? 640 : 560) * spdK(p);
    pBullet(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, a, sp, {
      r: big ? 24 : 14, dmg: p.dmg * (big ? 1.8 : 0.5) * DM('blade'), life: (big ? 0.85 : 0.3) * rangeK(p), pierce: 999, ghost: big, col: pl.col,
      ho: { tag: 'blade', kb: big ? 240 : 100 }, big,
      upd(b) { if (b.big) cutWhere(q => Math.hypot(q.x - b.x, q.y - b.y) < b.r + q.r + 4, pl.col); return true; },
      drw(b) { const ang = Math.atan2(b.vy, b.vx), s = b.big ? 1.6 : 1, al = Math.min(1, b.life * 6); ctx.globalAlpha = al;
        ctx.fillStyle = hexA(pl.col, 0.5); crescent(ctx, b.x - Math.cos(ang) * 14 * s, b.y - Math.sin(ang) * 14 * s, 22 * s, ang - 1.1, ang + 1.1, 12 * s, 10); ctx.fill();
        ctx.fillStyle = '#ffffff'; crescent(ctx, b.x - Math.cos(ang) * 14 * s, b.y - Math.sin(ang) * 14 * s, 22 * s, ang - 0.9, ang + 0.9, 4 * s, 10); ctx.fill();
        ctx.globalAlpha = 1; },
    });
  }
  function bladeHitFx(e, a, pl, heavy) {
    if (!partOK()) return;
    vfx.spark(e.x, e.y, a, 0.7, pl.spark, heavy ? 10 : 6, heavy ? 420 : 320, 0.3, 2.5);
    if (Math.random() < (heavy ? 0.8 : 0.35)) vfx.feathers(e.x, e.y, heavy ? 3 : 1, MO('blade') === 'blade_flame' ? '#ffd9a8' : '#fff8e8');
  }
  function bladeParry(p, cut, a, pl) {
    if (!cut.length) return;
    sfx('wParry'); starFx(cut[0].x, cut[0].y, 16, pl.col2, 0.2);
    if (WL('blade') >= 3) for (let i = 0; i < Math.min(cut.length, 6); i++) {
      const q = cut[i];
      pBullet(q.x, q.y, a + rand(-0.25, 0.25), 620 * spdK(p), { r: 4, dmg: p.dmg * 0.8 * DM('blade'), life: 0.5, col: pl.col, ho: { tag: 'blade' },
        drw(b) { const an = Math.atan2(b.vy, b.vx); ctx.translate(b.x, b.y); ctx.rotate(an); ctx.fillStyle = hexA(pl.col, 0.6); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-10, -3); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-6, -1, 12, 2); } });
    }
  }
  function bladeSlash(p, ws, a, step) {
    const pl = bPal(), mo = MO('blade'), r = bladeReach(p), half = Math.min(2.2, 1.05 + (p.shots - 1) * 0.22 + (WL('blade') >= 2 ? 0.25 : 0));
    const dir = step === 0 ? 1 : -1, skip = new Set();
    for (const da of p.back ? [a, a + Math.PI] : [a]) {
      const hits = hitArc(p.x, p.y, r, da, half, p.dmg * 1.5 * DM('blade'), { kb: 170, tag: 'blade', hitstop: 0.025, wburn: mo === 'blade_flame' ? 2.5 : 0 }, skip);
      for (const e of hits) bladeHitFx(e, angTo(p, e), pl, false);
      bladeParry(p, cutWhere(b => inArc(b, p.x, p.y, r, da, half), pl.spark), da, pl);
      swingFx({ a: da, half: half * 1.05, r: r * 0.92, w: 26, dir, col: pl.col, col2: pl.col2, dur: 0.2 });
      if (mo === 'blade_flame') { const pts = []; for (let i = 0; i < 5; i++) { const aa = da - half * 0.8 + i / 4 * half * 1.6; pts.push({ x: clamp(p.x + Math.cos(aa) * r * 0.7, L + 10, R - 10), y: clamp(p.y + Math.sin(aa) * r * 0.7, T + 10, B - 10) }); } flameTrail(pts); }
      if (mo === 'blade_justice') justiceWave(p, da, false);
    }
    ws.sw = { t: 0, dur: 0.17, a, half, dir, kind: 'slash' };
    sfx(step === 0 ? 'wBlade1' : 'wBlade2'); if (mo === 'blade_flame') sfx('wFlame');
  }
  function bladeThrust(p, ws, a) {
    const pl = bPal(), mo = MO('blade'), len = bladeReach(p) * 1.6, w = 28 * sizeK(p), skip = new Set();
    for (const da of p.back ? [a, a + Math.PI] : [a]) {
      const x2 = p.x + Math.cos(da) * len, y2 = p.y + Math.sin(da) * len;
      const hits = hitLine(p.x, p.y, x2, y2, w, p.dmg * 2.6 * DM('blade'), { kb: 340, kbA: da, stun: 0.25, hitstop: 0.05, critAdd: 0.1, tag: 'blade', wburn: mo === 'blade_flame' ? 3 : 0 }, skip);
      for (const e of hits) bladeHitFx(e, da, pl, true);
      bladeParry(p, cutWhere(b => segDist(b.x, b.y, p.x, p.y, da, len) < w / 2 + b.r), da, pl);
      // fénydárda-nyom
      let t = 0; const dur = 0.22;
      addFx({ tag: 'thrust', upd(dt) { t += dt; return t < dur; },
        drw() { const k = t / dur, pp = G.p, ex = lerp(len * 0.7, len, ease(k * 3)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(pp.x, pp.y); ctx.rotate(da);
          ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = pl.col; ctx.beginPath(); ctx.moveTo(10, -w * 0.55); ctx.lineTo(ex, 0); ctx.lineTo(10, w * 0.55); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1 - k; ctx.fillStyle = pl.col2; ctx.beginPath(); ctx.moveTo(10, -w * 0.16); ctx.lineTo(ex + 6, 0); ctx.lineTo(10, w * 0.16); ctx.closePath(); ctx.fill(); ctx.restore(); },
        glw() { const pp = G.p; gctx.globalAlpha = 0.8 * (1 - t / dur); gctx.strokeStyle = pl.col; gctx.lineWidth = w; gctx.beginPath(); gctx.moveTo(pp.x, pp.y); gctx.lineTo(pp.x + Math.cos(da) * len, pp.y + Math.sin(da) * len); gctx.stroke(); } });
      starFx(x2, y2, 22, pl.col2, 0.25, da);
      if (mo === 'blade_flame') {
        hitCircle(x2, y2, 50, p.dmg * 1.0 * DM('blade'), { wburn: 3, kb: 200, tag: 'blade' });
        ringFx(x2, y2, 8, 60, '#ff7a2a', 0.35, 10); if (partOK()) { part(x2, y2, '#ff7a2a', 18, 260, 0.5, 3.5); part(x2, y2, '#ffe08a', 10, 160, 0.4, 3); }
        flameTrail([{ x: clamp(x2, L + 10, R - 10), y: clamp(y2, T + 10, B - 10) }, { x: lerp(p.x, x2, 0.6), y: lerp(p.y, y2, 0.6) }]);
      }
      if (mo === 'blade_justice') justiceWave(p, da, true);
    }
    p.lunge = 0.1; p.lungeA = a;
    ws.sw = { t: 0, dur: 0.22, a, half: 0, dir: 1, kind: 'thrust' };
    vfx.shake(3); sfx('wThrust');
  }
  function bladeWhirl(p, ws, a) {
    const pl = bPal(), r = bladeReach(p) * 1.08;
    const hits = hitCircle(p.x, p.y, r, p.dmg * 3.0 * DM('blade'), { kb: 300, tag: 'blade', hitstop: 0.04, wburn: MO('blade') === 'blade_flame' ? 3 : 0 });
    for (const e of hits) bladeHitFx(e, angTo(p, e), pl, true);
    bladeParry(p, cutWhere(b => Math.hypot(b.x - p.x, b.y - p.y) < r + b.r), a, pl);
    swingFx({ a: a + Math.PI, half: Math.PI, r: r * 0.92, w: 30, dir: 1, col: pl.col, col2: pl.col2, dur: 0.3 });
    ringFx(p.x, p.y, 20, r * 1.1, pl.col, 0.35, 8);
    if (partOK()) vfx.feathers(p.x, p.y, 5, MO('blade') === 'blade_flame' ? '#ffd9a8' : '#fff8e8');
    if (MO('blade') === 'blade_justice') for (let i = 0; i < 6; i++) justiceWave(p, a + i / 6 * TAU, false);
    ws.sw = { t: 0, dur: 0.3, a, half: Math.PI, dir: 1, kind: 'whirl' };
    vfx.shake(4); sfx('wWhirl');
  }
  // kard rajza helyi koordinátában: +x a penge iránya
  function drawSword(len, pl, mo, glowK) {
    // markolat és gomb
    ctx.fillStyle = '#6a4a22'; ctx.fillRect(-11, -1.8, 11, 3.6);
    ctx.fillStyle = pl.guard; ctx.beginPath(); ctx.arc(-12, 0, 2.6, 0, TAU); ctx.fill();
    // szárnyas keresztvas
    ctx.fillStyle = pl.guard; ctx.beginPath(); ctx.moveTo(0, -2); ctx.quadraticCurveTo(-3, -10, 3, -12); ctx.quadraticCurveTo(2, -6, 3, -2); ctx.lineTo(3, 2); ctx.quadraticCurveTo(2, 6, 3, 12); ctx.quadraticCurveTo(-3, 10, 0, 2); ctx.closePath(); ctx.fill();
    // penge
    ctx.fillStyle = mo === 'blade_flame' ? '#ffb070' : mo === 'blade_justice' ? '#eef8ff' : '#fff6d6';
    ctx.beginPath(); ctx.moveTo(3, -3.4); ctx.lineTo(len - 8, -2.6); ctx.lineTo(len, 0); ctx.lineTo(len - 8, 2.6); ctx.lineTo(3, 3.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pl.col; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(len - 6, 0); ctx.stroke();
    if (mo === 'blade_flame') { // lángnyelvek a pengén
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) { const x = 8 + i * (len - 12) / 5, h = 5 + Math.sin(gt * 18 + i * 1.7) * 3; ctx.globalAlpha = 0.55; ctx.fillStyle = i % 2 ? '#ff7a2a' : '#ffd27a';
        ctx.beginPath(); ctx.moveTo(x - 3, -2); ctx.quadraticCurveTo(x, -2 - h * 2, x + 3 + Math.sin(gt * 9 + i) * 2, -2 - h * 2.4); ctx.quadraticCurveTo(x + 2, -2 - h, x + 4, -2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    if (glowK > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glowK; ctx.fillStyle = pl.col; ctx.beginPath(); ctx.ellipse(len * 0.55, 0, len * 0.55, 6, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  }
  function bladePose(p, ws) {
    const sw = ws.sw; let ang = p.face + 0.95 + Math.sin(gt * 2.2) * 0.06, ext = 0, gk = 0;
    if (sw) { const k = ease(sw.t / sw.dur);
      if (sw.kind === 'slash') { ang = sw.a - sw.dir * sw.half * 1.1 + sw.dir * sw.half * 2.2 * k; gk = 0.5 * (1 - k); }
      else if (sw.kind === 'thrust') { ang = sw.a; ext = Math.sin(Math.min(1, sw.t / sw.dur) * Math.PI) * 18; gk = 0.6; }
      else { ang = sw.a + k * TAU; gk = 0.5; } }
    return { ang, ext, gk };
  }

  // =================================================================
  //  2. LÉLEKARATÓ KASZA
  // =================================================================
  const SCY = {
    base: { col: '#9ff5d8', blade: '#dffff4', soul: '#8fffd6', dark: '#2a6a5a', staff: '#5b4a3a' },
    scythe_moon: { col: '#cfe0ff', blade: '#f4f8ff', soul: '#bcd4ff', dark: '#3a4a7a', staff: '#8a93b0' },
    scythe_death: { col: '#5affc8', blade: '#c8ffe8', soul: '#5affc8', dark: '#3a1a5a', staff: '#2a1a34' },
  };
  const sPal = () => SCY[MO('scythe')] || SCY.base;
  function scyReach(p) { return (88 + p.size * 2.6 + (rangeK(p) - 1) * 60) * (WL('scythe') >= 2 ? 1.2 : 1); }
  // lélekfoszlány: a megölt démonból az angyalhoz száll (gyógyít, Kegyelmet ad)
  function soulWisp(x, y, strong) {
    const p = G.p, pl = sPal();
    if (fxN('wisp') >= 16) { p.hp = Math.min(p.maxHp, p.hp + 1); p.grace = Math.min(p.maxGrace, p.grace + 4 * p.graceGain); return; }
    let vx = rand(-160, 160), vy = rand(-220, -80), t = 0, prey = null, bit = WL('scythe') < 3;
    const trail = [];
    addFx({ tag: 'wisp', upd(dt) {
        t += dt; let tx = p.x, ty = p.y - 4;
        if (!bit && t > 0.15) {
          if (!prey || !canHit(prey)) { prey = null; let bd = 260; eachEnemy(e => { const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; prey = e; } }); if (!prey) bit = true; }
          if (prey) { tx = prey.x; ty = prey.y; if (Math.hypot(tx - x, ty - y) < prey.r + 6) { hitEnemy(prey, p.dmg * 1.0 * DM('scythe'), { tag: 'wisp' }); if (partOK()) part(x, y, pl.soul, 6, 140, 0.3, 2.5); bit = true; vx = -vx; vy = -vy; } }
        }
        const a = Math.atan2(ty - y, tx - x), acc = 1500 + t * 1500;
        vx += Math.cos(a) * acc * dt; vy += Math.sin(a) * acc * dt; const sp = Math.hypot(vx, vy), mx = 360 + t * 300; if (sp > mx) { vx *= mx / sp; vy *= mx / sp; }
        x += vx * dt; y += vy * dt; trail.unshift(x, y); if (trail.length > 16) trail.length = 16;
        if (bit && Math.hypot(p.x - x, p.y - y) < 16) {
          p.hp = Math.min(p.maxHp, p.hp + (strong ? 2 : 1)); p.grace = Math.min(p.maxGrace, p.grace + 4 * p.graceGain);
          sfx('wSoul'); if (partOK()) part(p.x, p.y, pl.soul, 6, 90, 0.4, 2.5); return false;
        }
        return t < 4; },
      drw() { ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 2; i < trail.length; i += 2) { ctx.globalAlpha = (1 - i / trail.length) * 0.6; ctx.fillStyle = pl.soul; ctx.beginPath(); ctx.arc(trail[i], trail[i + 1], 4 * (1 - i / trail.length) + 1, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.fillStyle = pl.soul; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill(); ctx.restore(); },
      glw() { glowDot(x, y, 10, pl.soul, 0.8); } });
  }
  // Halál Aratója: a démon lelke szétrobban
  function soulBurst(x, y) {
    const p = G.p, pl = SCY.scythe_death; let t = 0;
    if (fxN('sburst') >= 6) return;
    addFx({ tag: 'sburst', upd(dt) { t += dt;
        if (t >= 0.12 && !this.done) { this.done = true; hitCircle(x, y, 70, p.dmg * 1.5 * DM('scythe'), { kb: 260, tag: 'scythe' }); ringFx(x, y, 6, 78, pl.col, 0.4, 10);
          if (partOK()) { part(x, y, pl.col, 16, 260, 0.5, 3); part(x, y, '#000', 8, 140, 0.6, 6); } vfx.shake(3); }
        return t < 0.4; },
      drw() { if (t > 0.12) return; const k = t / 0.12; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.fillStyle = pl.col; ctx.beginPath(); ctx.arc(x, y, 10 + k * 26, 0, TAU); ctx.fill(); ctx.restore(); },
      glw() { glowDot(x, y, 40, pl.col, 0.6 * (1 - t / 0.4)); } });
  }
  KILL.scythe = e => { soulWisp(e.x, e.y, MO('scythe') === 'scythe_death'); if (MO('scythe') === 'scythe_death') { soulWisp(e.x, e.y, false); soulBurst(e.x, e.y); } };
  function scySweep(p, ws, a) {
    const pl = sPal(), r = scyReach(p), half = Math.min(Math.PI, (WL('scythe') >= 2 ? 2.6 : 2.2) + (p.shots - 1) * 0.2 + (p.back ? 0.5 : 0));
    ws.dir = -(ws.dir || 1);
    const hits = hitArc(p.x, p.y, r, a, half, p.dmg * 3.4 * DM('scythe'), { kb: 210, tag: 'scythe', hitstop: 0.03, slow: 0.6 });
    for (const e of hits) if (partOK()) { vfx.spark(e.x, e.y, angTo(p, e) + ws.dir * 1.2, 0.5, pl.soul, 6, 300, 0.35, 2.5); }
    cutWhere(b => inArc(b, p.x, p.y, r, a, half), pl.soul);
    swingFx({ a, half, r: r * 0.95, w: 34, dir: ws.dir, col: pl.col, col2: pl.blade, dur: 0.3 });
    ws.sw = { t: 0, dur: 0.3, a, half, dir: ws.dir };
    if (partOK()) for (let i = 0; i < 6; i++) { const aa = a + rand(-half, half), rr = rand(0.5, 1) * r; G.parts.push({ x: p.x + Math.cos(aa) * rr, y: p.y + Math.sin(aa) * rr, vx: rand(-20, 20), vy: rand(-60, -20), life: 0.8, max: 0.8, col: pl.soul, size: 2.5 }); }
    sfx('wScy');
  }
  function scyEndSpin(p, ws) {
    const pl = sPal();
    if (ws.spinT > 0.4) {
      const r = scyReach(p) * 1.15;
      const hits = hitCircle(p.x, p.y, r, p.dmg * 2.4 * DM('scythe'), { kb: 330, tag: 'scythe', hitstop: 0.05 });
      for (const e of hits) if (partOK()) vfx.spark(e.x, e.y, angTo(p, e), 0.6, pl.soul, 6, 300, 0.35, 2.5);
      ringFx(p.x, p.y, 20, r * 1.15, pl.col, 0.45, 12); ringFx(p.x, p.y, 10, r * 0.8, pl.blade, 0.3, 6);
      vfx.shake(5); sfx('wReap');
    }
    ws.spin = false; ws.spinT = 0; ws.chg = 0; ws.charging = false; ws.cd = 0.8;
  }
  function scyUpdateSpin(p, ws, dt) {
    const pl = sPal(), r = scyReach(p) * 0.92, death = MO('scythe') === 'scythe_death';
    ws.spinT += dt; ws.ang = (ws.ang || 0) + dt * 15;
    if (WL('scythe') < 4) slowMove(p, dt, 0.6);
    ws.tick = (ws.tick || 0) - dt;
    if (ws.tick <= 0) {
      ws.tick = 0.14; ws.tickN = (ws.tickN || 0) + 1; sfx('wSpin');
      const hits = hitCircle(p.x, p.y, r, p.dmg * 0.75 * DM('scythe'), { kb: death ? 0 : 120, tag: 'scythe', silentNum: ws.tickN % 3 !== 0 });
      for (const e of hits) if (partOK(1000)) vfx.spark(e.x, e.y, angTo(p, e) + Math.PI / 2, 0.4, pl.soul, 3, 260, 0.25, 2);
      cutWhere(b => Math.hypot(b.x - p.x, b.y - p.y) < r + b.r, pl.soul);
    }
    if (death) eachEnemy(e => { if (e.boss || e.type === 'turret') return; const d = dist(e, p); if (d < 240 && d > e.r + p.r + 18) { const a = angTo(e, p), k = 170 * (1 - d / 260) + 40; e.x += Math.cos(a) * k * dt; e.y += Math.sin(a) * k * dt; } });
    if (partOK(1000) && Math.random() < 0.7) { const a = ws.ang + rand(-0.3, 0.3); G.parts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, vx: -Math.sin(a) * 120, vy: Math.cos(a) * 120, life: 0.4, max: 0.4, col: death && Math.random() < 0.4 ? '#000' : pl.soul, size: 3 }); }
    const maxT = WL('scythe') >= 4 ? 3.6 : 2.6;
    if (ws.spinT > maxT) scyEndSpin(p, ws);
  }
  // Holdsarló: bumeráng-kasza
  // a hajítás távolsága: a célzás irányába eső legközelebbi démonig (érintésnél is működik), különben a teljes hatótáv
  function moonDist(p, a) {
    const D = 260 * rangeK(p) * (WL('scythe') >= 2 ? 1.15 : 1); let best = D;
    eachEnemy(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < D + 40 && arcDiff(Math.atan2(e.y - p.y, e.x - p.x), a) < 0.45) best = Math.min(best, d + 12); });
    return clamp(best, 90, D);
  }
  function moonThrow(p, ws, a) {
    const D = moonDist(p, a);
    ws.boom = { x: p.x, y: p.y, a, d: 0, D, st: 'out', t: 0, spin: 0, skip: new Set(), room: G.room, tick: 0, vx: 0, vy: 0 };
    sfx('wMoon');
  }
  function moonUpdate(p, ws, dt, aim) {
    const b = ws.boom, pl = SCY.scythe_moon, rr = 30 * sizeK(p) * (WL('scythe') >= 2 ? 1.15 : 1);
    if (b.room !== G.room) { ws.boom = null; return; }
    b.t += dt; b.spin += dt * 22;
    if (b.st === 'out') {
      const sp = (760 * spdK(p)) * Math.max(0.15, 1 - b.d / b.D); b.d += sp * dt;
      b.x = p.x + Math.cos(b.a) * b.d; b.y = p.y + Math.sin(b.a) * b.d;
      if (b.d >= b.D * 0.97 || b.x < L + 10 || b.x > R - 10 || b.y < T + 10 || b.y > B - 10) { b.st = aim !== null ? 'hover' : 'back'; b.skip.clear(); b.t = 0; b.x = clamp(b.x, L + 10, R - 10); b.y = clamp(b.y, T + 10, B - 10); }
      const hits = hitCircle(b.x, b.y, rr, p.dmg * 2.3 * DM('scythe'), { kb: 160, kbA: b.a, tag: 'scythe' }, b.skip);
      for (const e of hits) if (partOK()) vfx.spark(e.x, e.y, b.a, 0.6, pl.soul, 6, 300, 0.3, 2.5);
    } else if (b.st === 'hover') {
      if (aim !== null) { b.D += (moonDist(p, aim) - b.D) * Math.min(1, dt * 3); const tx = clamp(p.x + Math.cos(aim) * b.D, L + 20, R - 20), ty = clamp(p.y + Math.sin(aim) * b.D, T + 20, B - 20); b.x += (tx - b.x) * Math.min(1, dt * 4); b.y += (ty - b.y) * Math.min(1, dt * 4); }
      b.tick -= dt;
      if (b.tick <= 0) { b.tick = 0.15; const hits = hitCircle(b.x, b.y, rr * 1.5, p.dmg * 0.7 * DM('scythe'), { kb: 60, tag: 'scythe' }); for (const e of hits) if (partOK(1000)) vfx.spark(e.x, e.y, rand(0, TAU), 0.5, pl.soul, 3, 220, 0.25, 2); if (b.t % 0.45 < 0.15) sfx('wSpin'); }
      if (aim === null || b.t > (WL('scythe') >= 4 ? 3.6 : 2.6)) { b.st = 'back'; b.skip.clear(); b.t = 0; }
    } else {
      const a = Math.atan2(p.y - b.y, p.x - b.x), sp = 300 + b.t * 1600; b.x += Math.cos(a) * sp * dt; b.y += Math.sin(a) * sp * dt;
      const hits = hitCircle(b.x, b.y, rr, p.dmg * 2.3 * DM('scythe'), { kb: 160, kbA: a, tag: 'scythe' }, b.skip);
      for (const e of hits) if (partOK()) vfx.spark(e.x, e.y, a, 0.6, pl.soul, 6, 300, 0.3, 2.5);
      if (Math.hypot(p.x - b.x, p.y - b.y) < 22 || b.t > 1.5) { ws.boom = null; ws.cd = 0.2; sfx('wSoul'); if (partOK()) part(p.x, p.y, pl.col, 8, 120, 0.3, 2.5); return; }
    }
    cutWhere(q => Math.hypot(q.x - b.x, q.y - b.y) < rr + q.r, pl.soul);
    if (partOK(1000) && Math.random() < 0.35) { const a = b.spin + rand(0, TAU); G.parts.push({ x: b.x + Math.cos(a) * rr, y: b.y + Math.sin(a) * rr, vx: -Math.sin(a) * 90, vy: Math.cos(a) * 90, life: 0.35, max: 0.35, col: Math.random() < 0.5 ? pl.soul : '#ffffff', size: 2 }); }
  }
  // kasza rajza helyi koordinátában: a nyél +x felé, a penge a végén -y oldalra hajlik
  function drawScytheShape(len, pl, mo, glowK, spectral) {
    ctx.strokeStyle = pl.staff; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-len * 0.35, 0); ctx.lineTo(len, 0); ctx.stroke();
    ctx.strokeStyle = hexA(pl.col, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-len * 0.3, -1); ctx.lineTo(len, -1); ctx.stroke();
    // csont-gyűrűk a nyélen
    ctx.fillStyle = mo === 'scythe_death' ? '#7a5a9a' : '#cfc6a8'; ctx.fillRect(len * 0.2, -2.5, 3, 5); ctx.fillRect(len * 0.55, -2.5, 3, 5);
    // penge
    const bl = len * 0.95;
    ctx.save(); ctx.translate(len, 0);
    if (glowK > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glowK * 0.7; ctx.fillStyle = pl.col;
      ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(14, -bl * 0.55, -bl * 0.85, -bl * 0.72); ctx.quadraticCurveTo(-bl * 0.1, -bl * 0.28, -2, 6); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha *= spectral ? 0.85 : 1;
    ctx.fillStyle = pl.blade; ctx.beginPath(); ctx.moveTo(2, 3); ctx.quadraticCurveTo(10, -bl * 0.5, -bl * 0.8, -bl * 0.62); ctx.quadraticCurveTo(-bl * 0.12, -bl * 0.3, -2, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pl.col; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(3, 0); ctx.quadraticCurveTo(10, -bl * 0.5, -bl * 0.8, -bl * 0.62); ctx.stroke();
    if (mo === 'scythe_death') { ctx.fillStyle = '#1a0a24'; ctx.beginPath(); ctx.arc(-bl * 0.25, -bl * 0.38, 2.2, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawMoonBoom(b, pl) {
    const rr = 30;
    // holdsarló-pálya: elmosódott fény-ív a forgás mögött
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.08; ctx.fillStyle = pl.col; ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.fill();
    for (let i = 0; i < 2; i++) { const a0 = b.spin + i * Math.PI; ctx.globalAlpha = 0.5; ctx.fillStyle = pl.col; crescent(ctx, b.x, b.y, rr, a0 - 1.6, a0, 8, 10); ctx.fill(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; crescent(ctx, b.x, b.y, rr, a0 - 0.7, a0, 2.5, 8); ctx.fill(); }
    ctx.restore();
    // maga a kasza, középen forgatva
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin); ctx.translate(-12, 8); drawScytheShape(24, pl, 'scythe_moon', 0.35, false); ctx.restore();
    // holdsarló-jel
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#eef4ff'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill(); ctx.fillStyle = pl.dark; ctx.beginPath(); ctx.arc(b.x + 1.6, b.y - 1, 3.4, 0, TAU); ctx.fill(); ctx.restore();
  }

  // =================================================================
  //  3. ÍTÉLET PÖRÖLYE
  // =================================================================
  const HAM = {
    base: { col: '#ffd75e', storm: '#7fb8ff', head: '#e8c25a', dark: '#8a6a2a', crack: '#ffe08a' },
    hammer_thunder: { col: '#8fd0ff', storm: '#c8e8ff', head: '#b8d8ff', dark: '#3a5a8a', crack: '#bfe6ff' },
    hammer_quake: { col: '#ffb04a', storm: '#ff6a2a', head: '#c08a4a', dark: '#5a3a1a', crack: '#ff8a2a' },
  };
  const hPal = () => HAM[MO('hammer')] || HAM.base;
  function cracksFx(x, y, rad, pl, n = 9) {
    const lines = [];
    for (let i = 0; i < n; i++) {
      let a = i / n * TAU + rand(-0.25, 0.25), r = 6, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; const pts = [[px, py]], end = rad * rand(0.6, 1.25);
      while (r < end) { r += rand(8, 15); a += rand(-0.35, 0.35); px = x + Math.cos(a) * r; py = y + Math.sin(a) * r; pts.push([px, py]); }
      lines.push(pts);
      if (Math.random() < 0.5 && pts.length > 3) { const s = pts[2], ba = a + rand(0.5, 0.9) * (Math.random() < 0.5 ? -1 : 1); lines.push([s, [s[0] + Math.cos(ba) * rad * 0.3, s[1] + Math.sin(ba) * rad * 0.3]]); }
    }
    let t = 0; const dur = 2.2;
    addFx({ tag: 'crack', under: true, upd(dt) { t += dt; return t < dur; },
      drw() { const al = Math.min(1, (dur - t) * 1.2), gl = Math.max(0, 1 - t / 0.9); ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.globalAlpha = al * 0.7; ctx.strokeStyle = '#0a0606'; ctx.lineWidth = 3.5; for (const l of lines) strokePts(ctx, l);
        if (gl > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = gl; ctx.strokeStyle = pl.crack; ctx.lineWidth = 1.6; for (const l of lines) strokePts(ctx, l); }
        ctx.restore(); },
      glw() { const gl = Math.max(0, 1 - t / 0.9); if (gl > 0) glowDot(x, y, rad * 0.7, pl.crack, 0.35 * gl); } });
  }
  function holyPillar(x, y, col) {
    let t = 0; const dur = 0.6;
    addFx({ tag: 'pillar', upd(dt) { t += dt; return t < dur; },
      drw() { const k = t / dur, w = 46 * (1 - k * 0.7); ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - k) * 0.35; ctx.fillStyle = col; ctx.fillRect(x - w, T, w * 2, y - T);
        ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w * 0.25, T, w * 0.5, y - T);
        ctx.beginPath(); ctx.ellipse(x, y, w * 1.4, w * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore(); },
      glw() { gctx.globalAlpha = 0.8 * (1 - t / dur); gctx.fillStyle = col; gctx.fillRect(x - 40, T, 80, y - T); } });
  }
  function chainLightning(p, x, y, pl, n) {
    const done = new Set(); let cx = x, cy = y, k = 0;
    const step = () => {
      let best = null, bd = 260;
      eachEnemy(e => { if (done.has(e)) return; const d = Math.hypot(e.x - cx, e.y - cy); if (d < bd) { bd = d; best = e; } });
      if (!best) return;
      done.add(best); boltFx(cx, cy, best.x, best.y, pl.col, 0.25, 2.5);
      hitEnemy(best, p.dmg * 2.0 * DM('hammer'), { stun: 0.35, tag: 'hammer' }); if (partOK()) vfx.spark(best.x, best.y, rand(0, TAU), Math.PI, pl.storm, 6, 260, 0.3, 2);
      cx = best.x; cy = best.y; k++;
      if (k < n) { let t = 0; addFx({ tag: 'chain', upd(dt) { t += dt; if (t > 0.06) { step(); return false; } return true; } }); }
    };
    step();
  }
  function fissure(p, x, y, a, pl) {
    const n = 8 + WL('hammer') + (p.shots - 1) * 2, skip = new Set(), crack = [[x, y]];
    let t = 0, i = 0, cx = x, cy = y, dead = false;
    addFx({ tag: 'fissure', under: true, upd(dt) {
        t += dt;
        while (!dead && t > i * 0.045 && i < n) {
          i++; const aa = a + rand(-0.25, 0.25); cx += Math.cos(aa) * 34; cy += Math.sin(aa) * 34;
          if (cx < L + 8 || cx > R - 8 || cy < T + 8 || cy > B - 8) { dead = true; break; }
          crack.push([cx, cy]);
          hitCircle(cx, cy, 32 * sizeK(p), p.dmg * 2.0 * DM('hammer'), { stun: 0.45, kb: 220, kbA: aa + (Math.random() < 0.5 ? 1.4 : -1.4), tag: 'hammer' }, skip);
          cutWhere(b => Math.hypot(b.x - cx, b.y - cy) < 34 + b.r, pl.col);
          ringFx(cx, cy, 4, 40, pl.col, 0.3, 6, true);
          if (partOK()) { part(cx, cy, '#6a4a2a', 6, 220, 0.6, 4); part(cx, cy, pl.col, 6, 200, 0.4, 3); }
          if (i % 2) { vfx.shake(4); sfx('wQuake'); }
        }
        return t < 2.0; },
      drw() { const al = Math.min(1, (2 - t) * 1.5), gl = Math.max(0, 1 - t / 1.2); ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.globalAlpha = al * 0.8; ctx.strokeStyle = '#120804'; ctx.lineWidth = 8; strokePts(ctx, crack);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = gl; ctx.strokeStyle = pl.storm; ctx.lineWidth = 4; strokePts(ctx, crack);
        ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 1.5; strokePts(ctx, crack); ctx.restore(); },
      glw() { const gl = Math.max(0, 1 - t / 1.2); if (gl > 0) { gctx.globalAlpha = gl * 0.8; gctx.strokeStyle = pl.storm; gctx.lineWidth = 14; strokePts(gctx, crack); } } });
  }
  function hammerSlam(p, ws, a) {
    const pl = hPal(), mo = MO('hammer'), lv = WL('hammer');
    ws.cnt = (ws.cnt || 0) + 1;
    const big = lv >= 4 && ws.cnt % 3 === 0;
    const ix = clamp(p.x + Math.cos(a) * 46, L + 6, R - 6), iy = clamp(p.y + Math.sin(a) * 46, T + 6, B - 6);
    const rad = (72 * Math.sqrt(sizeK(p)) + (rangeK(p) - 1) * 30) * (lv >= 2 ? 1.25 : 1) * (big ? 1.35 : 1);
    const dmg = p.dmg * 5.0 * DM('hammer') * (big ? 1.8 : 1);
    let nHit = 0;
    eachEnemy(e => {
      const d = Math.hypot(e.x - ix, e.y - iy), ka = Math.atan2(e.y - iy, e.x - ix);
      if (d < rad + e.r) { if (hitEnemy(e, dmg, { kb: 440, kbA: ka, stun: 0.7, tag: 'hammer' })) { nHit++; if (partOK()) vfx.spark(e.x, e.y, ka, 0.5, pl.storm, 6, 360, 0.3, 2.5); } }
      else if (d < rad * 1.8 + e.r) { hitEnemy(e, p.dmg * 1.2 * DM('hammer'), { kb: 280, kbA: ka, stun: 0.3, tag: 'hammer' }); }
    });
    cutWhere(b => Math.hypot(b.x - ix, b.y - iy) < rad * 1.4 + b.r, pl.crack);
    // látvány
    cracksFx(ix, iy, rad * 1.1, pl, big ? 13 : 9);
    ringFx(ix, iy, 10, rad * 1.8, pl.col, 0.45, 14); ringFx(ix, iy, 6, rad * 1.1, pl.storm, 0.3, 8); vfx.ring(ix, iy, 4, rad * 0.8, '#ffffff', 0.2, 6);
    if (partOK()) {
      part(ix, iy, '#8a7a6a', 14, 260, 0.6, 4); part(ix, iy, pl.col, 14, 320, 0.45, 3);
      for (let i = 0; i < 5; i++) { const ba = rand(0, TAU), bl = rad * rand(0.6, 1.1); boltFx(ix, iy, ix + Math.cos(ba) * bl, iy + Math.sin(ba) * bl, pl.storm, 0.16, 1.6); }
    }
    starFx(ix, iy, rad * 0.55, pl.col, 0.22, a);
    vfx.shake(big ? 16 : 11); G.hitstop = Math.max(G.hitstop, nHit ? (big ? 0.11 : 0.075) : 0.04);
    if (big) { holyPillar(ix, iy, pl.col); vfx.flash(0.25); sfx('holy'); }
    sfx('wSlam');
    if (lv >= 3) { let t = 0; const skip = new Set(); addFx({ tag: 'after', upd(dt) { t += dt; if (t > 0.38) { hitCircle(ix, iy, rad * 1.35, p.dmg * 1.5 * DM('hammer'), { kb: 300, stun: 0.3, tag: 'hammer' }, skip); ringFx(ix, iy, rad * 0.3, rad * 1.45, pl.storm, 0.4, 10); vfx.shake(5); sfx('wSlam'); return false; } return true; } }); }
    if (mo === 'hammer_thunder') { boltFx(ix + rand(-20, 20), T - 10, ix, iy, pl.col, 0.3, 4); chainLightning(p, ix, iy, pl, 4 + (p.shots - 1) + (big ? 3 : 0)); sfx('wThunder'); vfx.flash(0.12); }
    if (mo === 'hammer_quake') fissure(p, ix, iy, a, pl);
    ws.post = 0.28; ws.postA = a; ws.ix = ix; ws.iy = iy;
  }
  function drawHammerShape(pl, mo, glowK) {
    // nyél
    ctx.fillStyle = '#5a3e22'; ctx.fillRect(-6, -1.8, 34, 3.6);
    ctx.fillStyle = pl.head; ctx.fillRect(4, -2.3, 3, 4.6); ctx.fillRect(14, -2.3, 3, 4.6);
    // fej (kalapácsfej keresztben a nyél végén)
    ctx.save(); ctx.translate(30, 0);
    ctx.fillStyle = pl.dark; ctx.fillRect(-7, -13, 14, 26);
    ctx.fillStyle = pl.head; ctx.fillRect(-6, -12, 12, 24);
    ctx.fillStyle = '#fff6d0'; ctx.fillRect(-6, -12, 12, 3); ctx.fillRect(-6, 9, 12, 3);
    // villám-berakás
    ctx.strokeStyle = mo === 'hammer_quake' ? '#ff6a2a' : pl.storm; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(2, -2); ctx.lineTo(-2, 1); ctx.lineTo(2, 8); ctx.stroke();
    if (glowK > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glowK; ctx.fillStyle = pl.col; ctx.fillRect(-9, -15, 18, 30); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
  }

  // =================================================================
  //  4. SZERÁF ÍJA
  // =================================================================
  const BOW = {
    base: { col: '#fff1c4', arrow: '#ffe9a8', limb: '#f2d27a', str: '#fffbe8' },
    bow_stars: { col: '#bfd4ff', arrow: '#cfe0ff', limb: '#8aa8ff', str: '#eef4ff' },
    bow_dawn: { col: '#ffb08a', arrow: '#ffc8a0', limb: '#ff8a7a', str: '#fff0e0' },
  };
  const wPal = () => BOW[MO('bow')] || BOW.base;
  function drawArrow(b, pl, s) {
    const an = Math.atan2(b.vy, b.vx); ctx.translate(b.x, b.y); ctx.rotate(an); ctx.scale(s, s); ctx.lineCap = 'round';
    ctx.strokeStyle = hexA(pl.arrow, 0.35); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(0, 0); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-17, 0); ctx.lineTo(4, 0); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(1, -3); ctx.lineTo(1, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA(pl.arrow, 0.9); ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-19, -5); ctx.lineTo(-16, 0); ctx.lineTo(-19, 5); ctx.closePath(); ctx.fill();
  }
  function dawnSplit(p, x, y, a, e, n) {
    const pl = BOW.bow_dawn;
    for (let i = 0; i < n; i++) {
      const aa = a + (i - (n - 1) / 2) * 0.55 + rand(-0.1, 0.1);
      const b = pBullet(x, y, aa, 480 * spdK(p), { r: 3.5, dmg: p.dmg * 0.45 * DM('bow'), life: 0.35 * rangeK(p), pierce: 0, col: pl.col, ho: { tag: 'bow' },
        drw(b) { const an = Math.atan2(b.vy, b.vx); ctx.translate(b.x, b.y); ctx.rotate(an); ctx.fillStyle = hexA(pl.col, 0.6); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-9, -3); ctx.lineTo(-9, 3); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill(); } });
      if (e) b.hits.push(e);
    }
    if (partOK()) vfx.spark(x, y, a, 0.8, pl.col, 5, 240, 0.3, 2);
  }
  function bowArrow(p, a) {
    const pl = wPal(), mo = MO('bow'), lv = WL('bow'), n = p.shots + (lv >= 4 ? 1 : 0);
    const fire = (aa, side) => pBullet(p.x + Math.cos(aa) * 16, p.y + Math.sin(aa) * 16 - 2, aa, p.shotSpd * 1.3, {
      r: 4 * sizeK(p), dmg: p.dmg * (lv >= 4 ? 0.75 : 1) * DM('bow'), life: p.range, pierce: p.pierce + (lv >= 2 ? 1 : 0), col: pl.arrow, ho: { tag: 'bow' },
      onHit: mo === 'bow_dawn' ? (e, b) => { if (!b.split) { b.split = true; dawnSplit(p, b.x, b.y, Math.atan2(b.vy, b.vx), e, 3); } } : null,
      upd: mo === 'bow_stars' ? b => { if (partOK(1000) && Math.random() < 0.35) G.parts.push({ x: b.x + rand(-4, 4), y: b.y + rand(-4, 4), vx: 0, vy: 0, life: 0.35, max: 0.35, col: Math.random() < 0.5 ? '#ffffff' : pl.col, size: 2 }); return true; } : null,
      drw(b) { drawArrow(b, pl, b.cr ? 1.3 : 1); },
    });
    for (let i = 0; i < n; i++) fire(a + (i - (n - 1) / 2) * 0.12);
    if (p.back) fire(a + Math.PI);
    if (partOK()) vfx.spark(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, a, 0.3, pl.col, 3, 200, 0.2, 2);
    sfx('wArrow');
  }
  function starRain(p, x, y) {
    const pl = BOW.bow_stars, n = 10 + (p.shots - 1) * 3 + WL('bow');
    x = clamp(x, L + 30, R - 30); y = clamp(y, T + 40, B - 20);
    let t = 0, k = 0; const falls = [];
    vfx.glyph(x, y, pl.col, 84, 1.2, 1.5); sfx('wStars');
    addFx({ tag: 'rain', upd(dt) {
        t += dt;
        while (k < n && t > k * 0.06) { k++; const a = rand(0, TAU), r = Math.sqrt(Math.random()) * 80; falls.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, t: 0 }); }
        for (const f of falls) { if (f.done) continue; f.t += dt; if (f.t > 0.18) { f.done = true;
          hitCircle(f.x, f.y, 26, p.dmg * 0.9 * DM('bow'), { tag: 'bow', kb: 80, kbA: Math.PI / 2 });
          if (partOK()) part(f.x, f.y, pl.col, 4, 160, 0.3, 2.5); starFx(f.x, f.y, 14, '#ffffff', 0.2); sfx('wArrow'); } }
        return t < n * 0.06 + 0.4; },
      drw() { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (const f of falls) { if (f.done) continue; const kk = f.t / 0.18, y1 = f.y - 160 * (1 - kk), y0 = y1 - 50;
          ctx.globalAlpha = 0.5; ctx.strokeStyle = pl.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(f.x + 20 * (1 - kk) + 10, y0); ctx.lineTo(f.x + 20 * (1 - kk), y1); ctx.stroke();
          ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.globalAlpha = 0.5 * kk; ctx.beginPath(); ctx.arc(f.x, f.y, 10 * (1 - kk) + 2, 0, TAU); ctx.stroke(); }
        ctx.restore(); },
      glw() { for (const f of falls) if (!f.done) glowDot(f.x, f.y - 160 * (1 - f.t / 0.18), 10, pl.col, 0.8); glowDot(x, y, 80, pl.col, 0.12); } });
  }
  function bowLance(p, a, c) {
    const pl = wPal(), mo = MO('bow'), lv = WL('bow'), k = 0.35 + 0.65 * c;
    const w = (18 + 10 * c) * sizeK(p) + (lv >= 2 ? 8 : 0), vw = (7 + 7 * c) * sizeK(p) + (lv >= 2 ? 3 : 0);
    const shots = lv >= 4 ? [[a, 1], [a - 0.13, 0.5], [a + 0.13, 0.5]] : [[a, 1]];
    if (p.back) shots.push([a + Math.PI, 0.6]);
    let tgt = null, tgtHp = -1, endX = 0, endY = 0;
    for (const [da, m] of shots) {
      const x1 = p.x + Math.cos(da) * 14, y1 = p.y + Math.sin(da) * 14, len = rayLen(x1, y1, da), x2 = x1 + Math.cos(da) * len, y2 = y1 + Math.sin(da) * len;
      const hits = hitLine(x1, y1, x2, y2, w * (m < 1 ? 0.7 : 1), p.dmg * 4.2 * DM('bow') * k * m * (mo === 'bow_stars' ? 0.7 : 1), { kb: 160 * c, kbA: da, tag: 'bow', hitstop: c > 0.9 ? 0.04 : 0, critAdd: 0.1 * c });
      for (const e of hits) { if (partOK()) vfx.spark(e.x, e.y, da, 0.5, pl.col, 6, 380, 0.3, 2.5); if (m === 1 && e.hp > tgtHp) { tgt = e; tgtHp = e.hp; } if (mo === 'bow_dawn') dawnSplit(p, e.x, e.y, da, e, 4); }
      if (lv >= 3) cutWhere(b => segDist(b.x, b.y, x1, y1, da, len) < w / 2 + b.r, pl.col);
      beamFx(x1, y1, x2, y2, vw * (m < 1 ? 0.6 : 1), pl.col, 0.45);
      if (m === 1) { endX = x2; endY = y2; }
      if (partOK()) for (let i = 0; i < 8; i++) { const r = rand(0, len); G.parts.push({ x: x1 + Math.cos(da) * r, y: y1 + Math.sin(da) * r, vx: rand(-40, 40), vy: rand(-40, 40), life: 0.5, max: 0.5, col: i % 2 ? '#ffffff' : pl.col, size: 2.5 }); }
      if (partOK() && Math.random() < 0.5) vfx.feathers(x1 + Math.cos(da) * 30, y1 + Math.sin(da) * 30, 2, mo === 'bow_dawn' ? '#ffd8c8' : '#fff8e8');
    }
    starFx(p.x + Math.cos(a) * 18, p.y + Math.sin(a) * 18, 18 + 12 * c, pl.col, 0.25, a);
    if (mo === 'bow_stars' && c > 0.6) { if (tgt) starRain(p, tgt.x, tgt.y); else { const d = Math.min(320, Math.hypot(endX - p.x, endY - p.y) - 20); starRain(p, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d); } }
    vfx.shake(3 + c * 5); sfx('wLance');
  }

  // =================================================================
  //  5. JERIKÓI HARSONA
  // =================================================================
  const HORN = {
    base: { col: '#ffc35a', col2: '#fff0c0', brass: '#d9a63a', dark: '#7a5a1a' },
    horn_last: { col: '#ff8a4a', col2: '#fff4d0', brass: '#e8b04a', dark: '#7a2a1a' },
    horn_walls: { col: '#6fe0b0', col2: '#e8ffe8', brass: '#c8b070', dark: '#3a5a3a' },
  };
  const nPal = () => HORN[MO('horn')] || HORN.base;
  function sonicWall(p, x, y, a, half, r, pl) {
    const walls = G.fx.filter(f => f.tag === 'wall' && !f.dead); if (walls.length >= 5) walls[0].dead = true;
    let t = 0, tick = 0; const dur = 2.8;
    sfx('wWall');
    addFx({ tag: 'wall', upd(dt) {
        t += dt; tick -= dt;
        cutWhere(b => { const d = Math.hypot(b.x - x, b.y - y); return Math.abs(d - r) < 10 + b.r && arcDiff(Math.atan2(b.y - y, b.x - x), a) <= half; }, pl.col);
        if (tick <= 0) { tick = 0.3; eachEnemy(e => { const d = Math.hypot(e.x - x, e.y - y), ea = Math.atan2(e.y - y, e.x - x); if (Math.abs(d - r) < 14 + e.r && arcDiff(ea, a) <= half) hitEnemy(e, p.dmg * 0.5 * DM('horn'), { kb: 260, kbA: d < r ? ea + Math.PI : ea, tag: 'horn', silentNum: true }); }); }
        return t < dur; },
      drw() { const al = Math.min(1, (dur - t) * 2) * Math.min(1, t * 8), pul = 1 + Math.sin(gt * 14) * 0.15; ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = al * 0.25; ctx.strokeStyle = pl.col; ctx.lineWidth = 18 * pul; ctx.beginPath(); ctx.arc(x, y, r, a - half, a + half); ctx.stroke();
        ctx.globalAlpha = al * 0.8; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r - 7, a - half, a + half); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r + 7, a - half, a + half); ctx.stroke();
        // kőfal-téglák: rezgő keresztvonalak
        ctx.globalAlpha = al * 0.6; ctx.strokeStyle = pl.col2; ctx.lineWidth = 1.5; const n = Math.max(4, Math.round(half * r / 14));
        ctx.beginPath(); for (let i = 0; i <= n; i++) { const aa = a - half + i / n * half * 2, o = i % 2 ? 0 : 3; ctx.moveTo(x + Math.cos(aa) * (r - 7 + o), y + Math.sin(aa) * (r - 7 + o)); ctx.lineTo(x + Math.cos(aa) * (r + 7 - o), y + Math.sin(aa) * (r + 7 - o)); } ctx.stroke();
        ctx.restore(); },
      glw() { gctx.globalAlpha = 0.5 * Math.min(1, (dur - t) * 2); gctx.strokeStyle = pl.col; gctx.lineWidth = 22; gctx.beginPath(); gctx.arc(x, y, r, a - half, a + half); gctx.stroke(); } });
  }
  // hanghullám: o = { x, y, a, half, maxR, spd, dmg, kb, stun, fan, echo, pl, wall }
  function soundWave(o) {
    const p = G.p, skip = new Set(); let r = 16, delay = o.delay || 0, walled = false;
    const notes = o.echo ? 0 : o.fan ? 3 : 1, band = o.fan ? 22 : 16;
    return addFx({ tag: 'wave', upd(dt) {
        if (delay > 0) { delay -= dt; return true; }
        const r0 = r; r += o.spd * dt * (1 - 0.35 * r / o.maxR);
        eachEnemy(e => { if (skip.has(e)) return; const d = Math.hypot(e.x - o.x, e.y - o.y); if (d < r + e.r && d > r0 - band - e.r && (o.half >= Math.PI || arcDiff(Math.atan2(e.y - o.y, e.x - o.x), o.a) <= o.half + e.r / Math.max(30, d))) {
          skip.add(e); if (hitEnemy(e, o.dmg, { kb: o.kb, kbA: Math.atan2(e.y - o.y, e.x - o.x), stun: o.stun, tag: 'horn' }) && partOK()) vfx.spark(e.x, e.y, Math.atan2(e.y - o.y, e.x - o.x), 0.5, o.pl.col, o.fan ? 6 : 3, 300, 0.3, 2.5); } });
        cutWhere(b => { const d = Math.hypot(b.x - o.x, b.y - o.y); return d < r + b.r && d > r0 - band - b.r && (o.half >= Math.PI || arcDiff(Math.atan2(b.y - o.y, b.x - o.x), o.a) <= o.half); }, o.pl.col2);
        if (o.wall && !walled && r > o.wall) { walled = true; sonicWall(p, o.x, o.y, o.a, Math.min(o.half, 1.2), o.wall, o.pl); }
        return r < o.maxR; },
      drw() { if (delay > 0) return; const k = r / o.maxR, al = Math.min(1, (1 - k) * 2.2) * (o.echo ? 0.55 : 1), a0 = o.a - o.half, a1 = o.a + o.half;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const rr = r - i * (o.fan ? 13 : 10); if (rr < 6) break;
          ctx.globalAlpha = al * (i ? 0.45 / i : 0.9); ctx.strokeStyle = i ? o.pl.col : o.pl.col2; ctx.lineWidth = (o.fan ? 7 : 4.5) / (i + 1) + (i ? 0 : 1);
          ctx.beginPath(); ctx.arc(o.x, o.y, rr, a0, a1); ctx.stroke(); }
        ctx.globalAlpha = al * 0.12; ctx.fillStyle = o.pl.col; ctx.beginPath(); ctx.arc(o.x, o.y, r, a0, a1); ctx.arc(o.x, o.y, Math.max(1, r - band * 2), a1, a0, true); ctx.closePath(); ctx.fill();
        if (notes) { ctx.globalAlpha = al; ctx.fillStyle = o.pl.col2; ctx.font = `bold ${o.fan ? 16 : 12}px ${SANS}`; ctx.textAlign = 'center';
          for (let i = 0; i < notes; i++) { const aa = o.half >= Math.PI ? o.a + i / notes * TAU + r * 0.004 : o.a + (notes === 1 ? 0 : (i / (notes - 1) - 0.5) * o.half * 1.4); ctx.fillText(i % 2 ? '♫' : '♪', o.x + Math.cos(aa) * (r - 10), o.y + Math.sin(aa) * (r - 10) + 4 + Math.sin(gt * 12 + i) * 3); } }
        ctx.restore(); },
      glw() { if (delay > 0) return; gctx.globalAlpha = 0.5 * Math.min(1, (1 - r / o.maxR) * 2); gctx.strokeStyle = o.pl.col; gctx.lineWidth = o.fan ? 20 : 12; gctx.beginPath(); gctx.arc(o.x, o.y, r, o.a - o.half, o.a + o.half); gctx.stroke(); } });
  }
  function hornBlast(p, ws, a) {
    const pl = nPal(), mo = MO('horn'), lv = WL('horn');
    ws.n = (ws.n || 0) + 1;
    const last = mo === 'horn_last', fan = last || ws.n % 3 === 0;
    const bx = p.x + Math.cos(a) * 26, by = p.y + Math.sin(a) * 26 - 3;
    let half = (0.42 + (lv >= 2 ? 0.15 : 0) + (p.shots - 1) * 0.12) * (fan ? 1.8 : 1);
    let maxR = 290 * rangeK(p) * (lv >= 2 ? 1.15 : 1) * (fan ? 1.25 : 1);
    const dmg = p.dmg * (fan ? 2.5 : 1.5) * DM('horn');
    const base = { x: bx, y: by, a, half: Math.min(half, Math.PI), maxR, spd: 470 * spdK(p) * (fan ? 1.1 : 1), dmg, kb: fan ? 640 : 380, stun: fan ? 0.45 : 0, fan, pl, wall: mo === 'horn_walls' ? Math.min(130, maxR * 0.45) : 0 };
    if (last) Object.assign(base, { x: p.x, y: p.y, half: Math.PI, maxR: 800, spd: 620 * spdK(p), stun: 0.6 });
    soundWave(base);
    if (lv >= 4) { soundWave(Object.assign({}, base, { delay: 0.1, dmg: dmg * 0.25, kb: base.kb * 0.4, stun: 0, echo: true, wall: 0 })); soundWave(Object.assign({}, base, { delay: 0.2, dmg: dmg * 0.25, kb: base.kb * 0.4, stun: 0, echo: true, wall: 0 })); }
    if (fan && lv >= 3 && !last) soundWave({ x: p.x, y: p.y, a: 0, half: Math.PI, maxR: 150, spd: 520, dmg: dmg * 0.6, kb: 520, stun: 0.6, fan: true, pl });
    if (p.back) soundWave(Object.assign({}, base, { x: p.x - Math.cos(a) * 20, y: p.y - Math.sin(a) * 20, a: a + Math.PI, dmg: dmg * 0.7, wall: 0, fan: false, echo: true }));
    ringFx(bx, by, 4, fan ? 40 : 24, pl.col2, 0.25, fan ? 6 : 4);
    if (partOK()) vfx.spark(bx, by, a, half * 0.8, pl.col, fan ? 10 : 5, 360, 0.3, 2.5);
    if (fan) { vfx.shake(last ? 9 : 6); if (last) vfx.flash(0.15); sfx('wFanfare'); floatText(p.x, p.y - 44, last ? 'UTOLSÓ HARSONA!' : 'FANFÁR!', pl.col2, 0.7, last ? 15 : 13); }
    else { vfx.shake(1.5); sfx('wHorn'); }
    ws.recoil = fan ? 0.3 : 0.18; ws.fan = fan;
    if (last) ws.cd = 1.15; else ws.cd = 0.45;
  }

  // =================================================================
  //  6. AZ IGE KÖNYVE
  // =================================================================
  const TOME = {
    base: { col: '#c9a0ff', col2: '#ffffff', cover: '#4a2a7a', page: '#e9dcff', ink: '#6a3ac0' },
    tome_apoc: { col: '#ff4a5a', col2: '#ffe08a', cover: '#5a1218', page: '#ffe8d8', ink: '#c0202a' },
    tome_cherub: { col: '#ffd0e8', col2: '#fff6c8', cover: '#e8c25a', page: '#fffaf0', ink: '#d9a63a' },
  };
  const tPal = () => TOME[MO('tome')] || TOME.base;
  const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᛉ', 'ᛟ', 'ᛞ', 'ᛗ', 'Ω', 'Α', '✠', '☩'];
  // pecsét a démonon: rövid késleltetés után felrobban
  function stampGlyph(p, e, dmg, gen, chain) {
    const pl = tPal(), lv = WL('tome'), rad = gen ? 26 * Math.sqrt(sizeK(p)) : 42 * (lv >= 3 ? 1.5 : 1) * Math.sqrt(sizeK(p)), rune = choice(RUNES);
    if (fxN('glyph') >= (gen ? 10 : 16)) { hitCircle(e.x, e.y, rad, dmg, { tag: 'tome', slow: lv >= 3 ? 1.2 : 0 }); return; }
    let t = 0, x = e.x, y = e.y; const dur = 0.5;
    if (gen < 2) vfx.glyph(x, y, pl.col, rad * 0.75, dur + 0.15, 4);
    addFx({ tag: 'glyph', upd(dt) {
        t += dt; if (!e.dead) { x = e.x; y = e.y; }
        if (t >= dur) {
          const hits = hitCircle(x, y, rad, dmg, { tag: 'tome', slow: lv >= 3 ? 1.2 : 0, kb: 120 });
          ringFx(x, y, 6, rad * 1.1, pl.col, 0.35, 10); if (!gen) starFx(x, y, rad * 0.55, pl.col, 0.25, rand(0, 1));
          if (partOK()) { part(x, y, pl.col, 12, 220, 0.45, 3); part(x, y, pl.col2, 5, 140, 0.35, 2.5); }
          sfx('wGlyph'); vfx.shake(gen ? 1.5 : 2.5);
          if (MO('tome') === 'tome_apoc' && gen < 3) {
            const set = chain || new Set(); set.add(e); let k = 0;
            const reach = 42 * (lv >= 3 ? 1.5 : 1) * 2.2;
            eachEnemy(o => { if (k >= 4 || set.has(o) || Math.hypot(o.x - x, o.y - y) > reach + o.r) return; set.add(o); k++; if (gen < 2) boltFx(x, y, o.x, o.y, pl.col, 0.2, 1.8); stampGlyph(p, o, dmg * 0.75, gen + 1, set); });
          }
          return false;
        }
        return true; },
      drw() { const k = t / dur, s = 1 + Math.sin(k * Math.PI * 6) * 0.08 * k; ctx.save(); ctx.translate(x, y - 2); ctx.scale(s, s); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + k * 0.5; ctx.strokeStyle = pl.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.stroke();
        ctx.rotate(-t * 3); ctx.strokeStyle = pl.col2; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13); } ctx.closePath(); ctx.stroke(); ctx.rotate(t * 3);
        ctx.globalAlpha = 0.7 + k * 0.3; ctx.fillStyle = pl.col2; ctx.font = `bold 14px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(rune, 0, 5); ctx.restore(); },
      glw() { glowDot(x, y, 14 + t * 20, pl.col, 0.25 + t * 0.6); } });
  }
  function tomePage(p, a, i, n) {
    const pl = tPal(), lv = WL('tome'), side = i % 2 ? 1 : -1, rune = choice(RUNES);
    if (fxN('page') >= 18) return;
    const sp = 300 * spdK(p), sa = a + (i - (n - 1) / 2) * 0.45 + rand(-0.15, 0.15);
    let x = p.x + Math.cos(a) * 16, y = p.y + Math.sin(a) * 16 - 4, vx = Math.cos(sa) * sp, vy = Math.sin(sa) * sp, t = 0, rot = rand(0, TAU), tgt = null, hitsLeft = lv >= 4 ? 2 : 1;
    const hitOnce = new Set(), dmg = p.dmg * 0.8 * DM('tome'), gdmg = p.dmg * 1.0 * DM('tome'), life = 2.6 * Math.max(1, rangeK(p));
    const trail = [];
    addFx({ tag: 'page', upd(dt) {
        t += dt; rot += dt * (t < 0.5 ? 9 : 4) * side;
        if (t < 0.28) { const f = Math.pow(0.08, dt); vx *= f; vy *= f; const w = Math.sin(t * 30) * 160 * side; x += -Math.sin(sa) * w * dt; y += Math.cos(sa) * w * dt; }
        else if (t < 0.55) { const ang = Math.atan2(vy, vx) + side * 7 * dt, s = Math.hypot(vx, vy) * 0.98 + 30 * dt; vx = Math.cos(ang) * s; vy = Math.sin(ang) * s; }
        else {
          if (!tgt || !canHit(tgt)) { tgt = null; let bd = 460; eachEnemy(e => { if (hitOnce.has(e)) return; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; tgt = e; } }); }
          const cur = Math.atan2(vy, vx), s = Math.min(560 * spdK(p), Math.hypot(vx, vy) + 900 * dt);
          let na = cur; if (tgt) { const df = ((Math.atan2(tgt.y - y, tgt.x - x) - cur + Math.PI) % TAU + TAU) % TAU - Math.PI; na = cur + clamp(df, -10 * dt, 10 * dt); }
          vx = Math.cos(na) * s; vy = Math.sin(na) * s;
        }
        x += vx * dt; y += vy * dt;
        if (x < L + 6 || x > R - 6) { vx = -vx; x = clamp(x, L + 6, R - 6); } if (y < T + 6 || y > B - 6) { vy = -vy; y = clamp(y, T + 6, B - 6); }
        trail.unshift(x, y); if (trail.length > 12) trail.length = 12;
        if (t > 0.12) for (const e of G.enemies) {
          if (!canHit(e) || hitOnce.has(e) || Math.hypot(e.x - x, e.y - y) > e.r + 8) continue;
          hitOnce.add(e); hitEnemy(e, dmg, { tag: 'tome' }); stampGlyph(p, e, gdmg, 0);
          if (partOK()) { part(x, y, pl.page, 5, 160, 0.4, 2.5); part(x, y, pl.col, 4, 120, 0.3, 2); }
          if (--hitsLeft <= 0) return false;
          tgt = null; t = Math.max(t, 0.55); break;
        }
        if (t > life) { if (partOK()) part(x, y, pl.col, 6, 90, 0.4, 2); return false; }
        return true; },
      drw() { ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let j = 2; j < trail.length; j += 2) { ctx.globalAlpha = (1 - j / trail.length) * 0.35; ctx.fillStyle = pl.col; ctx.beginPath(); ctx.arc(trail[j], trail[j + 1], 3, 0, TAU); ctx.fill(); }
        ctx.restore();
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(Math.cos(t * 7) * 0.4 + 0.75, 1);
        ctx.fillStyle = pl.page; ctx.fillRect(-6, -8, 12, 16); ctx.strokeStyle = pl.col; ctx.lineWidth = 1; ctx.strokeRect(-6, -8, 12, 16);
        ctx.fillStyle = pl.ink; ctx.font = `bold 9px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(rune, 0, 3);
        ctx.fillRect(-4, -6, 8, 1); ctx.fillRect(-4, 5, 8, 1);
        ctx.restore(); },
      glw() { glowDot(x, y, 10, pl.col, 0.6); } });
  }
  // Kerubok Kórusa
  function cherubMax(p) { return 3 + (p.shots - 1) + (WL('tome') >= 2 ? 1 : 0); }
  function cherubPos(p, ws, i, n) { const a = gt * 1.5 + i / n * TAU; return { x: p.x + Math.cos(a) * 56, y: p.y + Math.sin(a) * 48 - 6 + Math.sin(gt * 4 + i) * 4 }; }
  function cherubUpdate(p, ws, dt, aim) {
    const ch = ws.cher || (ws.cher = []), pl = TOME.tome_cherub, mx = cherubMax(p);
    if (ch.length > mx) ch.length = mx;
    if (aim !== null) {
      ws.sum = (ws.sum || 0) - dt * p.atkSpd;
      if (ch.length < mx && ws.sum <= 0) { ws.sum = 0.4; ch.push({ born: 0, ft: rand(0, 0.3) }); sfx('wCherub'); if (partOK()) part(p.x, p.y, pl.col2, 10, 160, 0.4, 2.5); }
    }
    ch.forEach((c, i) => {
      c.born = Math.min(1, c.born + dt * 3); const q = cherubPos(p, ws, i, ch.length); c.x = q.x; c.y = q.y;
      cutWhere(b => Math.hypot(b.x - c.x, b.y - c.y) < 10 + b.r, pl.col2);
      if (aim === null || c.born < 1) return;
      c.ft -= dt * p.atkSpd;
      if (c.ft > 0) return;
      c.ft = 0.7;
      let best = null, bs = 1e9;
      eachEnemy(e => { const d = Math.hypot(e.x - c.x, e.y - c.y), da = arcDiff(Math.atan2(e.y - c.y, e.x - c.x), aim); if (da < 1.0 && d < 600) { const s = d * (1 + da); if (s < bs) { bs = s; best = e; } } });
      const fa = best ? Math.atan2(best.y - c.y, best.x - c.x) : aim + rand(-0.1, 0.1);
      pBullet(c.x, c.y, fa, 620 * spdK(p), { r: 4, dmg: p.dmg * 0.9 * DM('tome'), life: 0.9 * rangeK(p), col: pl.col, ho: { tag: 'tome' }, tg: best,
        onHit: WL('tome') >= 3 ? (e, b) => { if (Math.random() < 0.5) stampGlyph(p, e, p.dmg * 0.6 * DM('tome'), 1); } : null,
        upd(b, dt2) { if (b.tg && canHit(b.tg)) { const cur = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy), df = ((Math.atan2(b.tg.y - b.y, b.tg.x - b.x) - cur + Math.PI) % TAU + TAU) % TAU - Math.PI, na = cur + clamp(df, -6 * dt2, 6 * dt2); b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp; } return true; },
        drw(b) { const an = Math.atan2(b.vy, b.vx); ctx.translate(b.x, b.y); ctx.rotate(an); ctx.fillStyle = hexA(pl.col, 0.45); ctx.beginPath(); ctx.ellipse(-6, 0, 12, 3.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.ellipse(-2, 0, 6, 1.6, 0, 0, TAU); ctx.fill(); } });
      sfx('wCherub'); if (partOK(1000)) vfx.spark(c.x, c.y, fa, 0.4, pl.col2, 2, 160, 0.2, 2);
    });
  }
  function drawCherub(c, pl) {
    const s = c.born, fl = Math.sin(gt * 18 + c.x * 0.1) * 0.5;
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(s * 1.3, s * 1.3);
    ctx.fillStyle = '#ffe6f2';
    for (const sd of [-1, 1]) { ctx.save(); ctx.scale(sd, 1); ctx.rotate(-0.3 - fl * 0.6); ctx.beginPath(); ctx.ellipse(8, -2, 7, 3.2, -0.3, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(6, 2, 5, 2.4, 0.1, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#ffe2c8'; ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2c75a'; ctx.beginPath(); ctx.arc(0, -1.6, 4.4, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    ctx.fillStyle = '#c86a7a'; ctx.fillRect(-1.8, 0.4, 1.2, 1.2); ctx.fillRect(0.6, 0.4, 1.2, 1.2);
    ctx.strokeStyle = '#ffd75e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, -8, 4.6, 1.6, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  function drawBook(pl, mo, flip, open) {
    // borító
    ctx.fillStyle = pl.cover; ctx.fillRect(-13, -9, 26, 18);
    ctx.strokeStyle = mo === 'tome_cherub' ? '#fff6c8' : '#e8c25a'; ctx.lineWidth = 1; ctx.strokeRect(-12.5, -8.5, 25, 17);
    // lapok
    const sp = open * 1.5;
    ctx.fillStyle = pl.page; ctx.fillRect(-11.5, -7.5 - sp, 11, 15); ctx.fillRect(0.5, -7.5 - sp, 11, 15);
    ctx.fillStyle = pl.ink; for (let i = 0; i < 4; i++) { ctx.fillRect(-10, -5 + i * 3.4 - sp, 8, 0.9); ctx.fillRect(2, -5 + i * 3.4 - sp, 8, 0.9); }
    ctx.fillStyle = hexA(pl.ink, 0.6); ctx.fillRect(-0.5, -8 - sp, 1, 16);
    // lapozó oldal
    if (flip > 0) { const k = 1 - flip, sx = Math.cos(k * Math.PI); ctx.save(); ctx.scale(sx, 1); ctx.fillStyle = pl.page; ctx.fillRect(0, -7.5 - sp - Math.sin(k * Math.PI) * 3, 11, 15); ctx.strokeStyle = pl.col; ctx.lineWidth = 0.6; ctx.strokeRect(0, -7.5 - sp - Math.sin(k * Math.PI) * 3, 11, 15); ctx.restore(); }
  }

  // =================================================================
  //  REGISZTRÁCIÓ
  // =================================================================
  Object.assign(WEAPONS, {
    // ---------------------------------------------------------------
    blade: {
      n: 'Égi Penge', short: 'Penge', kind: 'melee', col: '#ffe9a8',
      d: 'Hármas kombó: két gyors suhintás, majd előrelendülő döfés. A suhintás kettévágja a démonok lövedékeit.',
      lv: ['+20% sebzés', 'Szélesebb és hosszabb suhintások', 'Hárítás: a kettévágott lövedékek fényszilánkként visszarepülnek', 'Negyedik csapás: a döfés után teljes körű égi forgószél'],
      morphs: [
        { id: 'blade_flame', n: 'Lángoló Kard', d: 'A suhintások égő ösvényt hagynak, minden találat lángra lobbant, a döfés tűzrobbanással zárul.', i: '✹' },
        { id: 'blade_justice', n: 'Igazság Pengéje', d: 'Minden suhintás fény-sarlót röpít, a döfés pedig átható, lövedéket elnyelő igazság-hullámot indít.', i: '⚖' },
      ],
      onEquip(p, ws) { ws.combo = 0; ws.sw = null; },
      update(p, ws, dt, aim) {
        ws.comboT = (ws.comboT || 0) - dt; if (ws.comboT <= 0) ws.combo = 0;
        if (ws.sw) { ws.sw.t += dt; if (ws.sw.t > ws.sw.dur) ws.sw = null; }
        if (aim === null || ws.cd > 0) return;
        const step = ws.combo || 0, lv4 = WL('blade') >= 4;
        if (step < 2) { bladeSlash(p, ws, aim, step); ws.cd = 0.3; }
        else if (step === 2) { bladeThrust(p, ws, aim); ws.cd = lv4 ? 0.36 : 0.5; }
        else { bladeWhirl(p, ws, aim); ws.cd = 0.45; }
        ws.combo = step >= (lv4 ? 3 : 2) ? 0 : step + 1; ws.comboT = 0.8;
      },
      drawHeld(p, ws) {
        const pl = bPal(), mo = MO('blade'), ps = bladePose(p, ws), len = mo === 'blade_justice' ? 38 : 34;
        ctx.save(); ctx.translate(p.x + Math.cos(ps.ang) * (7 + ps.ext), p.y + 2 + Math.sin(ps.ang) * (7 + ps.ext)); ctx.rotate(ps.ang);
        drawSword(len, pl, mo, ps.gk); ctx.restore();
        // kombó-jelzők
        if (ws.comboT > 0 && ws.combo) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < ws.combo; i++) { ctx.fillStyle = pl.col; ctx.globalAlpha = Math.min(1, ws.comboT * 3); ctx.beginPath(); ctx.arc(p.x - 6 + i * 6, p.y + 24, 2, 0, TAU); ctx.fill(); } ctx.restore(); }
      },
      glow(p, ws) { const pl = bPal(), ps = bladePose(p, ws); for (let i = 1; i <= 3; i++) glowDot(p.x + Math.cos(ps.ang) * (8 + i * 9 + ps.ext), p.y + 2 + Math.sin(ps.ang) * (8 + i * 9 + ps.ext), 7, pl.col, ps.gk > 0 ? 0.7 : 0.4); },
      icon(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s * 1.25, s * 1.25); ctx.rotate(-Math.PI / 4); ctx.translate(-11, 0);
        ctx.fillStyle = 'rgba(255,248,232,0.85)'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-3, sd * 10, 8, 3.2, sd * 0.6, 0, TAU); ctx.fill(); }
        drawSword(34, BLADE.base, null, 0); ctx.restore();
      },
    },
    // ---------------------------------------------------------------
    scythe: {
      n: 'Lélekarató Kasza', short: 'Kasza', kind: 'melee', col: '#9ff5d8',
      d: 'Széles, lassú aratás nagy hatótávval. Tartsd nyomva: a kasza forgószéllé pörög. Az elesett démonok lelke gyógyít és Kegyelmet ad.',
      lv: ['+20% sebzés', 'Hosszabb nyél, ~300°-os aratás', 'A lélekfoszlányok előbb belemarnak a legközelebbi démonba', 'Kétszer gyorsabb forgószél-töltés, hosszabb pörgés, és közben sem lassulsz'],
      morphs: [
        { id: 'scythe_moon', n: 'Holdsarló', d: 'A kaszát bumerángként hajítod. Nyomva tartva a távolban pörög és arat, elengedve visszatér hozzád.', i: '☾' },
        { id: 'scythe_death', n: 'Halál Aratója', d: 'A forgószél magába szippantja a démonokat, és minden elesett lelke sebző lélekrobbanással tör ki.', i: '☠' },
      ],
      onEquip(p, ws) { ws.spin = false; ws.chg = 0; ws.charging = false; ws.boom = null; ws.sw = null; },
      onUnequip(p, ws) { ws.spin = false; ws.chg = 0; ws.charging = false; ws.boom = null; },
      update(p, ws, dt, aim) {
        if (ws.sw) { ws.sw.t += dt; if (ws.sw.t > ws.sw.dur) ws.sw = null; }
        if (MO('scythe') === 'scythe_moon') {
          if (ws.boom) moonUpdate(p, ws, dt, aim);
          else if (aim !== null && ws.cd <= 0) { moonThrow(p, ws, aim); ws.cd = 0.15; }
          return;
        }
        if (ws.spin) { if (aim === null) scyEndSpin(p, ws); else scyUpdateSpin(p, ws, dt); return; }
        if (aim === null) { ws.charging = false; ws.chg = 0; return; }
        if (!ws.charging) { if (ws.cd <= 0) { scySweep(p, ws, aim); ws.cd = 0.75; ws.charging = true; ws.chg = 0; } return; }
        if (!ws.sw) {
          const before = ws.chg; ws.chg = Math.min(1, ws.chg + dt / (WL('scythe') >= 4 ? 0.35 : 0.7) * p.atkSpd);
          slowMove(p, dt, 0.8);
          if (partOK(1000) && Math.random() < 0.5) { const a = rand(0, TAU), r = rand(30, 50); G.parts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, vx: -Math.cos(a) * 80, vy: -Math.sin(a) * 80, life: 0.35, max: 0.35, col: sPal().soul, size: 2.2 }); }
          if (before < 1 && ws.chg >= 1) { ws.spin = true; ws.spinT = 0; ws.tick = 0; ws.ang = aim; sfx('wReap'); ringFx(p.x, p.y, 50, 10, sPal().col, 0.25, 6); }
        }
      },
      drawHeld(p, ws) {
        const pl = sPal(), mo = MO('scythe');
        if (mo === 'scythe_moon' && ws.boom) { drawMoonBoom(ws.boom, pl);
          // üres kéz: holdfény a tenyérben, és a lánc-fény a sarlóig
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.strokeStyle = pl.col; ctx.lineWidth = 1; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(ws.boom.x, ws.boom.y); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
          return; }
        if (ws.spin) {
          ctx.save(); ctx.translate(p.x, p.y + 2);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const r = scyReach(p) * 0.92; ctx.globalAlpha = 0.18; ctx.strokeStyle = pl.col; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, 0, r * 0.75, 0, TAU); ctx.stroke();
          for (let i = 1; i <= 3; i++) { ctx.save(); ctx.rotate(ws.ang - i * 0.45); ctx.globalAlpha = 0.28 / i; drawScytheShape(r * 0.62, pl, mo, 0, true); ctx.restore(); }
          ctx.restore();
          ctx.rotate(ws.ang); drawScytheShape(r * 0.62, pl, mo, 0.5, false); ctx.restore();
          return;
        }
        let ang = p.face - 2.2 + Math.sin(gt * 2) * 0.05, gk = ws.chg * 0.8;
        if (ws.sw) { const k = ease(ws.sw.t / ws.sw.dur); ang = ws.sw.a - ws.sw.dir * ws.sw.half + ws.sw.dir * ws.sw.half * 2 * k; gk = 0.6; }
        const len = 30 + (WL('scythe') >= 2 ? 4 : 0);
        ctx.save(); ctx.translate(p.x + Math.cos(ang) * 4, p.y + 2 + Math.sin(ang) * 4); ctx.rotate(ang);
        if (ws.sw && ws.sw.dir < 0) ctx.scale(1, -1);
        drawScytheShape(len, pl, mo, gk, false); ctx.restore();
        if (ws.charging && ws.chg > 0 && !ws.sw) { // töltés-kör
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = pl.col; ctx.lineWidth = 3; ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.arc(p.x, p.y + 2, 30, -Math.PI / 2, -Math.PI / 2 + TAU * ws.chg); ctx.stroke();
          for (let i = 0; i < 3; i++) { const a = gt * 5 + i * TAU / 3; ctx.fillStyle = pl.soul; ctx.globalAlpha = ws.chg; ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 30, p.y + 2 + Math.sin(a) * 30, 2.5, 0, TAU); ctx.fill(); }
          ctx.restore();
        }
      },
      glow(p, ws) {
        const pl = sPal();
        if (ws.boom) { glowDot(ws.boom.x, ws.boom.y, 22, pl.col, 0.4); return; }
        if (ws.spin) { glowDot(p.x, p.y, scyReach(p) * 0.8, pl.col, 0.18); return; }
        glowDot(p.x + Math.cos(p.face - 2.2) * 28, p.y + Math.sin(p.face - 2.2) * 28, 12 + ws.chg * 10, pl.col, 0.35 + ws.chg * 0.4);
      },
      icon(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-Math.PI / 2 - 0.5); ctx.translate(-10, 6);
        drawScytheShape(26, SCY.base, null, 0, false); ctx.restore();
      },
    },
    // ---------------------------------------------------------------
    hammer: {
      n: 'Ítélet Pörölye', short: 'Pöröly', kind: 'melee', col: '#ffd75e',
      d: 'Lassú, a fej fölül lesújtó csapás. A becsapódás lökéshulláma megrázza a földet, elkábítja és elhajítja a démonokat.',
      lv: ['+20% sebzés', '+25% lökéshullám-sugár', 'Utórengés: a becsapódás helyén újabb hullám tör fel', 'Minden 3. csapás Szent Ítélet: közel kétszeres erő és fényoszlop'],
      morphs: [
        { id: 'hammer_thunder', n: 'Mennydörgő Pöröly', d: 'Minden csapásba villám csap, amely démonról démonra ugrik és elkábítja őket.', i: 'ϟ' },
        { id: 'hammer_quake', n: 'Földrengető', d: 'A csapás izzó hasadékot nyit előre, amely sorban kitörve dobálja és kábítja a démonokat.', i: '⛰' },
      ],
      onEquip(p, ws) { ws.wind = 0; ws.post = 0; },
      update(p, ws, dt, aim) {
        if (ws.post > 0) ws.post -= dt;
        if (ws.wind > 0) {
          if (aim !== null) ws.windA = aim;
          ws.wind -= dt * p.atkSpd; slowMove(p, dt, 0.45);
          if (partOK(1000) && Math.random() < 0.6) { const pl = hPal(), hx = p.x - Math.cos(ws.windA) * 10, hy = p.y - 30; G.parts.push({ x: hx + rand(-10, 10), y: hy + rand(-8, 8), vx: rand(-60, 60), vy: rand(-60, 20), life: 0.3, max: 0.3, col: Math.random() < 0.5 ? pl.storm : pl.col, size: 2.2 }); }
          if (ws.wind <= 0) hammerSlam(p, ws, ws.windA);
          return;
        }
        if (aim !== null && ws.cd <= 0) { ws.windDur = WL('hammer') >= 4 ? 0.3 : 0.38; ws.wind = ws.windDur; ws.windA = aim; ws.cd = 1.0; sfx('wWind'); }
      },
      drawHeld(p, ws) {
        const pl = hPal(), mo = MO('hammer'); let ang, lift = 0, gk = 0, sx = 0;
        if (ws.wind > 0) { const k = 1 - ws.wind / ws.windDur; ang = ws.windA + Math.PI * 0.95 * ease(k); lift = 16 * ease(k); gk = k * 0.8; sx = rand(-1, 1) * k * 1.5; }
        else if (ws.post > 0) { const k = ws.post / 0.28; ang = ws.postA; gk = k * 0.9; lift = -2 * k; }
        else { ang = p.face - 1.1 + Math.sin(gt * 2) * 0.05; }
        ctx.save(); ctx.translate(p.x + sx + Math.cos(ang) * 4, p.y + 4 - lift + Math.sin(ang) * 4); ctx.rotate(ang);
        drawHammerShape(pl, mo, gk); ctx.restore();
        if (ws.wind > 0) { // gyülekező villámok a fej körül
          const k = 1 - ws.wind / ws.windDur, hx = p.x + sx + Math.cos(ang) * 34, hy = p.y + 4 - lift + Math.sin(ang) * 34;
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = pl.storm; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.5 + k * 0.5;
          for (let i = 0; i < 3; i++) { const a = rand(0, TAU), r = 10 + k * 14; strokePts(ctx, boltPts(hx, hy, hx + Math.cos(a) * r, hy + Math.sin(a) * r, 4, 3)); }
          ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = pl.col; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(p.x + Math.cos(ws.windA) * 46, p.y + Math.sin(ws.windA) * 46, 70 * k + 8, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
          ctx.restore();
        }
      },
      glow(p, ws) {
        const pl = hPal();
        if (ws.wind > 0) { const k = 1 - ws.wind / ws.windDur, ang = ws.windA + Math.PI * 0.95 * ease(k); glowDot(p.x + Math.cos(ang) * 34, p.y + 4 - 16 * ease(k) + Math.sin(ang) * 34, 12 + k * 14, pl.storm, 0.5 + k * 0.4); }
        else if (ws.post > 0) glowDot(ws.ix, ws.iy, 30, pl.col, ws.post * 3);
        else glowDot(p.x + Math.cos(p.face - 1.1) * 32, p.y + 4 + Math.sin(p.face - 1.1) * 32, 9, pl.col, 0.4);
      },
      icon(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s * 1.15, s * 1.15); ctx.rotate(-Math.PI / 4); ctx.translate(-13, 0);
        drawHammerShape(HAM.base, null, 0); ctx.restore();
      },
    },
    // ---------------------------------------------------------------
    bow: {
      n: 'Szeráf Íja', short: 'Íj', kind: 'ranged', col: '#fff1c4',
      d: 'Koppintásra gyors, tollas fénynyilak. Tartsd nyomva a húr kifeszítéséhez: elengedve mindenen áthatoló fénylándzsa csap ki.',
      lv: ['+20% sebzés', 'A nyilak +1 démonon hatolnak át, szélesebb fénylándzsa', 'Gyorsabb feszítés, a lándzsa elégeti az útjába eső lövedékeket', 'A fénylándzsa hármas legyezőben csap ki, és +1 nyílvessző lövésenként'],
      morphs: [
        { id: 'bow_stars', n: 'Csillageső', d: 'A kifeszített lövés célpontjára csillagnyilak zápora hullik az égből.', i: '✧' },
        { id: 'bow_dawn', n: 'Hajnal Íja', d: 'A nyilak találatkor hajnalszilánkokra hasadnak; a lándzsa minden átdöfött démonból szilánkokat szór.', i: '☀' },
      ],
      onEquip(p, ws) { ws.held = false; ws.chg = 0; ws.full = 0; ws.hold = 0; },
      onUnequip(p, ws) { ws.held = false; ws.chg = 0; ws.full = 0; },
      update(p, ws, dt, aim) {
        if (ws.snap > 0) ws.snap -= dt;
        const ct = 0.75 * (WL('bow') >= 3 ? 0.7 : 1) / p.atkSpd;
        if (aim !== null) {
          ws.aim = aim;
          if (!ws.held) { ws.held = true; ws.hold = 0; ws.chg = 0; ws.full = 0; if (ws.cd <= 0) { bowArrow(p, aim); ws.cd = 0.24; ws.snap = 0.12; } }
          ws.hold += dt;
          if (ws.hold > 0.2) {
            if (ws.chg === 0) sfx('wDraw');
            const before = ws.chg; ws.chg = Math.min(1, ws.chg + dt / ct); slowMove(p, dt, 0.7);
            if (before < 1 && ws.chg >= 1) { sfx('wFull'); starFx(p.x + Math.cos(aim) * 14, p.y + Math.sin(aim) * 14, 14, wPal().col, 0.2); }
            if (ws.chg >= 1) { ws.full += dt; if (ws.full > 0.3) { bowLance(p, aim, 1); ws.chg = 0; ws.full = 0; ws.hold = 0.2; ws.snap = 0.15; ws.cd = 0.15; } }
          }
        } else if (ws.held) {
          ws.held = false;
          if (ws.chg >= 0.3) { bowLance(p, ws.aim, ws.chg); ws.snap = 0.15; ws.cd = 0.15; }
          ws.chg = 0; ws.full = 0;
        }
      },
      drawHeld(p, ws) {
        const pl = wPal(), a = ws.held ? ws.aim : p.face, c = ws.chg || 0, pull = c * 12 - (ws.snap > 0 ? ws.snap * 25 : 0);
        ctx.save(); ctx.translate(p.x + Math.cos(a) * 14, p.y + 1 + Math.sin(a) * 14); ctx.rotate(a);
        // szárak (szárnyas íj)
        ctx.strokeStyle = pl.limb; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-3, -21); ctx.quadraticCurveTo(10 - c * 3, -12, 4, 0); ctx.quadraticCurveTo(10 - c * 3, 12, -3, 21); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = 'rgba(255,250,235,0.9)'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(-6, sd * 22, 6, 2.2, sd * -0.6, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#d9a63a'; ctx.fillRect(2, -3, 4, 6);
        // húr
        const nx = -3 - Math.max(-2, pull);
        ctx.strokeStyle = pl.str; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -21); ctx.lineTo(nx, 0); ctx.lineTo(-3, 21); ctx.stroke();
        // felhelyezett nyíl / fénylándzsa töltés közben
        if (c > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = hexA(pl.col, 0.4 + c * 0.4); ctx.lineWidth = 3 + c * 5; ctx.beginPath(); ctx.moveTo(nx, 0); ctx.lineTo(nx + 30 + c * 6, 0); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(nx + 38 + c * 6, 0); ctx.lineTo(nx + 30 + c * 6, -4); ctx.lineTo(nx + 30 + c * 6, 4); ctx.closePath(); ctx.fill();
          if (c >= 1) { ctx.globalAlpha = 0.5 + Math.sin(gt * 30) * 0.3; ctx.fillStyle = pl.col; ctx.beginPath(); ctx.arc(nx + 40, 0, 6, 0, TAU); ctx.fill(); }
        }
        ctx.restore();
        if (c > 0) { // töltés-gyűrű
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = pl.col; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.arc(p.x, p.y + 2, 28, -Math.PI / 2, -Math.PI / 2 + TAU * c); ctx.stroke();
          if (c >= 1) { ctx.globalAlpha = 0.4 + Math.sin(gt * 25) * 0.3; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y + 2, 33, 0, TAU); ctx.stroke();
            ctx.globalAlpha = 0.12; ctx.strokeStyle = pl.col; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 50, p.y + Math.sin(a) * 50); ctx.lineTo(p.x + Math.cos(a) * 260, p.y + Math.sin(a) * 260); ctx.stroke(); ctx.setLineDash([]); }
          ctx.restore();
        }
      },
      glow(p, ws) { const pl = wPal(), a = ws.held ? ws.aim : p.face, c = ws.chg || 0; glowDot(p.x + Math.cos(a) * (18 + c * 18), p.y + Math.sin(a) * (18 + c * 18), 6 + c * 7, pl.col, 0.3 + c * 0.35); },
      icon(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-Math.PI / 4);
        ctx.strokeStyle = '#f2d27a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-4, -17); ctx.quadraticCurveTo(12, -9, 6, 0); ctx.quadraticCurveTo(12, 9, -4, 17); ctx.stroke();
        ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -17); ctx.lineTo(-6, 0); ctx.lineTo(-4, 17); ctx.stroke();
        ctx.strokeStyle = '#fff1c4'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(16, 0); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(20, 0); ctx.lineTo(13, -4); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-15, -5); ctx.lineTo(-13, 0); ctx.lineTo(-15, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      },
    },
    // ---------------------------------------------------------------
    horn: {
      n: 'Jerikói Harsona', short: 'Harsona', kind: 'ranged', col: '#ffc35a',
      d: 'Táguló hanghullámokat fúj, amelyek hátralökik a démonokat és szétzúzzák a lövedékeiket. Minden harmadik fúvás hatalmas fanfár.',
      lv: ['+20% sebzés', 'Szélesebb és messzebbre érő hanghullám', 'A fanfár körkörös hullámot is kelt körülötted', 'Visszhang: minden fúvást két gyengébb hullám követ'],
      morphs: [
        { id: 'horn_last', n: 'Utolsó Harsona', d: 'Minden fúvás fanfár: az egész termet betöltő ítéletnapi hullám, amely mindent elsöpör.', i: '♫' },
        { id: 'horn_walls', n: 'Jerikó Falai', d: 'A hullámok rezgő hangfalakat hagynak, amelyek elnyelik a lövedékeket és visszalökik a démonokat.', i: '▥' },
      ],
      onEquip(p, ws) { ws.recoil = 0; },
      update(p, ws, dt, aim) {
        if (ws.recoil > 0) ws.recoil -= dt;
        if (aim !== null && ws.cd <= 0) hornBlast(p, ws, aim);
      },
      drawHeld(p, ws) {
        const pl = nPal(), a = p.face, rc = ws.recoil > 0 ? ws.recoil / (ws.fan ? 0.3 : 0.18) : 0, nx = (ws.n || 0) % 3;
        ctx.save(); ctx.translate(p.x + Math.cos(a) * (10 - rc * 4), p.y - 3 + Math.sin(a) * (10 - rc * 4)); ctx.rotate(a);
        // cső és szelepek
        ctx.strokeStyle = pl.dark; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(18, 0); ctx.stroke();
        ctx.strokeStyle = pl.brass; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = pl.brass; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, 8, 6, 8); ctx.lineTo(14, 8); ctx.quadraticCurveTo(18, 8, 16, 1); ctx.stroke();
        ctx.fillStyle = '#fff0c0'; for (let i = 0; i < 3; i++) ctx.fillRect(4 + i * 4, -5, 2, 4);
        // tölcsér
        const fl = 1 + rc * 0.25;
        ctx.fillStyle = pl.brass; ctx.beginPath(); ctx.moveTo(16, -2); ctx.quadraticCurveTo(24, -3, 30, -9 * fl); ctx.lineTo(30, 9 * fl); ctx.quadraticCurveTo(24, 3, 16, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(30, 0, 2.5, 9 * fl, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = pl.dark; ctx.beginPath(); ctx.ellipse(30, 0, 1.6, 7 * fl, 0, 0, TAU); ctx.fill();
        // zászló a harsonán
        ctx.fillStyle = MO('horn') === 'horn_walls' ? '#2a6a4a' : '#a01a2a'; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(20, 1); ctx.lineTo(19, 9 + Math.sin(gt * 6) * 1.5); ctx.lineTo(14, 7); ctx.lineTo(9, 9 + Math.sin(gt * 6 + 1) * 1.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd75e'; ctx.font = `bold 6px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('✠', 14, 7);
        if (rc > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = rc; ctx.strokeStyle = pl.col2; ctx.lineWidth = 2; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(30, 0, i * 7 * (1.4 - rc), -0.8, 0.8); ctx.stroke(); } }
        ctx.restore();
        // ritmus-jelző: a következő fanfárig
        if (MO('horn') !== 'horn_last' && !G.hub) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { ctx.globalAlpha = i < nx ? 0.9 : 0.25; ctx.fillStyle = i === 2 ? pl.col2 : pl.col; ctx.beginPath(); ctx.arc(p.x - 7 + i * 7, p.y + 25, i === 2 ? 2.6 : 2, 0, TAU); ctx.fill(); } ctx.restore(); }
      },
      glow(p, ws) { const pl = nPal(), a = p.face, rc = ws.recoil > 0 ? 1 : 0; glowDot(p.x + Math.cos(a) * 38, p.y - 3 + Math.sin(a) * 38, 10 + rc * 12, pl.col, 0.4 + rc * 0.4); },
      icon(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.35); ctx.translate(-14, 0);
        ctx.strokeStyle = '#d9a63a'; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(18, 0); ctx.stroke();
        ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(2, 0); ctx.quadraticCurveTo(0, 8, 8, 8); ctx.lineTo(14, 8); ctx.quadraticCurveTo(18, 8, 16, 1); ctx.stroke();
        ctx.fillStyle = '#ffc35a'; ctx.beginPath(); ctx.moveTo(16, -2); ctx.quadraticCurveTo(24, -3, 32, -11); ctx.lineTo(32, 11); ctx.quadraticCurveTo(24, 3, 16, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#fff4d0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(32, 0, 2.5, 11, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 1.5; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(32, 0, 6 + i * 5, -0.7, 0.7); ctx.stroke(); }
        ctx.restore();
      },
    },
    // ---------------------------------------------------------------
    tome: {
      n: 'Az Ige Könyve', short: 'Ige', kind: 'ranged', col: '#c9a0ff',
      d: 'Izzó szentírás-lapokat bocsát ki, amelyek kirebbennek, köröznek, majd a démonokra vetik magukat, és felrobbanó rúnapecsétet nyomnak rájuk.',
      lv: ['+20% sebzés', 'Minden második lapozás +1 lapot bocsát ki', 'Nagyobb pecsétek, amelyek le is lassítanak', 'A lapok egy találat után új célpontot keresnek'],
      morphs: [
        { id: 'tome_apoc', n: 'Apokalipszis Könyve', d: 'A felrobbanó pecsétek a közeli démonokra is átíródnak – láncreakció, egyre tovább terjedő ítélet.', i: '✠' },
        { id: 'tome_cherub', n: 'Kerubok Kórusa', d: 'A lapokból körülötted keringő kerubok lesznek: fényvesszőket lőnek és elnyelik a feléd szálló lövedékeket.', i: '♡' },
      ],
      onEquip(p, ws) { ws.flip = 0; },
      update(p, ws, dt, aim) {
        if (ws.flip > 0) ws.flip -= dt * 4;
        if (MO('tome') === 'tome_cherub') { cherubUpdate(p, ws, dt, aim); return; }
        if (aim === null || ws.cd > 0) return;
        ws.cnt = (ws.cnt || 0) + 1;
        const n = 1 + (WL('tome') >= 2 && ws.cnt % 2 === 0 ? 1 : 0) + (p.shots - 1);
        for (let i = 0; i < n; i++) tomePage(p, aim, i, n);
        if (p.back) tomePage(p, aim + Math.PI, 0, 1);
        ws.flip = 1; ws.cd = 0.42; sfx('wPage');
      },
      drawHeld(p, ws) {
        const pl = tPal(), mo = MO('tome'), a = p.face, held = ws.flip > 0 || (mo === 'tome_cherub' && ws.sum !== undefined && ws.sum > -0.3);
        // kerubok
        if (mo === 'tome_cherub' && ws.cher) for (const c of ws.cher) if (c.x !== undefined) drawCherub(c, pl);
        const bx = p.x + Math.cos(a) * 18, by = p.y + 7 + Math.sin(a) * 10;
        // lebegő rúnák a könyv fölött
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = pl.col; ctx.font = `bold 9px ${SERIF}`; ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) { const k = (gt * 0.8 + i / 3) % 1; ctx.globalAlpha = Math.sin(k * Math.PI) * (held ? 0.9 : 0.5); ctx.fillText(RUNES[(i * 5 + Math.floor(gt * 0.8 + i / 3)) % RUNES.length], bx + Math.sin(gt * 2 + i * 2) * 8, by - 8 - k * 16); }
        ctx.restore();
        ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.cos(a) * 0.15); ctx.scale(0.9, 0.75 + Math.abs(Math.sin(a)) * 0.15);
        drawBook(pl, mo, Math.max(0, ws.flip || 0), 1);
        ctx.restore();
      },
      glow(p, ws) { const pl = tPal(), a = p.face; glowDot(p.x + Math.cos(a) * 18, p.y - 4 + Math.sin(a) * 10, 8 + (ws.flip > 0 ? 6 : 0), pl.col, 0.3); if (ws.cher) for (const c of ws.cher) if (c.x !== undefined) glowDot(c.x, c.y - 6, 6, '#ffd75e', 0.35); },
      icon(x, y, s) {
        ctx.save(); ctx.translate(x, y); ctx.scale(s * 1.15, s * 1.15);
        ctx.fillStyle = '#4a2a7a'; ctx.beginPath(); ctx.moveTo(-15, -9); ctx.lineTo(0, -6); ctx.lineTo(15, -9); ctx.lineTo(15, 10); ctx.lineTo(0, 13); ctx.lineTo(-15, 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f6efff'; ctx.beginPath(); ctx.moveTo(-13, -8); ctx.lineTo(-1, -5); ctx.lineTo(-1, 10); ctx.lineTo(-13, 7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(13, -8); ctx.lineTo(1, -5); ctx.lineTo(1, 10); ctx.lineTo(13, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#7a4ad0'; ctx.font = `bold 10px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('Α', -7, 5); ctx.fillText('Ω', 7, 5);
        ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, -14, 4, 0, TAU); ctx.stroke();
        ctx.restore();
      },
    },
  });
})();
