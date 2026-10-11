// The Arkangel – áldások, ereklyék, egyesülések, fegyverszintek és átalakulások.
// A mag (core.html) minden függvényét látjuk; minden saját név ebben a zárványban marad.
(() => {
  'use strict';
  // ======================================================================
  //  segédek
  // ======================================================================
  let busy = 0;                         // újrabelépés-őr: a saját sebzéseink nem indítanak újabb proc-ot
  const UT = { tag: 'upg' };
  function uHit(e, d, o) { busy++; try { return hitEnemy(e, d, o ? Object.assign({ tag: 'upg' }, o) : UT); } finally { busy--; } }
  function uCircle(x, y, r, d, o) { busy++; try { return hitCircle(x, y, r, d, Object.assign({ tag: 'upg' }, o || {})); } finally { busy--; } }
  const later = (t, fn) => addFx({ upd(dt) { t -= dt; if (t <= 0) { fn(); return false; } return true; } });
  let rs = { G: null };
  const RS = () => (rs.G === G ? rs : (rs = { G }));   // nem szerializálható (terem-hivatkozások)
  const S = () => G.flags._u || (G.flags._u = { hits: 0, kills: 0, ver: 0, fullT: 0, momT: 0, legT: 0, glintT: 0, petalT: 0, charonN: 0 });

  // birtoklás-gyorsítótár (a hookok sokszor futnak)
  let cG = null, cKey = '', cB = {}, cR = new Set();
  const FUSED_OF = {};                  // összetevő -> egyesült ereklye
  function cache() {
    const s = S(), key = G.blessings.length + ':' + G.relics.length + ':' + s.ver;
    if (cG !== G || key !== cKey) {
      cG = G; cKey = key; cB = {}; cR = new Set();
      for (const id of G.blessings) cB[id] = (cB[id] || 0) + 1;
      for (const id of G.relics) cR.add(id);
      for (const id of G.relics) for (const k in FUSED_OF) if (FUSED_OF[k] === id) cR.add(k);
    }
  }
  const nb = id => { cache(); return cB[id] || 0; };         // áldás darabszáma
  const own = id => { cache(); return cR.has(id); };         // ereklye (vagy az, amibe beleolvadt)
  const isUpg = o => o && o.tag === 'upg';

  // ---------- látványelemek ----------
  function bolt(x1, y1, x2, y2, col = PAL.storm, w = 3) {
    const pts = [], n = 7, a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a), ny = Math.cos(a);
    for (let i = 0; i <= n; i++) { const k = i / n, j = (i && i < n) ? rand(-11, 11) : 0; pts.push([x1 + (x2 - x1) * k + nx * j, y1 + (y2 - y1) * k + ny * j]); }
    let t = 0;
    addFx({ upd(dt) { t += dt; return t < 0.22; },
      drw() { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - t / 0.22; ctx.lineJoin = 'round';
        for (const [c, lw] of [[col, w], ['#ffffff', w * 0.4]]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
        ctx.restore(); },
      glw() { glowDot(x2, y2, 22, col, 0.35 * (1 - t / 0.22)); } });
  }
  function pillar(x, y, r, col, delay, onHit) {
    let t = 0, done = false; const dur = delay + 0.35;
    addFx({ upd(dt) { t += dt; if (!done && t >= delay) { done = true; onHit(); vfx.ring(x, y, 6, r * 1.4, col, 0.35, 5); part(x, y, col, 18, 240, 0.5, 3); } return t < dur; },
      drw() { ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (t < delay) { ctx.globalAlpha = 0.5; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * (t / delay), 0, TAU); ctx.stroke(); }
        else { const k = (t - delay) / 0.35, w = r * 0.7 * (1 - k * 0.6); const g = ctx.createLinearGradient(0, y - 320, 0, y); g.addColorStop(0, hexA(col, 0)); g.addColorStop(1, hexA(col, 0.85 * (1 - k)));
          ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - 320, w, 320); ctx.fillStyle = hexA('#ffffff', 0.8 * (1 - k)); ctx.fillRect(x - w / 6, y - 320, w / 3, 320); }
        ctx.restore(); },
      glw() { if (t >= delay) glowDot(x, y, r * 1.2, col, 0.4 * (1 - (t - delay) / 0.35)); } });
  }
  function firePatch(x, y, r, life, dmg, col = PAL.fire) {
    let t = 0, tick = 0; const seed = rand(0, 9);
    addFx({ under: true, upd(dt) { t += dt; tick -= dt; if (tick <= 0) { tick = 0.33; uCircle(x, y, r, dmg, { burn: 1.5, silentNum: true }); }
        if (Math.random() < 0.18) part(x + rand(-r, r) * 0.6, y + rand(-r, r) * 0.4, PAL.ember, 1, 50, 0.5, 3); return t < life; },
      drw() { const al = Math.min(1, (life - t) * 2); ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) { const fl = Math.sin(gt * 13 + seed + i * 2) * 3; ctx.fillStyle = hexA(i ? PAL.ember : col, 0.22 * al); ctx.beginPath(); ctx.ellipse(x + (i - 1) * r * 0.35, y, r * 0.55 + fl, r * 0.38 + fl * 0.5, 0, 0, TAU); ctx.fill(); }
        ctx.restore(); },
      glw() { glowDot(x, y, r * 1.2, col, 0.18 * Math.min(1, life - t)); } });
  }
  function spikes(x, y, r, col) {
    let t = 0;
    addFx({ upd(dt) { t += dt; return t < 0.3; },
      drw() { const k = t / 0.3; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA(col, 1 - k); ctx.lineWidth = 3;
        for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + 0.2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 20, y + Math.sin(a) * 20); ctx.lineTo(x + Math.cos(a) * (20 + r * k), y + Math.sin(a) * (20 + r * k)); ctx.stroke(); }
        ctx.restore(); } });
  }
  function iconBurst(x, y, ch, col, size = 28) {
    let t = 0;
    addFx({ upd(dt) { t += dt; return t < 0.9; },
      drw() { ctx.save(); ctx.globalAlpha = 1 - t / 0.9; ctx.fillStyle = col; ctx.font = `${size}px ${SANS}`; ctx.textAlign = 'center'; ctx.fillText(ch, x, y - 30 - t * 40); ctx.restore(); },
      glw() { glowDot(x, y - 30 - t * 40, 20, col, 0.3 * (1 - t / 0.9)); } });
  }
  function nearestTo(x, y, maxD, skip) {
    let best = null, bd = maxD;
    for (const e of G.enemies) { if (!canHit(e) || (skip && skip.has(e))) continue; const d = Math.hypot(e.x - x, e.y - y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function healP(n, txt, col = PAL.life) {
    const p = G.p; p.hp = Math.min(p.maxHp, p.hp + n);
    floatText(p.x, p.y - 34, `+${n}${txt ? ' ' + txt : ''}`, col, 1.1, 14); part(p.x, p.y, col, 12, 140, 0.6, 3);
  }
  function addShield(n, cap) { const p = G.p; p.shield = Math.min(p.shield + n, Math.max(p.shieldMax, 0) + cap); }
  function homingBolt(a, dmg, col) {
    return pBullet(G.p.x, G.p.y, a, 430, { r: 5, dmg, life: 1.6, pierce: 0, col, ho: UT,
      upd(b, dt) { const e = nearestTo(b.x, b.y, 400); if (e) { const cur = Math.atan2(b.vy, b.vx), want = Math.atan2(e.y - b.y, e.x - b.x);
          const df = ((want - cur + Math.PI) % TAU + TAU) % TAU - Math.PI, na = cur + clamp(df, -7 * dt, 7 * dt), s = Math.hypot(b.vx, b.vy); b.vx = Math.cos(na) * s; b.vy = Math.sin(na) * s; }
        if (Math.random() < 0.5) G.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, max: 0.25, col, size: 3 }); } });
  }
  function featherShot(a, dmg) {
    return pBullet(G.p.x, G.p.y, a, 470, { r: 5, dmg, life: 0.55, pierce: 1, col: PAL.white, ho: UT,
      drw(b) { ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillStyle = '#fff8e8'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 3, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,120,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke(); } });
  }
  function spear(a, dmg) {
    return pBullet(G.p.x, G.p.y, a, 520, { r: 6, dmg, life: 0.9, pierce: 2, col: PAL.gold, ho: UT,
      drw(b) { ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.fill(); } });
  }

  // ======================================================================
  //  ÁLDÁSOK
  // ======================================================================
  const OLD_RAR = { fire: 'rare', haste: 'common', tri: 'epic', pierce: 'common', wings: 'common', aegis: 'rare', eye: 'rare', crit: 'rare', ray: 'common',
    weight: 'rare', gloria: 'epic', storm: 'rare', guard: 'rare', orb: 'epic', burn: 'rare', patience: 'common', faith: 'epic', reaper: 'rare', water: 'common', redeem: 'common' };
  for (const b of BL) if (!b.rar) b.rar = OLD_RAR[b.id] || 'common';
  const none = () => {};
  BL.push(
    // --- tiszta erősítések ---
    { id: 'zeal', n: 'Buzgóság', d: '+10% sebzés és +8% támadási sebesség', i: '✹', rar: 'common', max: 3, a: p => { p.dmg *= 1.1; p.fireDelay *= 0.926; } },
    { id: 'vigor', n: 'Erős Szív', d: '+15 max életerő és 15 gyógyulás', i: '❤', rar: 'common', max: 4, a: p => { p.maxHp += 15; p.hp = Math.min(p.maxHp, p.hp + 15); } },
    { id: 'swift', n: 'Könnyű Lélek', d: '+6% sebesség, −15% kitérési idő', i: '➳', rar: 'common', max: 3, a: p => { p.spd *= 1.06; p.dashCd *= 0.85; } },
    { id: 'precision', n: 'Éles Szem', d: '+8% kritikus esély', i: '⌖', rar: 'common', max: 3, a: p => p.crit += 0.08 },
    { id: 'gracewell', n: 'Kegyelem Kútja', d: 'A Kegyelem 35%-kal gyorsabban telik', i: '❈', rar: 'common', max: 3, a: p => p.graceGain *= 1.35 },
    { id: 'harvest', n: 'Aratás', d: '+35% lélek a démonokból', i: '✾', rar: 'common', max: 3, a: p => p.soulMul += 0.35 },
    { id: 'longarm', n: 'Messzi Fény', d: '+20% hatótáv és lövedéksebesség', i: '➚', rar: 'common', max: 2, a: p => { p.range *= 1.2; p.shotSpd *= 1.2; } },
    { id: 'stoneheart', n: 'Kőszív', d: '+40 max életerő, de −8% sebesség', i: '◆', rar: 'rare', max: 2, a: p => { p.maxHp += 40; p.hp += 40; p.spd *= 0.92; } },
    { id: 'glass', n: 'Üvegszárny', d: '+50% sebzés, de −30 max életerő', i: '◇', rar: 'epic', max: 1, req: () => G.p.maxHp > 60,
      a: p => { p.dmg *= 1.5; p.maxHp -= 30; p.hp = Math.min(p.hp, p.maxHp); } },
    { id: 'seraph', n: 'Szeráf Szárnyai', d: '+1 lövedék, +20% sebzés és +10% sebesség', i: '❖', rar: 'legend', max: 1, a: p => { p.shots++; p.dmg *= 1.2; p.spd *= 1.1; } },
    { id: 'ascension', n: 'Mennybemenetel', d: '+50 max életerő, +1 pajzs és teljes gyógyulás', i: '☩', rar: 'legend', max: 1,
      a: p => { p.maxHp += 50; p.hp = p.maxHp; p.shieldMax++; p.shield = p.shieldMax; } },
    // --- mechanikák ---
    { id: 'wrath', n: 'Szent Harag', d: '40% életerő alatt +50% sebzés', i: '♰', rar: 'rare', max: 1, a: none },
    { id: 'chain', n: 'Villámlánc', d: 'Az ölés villámot ugraszt 2 közeli démonra (+1 szintenként)', i: 'ϟ', rar: 'rare', max: 3, a: none },
    { id: 'firetrail', n: 'Lángnyom', d: 'A kitérés szent tüzet hagy maga után', i: '♆', rar: 'rare', max: 2, a: none },
    { id: 'smite', n: 'Égi Csapás', d: 'Minden 10. találatra fényoszlop sújt le (4× sebzés)', i: '↯', rar: 'epic', max: 2, a: none },
    { id: 'fullness', n: 'Teljesség', d: 'Teljes életerőn 6 mp-enként egy extra pajzs', i: '⛉', rar: 'rare', max: 1, a: none },
    { id: 'magnet', n: 'Lélekmágnes', d: 'A terem összes lelke hozzád repül', i: '⊛', rar: 'common', max: 1, a: none },
    { id: 'thorns', n: 'Töviskorona', d: 'Ha megsebeznek, tövisek sújtanak a közeli démonokra', i: '✵', rar: 'rare', max: 2, a: none },
    { id: 'execute', n: 'Végítélet', d: '15% életerő alatt a démonok azonnal elporladnak (főellenség nem)', i: '⚖', rar: 'epic', max: 1, a: none },
    { id: 'novashield', n: 'Glória Burka', d: 'A Szent Nova 2 pajzsot és rövid sérthetetlenséget ad', i: '۞', rar: 'rare', max: 1, a: none },
    { id: 'soulburst', n: 'Lélekrobbanás', d: 'A legyőzött démonok szétrobbannak, sebezve a szomszédaikat', i: '✸', rar: 'rare', max: 2, a: none },
    { id: 'frost', n: 'Jeges Imádság', d: 'A találatok 20% eséllyel lelassítják a démont', i: '❄', rar: 'common', max: 2, a: none },
    { id: 'trumpet', n: 'Riadó Kürt', d: 'Harcba lépéskor lökéshullám: minden démon megbénul', i: '♫', rar: 'epic', max: 1, a: none },
    { id: 'momentum', n: 'Szárnyalás', d: 'Kitérés után 1,5 mp-ig +50% sebzés', i: '⇶', rar: 'rare', max: 1, a: none },
    { id: 'thanks', n: 'Hálaadás', d: 'Terem tisztításakor 8 életerőt gyógyulsz', i: '✿', rar: 'common', max: 3, a: none },
    { id: 'tithe', n: 'Tized', d: 'Terem tisztításakor 3 lélek hull az égből', i: '⛁', rar: 'common', max: 3, a: none },
    { id: 'dragon', n: 'Sárkányölő', d: '+35% sebzés a főellenségek ellen', i: '⚔', rar: 'rare', max: 2, a: none },
    { id: 'firststrike', n: 'Első Ítélet', d: 'Az első találat minden démonon kétszeres', i: '➊', rar: 'rare', max: 1, a: none },
    { id: 'mirror', n: 'Tükörpajzs', d: 'A kitérés megsemmisíti a közeli démoni lövedékeket', i: '◐', rar: 'epic', max: 1, a: none },
    { id: 'echo', n: 'Visszhang', d: 'A találatok 20% eséllyel egy pillanat múlva megismétlődnek', i: '≋', rar: 'epic', max: 2, a: none },
    { id: 'pentecost', n: 'Pünkösdi Láng', d: 'Az égő démonok +30% sebzést kapnak; haláluk továbbadja a lángot', i: '☄', rar: 'epic', max: 1, a: none },
    { id: 'halo', n: 'Glória-aura', d: 'Fénykör övez: a közeli démonok folyamatosan égnek', i: '◯', rar: 'epic', max: 2, a: none },
    { id: 'laststand', n: 'Utolsó Ima', d: 'Gyűrűnként egyszer túléled a halálos sebet', i: '✝', rar: 'legend', max: 1, a: none },
    { id: 'trinity', n: 'Szentháromság', d: 'Minden 3. ölés 3 követő fénylövedéket indít', i: '⁂', rar: 'legend', max: 1, a: none },
    { id: 'legion', n: 'Mennyei Légió', d: '8 mp-enként 12 fénylándzsa tör ki belőled', i: '✺', rar: 'legend', max: 1, a: none },
    { id: 'seals', n: 'Hét Pecsét', d: 'Minden 7. ölés feltör egy pecsétet: villám sújt minden démonra', i: '❼', rar: 'legend', max: 1, a: none },
    // --- fegyverhez kötött ---
    { id: 'w_blade', w: 'blade', n: 'Pengemester', d: '+25% sebzés az Égi Pengével', i: '†', rar: 'rare', max: 2, a: none },
    { id: 'w_scythe', w: 'scythe', n: 'Aratók Aratója', d: 'Kaszával ölve +1 lélek és 2 életerő', i: '☾', rar: 'rare', max: 1, a: none },
    { id: 'w_hammer', w: 'hammer', n: 'Földindulás', d: 'A pöröly találatai 25% eséllyel kábító rengést keltenek', i: '⚒', rar: 'rare', max: 1, a: none },
    { id: 'w_bow', w: 'bow', n: 'Fényzápor', d: 'Íjjal minden 6. találat követő fénynyilat indít', i: '➶', rar: 'rare', max: 1, a: none },
    { id: 'w_horn', w: 'horn', n: 'Harsonaszó', d: 'A kürt találatai 1,5 mp-re lelassítanak', i: '♪', rar: 'rare', max: 1, a: none },
    { id: 'w_tome', w: 'tome', n: 'Tiltott Lapok', d: 'A könyv találatai 20% eséllyel lángra lobbantanak', i: '❡', rar: 'rare', max: 1, a: none },
  );

  // ======================================================================
  //  EREKLYÉK
  // ======================================================================
  Object.assign(RELICS, {
    judas: { n: 'Júdás ezüstje', d: '+75% lélek, de 25%-kal több sebzést kapsz. Egyesül: Kharón obolusa', i: '¤', col: '#d8dcec', rar: 'relic', wt: 3, apply: p => p.soulMul += 0.75 },
    lazarus: { n: 'Lázár csontja', d: 'Halálkor egyszer feltámadsz 50% életerővel. Egyesül: Mária könnye', i: '⚚', col: '#e8e0c8', rar: 'relic', wt: 2 },
    samson: { n: 'Sámson hajtincse', d: '80% életerő felett +35% sebzés. Egyesül: Szamár-állkapocs', i: '§', col: '#ffcf4a', rar: 'relic', wt: 3 },
    noah: { n: 'Noé galambja', d: 'Fehér galamb kísér, és lecsap a démonokra. Egyesül: Frigyláda', i: '❦', col: '#ffffff', rar: 'relic', wt: 3 },
    ark: { n: 'Frigyláda', d: 'A Nova után 5 mp-ig szent kör nyeli el a lövedékeket. Egyesül: Noé galambja', i: '⌂', col: '#ffd75e', rar: 'relic', wt: 2 },
    moses: { n: 'Mózes kőtáblái', d: 'Terem tisztításakor +1 pajzs. Egyesül: Mannás korsó', i: '⊓', col: '#c9c2b0', rar: 'relic', wt: 3 },
    manna: { n: 'Mannás korsó', d: 'Terem tisztításakor manna hull: 6 életerő, 2 lélek. Egyesül: Mózes kőtáblái', i: '⚱', col: '#fffbe0', rar: 'relic', wt: 3 },
    david: { n: 'Dávid parittyája', d: 'Minden 5. találat 1 mp-re elkábít. Egyesül: Góliát sisakja', i: '◍', col: '#bfa27a', rar: 'relic', wt: 3 },
    goliath: { n: 'Góliát sisakja', d: '+60 max életerő, de −10% sebesség. Egyesül: Dávid parittyája', i: '⛑', col: '#9aa0a8', rar: 'relic', wt: 3,
      apply: p => { p.maxHp += 60; p.hp += 60; p.spd *= 0.9; } },
    jonah: { n: 'Jónás hala', d: '30% életerő alatt a hal elnyel: 2 mp védelem, +15 életerő. Termenként egyszer.', i: '◒', col: '#5fa8d8', rar: 'relic', wt: 2 },
    grail: { n: 'Szent Grál', d: '+25 max életerő, regeneráció, és a lelkek gyógyítanak', i: '♅', col: '#ffd75e', rar: 'relic', wt: 1,
      apply: p => { p.maxHp += 25; p.hp += 25; p.regen++; p.soulHeal++; } },
    longinus: { n: 'Longinus lándzsa', d: '+1 átszúrás; +25% sebzés a főellenség ellen', i: '↟', col: '#ff6a6a', rar: 'relic', wt: 2, apply: p => p.pierce++ },
    cerberus: { n: 'Kerberosz foga', d: 'Ugyanazon démon 3. gyors találata: háromfejű harapás. Egyesül: Minósz farka', i: 'Ψ', col: '#ff5a3a', rar: 'relic', wt: 3 },
    minos: { n: 'Minósz farka', d: 'Minden 8. ölés után a farok 3 démonra csap le. Egyesül: Kerberosz foga', i: '∫', col: '#b04fff', rar: 'relic', wt: 3 },
    cherub: { n: 'Kerub tolla', d: '+12% sebesség, gyorsabb kitérés, ami sebző tollakat szór. Egyesül: Illés szekere', i: '✒', col: '#fff8e8', rar: 'relic', wt: 3,
      apply: p => { p.spd *= 1.12; p.dashCd *= 0.8; } },
    elijah: { n: 'Illés tüzes szekere', d: 'A kitérés lángcsíkot húz maga után. Egyesül: Kerub tolla', i: '☸', col: '#ff7a2a', rar: 'relic', wt: 3 },
    mary: { n: 'Mária könnye', d: 'Sérüléskor könny hull: 2 mp múlva 10 életerő. Egyesül: Lázár csontja', i: '♁', col: '#8fc8ff', rar: 'relic', wt: 3 },
    peter: { n: 'Péter kulcsa', d: 'A bolt 30%-kal olcsóbb; az Égi Oltár 4 ajándékot kínál', i: '⚷', col: '#ffd75e', rar: 'relic', wt: 2 },
    veronica: { n: 'Veronika kendője', d: 'Termenként az első sebzés fele akkora, és visszavág', i: '▣', col: '#ff9ab8', rar: 'relic', wt: 3 },
    abel: { n: 'Ábel báránya', d: 'Minden 15. ölés után a bárány 20 életerőt ajándékoz', i: '☁', col: '#f4f0e0', rar: 'relic', wt: 3 },
    cain: { n: 'Káin bélyege', d: '+35% sebzés, de minden új harcba 6 életerőt fizetsz', i: '⊗', col: '#ff3348', rar: 'relic', wt: 2, apply: p => p.dmg *= 1.35 },
    babel: { n: 'Bábel téglája', d: '+1 lövedék, de szélesebb szórás és −5% sebzés', i: '▤', col: '#d8a860', rar: 'relic', wt: 2, apply: p => { p.shots++; p.spreadA *= 1.35; p.dmg *= 0.95; } },
    solomon: { n: 'Salamon gyűrűje', d: '+10% kritikus esély; a lövedékek enyhén követnek', i: '⍟', col: '#c08bff', rar: 'relic', wt: 2, apply: p => { p.crit += 0.1; p.homing++; } },
    virgil: { n: 'Vergilius lámpása', d: 'Harcba lépéskor a démonok 3 mp-ig lassan mozognak', i: '☼', col: '#ffe9a8', rar: 'relic', wt: 3 },
    charon: { n: 'Kharón obolusa', d: 'Halálkor lelkekért újjáélsz (25, aztán drágul). Egyesül: Júdás ezüstje', i: '⊙', col: '#ffc23a', rar: 'relic', wt: 2 },
    gabriel: { n: 'Gábriel harsonája', d: 'A Szent Nova visszhangzik: fél mp múlva még egy hullám', i: '♬', col: '#fff1c4', rar: 'relic', wt: 2 },
    calf: { n: 'Aranyborjú', d: 'Minden nálad lévő 50 lélek +6% sebzés (max +60%)', i: '✪', col: '#ffd700', rar: 'relic', wt: 2 },
    lot: { n: 'Lót sóoszlopa', d: 'A démonok 20% eséllyel sóoszloppá dermednek, ami lövedéket fog', i: '▮', col: '#f0f0f0', rar: 'relic', wt: 2 },
    lucifeather: { n: 'Bukott angyal tolla', d: '+40% sebzés, de a Kegyelem 40%-kal lassabban telik', i: '✑', col: '#b04fff', rar: 'relic', wt: 2,
      apply: p => { p.dmg *= 1.4; p.graceGain *= 0.6; } },
    jawbone: { n: 'Szamár-állkapocs', d: 'Ölésre 20% esély csontrengésre, ami lelöki a démonokat. Egyesül: Sámson hajtincse', i: '⊐', col: '#e8e0c8', rar: 'relic', wt: 3 },
    beatrice: { n: 'Beatrice rózsája', d: 'Regeneráció és +20% Kegyelem; rózsaszirmok kísérnek', i: '❀', col: '#ff7ac0', rar: 'relic', wt: 3,
      apply: p => { p.regen++; p.graceGain *= 1.2; } },
  });
  // ---------- egyesülések ----------
  const FUSIONS = [
    ['david', 'goliath', 'giantslayer'], ['lazarus', 'mary', 'dawn'], ['noah', 'ark', 'covenant'], ['moses', 'manna', 'exodus'],
    ['elijah', 'cherub', 'chariot'], ['judas', 'charon', 'bloodfield'], ['cerberus', 'minos', 'gatekeeper'], ['samson', 'jawbone', 'nazirite'],
  ];
  Object.assign(RELICS, {
    giantslayer: { n: 'Óriásölő Kő', s: 'gyakoribb kábítás, +50% a nagyok ellen', d: 'Minden 4. találat kábít; +50% sebzés nagy démonok és főellenség ellen', i: '◉', col: '#ffcf4a', rar: 'legend', fused: true },
    dawn: { n: 'Húsvéti Hajnal', s: 'gyűrűnként feltámadsz, teljes erővel', d: 'Gyűrűnként egyszer teljes életerővel támadsz fel, Novával', i: '☀', col: '#fff1c4', rar: 'legend', fused: true },
    covenant: { n: 'Szivárványfrigy', s: 'két galamb, hosszabb szent kör', d: 'Két galamb kísér; a Nova után 8 mp-ig szivárványkör véd', i: '⌒', col: '#9fe8ff', rar: 'legend', fused: true },
    exodus: { n: 'Kivonulás', s: 'pajzs, 12 életerő és 4 lélek termenként', d: 'Terem tisztításakor +1 pajzs, 12 életerő és 4 lélek', i: '⛰', col: '#e8d8a8', rar: 'legend', fused: true },
    chariot: { n: 'Mennyei Szekér', s: 'tűz és tollzápor minden kitéréskor', d: 'A kitérés erős lángot és tollzáport hagy; +15% sebesség', i: '☸', col: '#ffb04a', rar: 'legend', fused: true,
      apply: p => { p.spd *= 1.15; p.dashCd *= 0.85; } },
    bloodfield: { n: 'Vérmező', s: '×2 lélek, újjáélés mindig 20 lélekért', d: 'További +50% lélek; halálkor mindig újjáélsz 20 lélekért', i: '⚉', col: '#ff5a6a', rar: 'legend', fused: true, apply: p => p.soulMul += 0.5 },
    gatekeeper: { n: 'A Pokol Kapuőre', s: 'gyorsabb harapás és farokcsapás', d: 'Már a 2. gyors találat harap; minden 5. ölés farokcsapás', i: 'Ϡ', col: '#ff3a8a', rar: 'legend', fused: true },
    nazirite: { n: 'Nazirita Ereje', s: 'mindig +35% sebzés, gyakori csontrengés', d: 'Mindig +35% sebzés; ölésre 35% esély csontrengésre', i: '§', col: '#ffb000', rar: 'legend', fused: true },
  });
  for (const [a, b, f] of FUSIONS) { FUSED_OF[a] = f; FUSED_OF[b] = f; }

  function fuse(a, b, f) {
    const p = G.p, r = RELICS[f];
    G.relics = G.relics.filter(x => x !== a && x !== b); G.relics.push(f); S().ver++;
    if (r.apply) r.apply(p);
    const ia = RELICS[a].i, ib = RELICS[b].i, ca = RELICS[a].col, cb = RELICS[b].col;
    let t = 0; const dur = 0.9;
    addFx({ upd(dt) { t += dt; if (t >= dur) {
          vfx.flash(0.55); vfx.shake(12); vfx.ring(p.x, p.y, 10, 220, r.col, 0.7, 10); vfx.ring(p.x, p.y, 10, 140, '#ffffff', 0.5, 4);
          part(p.x, p.y, r.col, 70, 360, 1.1, 4); vfx.feathers(p.x, p.y, 14); vfx.glyph(p.x, p.y, r.col, 70, 1.4, 2);
          floatText(p.x, p.y - 70, 'EGYESÜLÉS!', '#ff5ad1', 2.2, 26); floatText(p.x, p.y - 44, r.n, r.col, 2.2, 18); sfx('unlock'); return false; }
        return true; },
      drw() { const k = t / dur, rr = 90 * (1 - k), an = k * 9; ctx.save(); ctx.font = `22px ${SANS}`; ctx.textAlign = 'center';
        ctx.fillStyle = ca; ctx.fillText(ia, p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr + 8);
        ctx.fillStyle = cb; ctx.fillText(ib, p.x - Math.cos(an) * rr, p.y - Math.sin(an) * rr + 8); ctx.restore(); },
      glw() { const k = t / dur, rr = 90 * (1 - k), an = k * 9; glowDot(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr, 18, ca, 0.5); glowDot(p.x - Math.cos(an) * rr, p.y - Math.sin(an) * rr, 18, cb, 0.5); } });
    emit('relic', f);
  }
  on('relic', id => {
    for (const [a, b, f] of FUSIONS) if ((id === a || id === b) && G.relics.includes(a) && G.relics.includes(b)) { fuse(a, b, f); break; }
    if (id === 'peter' && G.room && G.room.type === 'shop') discountShop(G.room);
  });

  // ======================================================================
  //  HOOKOK
  // ======================================================================
  on('runStart', () => { cG = null; });

  // --- kimenő sebzés ---
  on('dmgOut', (d, e, o) => {
    cache(); const p = G.p; let m = 1;
    if (cB.wrath && p.hp < p.maxHp * 0.4) m *= 1.5;
    if (cB.momentum && S().momT > 0) m *= 1.5;
    if (e.boss) { if (cB.dragon) m *= 1 + 0.35 * cB.dragon; if (cR.has('longinus')) { m *= 1.25; if (Math.random() < 0.25) vfx.spark(e.x, e.y, rand(0, TAU), 0.6, '#ff6a6a', 4, 200, 0.3, 2); } }
    if (cB.firststrike && !e._fs) { e._fs = 1; m *= 2; vfx.spark(e.x, e.y, -Math.PI / 2, 1.2, PAL.gold, 6, 180, 0.35, 2.5); }
    if (cB.pentecost && e.burn > 0) m *= 1.3;
    if (cB.w_blade && G.weapon === 'blade' && !isUpg(o)) m *= 1 + 0.25 * cB.w_blade;
    if (cR.has('samson') && (cR.has('nazirite') || p.hp >= p.maxHp * 0.8)) m *= 1.35;
    if (cR.has('calf') && G.souls >= 50) { m *= 1 + Math.min(0.6, Math.floor(G.souls / 50) * 0.06); if (Math.random() < 0.15) part(e.x, e.y, '#ffd700', 3, 120, 0.4, 2); }
    if (cR.has('giantslayer') && (e.boss || e.r >= 17)) m *= 1.5;
    return d * m;
  });

  // --- bejövő sebzés ---
  on('dmgIn', (d, src) => {
    cache(); const p = G.p;
    if (cR.has('judas')) { d *= 1.25; part(p.x, p.y, '#d8dcec', 6, 160, 0.5, 2.5); }
    if (cR.has('veronica') && RS().vero !== G.room && d > 0 && !(p.inv > 0)) {
      RS().vero = G.room; d *= 0.5;
      const t = (src && typeof src.hp === 'number' && canHit(src)) ? src : nearestTo(p.x, p.y, 500);
      floatText(p.x, p.y - 50, 'Veronika kendője', '#ff9ab8', 1.1, 14); vfx.ring(p.x, p.y, 10, 60, '#ff9ab8', 0.4, 5);
      if (t) { bolt(p.x, p.y, t.x, t.y, '#ff9ab8', 3); uHit(t, p.dmg * 3, { stun: 0.5 }); }
    }
    return d;
  });

  // --- feltámadás ---
  on('revive', v => {
    if (v) return v;
    cache(); const p = G.p, s = S();
    if (cR.has('dawn') && s.dawnRing !== G.ring + ':' + G.defeated.length) {
      s.dawnRing = G.ring + ':' + G.defeated.length; p.hp = p.maxHp;
      vfx.flash(0.8); vfx.shake(16); vfx.ring(p.x, p.y, 10, 340, '#fff1c4', 0.8, 12); vfx.feathers(p.x, p.y, 20); part(p.x, p.y, '#fff6c8', 90, 480, 1, 4);
      G.bullets = G.bullets.filter(b => b.f); uCircle(p.x, p.y, 230, p.dmg * 4 * p.novaMul);
      floatText(p.x, p.y - 60, 'FELTÁMADÁS!', '#fff1c4', 2.2, 26); sfx('nova'); return true;
    }
    if (cB.laststand && s.lastRing !== G.ring + ':' + G.defeated.length) {
      s.lastRing = G.ring + ':' + G.defeated.length; p.hp = 1;
      vfx.flash(0.5); vfx.ring(p.x, p.y, 10, 160, PAL.gold, 0.6, 8); vfx.glyph(p.x, p.y, PAL.gold, 50, 1.2, 3);
      floatText(p.x, p.y - 56, 'UTOLSÓ IMA', PAL.gold, 2, 22); sfx('holy'); return true;
    }
    if (G.relics.includes('lazarus')) {
      G.relics = G.relics.filter(x => x !== 'lazarus'); s.ver++; s.lazUsed = 1; p.hp = Math.round(p.maxHp * 0.5);
      vfx.flash(0.6); vfx.shake(12); vfx.ring(p.x, p.y, 10, 220, PAL.bone, 0.7, 10); part(p.x, p.y, PAL.bone, 60, 300, 1, 4); vfx.glyph(p.x, p.y, PAL.bone, 60, 1.4, 2);
      floatText(p.x, p.y - 60, 'LÁZÁR, JÖJJ ELŐ!', PAL.bone, 2.2, 22); floatText(p.x, p.y - 36, 'a csont porrá omlott', '#aaa', 2, 13); sfx('holy'); return true;
    }
    if (cR.has('charon')) {
      const blood = cR.has('bloodfield'), cost = blood ? 20 : 25 + s.charonN * 15;
      if (G.souls >= cost) {
        G.souls -= cost; s.charonN++; p.hp = Math.round(p.maxHp * 0.4);
        vfx.flash(0.5); vfx.ring(p.x, p.y, 10, 180, '#ffc23a', 0.6, 8); part(p.x, p.y, '#ffd700', 50, 280, 0.9, 3); sfx('coin');
        floatText(p.x, p.y - 56, `Kharón visszaküld (−${cost} ◈)`, '#ffc23a', 2, 18); return true;
      }
    }
    return false;
  });

  // --- találat ---
  on('hit', (e, d, o) => {
    if (busy || isUpg(o)) return;
    cache(); const p = G.p, s = S(); s.hits++;
    if (cB.smite && s.hits % (cB.smite > 1 ? 7 : 10) === 0) { const x = e.x, y = e.y; pillar(x, y, 60, PAL.holy, 0.15, () => { uCircle(x, y, 60, p.dmg * 4, { stun: 0.4 }); vfx.shake(5); }); sfx('holy'); }
    if (e.dead || !canHit(e)) return;
    if (cB.frost && Math.random() < 0.2 * cB.frost) { e.slowT = Math.max(e.slowT || 0, 2); vfx.spark(e.x, e.y, rand(0, TAU), Math.PI, PAL.frost, 6, 120, 0.4, 2.5); }
    if (cB.echo && Math.random() < 0.2 * cB.echo) later(0.22, () => { if (canHit(e)) { vfx.ring(e.x, e.y, 4, 40, '#c8b8ff', 0.3, 3); uHit(e, d * 0.6); } });
    if (cB.execute && !e.boss && e.hp > 0 && e.hp < e.maxHp * 0.15) {
      floatText(e.x, e.y - e.r - 16, 'ÍTÉLET', '#ff5a5a', 0.8, 15); bolt(e.x, e.y - 90, e.x, e.y, '#ffdddd', 4); uHit(e, e.hp + 1, { crit: false, silentNum: true }); return;
    }
    if (cB.w_hammer && G.weapon === 'hammer' && Math.random() < 0.25) { vfx.ring(e.x, e.y, 6, 80, PAL.ember, 0.35, 6); vfx.shake(4); uCircle(e.x, e.y, 70, p.dmg * 0.8, { stun: 0.8, silentNum: true }); }
    if (cB.w_horn && G.weapon === 'horn') { e.slowT = Math.max(e.slowT || 0, 1.5); if (Math.random() < 0.3) vfx.spark(e.x, e.y, rand(0, TAU), Math.PI, PAL.storm, 3, 90, 0.3, 2); }
    if (cB.w_tome && G.weapon === 'tome' && Math.random() < 0.2) { e.burn = Math.max(e.burn || 0, 3); part(e.x, e.y, PAL.fire, 8, 140, 0.5, 3); }
    if (cB.w_bow && G.weapon === 'bow' && s.hits % 6 === 0) homingBolt(angTo(p, e), p.dmg * 1.5, '#fff1c4');
    if (cR.has('david') && s.hits % (cR.has('giantslayer') ? 4 : 5) === 0) {
      e.stun = Math.max(e.stun || 0, e.boss ? 0 : (cR.has('giantslayer') ? 1.5 : 1)); vfx.spark(e.x, e.y, rand(0, TAU), Math.PI, '#bfa27a', 8, 160, 0.4, 3);
      vfx.ring(e.x, e.y, 4, 34, '#bfa27a', 0.3, 4); floatText(e.x, e.y - e.r - 14, 'kábult', '#bfa27a', 0.6, 12);
    }
    if (cR.has('cerberus')) {
      if (!e._cbT || G.time - e._cbT > 2) { e._cbN = 0; } e._cbT = G.time; e._cbN = (e._cbN || 0) + 1;
      if (e._cbN >= (cR.has('gatekeeper') ? 2 : 3)) { e._cbN = 0; bite(e); }
    }
  });
  function bite(e) {
    const x = e.x, y = e.y; let t = 0;
    addFx({ upd(dt) { t += dt; return t < 0.3; },
      drw() { const k = t / 0.3; ctx.save(); ctx.strokeStyle = hexA('#ff5a3a', 1 - k); ctx.lineWidth = 3;
        for (let i = -1; i <= 1; i++) { const a = -Math.PI / 2 + i * 0.7, cx = x + Math.cos(a) * 18, cy = y + Math.sin(a) * 18; ctx.beginPath(); ctx.arc(cx, cy, 10 + k * 4, a + 0.6, a + Math.PI * 2 - 0.6); ctx.stroke(); }
        ctx.restore(); } });
    part(x, y, PAL.blood, 10, 200, 0.4, 3); uHit(e, G.p.dmg * 2, { kb: 120 });
  }

  // --- ölés ---
  on('kill', e => {
    cache(); const p = G.p, s = S(); s.kills++;
    if (cB.w_scythe && G.weapon === 'scythe') { dropPickup('soul', e.x, e.y); p.hp = Math.min(p.maxHp, p.hp + 2); part(e.x, e.y, PAL.soul, 8, 140, 0.5, 3); }
    if (cB.pentecost && e.burn > 0) { for (const q of enemiesNear(e.x, e.y, 90)) { q.burn = Math.max(q.burn || 0, 3); vfx.spark(q.x, q.y, -Math.PI / 2, 0.8, PAL.fire, 4, 120, 0.4, 3); } vfx.ring(e.x, e.y, 6, 90, PAL.fire, 0.35, 4); }
    if (cR.has('abel') && s.kills % 15 === 0) { healP(20, 'Ábel báránya', '#f4f0e0'); vfx.glyph(p.x, p.y, '#f4f0e0', 34, 1, 2); iconBurst(p.x, p.y, '☁', '#f4f0e0'); }
    if (cR.has('lot') && !e.boss && Math.random() < 0.2) saltPillar(e.x, e.y);
    if (busy) return;                     // az alábbiak sebeznek: láncreakció ellen
    if (cB.chain) {
      let from = e; const skip = new Set([e]);
      for (let i = 0; i < 1 + cB.chain; i++) { const t = nearestTo(from.x, from.y, 190, skip); if (!t) break; skip.add(t); bolt(from.x, from.y, t.x, t.y); uHit(t, p.dmg * 1.2, { silentNum: false }); from = t; }
      if (skip.size > 1) sfx('laser');
    }
    if (cB.soulburst) { vfx.ring(e.x, e.y, 6, 60, PAL.soul, 0.3, 5); part(e.x, e.y, PAL.soul, 10, 200, 0.4, 3); uCircle(e.x, e.y, 55, p.dmg * 1.2 * cB.soulburst); }
    if (cB.trinity && s.kills % 3 === 0) { const a = angTo(p, e); for (let i = -1; i <= 1; i++) homingBolt(a + i * 0.7, p.dmg * 1.4, PAL.gold); iconBurst(p.x, p.y, '⁂', PAL.gold, 22); }
    if (cB.seals && s.kills % 7 === 0) {
      const seal = (s.kills / 7) % 7 || 7; let n = 0;
      eachEnemy(q => { if (n++ < 12) { bolt(q.x + rand(-30, 30), q.y - 260, q.x, q.y, '#e8d8ff', 4); later(0.05, () => uHit(q, p.dmg * 2.5)); } });
      floatText(p.x, p.y - 56, `${seal}. PECSÉT FELTÖRVE`, '#e8d8ff', 1.6, 18); vfx.flash(0.25); vfx.shake(8); sfx('boom');
    }
    if (cR.has('minos') && s.kills % (cR.has('gatekeeper') ? 5 : 8) === 0) lash(e);
    if (cR.has('jawbone') && Math.random() < (cR.has('nazirite') ? 0.35 : 0.2)) {
      vfx.ring(e.x, e.y, 6, 90, PAL.bone, 0.4, 7); part(e.x, e.y, PAL.bone, 16, 260, 0.5, 3); vfx.shake(5);
      uCircle(e.x, e.y, 85, p.dmg * 1.5, { kb: 320 }); floatText(e.x, e.y - 24, 'csontrengés', PAL.bone, 0.7, 12);
    }
  });
  function lash(e) {
    const p = G.p, ts = [], skip = new Set();
    for (let i = 0; i < 3; i++) { const t = nearestTo(e.x, e.y, 260, skip); if (!t) break; skip.add(t); ts.push(t); }
    if (!ts.length) return;
    let t = 0; const pts = [{ x: p.x, y: p.y }, ...ts.map(q => ({ x: q.x, y: q.y }))];
    addFx({ upd(dt) { t += dt; return t < 0.35; },
      drw() { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = hexA('#b04fff', 1 - t / 0.35); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; ctx.quadraticCurveTo((a.x + b.x) / 2 + 40, (a.y + b.y) / 2 - 40, b.x, b.y); } ctx.stroke(); ctx.restore(); } });
    for (const q of ts) { uHit(q, p.dmg * 3, { kb: 200 }); part(q.x, q.y, '#b04fff', 10, 200, 0.4, 3); }
    floatText(p.x, p.y - 44, 'Minósz ítél', '#c08bff', 1, 14); sfx('slash');
  }
  function saltPillar(x, y) {
    if (G.fx.filter(f => f.salt).length >= 4) return;
    let t = 0;
    addFx({ salt: true, upd(dt) { t += dt; cutBulletsCircle(x, y - 10, 20, '#ffffff'); return t < 5; },
      drw() { const al = Math.min(1, (5 - t) * 2, t * 6); ctx.save(); ctx.globalAlpha = al; const g = ctx.createLinearGradient(x - 9, 0, x + 9, 0); g.addColorStop(0, '#c8c8d0'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#a8a8b4');
        ctx.fillStyle = g; ctx.fillRect(x - 9, y - 34, 18, 34); ctx.beginPath(); ctx.ellipse(x, y - 34, 9, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 12, 4, 0, 0, TAU); ctx.fill(); ctx.restore(); },
      glw() { glowDot(x, y - 16, 22, '#ffffff', 0.12); } });
    part(x, y - 16, '#ffffff', 14, 120, 0.5, 2.5); floatText(x, y - 44, 'só', '#ffffff', 0.7, 12);
  }

  // --- sérülés ---
  on('hurt', (d, src) => {
    cache(); const p = G.p, s = S();
    if (cB.thorns) { spikes(p.x, p.y, 100, '#9adf6a'); part(p.x, p.y, '#9adf6a', 12, 240, 0.4, 2.5); uCircle(p.x, p.y, 120, p.dmg * 3 * cB.thorns, { kb: 260 }); }
    if (cR.has('mary') && (cR.has('dawn') || Math.random() < 0.6)) tear();
    if (cR.has('jonah') && p.hp < p.maxHp * 0.3 && RS().jonah !== G.room) { RS().jonah = G.room; whale(); }
  });
  function tear() {
    const p = G.p; let t = 0;
    addFx({ upd(dt) { t += dt; if (t >= 2) { healP(10, 'Mária könnye', '#8fc8ff'); vfx.ring(p.x, p.y, 4, 50, '#8fc8ff', 0.4, 4); return false; } return true; },
      drw() { const y = p.y - 30 - 120 * (1 - t / 2); ctx.save(); ctx.fillStyle = '#bfe0ff'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(p.x, y - 9); ctx.quadraticCurveTo(p.x + 6, y, p.x, y + 5); ctx.quadraticCurveTo(p.x - 6, y, p.x, y - 9); ctx.fill(); ctx.restore(); },
      glw() { glowDot(p.x, p.y - 30 - 120 * (1 - t / 2), 12, '#8fc8ff', 0.4); } });
  }
  function whale() {
    const p = G.p; p.inv = Math.max(p.inv, 2); p.hp = Math.min(p.maxHp, p.hp + 15); let t = 0;
    floatText(p.x, p.y - 56, 'Jónás hala elnyelt!', '#5fa8d8', 1.6, 17); sfx('block');
    addFx({ upd(dt) { t += dt; if (Math.random() < 0.3) part(p.x + rand(-30, 30), p.y + rand(-10, 20), '#9fd8ff', 1, 40, 0.8, 3); return t < 2; },
      drw() { const al = Math.min(1, (2 - t) * 2, t * 5); ctx.save(); ctx.globalAlpha = 0.55 * al; ctx.fillStyle = '#1d4a6a'; ctx.strokeStyle = '#5fa8d8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, 44, 28, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p.x + 40, p.y); ctx.lineTo(p.x + 62, p.y - 16 + Math.sin(t * 8) * 4); ctx.lineTo(p.x + 62, p.y + 16 + Math.sin(t * 8) * 4); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x - 28, p.y - 8, 3, 0, TAU); ctx.fill(); ctx.restore(); } });
  }

  // --- kitérés ---
  on('dash', () => {
    cache(); const p = G.p;
    if (cB.momentum) { S().momT = 1.5; vfx.ring(p.x, p.y, 6, 40, '#ffffff', 0.25, 3); }
    if (cB.mirror) { const n = cutBulletsCircle(p.x, p.y, 120, '#dfe8ff'); vfx.ring(p.x, p.y, 10, 120, '#dfe8ff', 0.3, 5); if (n) floatText(p.x, p.y - 40, `${n} lövedék tükrözve`, '#dfe8ff', 0.8, 12); }
    const fire = (cB.firetrail || 0) + (cR.has('elijah') ? 1.5 : 0) + (cR.has('chariot') ? 1 : 0);
    if (fire) { let t = 0, acc = 1; const life = cR.has('elijah') ? 3 : 2.2;
      addFx({ upd(dt) { t += dt; acc += dt; if (acc > 0.035) { acc = 0; firePatch(p.x, p.y, 22, life, p.dmg * 0.3 * fire, cR.has('chariot') ? PAL.gold : PAL.fire); } return t < 0.2; } }); }
    if (cR.has('cherub')) { const n = cR.has('chariot') ? 10 : 6, a0 = p.dashA + Math.PI; for (let i = 0; i < n; i++) featherShot(a0 + (i - (n - 1) / 2) * (TAU / n) * 0.9, p.dmg * 0.6); vfx.feathers(p.x, p.y, 4); }
  });

  // --- Nova ---
  on('nova', () => {
    cache(); const p = G.p;
    if (cB.novashield) { addShield(2, 2); p.inv = Math.max(p.inv, 1.5); vfx.ring(p.x, p.y, 10, 70, PAL.soul, 0.5, 6); floatText(p.x, p.y - 50, '+2 pajzs', PAL.soul, 1.2, 15); }
    if (cR.has('ark')) arkZone(cR.has('covenant') ? 8 : 5, cR.has('covenant'));
    if (cR.has('gabriel')) later(0.5, () => { vfx.ring(p.x, p.y, 20, 320, '#fff1c4', 0.6, 10); vfx.shake(8); sfx('nova'); G.bullets = G.bullets.filter(b => b.f); uCircle(p.x, p.y, 230, p.dmg * 2 * p.novaMul); floatText(p.x, p.y - 56, 'Gábriel harsonája', '#fff1c4', 1.2, 15); });
  });
  function arkZone(dur, rainbow) {
    const p = G.p; let t = 0; const R = 90;
    addFx({ upd(dt) { t += dt; cutBulletsCircle(p.x, p.y, R, '#ffe9a8'); return t < dur; },
      drw() { const al = Math.min(1, (dur - t) * 2); ctx.save(); ctx.lineWidth = 3;
        if (rainbow) { const cs = ['#ff5a5a', '#ffb04a', '#ffe94a', '#7cff9a', '#6fb8ff', '#c08bff']; cs.forEach((c, i) => { ctx.strokeStyle = hexA(c, 0.55 * al); ctx.beginPath(); ctx.arc(p.x, p.y, R - i * 3, gt * 2 + i, gt * 2 + i + Math.PI * 1.6); ctx.stroke(); }); }
        else { ctx.strokeStyle = hexA('#ffd75e', 0.6 * al); ctx.setLineDash([10, 8]); ctx.lineDashOffset = -gt * 40; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke(); }
        ctx.restore(); },
      glw() { glowDot(p.x, p.y, R, '#ffe9a8', 0.08); } });
  }

  // --- termek ---
  function discountShop(room) {
    if (room._peter || !room.items) return; room._peter = 1;
    for (const it of room.items) if (!it.sold) it.price = Math.max(1, Math.ceil(it.price * 0.7));
    floatText(G.p.x, G.p.y - 50, 'Péter kulcsa: −30%', '#ffd75e', 1.6, 16); vfx.glyph(G.p.x, G.p.y, '#ffd75e', 40, 1, 2);
  }
  on('roomEnter', room => {
    cache(); const p = G.p;
    if (room.type === 'shop' && cR.has('peter')) discountShop(room);
    if (G.hub || room.cleared) return;
    if (cR.has('cain')) { p.hp = Math.max(1, p.hp - 6); floatText(p.x, p.y - 44, '−6 Káin bélyege', PAL.blood, 1.3, 14); part(p.x, p.y, PAL.blood, 14, 160, 0.6, 3); }
    if (cB.trumpet) later(1.0, () => { vfx.ring(p.x, p.y, 10, 700, PAL.holy, 0.8, 12); vfx.shake(10); sfx('roar'); floatText(p.x, p.y - 56, 'A falak leomlanak!', PAL.holy, 1.4, 16); uCircle(p.x, p.y, 1400, p.dmg * 1.5, { stun: 1.5 }); });
    if (cR.has('virgil')) later(0.8, () => { eachEnemy(e => { e.slowT = Math.max(e.slowT || 0, 3); }); vfx.ring(p.x, p.y, 10, 500, '#ffe9a8', 0.9, 6); vfx.glyph(p.x, p.y, '#ffe9a8', 46, 1.2, 1); floatText(p.x, p.y - 50, 'Vergilius lámpása', '#ffe9a8', 1.2, 14); });
  });
  on('roomClear', () => {
    cache(); const p = G.p;
    if (cB.thanks) healP(8 * cB.thanks, 'Hálaadás');
    if (cB.tithe) { for (let i = 0; i < 3 * cB.tithe; i++) dropPickup('soul', p.x + rand(-40, 40), p.y - 60); part(p.x, p.y - 60, PAL.soul, 12, 120, 0.6, 3); }
    if (cR.has('moses')) {
      const ex = cR.has('exodus'); addShield(1, ex ? 2 : 1); tablets(); floatText(p.x, p.y - 50, '+1 pajzs', '#c9c2b0', 1.2, 15);
      if (ex) { healP(12, 'Kivonulás', '#e8d8a8'); for (let i = 0; i < 4; i++) dropPickup('soul', p.x, p.y - 30); }
    }
    if (cR.has('manna') && !cR.has('exodus')) { healP(6, 'manna', '#fffbe0'); dropPickup('soul', p.x, p.y - 30); dropPickup('soul', p.x, p.y - 30);
      for (let i = 0; i < 16; i++) G.parts.push({ x: p.x + rand(-60, 60), y: p.y - rand(60, 140), vx: 0, vy: rand(40, 90), life: 1.2, max: 1.2, col: '#fffbe0', size: 2.5 }); }
  });
  function tablets() {
    const p = G.p; let t = 0;
    addFx({ upd(dt) { t += dt; return t < 1.2; },
      drw() { const al = Math.min(1, (1.2 - t) * 2), y = p.y - 50 - t * 20; ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = '#c9c2b0'; ctx.strokeStyle = '#6a6458'; ctx.lineWidth = 1;
        for (const dx of [-9, 9]) { ctx.beginPath(); ctx.moveTo(p.x + dx - 7, y + 12); ctx.lineTo(p.x + dx - 7, y - 6); ctx.arc(p.x + dx, y - 6, 7, Math.PI, 0); ctx.lineTo(p.x + dx + 7, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
          for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(p.x + dx - 4, y - 2 + k * 4); ctx.lineTo(p.x + dx + 4, y - 2 + k * 4); ctx.stroke(); } }
        ctx.restore(); },
      glw() { glowDot(p.x, p.y - 50 - t * 20, 24, '#ffe9a8', 0.25 * (1 - t / 1.2)); } });
  }

  // --- kísérők: galamb(ok), fényaura ---
  let compRoom = null, compG = null, doves = [], aura = null;
  function makeDove(k, n, rainbow) {
    const p = G.p, d = { x: p.x, y: p.y - 30, st: 0, cd: 0.6 + k * 0.4, tgt: null, dir: 1, t: rand(0, 3), col: rainbow ? ['#ffffff', '#ffd6f0'][k % 2] : '#ffffff' };
    d.fx = addFx({
      upd(dt) {
        if (!own('noah')) return false;
        d.t += dt; d.cd -= dt;
        const str = own('covenant') ? 1.3 : 1;
        if (d.st === 0) {
          const a = d.t * 1.8 + k * TAU / n, hx = p.x + Math.cos(a) * 34, hy = p.y - 26 + Math.sin(a) * 12;
          d.dir = hx > d.x ? 1 : -1; d.x += (hx - d.x) * Math.min(1, dt * 6); d.y += (hy - d.y) * Math.min(1, dt * 6);
          if (d.cd <= 0) { d.tgt = nearestTo(d.x, d.y, 320); if (d.tgt) d.st = 1; else d.cd = 0.3; }
        } else if (d.st === 1) {
          const e = d.tgt; if (!canHit(e)) { d.st = 2; d.cd = 0.4; return true; }
          const dx = e.x - d.x, dy = e.y - d.y, dl = Math.hypot(dx, dy) || 1, sp = 560 * str;
          d.dir = dx > 0 ? 1 : -1; d.x += dx / dl * sp * dt; d.y += dy / dl * sp * dt;
          if (dl < e.r + 8) { uHit(e, p.dmg * 0.9 * str); part(d.x, d.y, d.col, 8, 140, 0.35, 2.5); vfx.feathers(d.x, d.y, 1); d.st = 2; d.cd = 0.85 / str; }
        } else {
          const dx = p.x - d.x, dy = p.y - 26 - d.y, dl = Math.hypot(dx, dy) || 1;
          d.dir = dx > 0 ? 1 : -1; d.x += dx / dl * 420 * dt; d.y += dy / dl * 420 * dt; if (dl < 20) d.st = 0;
        }
        return true;
      },
      drw() {
        const fl = Math.sin(d.t * (d.st === 1 ? 26 : 16)); ctx.save(); ctx.translate(d.x, d.y); ctx.scale(d.dir, 1);
        ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(6, -2, 3, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-12, -3); ctx.lineTo(-12, 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.moveTo(8.5, -2.5); ctx.lineTo(12, -1.5); ctx.lineTo(8.5, -0.5); ctx.fill();
        ctx.fillStyle = '#eef0ff'; ctx.beginPath(); ctx.moveTo(-3, -1); ctx.lineTo(-7, -1 - 11 * fl); ctx.lineTo(3, -2); ctx.closePath(); ctx.fill();
        ctx.restore();
      },
      glw() { glowDot(d.x, d.y, 14, '#ffffff', 0.25); },
    });
    return d;
  }
  function companions() {
    const want = own('covenant') ? 2 : own('noah') ? 1 : 0;
    if (compRoom !== G.room || compG !== G || doves.length !== want || doves.some(d => d.fx.dead)) {
      for (const d of doves) d.fx.dead = true;
      compRoom = G.room; compG = G; doves = [];
      for (let k = 0; k < want; k++) doves.push(makeDove(k, want, want > 1));
      aura = null;
    }
    if (cB.halo && (!aura || aura.dead)) {
      const p = G.p; let tt = 0;
      aura = addFx({ under: true,
        upd(dt) { if (!nb('halo')) return false; tt += dt; if (tt > 0.5) { tt = 0; const R = 70 + 20 * nb('halo'); uCircle(p.x, p.y, R, p.dmg * 0.45 * nb('halo'), { silentNum: true }); } return true; },
        drw() { const R = 70 + 20 * nb('halo'); ctx.save(); ctx.strokeStyle = hexA(PAL.holy, 0.35 + Math.sin(gt * 5) * 0.1); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke();
          ctx.fillStyle = hexA(PAL.holy, 0.06); ctx.fill(); for (let i = 0; i < 6; i++) { const a = gt * 1.5 + i * TAU / 6; ctx.fillStyle = hexA(PAL.gold, 0.7); ctx.fillRect(p.x + Math.cos(a) * R - 2, p.y + Math.sin(a) * R - 2, 4, 4); } ctx.restore(); },
        glw() { glowDot(p.x, p.y, 70 + 20 * nb('halo'), PAL.holy, 0.06); } });
    }
  }

  // --- képkocka ---
  on('tick', dt => {
    cache(); const p = G.p, s = S();
    companions();
    if (s.momT > 0) { s.momT -= dt; if (Math.random() < 0.4) G.parts.push({ x: p.x + rand(-10, 10), y: p.y + rand(-14, 8), vx: 0, vy: -40, life: 0.3, max: 0.3, col: '#ffffff', size: 2.5 }); }
    if (cB.wrath && p.hp < p.maxHp * 0.4 && Math.random() < 0.35) G.parts.push({ x: p.x + rand(-14, 14), y: p.y + rand(-10, 10), vx: 0, vy: -60, life: 0.4, max: 0.4, col: PAL.blood, size: 3 });
    if (cR.has('samson') && (cR.has('nazirite') || p.hp >= p.maxHp * 0.8)) { s.glintT -= dt; if (s.glintT <= 0) { s.glintT = 0.35; G.parts.push({ x: p.x + rand(-6, 6), y: p.y - 18, vx: rand(-20, 20), vy: -30, life: 0.5, max: 0.5, col: '#ffcf4a', size: 2.5 }); } }
    if (cR.has('beatrice')) { s.petalT -= dt; if (s.petalT <= 0) { s.petalT = 0.9; G.parts.push({ x: p.x + rand(-18, 18), y: p.y - 24, vx: rand(-20, 20), vy: 20, life: 1, max: 1, col: '#ff7ac0', size: 4, kind: 'feather', rot: rand(0, TAU), grav: 20 }); } }
    if (cB.fullness) {
      if (p.hp >= p.maxHp && p.shield < p.shieldMax + 1) { s.fullT += dt; if (s.fullT > 6) { s.fullT = 0; p.shield++; vfx.ring(p.x, p.y, 6, 40, PAL.soul, 0.4, 4); floatText(p.x, p.y - 40, 'Teljesség: +pajzs', PAL.soul, 1, 13); sfx('block'); } }
      else s.fullT = 0;
    }
    if (cB.magnet && !G.hub) {
      let k = 0;
      for (const q of G.room.pickups) if (q.type === 'soul' && q.t > 0.3) { const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1; if (d > 140) { q.x += dx / d * 420 * dt; q.y += dy / d * 420 * dt; if (k++ < 3 && Math.random() < 0.3) G.parts.push({ x: q.x, y: q.y, vx: 0, vy: 0, life: 0.3, max: 0.3, col: PAL.soul, size: 2 }); } }
    }
    if (cB.legion && !G.hub && G.enemies.length) {
      s.legT += dt;
      if (s.legT >= 8) { s.legT = 0; for (let i = 0; i < 12; i++) spear(i / 12 * TAU + rand(0, 0.2), p.dmg * 1.2); vfx.ring(p.x, p.y, 10, 90, PAL.gold, 0.4, 6); vfx.glyph(p.x, p.y, PAL.gold, 40, 0.6, 4); sfx('holy'); }
    }
  });

  // --- ritka ajánlat felvételekor fényvillanás ---
  on('offer', o => {
    if (!o) return;
    if (o.rar === 'legend' || o.kind === 'morph' || o.kind === 'fuse') {
      const c = o.col || (RAR[o.rar] || RAR.legend).c, p = G.p;
      vfx.flash(0.35); vfx.ring(p.x, p.y, 20, 260, c, 0.7, 10); vfx.shake(6); vfx.glyph(p.x, p.y, c, 56, 1.2, 2);
    }
  });

  // ======================================================================
  //  AJÁNLATOK
  // ======================================================================
  const ROMAN = ['I', 'II', 'III', 'IV'];
  const BL_PRICE = { common: 14, rare: 20, epic: 27, legend: 35 };
  function slotWeapons() { const out = []; for (const k of ['melee', 'ranged']) { const w = G.slots && G.slots[k]; if (w && WEAPONS[w] && !out.includes(w)) out.push(w); } return out; }
  function weaponOffer(w) {
    const W = WEAPONS[w], cur = G.wlv[w] || 0; if (!W || cur >= 4) return null;
    const lvl = cur + 1, txt = (Array.isArray(W.lv) && W.lv[lvl - 1]) || `Erősebb, gyorsabb támadások (${lvl}. szint)`;
    const o = { kind: 'weapon', id: 'wlv_' + w, n: `${W.n} ${ROMAN[lvl - 1]}`, d: txt, i: '⚔',
      rar: lvl >= 3 ? 'epic' : 'rare', col: W.col || RAR.rare.c,
      apply() {
        if ((G.wlv[w] || 0) >= 4) return; G.wlv[w] = (G.wlv[w] || 0) + 1; const p = G.p, c = W.col || PAL.gold;
        floatText(p.x, p.y - 50, `${W.short || W.n} — ${G.wlv[w]}. szint!`, c, 1.8, 18); vfx.glyph(p.x, p.y, c, 44, 1, 3); vfx.ring(p.x, p.y, 8, 110, c, 0.5, 6); part(p.x, p.y, c, 30, 220, 0.7, 3); sfx('unlock');
        if (G.wlv[w] === 3 && Array.isArray(W.morphs) && W.morphs.length && !G.morph[w]) floatText(p.x, p.y - 74, 'Átalakulás vár…', RAR.morph.c, 2, 14);
      } };
    if (typeof W.icon === 'function') o.icon = (x, y, s) => W.icon(x, y, s);
    return o;
  }
  const morphReady = w => { const W = WEAPONS[w]; return !!(W && (G.wlv[w] || 0) >= 3 && !G.morph[w] && Array.isArray(W.morphs) && W.morphs.length); };
  function morphOffers(w) {
    const W = WEAPONS[w];
    return W.morphs.filter(m => m && m.id).map(m => ({ kind: 'morph', id: 'morph_' + w + '_' + m.id, n: m.n || m.id, d: m.d || `${W.n} új alakot ölt`, i: m.i || '✦',
      rar: 'morph', col: RAR.morph.c,
      apply() {
        if (G.morph[w]) return; G.morph[w] = m.id; const p = G.p, c = W.col || RAR.morph.c;
        vfx.flash(0.7); vfx.shake(14); vfx.glyph(p.x, p.y, RAR.morph.c, 70, 1.6, 3); vfx.glyph(p.x, p.y, c, 46, 1.6, -4);
        vfx.ring(p.x, p.y, 10, 260, RAR.morph.c, 0.8, 12); vfx.ring(p.x, p.y, 10, 160, c, 0.6, 6); part(p.x, p.y, RAR.morph.c, 80, 420, 1.2, 4); part(p.x, p.y, c, 50, 300, 1, 3); vfx.feathers(p.x, p.y, 12);
        floatText(p.x, p.y - 74, 'ÁTALAKULÁS!', RAR.morph.c, 2.4, 26); floatText(p.x, p.y - 48, m.n || m.id, c, 2.4, 18); sfx('unlock'); sfx('nova');
      } }));
  }
  function rarWeights(boost) {
    const l = G.lvl || 0, w = { common: Math.max(12, 60 - 6 * l), rare: 28 + 2 * l, epic: 10 + 2.5 * l, legend: 2 + 1.5 * l };
    if (boost >= 1) { w.common *= 0.06; w.rare *= 0.6; w.epic *= 2.2; w.legend *= 3.5; }
    else if (boost > 0) { w.common *= 0.5; w.epic *= 1.4; w.legend *= 1.6; }
    return w;
  }
  function wpick(items, wf) { let tot = 0; for (const it of items) tot += wf(it); let r = Math.random() * tot; for (const it of items) { r -= wf(it); if (r <= 0) return it; } return items[items.length - 1]; }
  function pickBless(used, boost) {
    const pool = BL.filter(b => blessOk(b) && !used.has('bless:' + b.id));
    if (!pool.length) return null;
    const w = rarWeights(boost), b = wpick(pool, b => w[b.rar || 'common'] || 1);
    used.add('bless:' + b.id); return blessOffer(b);
  }
  function relicPool() {
    const s = S();
    return Object.keys(RELICS).filter(id => { const r = RELICS[id]; return r && !r.fused && !G.relics.includes(id) && !own(id) && !(id === 'lazarus' && s.lazUsed); });
  }
  function pickRelic(used) {
    const pool = relicPool().filter(id => !used.has('relic:' + id) && !used.has('fusein:' + id));
    if (!pool.length) return null;
    const id = wpick(pool, id => RELICS[id].wt || 2); used.add('relic:' + id);
    const o = relicOffer(id); o.i = o.i || '✦'; return o;
  }
  function fuseOffers(used) {
    const out = [];
    for (const [a, b, f] of FUSIONS) {
      if (own(f) || !RELICS[f]) continue;
      const ha = G.relics.includes(a), hb = G.relics.includes(b); if (ha === hb) continue;
      const miss = ha ? b : a; if (!relicPool().includes(miss) || used.has('relic:' + miss)) continue;
      const F = RELICS[f], M = RELICS[miss];
      out.push({ kind: 'fuse', id: 'fuse_' + f, miss, n: F.n, d: `Megkapod: ${M.n} → ${F.s || F.d}`, i: F.i, rar: 'legend', col: F.col, apply: () => gainRelic(miss) });
    }
    return shuffle(out);
  }
  function takeFuse(used) { const fs = fuseOffers(used); if (!fs.length) return null; const o = fs[0]; used.add('relic:' + o.miss); used.add('fusein:' + o.miss); delete o.miss; return o; }
  function weaponLvOffer(used) {
    const ws = shuffle(slotWeapons().filter(w => (G.wlv[w] || 0) < 4 && !used.has('weapon:' + w)));
    const pref = ws.find(w => w === G.weapon) && Math.random() < 0.6 ? G.weapon : ws[0];
    if (!pref) return null; used.add('weapon:' + pref); return weaponOffer(pref);
  }
  const healOffer = () => ({ kind: 'heal', id: 'heal', n: 'Mennyei Manna', d: 'Teljes gyógyulás', i: '♥', rar: 'common', col: '#ff6b8a',
    apply() { const p = G.p; p.hp = p.maxHp; floatText(p.x, p.y - 40, 'Teljes gyógyulás', '#ff6b8a', 1.4, 16); part(p.x, p.y, '#ff6b8a', 30, 200, 0.7, 3); } });

  function offers(src, n) {
    n = Math.max(1, n || 3);
    const used = new Set(), out = [], push = o => { if (o) out.push(o); return !!o; };
    const fill = (k, boost) => { let guard = 0; while (out.length < k && guard++ < 20) if (!push(pickBless(used, boost))) break; };
    const W = slotWeapons();
    if (src === 'boss') {
      const mw = [G.weapon, ...W].find(w => w && WEAPONS[w] && morphReady(w));
      if (mw) {
        for (const o of morphOffers(mw).slice(0, 2)) push(o);
        const k = Math.max(n, Math.min(4, out.length + 2));
        if (Math.random() < 0.3) push(takeFuse(used));
        fill(k, 1);
        return finish(out, src);
      }
      if (Math.random() < 0.55) push(weaponLvOffer(used));
      if (out.length < n && Math.random() < 0.35) push(takeFuse(used));
      fill(n, 1);
    } else if (src === 'morph') {
      for (const w of W) if (morphReady(w)) for (const o of morphOffers(w)) if (out.length < 4) push(o);
      if (!out.length) return offers('treasure', n);
    } else if (src === 'shop') {
      if (Math.random() < 0.5) { const o = weaponLvOffer(used); if (push(o)) o.price = 24; }
      if (out.length < n && Math.random() < 0.35) { const o = pickRelic(used); if (push(o)) o.price = 30; }
      fill(n, 0);
      for (const o of out) if (!o.price) o.price = BL_PRICE[o.rar] || 18;
    } else if (src === 'shrine') {
      if (Math.random() < 0.5) push(takeFuse(used));
      let guard = 0; while (out.length < n && guard++ < 10) if (!push(pickRelic(used))) break;
      fill(n, 1);
    } else if (src === 'story') {
      push(pickRelic(used));
      fill(n, 0.5);
    } else {                                   // 'treasure' és minden egyéb
      if (src === 'treasure' && own('peter')) n += 1;
      if (Math.random() < 0.35) push(weaponLvOffer(used));
      fill(n, src === 'treasure' ? 0 : 0.3);
    }
    return finish(out.slice(0, Math.max(n, src === 'boss' ? 4 : n)), src);
  }
  function finish(out, src) {
    if (!out.length) out.push(healOffer());
    for (const o of out) { if (!o.d) o.d = ''; if (!o.i) o.i = '✦'; if (!o.rar) o.rar = 'common'; }
    if (src !== 'boss' && out.length > 4) out.length = 4;
    return out;
  }
  UPG.offers = offers;
  UPG.fusions = FUSIONS;
  UPG.weaponOffer = weaponOffer;
  UPG.morphOffers = w => (WEAPONS[w] && Array.isArray(WEAPONS[w].morphs)) ? morphOffers(w) : [];
  UPG.own = own;
})();
