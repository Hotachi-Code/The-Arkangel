// =====================================================================
//  DÉMONOK RAJZA ÉS ANIMÁCIÓJA – végtagos „csontváz”, pózokkal
//  Felkészülés: hátradől, fegyvert emel; lecsapás: előrelendül, elmosódó
//  ív; kifújás: lóg a karja, lihegve kiegyenesedik; találatra megrándul;
//  kábultan tántorog. Halálkor a gore.js szétszaggatja.
// =====================================================================
const RIG = {
  imp: { torso: [9, 7, 13], head: 7, horn: 0.9, arm: [8, 8, 2.8], leg: [6, 7, 2.8], weapon: 'claw', skin: '#7a2a22', skin2: '#2e0c0a', belly: '#9a4a38', hunch: 0.28, tail: 1 },
  mini: { torso: [8, 6, 11], head: 6.5, horn: 0.6, arm: [7, 7, 2.4], leg: [5, 6, 2.4], weapon: 'claw', skin: '#7e3a26', skin2: '#2e100a', belly: '#a0583a', hunch: 0.3, tail: 1 },
  brute: { torso: [14, 10, 17], head: 7, horn: 1.4, arm: [10, 10, 5], leg: [8, 8, 4.4], weapon: 'cleaver', skin: '#6a3428', skin2: '#22100a', belly: '#8a4a36', hunch: 0.32, armor: 1, ribs: 1 },
  spitter: { torso: [10, 13, 13], head: 6, horn: 0.35, arm: [6, 6, 2.4], leg: [5, 5, 3.2], weapon: 'none', skin: '#7a5a34', skin2: '#2e2010', belly: '#a08048', hunch: 0.1, bloat: 1, boils: 1 },
  teleporter: { torso: [7, 5, 16], head: 6, horn: 0, arm: [10, 10, 2], leg: [9, 9, 2.2], weapon: 'blades', skin: '#3a2832', skin2: '#120a10', belly: '#4a3440', hunch: 0.15, hood: 1 },
  wisp: { torso: [8, 6, 14], head: 6.5, horn: 0, arm: [7, 7, 2], leg: [0, 0, 0], weapon: 'staff', skin: '#58585e', skin2: '#1c1c22', belly: '#6a6a70', hunch: 0.05, robe: 1, skull: 1, float: 1 },
};
const BOSS_RIG = {
  asmodeus: { torso: [13, 9, 18], head: 8, horn: 1.7, arm: [11, 11, 3.6], leg: [9, 9, 3.6], weapon: 'whip', skin: '#7a3040', skin2: '#2a0c14', belly: '#9a4a58', hunch: 0.12, wings: 'bat', tail: 1 },
  beelzebub: { torso: [14, 15, 16], head: 8, horn: 0.8, arm: [9, 9, 4], leg: [7, 7, 4.4], weapon: 'cleaver', skin: '#5e602a', skin2: '#22240c', belly: '#7e7a38', hunch: 0.2, bloat: 1, boils: 1, fly: 1, wings: 'fly' },
  mammon: { torso: [14, 11, 17], head: 8, horn: 1.1, arm: [10, 10, 4.4], leg: [8, 8, 4.4], weapon: 'mace', skin: '#6e5228', skin2: '#2a1c0a', belly: '#8e6c36', hunch: 0.2, armor: 2, crown: 1, chains: 1 },
  belphegor: { torso: [15, 16, 15], head: 8, horn: 1.5, arm: [10, 10, 5], leg: [7, 7, 5], weapon: 'none', skin: '#4e5462', skin2: '#1a1c24', belly: '#666c7a', hunch: 0.35, bloat: 1, sleepy: 1 },
  satan: { torso: [14, 10, 18], head: 8, horn: 2.0, arm: [11, 11, 4.4], leg: [9, 9, 4.4], weapon: 'greatsword', skin: '#7a2414', skin2: '#2a0a06', belly: '#9a3a20', hunch: 0.15, armor: 1, wings: 'bat', fire: 1 },
  leviathan: { torso: [12, 9, 16], head: 8, horn: 1.0, arm: [10, 10, 3.6], leg: [0, 0, 0], weapon: 'trident', skin: '#24524a', skin2: '#0a1e1a', belly: '#3a7466', hunch: 0.1, float: 1, scales: 1 },
  lucifer: { torso: [12, 8, 19], head: 8, horn: 1.3, arm: [11, 11, 3.4], leg: [10, 10, 3.4], weapon: 'greatsword', skin: '#b4a8b8', skin2: '#3a2e44', belly: '#cabed0', hunch: 0, wings: 'angel6', crown: 2 },
};
const ease = k => 1 - Math.pow(1 - k, 3);
function poseOf(e) {
  const P = { lean: 0, crouch: Math.sin(e.t * 2.6) * 0.8, armB: 0.35, armF: -0.25, bendB: 0.5, bendF: 0.6, leg: 0, mouth: 0.15, glow: 0, shake: 0, wing: Math.sin(e.t * 3) * 0.15 };
  const mv = e.moving ? Math.min(1, e.moving / 80) : 0;
  if (mv) { const w = Math.sin(e.t * 10); P.leg = w * 0.7 * mv; P.armB += w * 0.35 * mv; P.armF -= w * 0.35 * mv; P.crouch += Math.abs(w) * 1.2 * mv; P.lean += 0.12 * mv; }
  const A = e.act;
  if (A && !(e.stun > 0)) {
    const m = A.m, sh = m.shape, dur = A.ph === 'wind' ? m.wind : A.ph === 'act' ? m.act : m.rec, k = clamp(A.t / Math.max(0.01, dur), 0, 1);
    if (sh === 'circle') {
      if (A.ph === 'wind') { P.armB = P.armF = -2.7 * ease(k); P.bendB = P.bendF = -0.3; P.crouch = -3 * k; P.lean = -0.2 * k; P.shake = k > 0.7 ? 1 : 0; }
      else if (A.ph === 'act') { P.armB = P.armF = -2.7 + 3.9 * ease(Math.min(1, k * 3)); P.crouch = 6; P.lean = 0.3; }
      else { P.armB = P.armF = 1.2 - 0.6 * k; P.crouch = 6 * (1 - k); P.lean = 0.3 * (1 - k); P.mouth = 0.6; }
    } else if (sh === 'line') {
      if (A.ph === 'wind') { P.crouch = 5 * k; P.lean = 0.55 * k; P.armB = P.armF = 0.9 * k; P.shake = k; P.mouth = 0.8 * k; }
      else if (A.ph === 'act') { P.lean = 0.65; P.crouch = 3; P.armB = 1.1; P.armF = 1.3; P.leg = Math.sin(e.t * 26) * 0.9; P.mouth = 1; }
      else { P.lean = 0.5 * (1 - k); P.crouch = 4 * (1 - k); P.armB = P.armF = 1.0 * (1 - k); }
    } else if (sh === 'arc') {
      if (A.ph === 'wind') { P.armF = -2.5 * ease(k); P.bendF = -0.2; P.armB = 0.7 * k; P.lean = -0.32 * k; P.crouch = 2.5 * k; P.shake = k > 0.75 ? 0.6 : 0; P.mouth = 0.5 * k; }
      else if (A.ph === 'act') { P.armF = -2.5 + 4.0 * ease(Math.min(1, k * 2.5)); P.bendF = 0.1; P.armB = -0.4; P.lean = 0.38; P.crouch = 3; P.mouth = 1; }
      else { P.armF = 1.5 - 0.9 * k; P.armB = 0.3; P.lean = 0.38 * (1 - k); P.crouch = 3 * (1 - k); }
    } else if (sh === 'proj' || sh === 'lob' || sh === 'rain' || sh === 'beam') {
      if (A.ph === 'wind') { P.armF = -1.7 * k; P.armB = -1.1 * k; P.bendF = P.bendB = -0.6 * k; P.lean = -0.18 * k; P.mouth = 0.9 * k; P.glow = k; }
      else if (A.ph === 'act') { P.armF = 1.3; P.armB = 0.6; P.lean = 0.22; P.mouth = 1; P.glow = 1 - k; }
      else { P.armF = 1.0 * (1 - k); P.lean = 0.2 * (1 - k); }
    } else if (sh === 'blink') { P.crouch = 5 * k; P.lean = 0.3 * k; P.armB = P.armF = 1.1 * k; }
    else if (sh === 'summon' || sh === 'howl' || sh === 'pull') { const q = A.ph === 'wind' ? k : 1; P.armB = -2.4 * q; P.armF = -2.4 * q; P.bendB = P.bendF = 0.4; P.lean = -0.3 * q; P.mouth = 1 * q; P.glow = q; P.shake = q * 0.5; }
    else if (sh === 'hop') { P.crouch = -4; P.lean = -0.3; }
  }
  if (e.hurtT > 0) { const h = e.hurtT / 0.16; P.lean -= 0.4 * h; P.mouth = Math.max(P.mouth, 0.8); P.armB -= 0.6 * h; P.armF += 0.4 * h; }
  if (e.stun > 0) { P.lean = Math.sin(gt * 7) * 0.2; P.armB = 1.3; P.armF = 1.1; P.crouch = 5; P.mouth = 0.5; }
  return P;
}
function limb(x, y, a, l1, l2, bend, w, col, dark) {
  const ex = x + Math.sin(a) * l1, ey = y + Math.cos(a) * l1, a2 = a + bend, hx = ex + Math.sin(a2) * l2, hy = ey + Math.cos(a2) * l2;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = dark; ctx.lineWidth = w + 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); ctx.stroke();
  return { hx, hy, a: a2, ex, ey };
}
function mixHex(a, b, t) { const A = parseInt(a.slice(1), 16), Bn = parseInt(b.slice(1), 16); const r = (A >> 16) * (1 - t) + (Bn >> 16) * t, g = (A >> 8 & 255) * (1 - t) + (Bn >> 8 & 255) * t, bl = (A & 255) * (1 - t) + (Bn & 255) * t; return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(bl)).toString(16).slice(1); }
function drawWeapon(kind, h, sc, glow, bloody) {
  ctx.save(); ctx.translate(h.hx, h.hy); ctx.rotate(-h.a + Math.PI);
  const D = '#120808';
  switch (kind) {
    case 'claw': ctx.strokeStyle = '#d8cfb4'; ctx.lineWidth = 1.4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 1.6, 0); ctx.quadraticCurveTo(i * 2.6, -4, i * 1.4 + 1.5, -7); ctx.stroke(); } if (bloody) { ctx.fillStyle = '#6e0a0a'; ctx.fillRect(-2, -5, 4, 3); } break;
    case 'cleaver': ctx.fillStyle = '#3a2418'; ctx.fillRect(-1.4, -2, 2.8, 8); ctx.fillStyle = '#7a7a80'; ctx.strokeStyle = D; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-2, -22); ctx.lineTo(9, -20); ctx.lineTo(8, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#a8a8b0'; ctx.fillRect(6, -20, 2.4, 18); ctx.fillStyle = 'rgba(110,10,10,0.85)'; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(6, -18); ctx.lineTo(8, -8); ctx.lineTo(2, -6); ctx.fill(); break;
    case 'blades': ctx.strokeStyle = '#b8b8c8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -10, 1, -18); ctx.stroke(); ctx.strokeStyle = '#6e0a0a'; ctx.beginPath(); ctx.moveTo(2.4, -8); ctx.lineTo(1.8, -13); ctx.stroke(); break;
    case 'staff': ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(0, -24); ctx.stroke(); ctx.fillStyle = '#d8ceb0'; ctx.beginPath(); ctx.arc(0, -26, 3.4, 0, TAU); ctx.fill(); ctx.fillStyle = '#120808'; ctx.fillRect(-1.6, -27, 1.2, 1.2); ctx.fillRect(0.6, -27, 1.2, 1.2); if (glow) { ctx.fillStyle = `rgba(160,200,210,${0.6 * glow})`; ctx.beginPath(); ctx.arc(0, -26, 6 + glow * 3, 0, TAU); ctx.fill(); } break;
    case 'whip': ctx.strokeStyle = '#3a1418'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); for (let i = 1; i <= 8; i++) ctx.lineTo(Math.sin(gt * 8 + i) * i * 0.8, -i * 4); ctx.stroke(); ctx.fillStyle = '#8a1a2a'; ctx.beginPath(); ctx.arc(Math.sin(gt * 8 + 8) * 6.4, -32, 2, 0, TAU); ctx.fill(); break;
    case 'mace': ctx.fillStyle = '#3a2a18'; ctx.fillRect(-1.2, -16, 2.4, 20); ctx.fillStyle = '#8a6a28'; ctx.strokeStyle = D; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, -19, 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#c8a040'; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, -19 + Math.sin(a) * 5); ctx.lineTo(Math.cos(a) * 9, -19 + Math.sin(a) * 9); ctx.lineTo(Math.cos(a + 0.3) * 5, -19 + Math.sin(a + 0.3) * 5); ctx.fill(); } break;
    case 'greatsword': ctx.fillStyle = '#2a1a14'; ctx.fillRect(-1.2, -1, 2.4, 7); ctx.fillStyle = '#5a4a40'; ctx.fillRect(-6, -2, 12, 2.4); ctx.fillStyle = glow > 0 ? '#c86a2a' : '#8a8a94'; ctx.strokeStyle = D; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2.6, -2); ctx.lineTo(-2.2, -34); ctx.lineTo(0, -38); ctx.lineTo(2.2, -34); ctx.lineTo(2.6, -2); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(110,10,10,0.7)'; ctx.fillRect(-2, -26, 3, 10); break;
    case 'trident': ctx.strokeStyle = '#4a4a3a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -30); ctx.moveTo(-5, -26); ctx.lineTo(-5, -34); ctx.moveTo(5, -26); ctx.lineTo(5, -34); ctx.moveTo(-5, -26); ctx.lineTo(5, -26); ctx.stroke(); break;
  }
  ctx.restore();
}
function drawRig(e, R, S, dir) {
  const P = poseOf(e), fl = e.flash > 0, ri = e.ri !== undefined ? e.ri : 0, rgc = (RINGS[ri] || RINGS[0]).body;
  const skin = fl ? '#f0e0d8' : mixHex(R.skin, rgc, 0.25), skin2 = fl ? '#c8b8b0' : mixHex(R.skin2, rgc, 0.2), dark = '#0e0606', belly = fl ? '#fff0e8' : R.belly;
  const [tw, tb, th] = R.torso, [a1, a2, aw] = R.arm, [l1, l2, lw] = R.leg;
  const shx = P.shake ? Math.sin(gt * 60) * 0.8 * P.shake : 0;
  ctx.save(); ctx.translate(shx, 0); ctx.scale(dir * S, S);
  const fy = R.float ? -6 + Math.sin(e.t * 2.4) * 2 : 0;
  // lábak
  const hipY = 0 + P.crouch * 0.4 + fy;
  if (!R.float && l1) {
    limb(-tw * 0.35, hipY, -0.15 + P.leg + 0.15, l1, l2, -0.35 - Math.max(0, P.crouch) * 0.06, lw, skin2, dark);
    limb(tw * 0.35, hipY, 0.1 - P.leg + 0.1, l1, l2, -0.35 - Math.max(0, P.crouch) * 0.06, lw, skin2, dark);
  }
  ctx.translate(0, hipY); ctx.rotate(P.lean + R.hunch * 0.6);
  // szárnyak és farok a test mögött
  if (R.tail) { ctx.strokeStyle = dark; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(-14, 4 + Math.sin(e.t * 4) * 3, -18, -6); ctx.stroke(); ctx.strokeStyle = skin2; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = skin2; ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-22, -10); ctx.lineTo(-16, -9); ctx.fill(); }
  if (R.wings) drawWings(R.wings, th, P, skin2, dark, fl);
  // hátsó kar
  const sY = -th * 0.85;
  const hB = limb(-tw * 0.55, sY, P.armB, a1, a2, P.bendB, aw, skin2, dark);
  // törzs
  const tg = ctx.createLinearGradient(-tw, -th, tw, 0); tg.addColorStop(0, skin); tg.addColorStop(1, skin2);
  ctx.fillStyle = tg; ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-tw * 0.8, -th); ctx.quadraticCurveTo(-tw * 1.05, -th * 0.4, -tb * (R.bloat ? 1.05 : 0.7), 0); ctx.quadraticCurveTo(0, tb * (R.bloat ? 0.7 : 0.3), tb * (R.bloat ? 1.05 : 0.7), 0); ctx.quadraticCurveTo(tw * 1.05, -th * 0.4, tw * 0.8, -th); ctx.quadraticCurveTo(0, -th * 1.12, -tw * 0.8, -th); ctx.fill(); ctx.stroke();
  if (R.robe) { ctx.fillStyle = fl ? '#ddd' : '#1e1a20'; ctx.beginPath(); ctx.moveTo(-tw * 0.9, -th * 0.6); ctx.lineTo(-tw * 1.2, 14 + Math.sin(e.t * 5) * 2); for (let i = 0; i <= 5; i++) ctx.lineTo(-tw * 1.2 + i * tw * 0.48, 14 + (i % 2 ? 4 : 0) + Math.sin(e.t * 5 + i) * 2); ctx.lineTo(tw * 0.9, -th * 0.6); ctx.fill(); }
  ctx.fillStyle = belly; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(tw * 0.1, -th * 0.35, tw * (R.bloat ? 0.75 : 0.45), th * 0.32, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  if (R.ribs) { ctx.strokeStyle = '#d8ccb0'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-tw * 0.3, -th * 0.7 + i * 3.4); ctx.quadraticCurveTo(tw * 0.1, -th * 0.6 + i * 3.4, tw * 0.45, -th * 0.72 + i * 3.4); ctx.stroke(); } ctx.fillStyle = 'rgba(110,10,10,0.7)'; ctx.beginPath(); ctx.ellipse(0, -th * 0.6, tw * 0.35, 4, 0, 0, TAU); ctx.fill(); }
  if (R.boils) { ctx.fillStyle = '#b8a060'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-tw * 0.6 + hash2(i, 3, 9) * tw * 1.3, -th * 0.2 - hash2(i, 4, 9) * th * 0.6, 1.4 + hash2(i, 5, 9) * 1.6, 0, TAU); ctx.fill(); } }
  if (R.armor) { ctx.fillStyle = R.armor === 2 ? '#8a6a28' : '#4a4448'; ctx.strokeStyle = dark; ctx.lineWidth = 1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * tw * 0.75, -th * 0.95, tw * 0.38, tw * 0.22, s * 0.3, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#7a7478'; ctx.beginPath(); ctx.moveTo(s * tw * 0.8, -th * 1.1); ctx.lineTo(s * tw * 0.95, -th * 1.32); ctx.lineTo(s * tw * 0.6, -th * 1.08); ctx.fill(); ctx.fillStyle = R.armor === 2 ? '#8a6a28' : '#4a4448'; } }
  if (R.chains) { ctx.strokeStyle = '#c8a040'; ctx.lineWidth = 1.2; ctx.setLineDash([2, 1.5]); ctx.beginPath(); ctx.moveTo(-tw * 0.7, -th * 0.9); ctx.quadraticCurveTo(0, -th * 0.2, tw * 0.7, -th * 0.9); ctx.stroke(); ctx.setLineDash([]); }
  if (R.scales) { ctx.strokeStyle = 'rgba(160,220,200,0.25)'; ctx.lineWidth = 0.8; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-tw * 0.5 + (i % 3) * tw * 0.5, -th * 0.75 + Math.floor(i / 3) * 5, 2.4, 0, Math.PI); ctx.stroke(); } }
  // sebek a testen, ha megsérült
  if (e.hp < e.maxHp * 0.6) { ctx.fillStyle = 'rgba(100,8,8,0.85)'; ctx.beginPath(); ctx.ellipse(-tw * 0.25, -th * 0.5, 2.2, 3.4, 0.4, 0, TAU); ctx.fill(); }
  if (e.hp < e.maxHp * 0.3) { ctx.beginPath(); ctx.ellipse(tw * 0.3, -th * 0.25, 2.6, 2, -0.3, 0, TAU); ctx.fill(); }
  // fej
  ctx.save(); ctx.translate(tw * 0.15, -th - R.head * 0.75); ctx.rotate(-P.lean * 0.4);
  drawHead(R, P, skin, skin2, dark, fl, e);
  ctx.restore();
  // első kar + fegyver
  const hF = limb(tw * 0.55, sY, P.armF, a1, a2, P.bendF, aw, skin, dark);
  drawWeapon(R.weapon, hF, S, P.glow, e.hp < e.maxHp);
  if (R.weapon === 'blades') drawWeapon('blades', hB, S, 0, false);
  if (P.glow > 0 && (R.weapon === 'none' || R.weapon === 'claw')) { ctx.fillStyle = `rgba(200,120,60,${0.55 * P.glow})`; ctx.beginPath(); ctx.arc(hF.hx, hF.hy, 2 + P.glow * 3, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawHead(R, P, skin, skin2, dark, fl, e) {
  const h = R.head;
  if (R.horn) { ctx.fillStyle = fl ? '#eee' : '#1e1410'; ctx.strokeStyle = dark; ctx.lineWidth = 1; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * h * 0.4, -h * 0.55); ctx.quadraticCurveTo(s * h * (0.9 + R.horn * 0.4), -h * (0.9 + R.horn * 0.3), s * h * (0.7 + R.horn * 0.35), -h * (1.3 + R.horn * 0.55)); ctx.lineTo(s * h * 0.12, -h * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke(); } }
  if (R.hood) { ctx.fillStyle = fl ? '#ddd' : '#16101a'; ctx.beginPath(); ctx.moveTo(-h * 1.1, h * 0.6); ctx.quadraticCurveTo(-h * 1.2, -h * 1.3, 0, -h * 1.4); ctx.quadraticCurveTo(h * 1.2, -h * 1.3, h * 1.1, h * 0.6); ctx.fill(); }
  const hg = ctx.createLinearGradient(-h, -h, h, h); hg.addColorStop(0, R.skull ? '#d8ceb4' : skin); hg.addColorStop(1, R.skull ? '#8a8270' : skin2);
  ctx.fillStyle = hg; ctx.strokeStyle = dark; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(-h * 0.85, -h * 0.2); ctx.quadraticCurveTo(-h * 0.9, -h, 0, -h); ctx.quadraticCurveTo(h * 0.9, -h, h * 0.85, -h * 0.2); ctx.lineTo(h * 0.55, h * 0.55 + P.mouth * h * 0.35); ctx.lineTo(-h * 0.45, h * 0.55 + P.mouth * h * 0.35); ctx.closePath(); ctx.fill(); ctx.stroke();
  // szem
  if (R.fly) { ctx.fillStyle = '#5a1a12'; ctx.beginPath(); ctx.ellipse(-h * 0.4, -h * 0.35, h * 0.38, h * 0.32, 0, 0, TAU); ctx.ellipse(h * 0.45, -h * 0.35, h * 0.38, h * 0.32, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,180,120,0.25)'; ctx.fillRect(-h * 0.6, -h * 0.5, h * 0.2, h * 0.1); }
  else if (R.sleepy) { ctx.strokeStyle = '#d8b040'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-h * 0.55, -h * 0.3); ctx.lineTo(-h * 0.15, -h * 0.25); ctx.moveTo(h * 0.25, -h * 0.25); ctx.lineTo(h * 0.65, -h * 0.3); ctx.stroke(); }
  else { ctx.fillStyle = '#100404'; ctx.beginPath(); ctx.ellipse(-h * 0.33, -h * 0.3, h * 0.24, h * 0.15, 0.25, 0, TAU); ctx.ellipse(h * 0.42, -h * 0.3, h * 0.24, h * 0.15, -0.25, 0, TAU); ctx.fill(); ctx.fillStyle = R.skull ? '#a8c8d0' : '#e8a838'; ctx.beginPath(); ctx.arc(-h * 0.3, -h * 0.3, h * 0.08, 0, TAU); ctx.arc(h * 0.45, -h * 0.3, h * 0.08, 0, TAU); ctx.fill(); }
  // száj és fogak
  const my = h * 0.25, mh = h * (0.12 + P.mouth * 0.38);
  ctx.fillStyle = '#1a0404'; ctx.beginPath(); ctx.ellipse(h * 0.05, my, h * 0.42, mh, 0, 0, TAU); ctx.fill();
  if (P.mouth > 0.4) { ctx.fillStyle = '#6e0a0a'; ctx.beginPath(); ctx.ellipse(h * 0.05, my + mh * 0.4, h * 0.25, mh * 0.4, 0, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#e0d6bc'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(h * 0.05 + i * h * 0.15 - 1, my - mh * 0.6); ctx.lineTo(h * 0.05 + i * h * 0.15 + 1, my - mh * 0.6); ctx.lineTo(h * 0.05 + i * h * 0.15, my - mh * 0.6 + 2.2); ctx.fill(); }
  if (R.crown) { ctx.fillStyle = R.crown === 2 ? '#3a3040' : '#b08a30'; ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-h * 0.7, -h * 0.85); for (let i = 0; i <= 4; i++) ctx.lineTo(-h * 0.7 + i * h * 0.35, -h * (i % 2 ? 1.25 : 1.6)); ctx.lineTo(h * 0.7, -h * 0.85); ctx.closePath(); ctx.fill(); ctx.stroke(); if (R.crown === 2) { ctx.strokeStyle = 'rgba(160,140,180,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, -h * 1.9, h * 0.9, h * 0.25, 0, 0.3, Math.PI * 1.4); ctx.stroke(); } }
}
function drawWings(kind, th, P, col, dark, fl) {
  const f = P.wing + (P.glow ? -0.3 * P.glow : 0);
  if (kind === 'fly') { ctx.fillStyle = 'rgba(190,200,170,0.35)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 14, -th * 0.9, 13, 5, s * (0.5 + Math.sin(gt * 40) * 0.4), 0, TAU); ctx.fill(); } return; }
  const pairs = kind === 'angel6' ? 3 : 1;
  for (let k = 0; k < pairs; k++) for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 5, -th * 0.85); ctx.scale(s, 1); ctx.rotate(-0.5 + k * 0.55 + f);
    if (kind === 'bat') {
      ctx.fillStyle = fl ? '#ddd' : mixHex('#2a1418', '#000000', 0.2); ctx.strokeStyle = dark; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -14); ctx.lineTo(30, -10); ctx.quadraticCurveTo(26, -2, 30, 4); ctx.quadraticCurveTo(22, 2, 22, 8); ctx.quadraticCurveTo(14, 4, 10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -14); ctx.moveTo(16, -14); ctx.lineTo(22, 8); ctx.moveTo(16, -14); ctx.lineTo(10, 10); ctx.stroke();
    } else {
      for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#2a2232' : '#3a2e44'; ctx.strokeStyle = dark; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(10 + i * 3, -2 + i * 1.6, 14 - i, 3, -0.2 + i * 0.12, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }
}
// ---------- a rajzolás belépési pontja ----------
function drawEnemy(e) {
  const fl = e.flash > 0, r = e.r;
  const dir = Math.cos(e.face || 0) < 0 ? -1 : 1;
  ctx.save();
  if (e.spawn > 0) ctx.globalAlpha = 1 - e.spawn / 0.6;
  ctx.globalAlpha *= e.alpha;
  if (e.boss && e.key === 'leviathan') drawSerpent(e);
  // talajárnyék
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.85, r * 1.05, r * 0.34, 0, 0, TAU); ctx.fill();
  // lecsapás: elmosódó ív a fegyver útján
  const A = e.act;
  if (A && A.ph === 'act' && A.m.shape === 'arc') {
    const k = clamp(A.t / A.m.act, 0, 1), m = A.m, rr = m.r * 0.92, a0 = A.a - m.half, a1 = A.a - m.half + m.half * 2 * ease(Math.min(1, k * 2.5));
    ctx.fillStyle = `rgba(230,200,180,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(e.x, e.y, rr, a0, a1); ctx.arc(e.x, e.y, rr * 0.55, a1, a0, true); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(120,10,10,${0.6 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, rr, a0, a1); ctx.stroke();
  }
  if (A && A.ph === 'act' && A.m.shape === 'circle' && A.t < 0.1) { ctx.fillStyle = 'rgba(80,60,50,0.35)'; ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.6, A.m.r * 0.8, 0, TAU); ctx.fill(); }
  ctx.translate(e.x, e.y + r * 0.85);
  if (e.boss && e.intro > 0) { const k = Math.min(1, (2.2 - e.intro) / 1.2); ctx.scale(k, k); }
  if (e.boss && e.inv > 0) ctx.globalAlpha *= 0.6 + Math.sin(gt * 30) * 0.3;
  if (!G.hub && e.ri === 6 && e.spawn <= 0 && !e.boss) { // csábító aura (Kevélység)
    const d = dist(e, G.p); ctx.strokeStyle = 'rgba(190,150,200,0.25)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -gt * 30; ctx.beginPath(); ctx.arc(0, -r * 0.85, 115, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (d < 115) { ctx.strokeStyle = 'rgba(200,120,170,0.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(G.p.x - e.x, G.p.y - e.y - r * 0.85); ctx.stroke(); }
  }
  const R0 = e.boss ? BOSS_RIG[e.key] : RIG[e.type];
  if (R0) drawRig(e, R0, e.boss ? r / 13 : r / 10.5, dir);
  else drawBlobDemon(e, dir, fl);
  if (e.elite) { ctx.strokeStyle = 'rgba(216,176,80,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.4, 0, 0, TAU); ctx.stroke(); }
  ctx.restore();
  // állapotjelzők
  ctx.save(); ctx.translate(e.x, e.y);
  const top = -r * (e.boss ? 3.2 : 2.6);
  if (e.burn > 0) { ctx.fillStyle = '#d8803a'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.ellipse(0, top + 6, 3, 5 + Math.sin(gt * 20), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
  if (e.stun > 0) { ctx.fillStyle = PAL.gold; for (let i = 0; i < 3; i++) { const q = gt * 6 + i * TAU / 3; ctx.beginPath(); ctx.arc(Math.cos(q) * r * 0.8, top + Math.sin(q) * 3, 2.3, 0, TAU); ctx.fill(); } }
  if (e.loot) { ctx.textAlign = 'center'; ctx.font = `bold 12px ${SANS}`; ctx.fillStyle = '#000'; ctx.fillText(`◈${e.loot}`, 1, top - 9); ctx.fillStyle = '#d8b050'; ctx.fillText(`◈${e.loot}`, 0, top - 10); }
  ctx.restore();
  if (!e.boss && e.hp < e.maxHp && e.spawn <= 0) { const y = e.y - r * 2.5; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - 16, y, 32, 4); ctx.fillStyle = '#8a1010'; ctx.fillRect(e.x - 16, y, 32 * Math.max(0, e.hp / e.maxHp), 4); }
}
// nem emberszerű démonok: légy, hasadó húskupac, gerinctorony
function drawBlobDemon(e, dir, fl) {
  const r = e.r, A = e.act, wind = A && A.ph === 'wind' ? clamp(A.t / A.m.wind, 0, 1) : 0, actk = A && A.ph === 'act' ? 1 : 0;
  ctx.scale(dir, 1); ctx.translate(0, -r * 0.85);
  const dark = '#0e0606';
  if (e.type === 'fly') {
    const wf = Math.sin(gt * 50) * 0.5; ctx.fillStyle = 'rgba(180,190,160,0.4)'; ctx.beginPath(); ctx.ellipse(-r * 0.9, -r * 0.7, r * 0.95, r * 0.36, -0.5 + wf, 0, TAU); ctx.ellipse(r * 0.9, -r * 0.7, r * 0.95, r * 0.36, 0.5 - wf, 0, TAU); ctx.fill();
    ctx.fillStyle = fl ? '#eee' : '#3a3a1c'; ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.1, r * 0.85, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6a2214'; ctx.beginPath(); ctx.ellipse(r * 0.5, -r * 0.2, r * 0.42, r * 0.38, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a1010'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(r, r * 0.1); ctx.lineTo(r * 1.5 + actk * 4, r * 0.3); ctx.stroke();
    return;
  }
  if (e.type === 'splitter') {
    const wob = Math.sin(e.t * 6) * 0.07 + wind * 0.15;
    ctx.fillStyle = fl ? '#eee' : '#6a4a3a'; ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, r * (1 + wob), r * (1 - wob * 0.7), 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4a1a14'; for (let i = 0; i < 3; i++) { const a = -0.8 + i * 0.8; ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.45, r * 0.22, r * (0.08 + wind * 0.12 + actk * 0.15), a, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#d8ceb0'; for (let i = 0; i < 6; i++) { const a = -0.8 + (i % 3) * 0.8; ctx.fillRect(Math.cos(a) * r * 0.5 - 1 + (i > 2 ? 2 : -2), Math.sin(a) * r * 0.45 - 1, 1.2, 2.4); }
    ctx.fillStyle = 'rgba(110,10,10,0.6)'; ctx.beginPath(); ctx.ellipse(-r * 0.3, r * 0.5, r * 0.3, r * 0.15, 0, 0, TAU); ctx.fill();
    return;
  }
  if (e.type === 'turret') {
    ctx.fillStyle = '#2a1a16'; ctx.beginPath(); ctx.ellipse(0, r * 0.7, r * 1.1, r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fl ? '#eee' : '#5a2a22'; ctx.strokeStyle = dark; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.7); ctx.quadraticCurveTo(-r * 0.5, -r * 1.4, 0, -r * 1.7); ctx.quadraticCurveTo(r * 0.5, -r * 1.4, r * 0.8, r * 0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8ceb0'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.15, r * 0.4 - i * r * 0.4); ctx.lineTo(-r * 0.6, r * 0.2 - i * r * 0.4); ctx.lineTo(-r * 0.15, r * 0.2 - i * r * 0.4); ctx.fill(); }
    const op = 0.3 + wind * 0.7 + actk * 0.5;
    ctx.fillStyle = '#e8d8c0'; ctx.beginPath(); ctx.ellipse(r * 0.1, -r * 0.6, r * 0.45, r * 0.3 * op, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a1010'; ctx.beginPath(); ctx.arc(r * 0.1 + Math.cos(e.face) * 2, -r * 0.6, r * 0.18 * Math.min(1, op + 0.2), 0, TAU); ctx.fill();
    return;
  }
  if (e.type === 'shadow') { ctx.scale(dir, 1); drawAngel(0, 0, e.face, e.t, true, e.alpha * (fl ? 0.6 : 1)); }
}
function drawSerpent(b) {
  const col = mixHex(BOSS_RIG.leviathan.skin, '#000000', 0.1);
  for (let i = b.trail.length - 1; i > 2; i -= 3) {
    const q = b.trail[i], k = 1 - i / 60, r = b.r * (0.35 + k * 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(q.x, q.y + r * 0.8, r, r * 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = i % 6 === 0 ? '#163a32' : col; ctx.strokeStyle = '#06100e'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a7466'; ctx.beginPath(); ctx.moveTo(q.x - r * 0.3, q.y - r * 0.8); ctx.lineTo(q.x, q.y - r * 1.4); ctx.lineTo(q.x + r * 0.3, q.y - r * 0.8); ctx.fill();
  }
}
function drawBoss(b) { drawEnemy(b); }
