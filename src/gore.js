// =====================================================================
//  VÉR ÉS BELSŐSÉGEK – a Pokol nem tiszta hely
//  Repülő vércseppek (magassággal és gravitációval), a földön maradó
//  foltok, szétrepülő húscafatok, ottmaradó tetemek.
// =====================================================================
const GORE = { drops: [], chunks: [], decals: [], maxDecals: 360 };
const BLOOD = { demon: ['#6e0a0a', '#8a1010', '#4a0606'], bile: ['#5a6a14', '#76861c', '#3a440a'], ecto: ['#5a6670', '#7a8690', '#3a444c'], angel: ['#c8a040', '#e8c860', '#8a6a20'], gold: ['#8a6a18', '#b08a20', '#5a4410'] };
function bloodOf(e) {
  if (!e) return BLOOD.demon;
  if (e.type === 'fly' || e.type === 'splitter' || (e.ri === 1 && e.type === 'spitter')) return BLOOD.bile;
  if (e.type === 'wisp' || e.type === 'shadow') return BLOOD.ecto;
  return BLOOD.demon;
}
// vércseppek: x,y a talajon, z a magasság
function bloodSpray(x, y, a, n, spd = 260, spread = 0.7, pal = BLOOD.demon, size = 1) {
  if (GORE.drops.length > 520) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const aa = a + rand(-spread, spread), s = rand(0.25, 1) * spd;
    GORE.drops.push({ x, y, z: rand(8, 22), vx: Math.cos(aa) * s, vy: Math.sin(aa) * s * 0.8, vz: rand(60, 260), r: rand(1.2, 3.2) * size, col: choice(pal), pal });
  }
}
function splat(x, y, r, pal = BLOOD.demon, kind = 'splat') {
  const d = { x, y, r, rot: rand(0, TAU), col: pal[2], col2: pal[0], kind, seed: Math.floor(rand(0, 1e6)), t: 0 };
  GORE.decals.push(d); if (GORE.decals.length > GORE.maxDecals) GORE.decals.shift();
  return d;
}
// húscafatok és csontok
function gibs(e, n, pal) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(80, 300);
    GORE.chunks.push({ x: e.x, y: e.y, z: rand(6, 20), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.8, vz: rand(120, 340), rot: rand(0, TAU), vr: rand(-12, 12),
      w: rand(3, 7) * (e.r / 13), h: rand(2, 4.5) * (e.r / 13), kind: Math.random() < 0.25 ? 'bone' : 'flesh', pal });
  }
}
// tetem: a démon alakja a földön, alatta terjedő vértócsa
function corpse(e) {
  const pal = bloodOf(e), pool = splat(e.x, e.y + e.r * 0.4, e.r * 1.6, pal, 'pool'); pool.grow = 0;
  const c = { x: e.x, y: e.y, r: e.r, rot: rand(-0.5, 0.5), kind: 'corpse', type: e.type, ri: e.ri, col: (RINGS[e.ri] || RINGS[0]).body, col2: pal[0], seed: Math.floor(rand(0, 1e6)), t: 0, dir: Math.random() < 0.5 ? 1 : -1 };
  GORE.decals.push(c); if (GORE.decals.length > GORE.maxDecals) GORE.decals.shift();
}
function goreUpdate(dt) {
  for (const q of GORE.drops) {
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= 900 * dt; q.vx *= 0.985; q.vy *= 0.985;
    if (q.z <= 0) { q.dead = true; if (Math.random() < 0.55) splat(q.x, q.y, q.r * rand(1.2, 2.6), q.pal, 'drop'); }
  }
  GORE.drops = GORE.drops.filter(q => !q.dead);
  for (const c of GORE.chunks) {
    if (c.landed) continue;
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.vz -= 950 * dt; c.rot += c.vr * dt;
    if (Math.random() < 0.35) GORE.drops.push({ x: c.x, y: c.y, z: c.z, vx: c.vx * 0.2, vy: c.vy * 0.2, vz: 0, r: 1.4, col: c.pal[0], pal: c.pal });
    if (c.z <= 0) { if (Math.abs(c.vz) > 140) { c.vz *= -0.3; c.z = 0.1; c.vx *= 0.5; c.vy *= 0.5; } else { c.landed = true; c.z = 0; splat(c.x, c.y, c.w * 1.4, c.pal, 'drop'); } }
  }
  if (GORE.chunks.length > 160) GORE.chunks.splice(0, GORE.chunks.length - 160);
  for (const d of GORE.decals) { d.t += dt; if (d.kind === 'pool' && d.grow < 1) d.grow = Math.min(1, d.grow + dt * 0.5); }
}
const inView = (x, y, m = 60) => x > L - m && x < R + m && y > T - m && y < B + m;
// a talajon lévő nyomok – a démonok alatt rajzolódnak
function drawGoreUnder() {
  for (const d of GORE.decals) {
    if (!inView(d.x, d.y, 80)) continue;
    const fade = Math.max(0.35, 1 - d.t / 240);
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.globalAlpha = fade;
    if (d.kind === 'corpse') drawCorpse(d);
    else {
      const r = d.kind === 'pool' ? d.r * (0.4 + 0.6 * d.grow) : d.r;
      ctx.fillStyle = d.col; ctx.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rr = r * (0.7 + hash2(d.seed, k, 1) * 0.5); k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.75) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.75); }
      ctx.closePath(); ctx.fill();
      if (d.kind !== 'drop') { ctx.fillStyle = d.col2; ctx.globalAlpha = fade * 0.5; ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.1, r * 0.45, r * 0.3, 0, 0, TAU); ctx.fill(); }
      if (d.kind === 'splat') for (let k = 0; k < 5; k++) { const a = hash2(d.seed, k, 2) * TAU, rr = r * (1.2 + hash2(d.seed, k, 3) * 0.9); ctx.fillStyle = d.col; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.75, r * 0.14 + hash2(d.seed, k, 4) * 2, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  for (const c of GORE.chunks) if (c.landed && inView(c.x, c.y)) drawChunk(c);
}
function drawGoreOver() {
  for (const q of GORE.drops) {
    if (!inView(q.x, q.y)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(q.x - q.r * 0.5, q.y - q.r * 0.3, q.r, q.r * 0.6);
    ctx.fillStyle = q.col; ctx.beginPath(); ctx.ellipse(q.x, q.y - q.z, q.r, q.r * (1 + Math.min(1.5, Math.abs(q.vz) / 300)), 0, 0, TAU); ctx.fill();
  }
  for (const c of GORE.chunks) if (!c.landed && inView(c.x, c.y)) drawChunk(c);
}
function drawChunk(c) {
  ctx.save(); ctx.translate(c.x, c.y - c.z); ctx.rotate(c.rot);
  if (c.kind === 'bone') { ctx.fillStyle = '#d8ceb0'; ctx.fillRect(-c.w, -1.2, c.w * 2, 2.4); ctx.beginPath(); ctx.arc(-c.w, 0, 2, 0, TAU); ctx.arc(c.w, 0, 2, 0, TAU); ctx.fill(); }
  else { ctx.fillStyle = c.pal[1]; ctx.beginPath(); ctx.ellipse(0, 0, c.w, c.h, 0, 0, TAU); ctx.fill(); ctx.fillStyle = c.pal[2]; ctx.beginPath(); ctx.ellipse(c.w * 0.25, c.h * 0.2, c.w * 0.5, c.h * 0.5, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,220,200,0.25)'; ctx.beginPath(); ctx.ellipse(-c.w * 0.3, -c.h * 0.3, c.w * 0.3, c.h * 0.25, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawCorpse(d) {
  const s = d.r / 12, k = d.dir;
  ctx.scale(k * s, s);
  ctx.fillStyle = shade(d.col, 0.7); ctx.strokeStyle = '#140808'; ctx.lineWidth = 1.5 / s;
  // végtagok szanaszét
  ctx.lineCap = 'round'; ctx.strokeStyle = shade(d.col, 0.55); ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-4, 2); ctx.lineTo(-14, 8); ctx.moveTo(4, 2); ctx.lineTo(12, -6); ctx.moveTo(-2, 8); ctx.lineTo(-6, 18); ctx.moveTo(3, 8); ctx.lineTo(10, 16); ctx.stroke();
  ctx.fillStyle = shade(d.col, 0.75); ctx.beginPath(); ctx.ellipse(0, 4, 8, 11, 0.3, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(d.col, 0.6); ctx.beginPath(); ctx.arc(-3, -9, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = d.col2; ctx.beginPath(); ctx.ellipse(1, 5, 4, 5, 0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d8ceb0'; for (let i = 0; i < 3; i++) ctx.fillRect(-3 + i * 2.5, 1, 1.2, 6);
}
// események: találat, halál, sebesülés
on('hit', (e, dmg, o) => {
  if (!e || e.dead) return;
  const a = angTo(G.p, e), n = Math.min(14, 3 + Math.round(dmg / 6)), big = dmg > e.maxHp * 0.25;
  bloodSpray(e.x, e.y, a, n, big ? 340 : 240, big ? 0.9 : 0.6, bloodOf(e), e.boss ? 1.6 : 1);
  e.hurtT = 0.16; e.hurtA = a;
  if (big && !e.boss && e.act && e.act.ph === 'wind') { e.act = null; e.atk = null; e.stun = Math.max(e.stun || 0, 0.35); floatText(e.x, e.y - e.r - 18, 'MEGTÖRVE', '#e8c8a0', 0.7, 12); }
  if (Math.random() < 0.3) splat(e.x + rand(-6, 6), e.y + rand(-4, 6), rand(4, 9), bloodOf(e), 'splat');
});
on('kill', e => {
  if (!e) return;
  const pal = bloodOf(e), a = angTo(G.p, e);
  bloodSpray(e.x, e.y, a, e.boss ? 60 : 22, e.boss ? 420 : 320, Math.PI, pal, e.boss ? 1.8 : 1.2);
  bloodSpray(e.x, e.y, a, 10, 420, 0.35, pal, 1.4);
  gibs(e, e.boss ? 26 : e.type === 'fly' || e.type === 'mini' ? 3 : 6 + Math.round(e.r / 4), pal);
  splat(e.x, e.y, e.r * 1.4, pal, 'splat');
  if (e.type !== 'fly' && e.type !== 'wisp' && e.type !== 'shadow') corpse(e);
  vfx.shake(e.boss ? 18 : e.r > 16 ? 5 : 2.5);
});
on('hurt', (d) => { const p = G.p; bloodSpray(p.x, p.y, rand(0, TAU), 6 + Math.round(d / 4), 200, Math.PI, BLOOD.angel, 0.9); });
on('runStart', () => { GORE.drops.length = 0; GORE.chunks.length = 0; GORE.decals.length = 0; });
