// The Arkangel – a bűnök kísértései.
// Nincs bolt és nincs külön szerezhető erősítés: csak a legyőzött bűn hagy maga után kísértést.
// Minden kísértés kétélű: téged megerősít, de a démonokat is (G.em – az ellenségek szorzói).
// A bűn halála után a fegyvereid is erősödnek egy szintet (3. szinttől átalakulás választható).
(() => {
  'use strict';
  RAR.tempt = { n: 'Kísértés', c: '#ff5a6a' };
  const EM = () => G.em || (G.em = { hp: 1, spd: 1, atk: 1, sm: 1, shots: 0, dmg: 1, homing: 0, armor: 0 });
  const has = id => !!(G && G.tempts && G.tempts.includes(id));
  const S = () => G.flags._t || (G.flags._t = { seduceT: 0, stillT: 0, healAcc: 0, covet: 0 });
  const later = (t, fn) => addFx({ upd(dt) { t -= dt; if (t <= 0) { fn(); return false; } return true; } });
  function heal(n, col = PAL.life) {
    const p = G.p, h = Math.min(n, p.maxHp - p.hp); if (h <= 0) return;
    p.hp += h; S().healAcc += h;
    if (S().healAcc >= 4) { floatText(p.x + rand(-8, 8), p.y - 30, '+' + Math.round(S().healAcc), col, 0.6, 12); S().healAcc = 0; }
  }
  let busy = 0;
  function tHit(x, y, r, d, o) { busy++; try { return hitCircle(x, y, r, d, Object.assign({ tag: 'tempt' }, o || {})); } finally { busy--; } }

  // T(gyűrű, id, név, ikon, rád gyakorolt hatás, a démonokra gyakorolt hatás, alkalmazás a játékosra, alkalmazás a démonokra)
  const T = (ri, id, n, i, d, d2, p, e) => { TEMPTS[id] = { ri, id, n, i, d, d2, p, e }; };

  // ---------- I. Bujaság ----------
  T(0, 'seduce', 'A Csábító Töltény', '♥',
    'Minden lövedéked követi a démonokat, és másodpercenként egy csábító szív repül a legközelebbire.',
    'A démonok lövedékei is követnek téged.',
    p => { p.homing += 2; }, m => { m.homing += 0.9; });
  T(0, 'charm', 'Igéző Pillantás', '❦',
    'Találataid 15% eséllyel 1,5 mp-re megbabonázzák a démont: megdermed.',
    'A vágy hajtja őket: a démonok 15%-kal gyorsabbak.',
    null, m => { m.spd *= 1.15; });
  T(0, 'passion', 'Szenvedély', '✶',
    '+30% támadási sebesség.',
    'A démonok is 25%-kal gyakrabban támadnak.',
    p => { p.fireDelay *= 0.77; }, m => { m.atk *= 1.25; });

  // ---------- II. Torkosság ----------
  T(1, 'hunger', 'Telhetetlen Éhség', '◕',
    'A sebzés gyógyít: a kiosztott sebzés 5%-át visszakapod életerőként.',
    'A démonok is falnak: ha megsebeznek, a sebzés felét visszagyógyítják.',
    null, null);
  T(1, 'belly', 'Feneketlen Gyomor', '●',
    '+40 max életerő és teljes gyógyulás.',
    'A démonok életereje 25%-kal nő.',
    p => { p.maxHp += 40; p.hp = p.maxHp; }, m => { m.hp *= 1.25; });
  T(1, 'carrion', 'Dögevés', '✣',
    'Minden ölés 3 életerőt ad, és sokkal gyakrabban hullik szív.',
    'A démonok felfalják elesett társaikat: ölésnél a közeliek 20%-ot gyógyulnak.',
    null, null);

  // ---------- III. Fösvénység ----------
  T(2, 'goldfever', 'Aranyláz', '✪',
    'Minden nálad lévő 10 lélek +3% sebzést ad (legfeljebb +60%).',
    'Minden találatuk 3 lelket rabol el tőled (a tolvajt megölve visszakapod).',
    null, null);
  T(2, 'midas', 'Midász Érintése', '◈',
    'A 25% alatti démonokat találatod 15% eséllyel aranyszoborrá dermeszti: azonnal elpusztulnak.',
    'Aranypáncél: a démonok 15%-kal kevesebb sebzést kapnak.',
    null, m => { m.armor = 1 - (1 - m.armor) * 0.85; });
  T(2, 'hoard', 'Harácsolás', '⁂',
    '+1 lövedék minden lövéshez (közelharcban szélesebb csapás).',
    'A démonok is eggyel több lövedéket lőnek.',
    p => { p.shots++; }, m => { m.shots += 1; });

  // ---------- IV. Restség ----------
  T(3, 'rest', 'Tunya Nyugalom', '☾',
    'Ha egy pillanatra megállsz, gyorsan gyógyulsz (5 életerő / mp).',
    'A démonok is regenerálnak: 2% / mp, ha 3 mp-ig nem sebzik őket.',
    null, null);
  T(3, 'dream', 'Hosszú Álom', '✧',
    'A Szent Nova 50%-kal erősebb, és a Kegyelem 40%-kal gyorsabban telik.',
    'A démonok életereje 20%-kal nő.',
    p => { p.novaMul *= 1.5; p.graceGain *= 1.4; }, m => { m.hp *= 1.2; });
  T(3, 'fog', 'Altató Köd', '≈',
    'Kitéréskor altató köd marad utánad: a benne álló démonok erősen lelassulnak.',
    'A démonok találatai elnehezítenek: 1 mp-re lelassulsz.',
    null, null);

  // ---------- V. Harag ----------
  T(4, 'fury', 'Vak Düh', '⚔',
    '+35% sebzés.',
    'A démonok sebzése 25%-kal nő.',
    p => { p.dmg *= 1.35; }, m => { m.dmg *= 1.25; });
  T(4, 'blood', 'Lángoló Vér', '✹',
    'Találataid lángra lobbantják a démonokat.',
    'A démonok haláluk után felrobbannak.',
    p => { p.burn++; }, null);
  T(4, 'revenge', 'Bosszú', '☄',
    'Ha megsebeznek, haragod lökéshulláma szétveti a közeli démonokat.',
    'A félholt démonok dühbe gurulnak: 40%-kal gyorsabbak.',
    null, null);

  // ---------- VI. Irigység ----------
  T(5, 'covet', 'Mások Ereje', '◐',
    'Minden ölés 25% eséllyel ellopja a démon erejét: +2% sebzés (legfeljebb +40%).',
    'Ha egy démon meghal, a közeliek életereje és sebessége 10%-kal nő.',
    null, null);
  T(5, 'greeneye', 'Zöld Szem', '◉',
    '+20% kritikus esély.',
    'A démonok lövedékei 25%-kal gyorsabbak.',
    p => { p.crit += 0.2; }, m => { m.sm *= 1.25; });
  T(5, 'wings', 'Kölcsönvett Szárnyak', '❧',
    '+18% mozgási sebesség és 25%-kal gyorsabb kitérés.',
    'A démonok is 15%-kal gyorsabbak.',
    p => { p.spd *= 1.18; p.dashCd *= 0.75; }, m => { m.spd *= 1.15; });

  // ======================================================================
  //  felvétel és a démonok megerősítése
  // ======================================================================
  function sync() { const m = EM(); G.eDmgMul = m.dmg; G.eHoming = m.homing; }
  function empower(e) {
    const m = EM();
    e.hp *= m.hp; e.maxHp *= m.hp; if (e.poiseMax) { e.poise *= m.hp; e.poiseMax *= m.hp; }
    e.spd *= m.spd; e.atkMul = m.atk; e.sm = (e.sm || 1) * m.sm; e.xShots = m.shots;
  }
  on('spawn', e => { if (G && G.em) empower(e); });
  function takeTempt(id) {
    const t = TEMPTS[id]; if (!t || has(id)) return;
    G.tempts.push(id);
    if (t.p) t.p(G.p);
    if (t.e) t.e(EM());
    sync();
    const p = G.p, c = RINGS[t.ri].col;
    floatText(p.x, p.y - 64, t.n, c, 2.2, 20); floatText(p.x, p.y - 42, 'A démonok is megerősödtek…', '#ff8a8a', 2.2, 13);
    vfx.flash(0.4); vfx.ring(p.x, p.y, 10, 240, c, 0.8, 10); vfx.glyph(p.x, p.y, c, 56, 1.4, -2); vfx.shake(8); sfx('roar');
  }
  function temptOffers(ri) {
    return Object.values(TEMPTS).filter(t => t.ri === ri && !has(t.id)).map(t => ({
      kind: 'tempt', id: t.id, n: t.n, d: t.d, d2: t.d2, i: t.i, rar: 'tempt', col: RINGS[ri].col, apply: () => takeTempt(t.id),
    }));
  }
  const baseOffers = UPG.offers;
  // csak a bűn (főellenség) hagy erősítést – minden más forrás üres
  UPG.offers = (src, n) => src === 'boss' ? temptOffers(G.ring) : src === 'morph' && baseOffers ? baseOffers(src, n) : [];

  // a bűn halála után: minden fegyver erősödik egy szintet, 3. szinttől átalakulás választható
  UPG.afterSin = done => {
    const p = G.p; let up = false;
    for (const w of Object.keys(WEAPONS)) if ((G.wlv[w] || 0) < 4) { G.wlv[w] = (G.wlv[w] || 0) + 1; up = true; }
    if (up) { const c = (WEAPONS[G.weapon] && WEAPONS[G.weapon].col) || PAL.gold; floatText(p.x, p.y - 86, `A bűn ereje átjárja fegyvereidet — ${G.wlv[G.weapon]}. szint`, c, 2.4, 15); vfx.ring(p.x, p.y, 8, 110, c, 0.5, 6); sfx('unlock'); }
    const ready = [G.slots.melee, G.slots.ranged].filter(w => w && WEAPONS[w] && (G.wlv[w] || 0) >= 3 && !G.morph[w] && UPG.morphOffers && UPG.morphOffers(w).length);
    const next = () => { const w = ready.shift(); if (!w) return done(); openChoice('morph', next, UPG.morphOffers(w)); };
    next();
  };

  // ======================================================================
  //  hatások
  // ======================================================================
  on('tick', dt => {
    if (!G.tempts.length) return;
    const p = G.p, s = S();
    if (has('seduce') && !G.hub && !G.dying) {
      s.seduceT -= dt;
      if (s.seduceT <= 0) {
        s.seduceT = 1.0;
        const e = nearestEnemy();
        if (e && canHit(e) && dist(e, p) < 520) {
          const a = angTo(p, e);
          pBullet(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, a, 380, { r: 6, dmg: p.dmg * 1.1, life: 1.8, col: '#ff7ac0', pierce: 0,
            drw(b) { ctx.save(); ctx.translate(b.x, b.y); ctx.fillStyle = '#ff7ac0'; ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-9, -2, -5, -9, 0, -4); ctx.bezierCurveTo(5, -9, 9, -2, 0, 5); ctx.fill(); ctx.restore(); } });
        }
      }
    }
    if (has('rest') && !G.dying) {
      if (Math.hypot(p.vx, p.vy) < 12) { s.stillT += dt; if (s.stillT > 0.5) heal(5 * dt, '#9fb8e8'); } else s.stillT = 0;
    }
    if (has('rest') && !G.hub) for (const e of G.enemies) {
      if (e.dead || e.hp >= e.maxHp || gt - (e._lh || 0) < 3) continue;
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt);
      if (Math.random() < dt * 2) part(e.x, e.y - e.r, '#8fb0e0', 2, 40, 0.5, 2);
    }
  });

  on('dmgOut', (d, e) => {
    if (!G.tempts.length) return d;
    let m = 1;
    if (has('goldfever')) m *= 1 + Math.min(0.6, Math.floor(G.souls / 10) * 0.03);
    if (has('covet')) m *= 1 + 0.02 * S().covet;
    if (G.em && G.em.armor) m *= 1 - G.em.armor;
    return d * m;
  });

  on('hit', (e, d) => {
    if (!G.tempts.length || busy) return;
    const p = G.p;
    e._lh = gt;
    if (has('hunger')) heal(Math.min(d * 0.05, 6), '#b8d43a');
    if (has('charm') && !e.boss && !e.dead && Math.random() < 0.15) { e.stun = Math.max(e.stun || 0, 1.5); floatText(e.x, e.y - e.r - 14, '♥', '#ff7ac0', 0.9, 16); part(e.x, e.y, '#ff7ac0', 8, 120, 0.5, 2.5); }
    if (has('midas') && !e.boss && !e.dead && e.hp > 0 && e.hp < e.maxHp * 0.25 && Math.random() < 0.15) {
      floatText(e.x, e.y - e.r - 14, 'ARANY', '#ffd700', 0.9, 15); part(e.x, e.y, '#ffd700', 24, 200, 0.7, 3);
      killEnemy(e); for (let i = 0; i < 3; i++) dropPickup('soul', e.x, e.y);
    }
    if (has('revenge') && !e.boss && !e.dead && !e.rage && e.hp < e.maxHp * 0.5) { e.rage = true; e.spd *= 1.4; floatText(e.x, e.y - e.r - 12, 'DÜH!', '#ff4a24', 0.8, 14); }
  });

  on('kill', e => {
    if (!G.tempts.length || e.boss) return;
    const p = G.p;
    if (has('carrion')) { heal(3, '#c8d860'); if (Math.random() < 0.08) dropPickup('heart', e.x, e.y); }
    if (has('carrion') || has('covet')) for (const o of G.enemies) {
      if (o.dead || o === e || Math.hypot(o.x - e.x, o.y - e.y) > 240) continue;
      if (has('carrion')) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.2); floatText(o.x, o.y - o.r * 2.4, 'falás +', '#b8d43a', 0.7, 11); }
      if (has('covet')) { o.maxHp *= 1.1; o.hp *= 1.1; o.spd *= 1.1; part(o.x, o.y, '#3ddc84', 6, 80, 0.4, 2); }
    }
    if (has('covet') && S().covet < 20 && Math.random() < 0.25) { S().covet++; floatText(p.x, p.y - 40, `elorzott erő +${S().covet * 2}%`, '#3ddc84', 1, 12); part(e.x, e.y, '#3ddc84', 10, 160, 0.5, 2.5); }
    if (has('blood') && !G.hub && G.ring !== 4) { G.hazards.push({ x: e.x, y: e.y, r: 70, type: 'blast', warn: 0.7, warn0: 0.7, life: 0.3, dmg: eDmg() * 0.9, col: '#ff8a3a' }); part(e.x, e.y, '#ff8a3a', 16, 260, 0.5, 4); }
  });

  on('hurt', (d, src) => {
    if (!G.tempts.length) return;
    const p = G.p, foe = src && src.maxHp && !src.dead ? src : null;
    if (has('hunger') && foe) { foe.hp = Math.min(foe.maxHp, foe.hp + d * 0.5); floatText(foe.x, foe.y - foe.r - 12, '+' + Math.round(d * 0.5), '#b8d43a', 0.8, 12); }
    if (has('goldfever') && G.souls > 0) { const n = Math.min(3, G.souls); G.souls -= n; if (foe) foe.loot = (foe.loot || 0) + n; floatText(p.x, p.y - 52, `-${n} ◈`, '#ffc23a', 0.9, 13); }
    if (has('fog')) p.slow = Math.max(p.slow, 1);
    if (has('revenge')) { vfx.ring(p.x, p.y, 10, 150, '#ff4a24', 0.4, 8); vfx.shake(6); tHit(p.x, p.y, 150, p.dmg * 3, { kb: 420 }); }
  });

  on('dash', () => {
    if (!has('fog')) return;
    const x = G.p.x, y = G.p.y, R = 90; let t = 0; const dur = 3;
    addFx({ under: true,
      upd(dt) { t += dt; for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < R + e.r) e.slowT = Math.max(e.slowT || 0, 0.4); return t < dur; },
      drw() { const al = Math.min(1, (dur - t) * 1.5) * 0.28; ctx.save(); ctx.fillStyle = hexA('#8fb0e0', al); for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.3 + t) * 30, y + Math.sin(k * 1.7 + t) * 20, R * 0.6, 0, TAU); ctx.fill(); } ctx.restore(); } });
  });
})();
