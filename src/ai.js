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

// ----- újabb mozdulatok: kombók folytatása, ugrás, sav, gyógyítás, átok, blokk, megragadás -----
Object.assign(MOVES, {
  bite2: { kind: 'melee', min: 0, max: 110, wind: 0.2, act: 0.12, rec: 0.5, cd: 0, shape: 'arc', r: 62, half: 0.8, dmg: 0.9, lunge: 240 },
  swipe2: { kind: 'melee', min: 0, max: 150, wind: 0.32, act: 0.14, rec: 0.55, cd: 0, shape: 'arc', r: 104, half: 1.2, dmg: 1.5, lunge: 200, then: 'slam', thenP: 0.35 },
  whip2: { kind: 'melee', min: 0, max: 220, wind: 0.3, act: 0.14, rec: 0.6, cd: 0, shape: 'arc', r: 150, half: 1.3, dmg: 1.5, lunge: 160 },
  cleave2: { kind: 'melee', min: 0, max: 220, wind: 0.34, act: 0.14, rec: 0.6, cd: 0, shape: 'arc', r: 160, half: 1.3, dmg: 1.7, lunge: 220, then: 'bslam', thenP: 0.35 },
  pounce: { kind: 'melee', min: 110, max: 300, wind: 0.48, act: 0.42, rec: 0.55, cd: 4.2, shape: 'leap', r: 62, dmg: 1.25, feint: 1 },
  bleap: { kind: 'melee', min: 160, max: 520, wind: 0.7, act: 0.6, rec: 0.8, cd: 6.5, shape: 'leap', r: 120, dmg: 1.9, shake: 14 },
  acid: { kind: 'ranged', min: 140, max: 480, wind: 0.5, act: 0.05, rec: 0.6, cd: 4.6, shape: 'lob', r: 72, delay: 0.9, dmg: 0.9, burn: 1 },
  mend: { kind: 'special', min: 0, max: 640, wind: 0.9, act: 0.05, rec: 0.5, cd: 7, shape: 'mend' },
  hex: { kind: 'ranged', min: 120, max: 520, wind: 0.6, act: 0.05, rec: 0.5, cd: 6.5, shape: 'lob', r: 84, delay: 0.8, dmg: 0.5, slow: 1, linger: 3 },
  guard: { kind: 'special', min: 0, max: 220, wind: 0.1, act: 1.6, rec: 0.25, cd: 4.5, shape: 'guard' },
  grab: { kind: 'melee', min: 0, max: 95, wind: 0.55, act: 0.2, rec: 0.75, cd: 6.5, shape: 'grab', r: 74, half: 0.9, dmg: 2.2, hold: 1.1 },
  bgrab: { kind: 'melee', min: 0, max: 150, wind: 0.6, act: 0.2, rec: 0.8, cd: 8, shape: 'grab', r: 120, half: 1.0, dmg: 2.6, hold: 1.3 },
});
// ----- főellenségek új mozdulatai: vérgyűrű, repedés, kereszt, ketrec, pörgés, dobbantás-sor, tépés-sor -----
Object.assign(MOVES, {
  bloodring: { kind: 'ranged', min: 0, max: 620, wind: 0.8, act: 0.75, rec: 0.7, cd: 7, shape: 'proj', ring: 1, n: 14, spread: 0, spd: 165, br: 9, dmg: 0.8, burst: 3, twist: 0.11, col: '#9a1a14' },
  quake: { kind: 'ranged', min: 60, max: 650, wind: 0.7, act: 0.05, rec: 0.6, cd: 5, shape: 'quake', n: 9, step: 62, r: 44, dmg: 1.4, delay: 0.3, stepT: 0.07 },
  cross: { kind: 'special', min: 0, max: 520, wind: 0.8, act: 0.05, rec: 0.7, cd: 7.5, shape: 'cross', n: 7, step: 60, r: 40, dmg: 1.3, delay: 0.35, stepT: 0.06, arms: 4 },
  cage: { kind: 'ranged', min: 0, max: 700, wind: 0.6, act: 0.05, rec: 0.6, cd: 9, shape: 'cage', n: 11, rad: 135, r: 50, dmg: 1.5, delay: 0.75 },
  spin: { kind: 'melee', min: 0, max: 260, wind: 0.7, act: 1.8, rec: 0.9, cd: 7, shape: 'spin', r: 118, dmg: 0.8, tick: 0.3, spd: 170 },
  bstomp: { kind: 'melee', min: 0, max: 160, wind: 0.7, act: 0.1, rec: 0.25, cd: 6.5, shape: 'circle', r: 120, dmg: 1.3, shake: 8, then: 'bstomp2', thenP: 0.85, feint: 1 },
  bstomp2: { kind: 'melee', min: 0, max: 260, wind: 0.35, act: 0.1, rec: 0.25, cd: 0, shape: 'circle', r: 175, dmg: 1.4, shake: 10, then: 'bstomp3', thenP: 0.7 },
  bstomp3: { kind: 'melee', min: 0, max: 320, wind: 0.45, act: 0.12, rec: 1.0, cd: 0, shape: 'circle', r: 240, dmg: 1.6, shake: 14 },
  rend: { kind: 'melee', min: 0, max: 170, wind: 0.4, act: 0.12, rec: 0.15, cd: 3.4, shape: 'arc', r: 120, half: 0.9, dmg: 1.0, lunge: 200, then: 'rend2', thenP: 0.9, feint: 1 },
  rend2: { kind: 'melee', min: 0, max: 240, wind: 0.22, act: 0.12, rec: 0.15, cd: 0, shape: 'arc', r: 130, half: 0.9, dmg: 1.0, lunge: 220, then: 'rend3', thenP: 0.75 },
  rend3: { kind: 'melee', min: 0, max: 280, wind: 0.3, act: 0.14, rec: 0.8, cd: 0, shape: 'arc', r: 150, half: 1.4, dmg: 1.5, lunge: 260 },
});
// kombók: a lecsapás után bizonyos eséllyel azonnal jön a következő
Object.assign(MOVES.bite, { then: 'bite2', thenP: 0.45 });
Object.assign(MOVES.swipe, { then: 'swipe2', thenP: 0.6, feint: 1 });
Object.assign(MOVES.whip, { then: 'whip2', thenP: 0.55, feint: 1 });
Object.assign(MOVES.cleave, { then: 'cleave2', thenP: 0.6, feint: 1 });
Object.assign(MOVES.backstab, { then: 'retreat', thenP: 0.6 });
for (const k of ['slam', 'charge', 'bslam', 'bcharge', 'combo', 'roll']) MOVES[k].feint = 1;

// ---------- démontípusok: viselkedés és mozdulatkészlet ----------
// pref: kedvelt távolság ; sight: észlelés ; agile: kitér a lövedékek elől ; flee: alacsony életerőnél visszahúzódik
const EDEF = {
  imp: { pref: [40, 120], sight: 400, moves: { bite: 3, dart: 1.2, spit: 0.6, pounce: 1.4 }, agile: 0.45, flee: 0.22 },
  fly: { pref: [30, 90], sight: 360, moves: { dart: 3, claw: 1 }, fly: true },
  mini: { pref: [30, 80], sight: 360, moves: { bite: 3, dart: 1, pounce: 0.8 }, agile: 0.3 },
  spitter: { pref: [200, 330], sight: 460, moves: { spit: 2.6, spread3: 1.4, acid: 1.4, retreat: 1.4, claw: 0.6 } },
  brute: { pref: [40, 140], sight: 380, moves: { swipe: 3, slam: 1.6, charge: 1.6, guard: 1.2, grab: 1.1 }, heavy: true },
  wisp: { pref: [240, 380], sight: 480, moves: { orb: 2.2, lob: 1.6, hex: 1.3, mend: 1.6, retreat: 1.5 }, fly: true },
  splitter: { pref: [40, 120], sight: 360, moves: { belly: 2.5, bite: 1.5, lob: 0.8 } },
  turret: { pref: [0, 9999], sight: 520, moves: { volley: 3, lob: 1 }, still: true },
  teleporter: { pref: [140, 300], sight: 460, moves: { blink: 2.5, spit: 1.5, backstab: 2 }, agile: 0.6 },
  shadow: { pref: [60, 200], sight: 520, moves: { combo: 2, dart: 1.5, spit: 1.2, blink: 1, guard: 0.9 }, agile: 0.55 },
};
const BOSS_MOVES = {
  asmodeus: [{ whip: 3, hearts: 2.2, charge: 1.4, charm: 1.2, bleap: 1, rend: 1 },
    { whip: 3, hearts: 2.4, bcharge: 1.6, charm: 1.6, starfall: 0.8, bleap: 1.4, bgrab: 1, rend: 1.4, cage: 1 },
    { whip: 3, hearts: 2.4, bcharge: 1.6, charm: 1.6, starfall: 1.2, bleap: 1.4, bgrab: 1.2, rend: 1.8, cage: 1.4, bloodring: 1.2, spin: 1 }],
  beelzebub: [{ bslam: 2, bile: 2.4, flies: 1.2, swipe: 2, bgrab: 1, bstomp: 1 },
    { bslam: 2.2, bile: 2.5, flies: 1.5, swipe: 2.2, bcharge: 1.2, bgrab: 1.4, bleap: 1, quake: 1.2, spin: 1 },
    { bslam: 2.2, bile: 2.5, flies: 1.5, swipe: 2.2, bcharge: 1.4, bgrab: 1.4, bleap: 1.2, quake: 1.4, spin: 1.3, bloodring: 1.4, cage: 1.2, bstomp: 1.2 }],
  mammon: [{ coins: 2.6, goldfist: 2, swipe: 2.2, turrets: 0.8, guard: 1, quake: 0.8 },
    { coins: 2.8, goldfist: 2.2, goldrain: 1.6, swipe: 2.4, turrets: 1, guard: 1.2, bgrab: 1, quake: 1.2, cross: 1.2 },
    { coins: 2.8, goldfist: 2.2, goldrain: 1.8, swipe: 2.4, turrets: 1, guard: 1.2, bgrab: 1.2, quake: 1.4, cross: 1.4, bloodring: 1.3, spin: 1.1, bstomp: 1.2 }],
  belphegor: [{ sleep: 2, roll: 1.6, swipe: 2.5, yawn: 1, bgrab: 0.8, bstomp: 1 },
    { sleep: 2.2, roll: 2, swipe: 2.5, yawn: 1.4, bslam: 1.2, bleap: 1, quake: 1.2, bstomp: 1.2 },
    { sleep: 2.2, roll: 2, swipe: 2.5, yawn: 1.4, bslam: 1.4, bleap: 1.2, quake: 1.4, bstomp: 1.4, cage: 1.3, cross: 1.2, bloodring: 1.2 }],
  satan: [{ cleave: 3, fireballs: 1.8, bcharge: 1.6, pillars: 1.4, guard: 0.8, quake: 1 },
    { cleave: 3.2, fireballs: 2, bcharge: 2, pillars: 2, bleap: 1.4, bgrab: 1.2, cross: 1.3, rend: 1.4 },
    { cleave: 3.2, fireballs: 2, bcharge: 2, pillars: 2, bleap: 1.4, bgrab: 1.4, cross: 1.5, rend: 1.8, bloodring: 1.5, spin: 1.3, bstomp: 1.3, cage: 1.2 }],
  leviathan: [{ dive: 2, bite: 2, wave: 2, mirror: 0.8, spin: 1 },
    { dive: 2.5, whip: 2.2, wave: 2.4, mirror: 1, bgrab: 1.2, bloodring: 1.2, quake: 1.2 },
    { dive: 2.5, whip: 2.4, wave: 2.4, mirror: 1, bgrab: 1.4, bloodring: 1.5, quake: 1.4, cross: 1.3, cage: 1.3, rend: 1.5, bleap: 1.2 }],
  lucifer: [{ combo: 3, wingslash: 2, starfall: 1.4, guard: 1, rend: 1.2 },
    { combo: 3, wingslash: 2, starfall: 1.6, laser: 1.4, minions: 1, bcharge: 1.2, bleap: 1.2, cross: 1.2, bloodring: 1 },
    { combo: 3.2, wingslash: 2.2, starfall: 2, laser: 1.8, supernova: 1.2, teleslash: 1.8, bgrab: 1.2, rend: 1.6, cage: 1.3, quake: 1.2, spin: 1 },
    { combo: 3.2, wingslash: 2.2, starfall: 2.2, laser: 2, supernova: 1.6, teleslash: 2, bgrab: 1.4, rend: 1.8, cage: 1.5, quake: 1.4, spin: 1.3, cross: 1.5, bloodring: 1.8, bstomp: 1.3 }],
};

// ---------- létrehozás ----------
function mkEnemy(type, x, y, ri) {
  const d = ET[type], lv = G.lvl, m = 1.4 + 0.5 * lv, hp = d.hp * m;
  return { type, x, y, r: d.r, hp, maxHp: hp, poise: hp * 0.4, poiseMax: hp * 0.4, poiseT: 0, broken: 0, z: 0, spd: d.spd * (1.06 + 0.04 * lv), t: rand(0, 2), st: 0, stT: rand(0.8, 2),
    flash: 0, spawn: 0.6, burn: 0, orbCd: 0, alpha: 1, ghost: false, side: Math.random() < 0.5 ? 1 : -1, spin: rand(0, TAU), shT: 0, boss: false, dead: false,
    ri: ri !== undefined ? ri : (G.hub ? 7 : G.ring), home: { x, y }, aggro: false, cds: {}, act: null, think: rand(0, 0.4), sideT: rand(1, 3), wander: null, face: rand(0, TAU), dodgeCd: 0 };
}
function spawnBoss(x, y) {
  const ri = G.ring, bd = BOSSES[ri], bhp = bd.key === 'lucifer' ? bd.hp : BOSS_HP[Math.min(5, G.lvl)];
  const f = findFree(x, y, 40);
  const b = mkEnemy('imp', f.x, f.y, ri);
  Object.assign(b, { type: 'boss', key: bd.key, bd, boss: true, r: bd.r, hp: bhp * 2.6, maxHp: bhp * 2.6, poise: bhp * 0.22, poiseMax: bhp * 0.22, armor: 0.15, age: 0, spd: bd.spd * 1.15, spawn: 0, intro: 2.2, aggro: true,
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
  // a messzi, nyugvó démonok alszanak – nem terhelik a telefont
  if (!e.aggro && !e.boss && (Math.abs(e.x - p.x) > 1300 || Math.abs(e.y - p.y) > 1000)) return;
  if (e.flash > 0) e.flash -= dt;
  if (e.orbCd > 0) e.orbCd -= dt;
  if (e.dodgeCd > 0) e.dodgeCd -= dt;
  if (e.hurtT > 0) e.hurtT -= dt;
  if (e.poiseT > 0) e.poiseT -= dt; else if (e.poise < e.poiseMax) e.poise = Math.min(e.poiseMax, e.poise + e.poiseMax * 0.6 * dt);
  if (e.broken > 0) e.broken -= dt;
  if (e.stunB > 0) { e.stunB -= dt; e.moving = 0; collideObst(e); return; }
  e.t += dt; e.moving = 0;
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
  if (e.boss) { bossPhase(e, dt); if (e.intro > 0) { collideObst(e); return; } }
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
  keepOutOfSanctuary(e);
}
// a menedékbe (kalmár) démon nem léphet
function keepOutOfSanctuary(e) {
  for (const o of G.pois) { if (o.type !== 'shop') continue; const dx = e.x - o.x, dy = e.y - o.y - 30, d = Math.hypot(dx / 1.75, dy); if (d < 110) { const k = 110 / Math.max(1, d); e.x = o.x + dx * k; e.y = o.y + 30 + dy * k; } }
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
// egyensúly (poise): csak elég ütés után törik meg a démon; a megtört főellenség sebezhetőbb
on('hit', (e, d) => {
  if (G && G.p) G.p.lastAtkT = G.time;
  if (!e || e.dead || e.poiseMax === undefined) return;
  e.poiseT = 2.2; e.poise -= d;
  if (e.poise <= 0) {
    e.poise = e.poiseMax; e.act = null; e.atk = null; e.guarding = false;
    if (G.p.held && G.p.held.e === e) G.p.held = null;
    if (e.boss) { e.broken = 2.2; e.stunB = 1.3; floatText(e.x, e.y - e.r * 3.4, 'EGYENSÚLY MEGTÖRVE!', '#e8c890', 1.4, 18); vfx.shake(10); sfx('boom'); }
    else { e.stun = Math.max(e.stun || 0, 0.7); floatText(e.x, e.y - e.r * 2.8, 'MEGTÖRVE', '#e8c8a0', 0.8, 13); }
  }
});
on('dmgOut', (d, e, o) => {
  if (!e) return d;
  if (e.guarding && !(o && o.nova)) {
    const front = arcDiff(e.face || 0, angTo(e, G.p)) < 1.15;
    if (front && !(o && o.heavyBreak)) { vfx.spark(e.x + Math.cos(e.face) * e.r, e.y + Math.sin(e.face) * e.r, e.face, 0.8, '#e8e0c8', 6, 260, 0.25, 2); sfx('block'); e.poise -= d * 0.6; e.poiseT = 2; if (e.poise <= 0) { e.guarding = false; e.act = null; e.stun = Math.max(e.stun || 0, e.boss ? 0 : 0.9); floatText(e.x, e.y - e.r * 2.8, 'BLOKK ÁTTÖRVE', '#e8c8a0', 0.9, 13); e.poise = e.poiseMax; } return d * 0.2; }
  }
  if (e.broken > 0) d *= 1.5; else if (e.armor) d *= 1 - e.armor;
  return d;
}, true);
function moveSet(e) { return e.boss ? BOSS_MOVES[e.key][Math.min(BOSS_MOVES[e.key].length, e.phase) - 1] : (EDEF[e.type] || EDEF.imp).moves; }
function chooseMove(e, d) {
  const p = G.p, set = moveSet(e); let best = null, bs = 0, los = null;
  for (const id in set) {
    const m = MOVES[id]; if (!m || (e.cds[id] || 0) > 0) continue;
    if (d < m.min || d > m.max) continue;
    if (m.kind === 'ranged' || m.shape === 'blink') { if (los === null) los = losClear(e, p); if (!los) continue; }
    if (m.shape === 'summon' && G.enemies.filter(o => !o.dead && o.summoner === e).length >= 4) continue;
    let s = set[id] * rand(0.55, 1.45);
    const vulnerable = p.dashCool > 0.35 || (p.st !== undefined && p.st < 35) || p.held;
    if (m.kind === 'melee' && vulnerable) s *= 1.7;
    if (m.shape === 'guard') { if (G.time - (p.lastAtkT || -9) < 0.5 && d < 170) s *= 3.2; else continue; }
    if (m.shape === 'mend') { if (!G.enemies.some(o => !o.dead && o !== e && o.hp < o.maxHp * 0.65 && Math.hypot(o.x - e.x, o.y - e.y) < 280)) continue; s *= 2.2; }
    if (m.shape === 'grab' && (p.held || p.dashT > 0)) continue;
    if (m.kind === 'melee' && d < 90) s *= 1.6;
    if (m.kind === 'ranged' && d > 220) s *= 1.3;
    if (m.shape === 'hop' && d < 90) s *= 2;
    if (m.shape === 'hop' && d > 90) continue;
    if (e.lastMove === id) s *= 0.6;
    if (s > bs) { bs = s; best = id; }
  }
  // időnként csak helyezkedik, nem támad
  if (best && !e.boss && Math.random() < 0.12) return null;
  return best;
}
function startAct(e, id) {
  const m = MOVES[id], p = G.p;
  const wmul = m.feint ? (Math.random() < 0.35 ? rand(1.35, 1.75) : rand(0.85, 1.05)) : 1;
  e.act = { id, m, ph: 'wind', t: 0, a: angTo(e, p), tx: p.x + p.vx * 0.25, ty: p.y + p.vy * 0.25, hit: false, n: 0, wind: m.wind * wmul };
  if (m.shape === 'leap') { const dd = Math.min(m.max, dist(e, p) + 20), aa = angTo(e, p), f = findFree(e.x + Math.cos(aa) * dd, e.y + Math.sin(aa) * dd, e.r, 80); e.act.tx = f.x; e.act.ty = f.y; }
  e.lastMove = id; e.cds[id] = m.cd * (e.boss ? 0.85 : 1) * rand(0.85, 1.2); e.atk = id;
  if (m.shape === 'lob' || m.shape === 'rain') windMarks(e, m);
  if (m.shape === 'quake' || m.shape === 'cross' || m.shape === 'cage') patternMarks(e, m);
  if (m.shape === 'beam') { e.act.beam = { o: e, ang: e.act.a, rot: (Math.random() < 0.5 ? 1 : -1) * 0.25, warn: m.wind, life: m.act, w: 26 }; G.beams.push(e.act.beam); sfx('laser'); }
  if (m.shape === 'pull') { G.charm = m.wind + m.act; }
  if (e.boss) sfx('charge');
}
function windMarks(e, m) {
  const p = G.p, dmg = eDmg() * m.dmg;
  const mk = (x, y) => { const f = findFree(x, y, 6, 60), w0 = m.delay + (e.act.wind || m.wind); G.hazards.push({ x: f.x, y: f.y, r: m.r, type: 'blast', warn: w0, warn0: w0, life: m.linger || 0.3, dmg, slow: m.slow, burn: m.burn, col: RINGS[e.ri].col }); };
  if (m.shape === 'lob') mk(e.act.tx, e.act.ty);
  else { mk(p.x + p.vx * 0.3, p.y + p.vy * 0.3); for (let i = 1; i < m.n; i++) { const a = rand(0, TAU), r = rand(70, m.around); mk(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r); } }
}
// sorozatos becsapódások: repedés a játékos felé, kereszt a boss körül, ketrec a játékos körül
function patternMarks(e, m) {
  const p = G.p, A = e.act, dmg = eDmg() * m.dmg * 1.25, col = RINGS[e.ri].col, w0 = (A.wind || m.wind) + m.delay;
  const mk = (x, y, w) => { const f = findFree(x, y, 6, 40); G.hazards.push({ x: f.x, y: f.y, r: m.r, type: 'blast', warn: w, warn0: w, life: 0.25, dmg, col }); };
  if (m.shape === 'quake') { const a = angTo(e, p); for (let i = 1; i <= m.n; i++) mk(e.x + Math.cos(a) * i * m.step, e.y + Math.sin(a) * i * m.step, w0 + i * m.stepT); }
  else if (m.shape === 'cross') {
    const arms = e.phase >= 3 ? 8 : m.arms, a0 = Math.random() < 0.5 ? 0 : Math.PI / 4;
    for (let k = 0; k < arms; k++) { const a = a0 + k * TAU / arms; for (let i = 1; i <= m.n; i++) mk(e.x + Math.cos(a) * i * m.step, e.y + Math.sin(a) * i * m.step, w0 + i * m.stepT); }
  } else {
    const gap = Math.floor(rand(0, m.n)), cx = p.x, cy = p.y;
    for (let i = 0; i < m.n; i++) { if (i === gap) continue; const a = i / m.n * TAU; mk(cx + Math.cos(a) * m.rad, cy + Math.sin(a) * m.rad, w0); }
    mk(cx, cy, w0 + 0.45);
  }
}
function runAct(e, dt, d) {
  const A = e.act, m = A.m, p = G.p;
  A.t += dt;
  if (A.ph === 'wind') {
    // felkészülés közben követi a célt (a vége felé már nem – így ki lehet térni)
    const W = A.wind || m.wind;
    if (A.t < W * 0.7 && m.shape !== 'line' && m.shape !== 'leap') { A.a = angTo(e, p); A.tx = p.x; A.ty = p.y; }
    else if (A.t < W * 0.55) A.a = angTo(e, p);
    e.face = A.a;
    if (A.t >= W) { A.ph = 'act'; A.t = 0; actStart(e, A, m); }
    return;
  }
  if (A.ph === 'act') {
    actTick(e, A, m, dt);
    if (A.t >= m.act || A.stop) { A.ph = 'rec'; A.t = 0; if (m.shape === 'pull') G.charm = 0; if (m.shape === 'leap') leapLand(e, A, m); if (m.shape === 'guard') e.guarding = false; }
    return;
  }
  if (A.t >= m.rec * (e.boss && e.phase > 1 ? 0.75 : 1)) {
    e.act = null; e.atk = null;
    if (m.then && Math.random() < (m.thenP === undefined ? 1 : m.thenP) && !(e.stun > 0)) { startAct(e, m.then); e.act.t = 0; }
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
    case 'leap': A.sx = e.x; A.sy = e.y; sfx('dash'); break;
    case 'guard': e.guarding = true; break;
    case 'spin': A.tick = 0; sfx('slash'); break;
    case 'quake': case 'cross': case 'cage': vfx.shake(5); sfx('boom'); break;
    case 'grab':
      if (pHitCheck(q => { const dd = dist(e, q); return dd < m.r + q.r && (dd < e.r + q.r + 8 || arcDiff(angTo(e, q), A.a) <= m.half); })) {
        p.held = { e, t: m.hold, dmg, tick: 0 }; p.inv = 0; floatText(p.x, p.y - 44, 'MEGRAGADOTT! – KITÉRÉS a szabaduláshoz', '#e8c8a0', 1.2, 13); sfx('hurt'); vfx.shake(6);
      } else { vfx.spark(e.x + Math.cos(A.a) * m.r * 0.7, e.y + Math.sin(A.a) * m.r * 0.7, A.a, 0.6, '#c8b8a8', 5, 200, 0.3, 2); }
      A.lunge = 160; break;
    case 'mend':
      for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 280) { const h = o.maxHp * 0.25; o.hp = Math.min(o.maxHp, o.hp + h); floatText(o.x, o.y - o.r * 2.6, '+' + Math.round(h), '#8ab0a0', 0.8, 12); }
      vfx.ring(e.x, e.y, 20, 280, '#6a8a80', 0.6, 6); sfx('holy'); break;
    case 'howl': for (const o of G.enemies) if (!o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 300) { o.rage = true; o.spd *= 1.1; } floatText(e.x, e.y - 30, 'ÜVÖLTÉS', RINGS[e.ri].col, 0.8, 13); break;
    case 'summon':
      for (let i = 0; i < m.n; i++) { if (G.enemies.length > 34) break; const f = findFree(e.x + Math.cos(i * 2.1) * 90, e.y + Math.sin(i * 2.1) * 90); const s = mkEnemy(m.what, f.x, f.y, e.ri); s.aggro = true; s.summoner = e; s.enc = e.enc || G.arenaPoi || null; G.enemies.push(s); }
      sfx('roar'); break;
  }
}
function actTick(e, A, m, dt) {
  const p = G.p, dmg = eDmg() * m.dmg * (e.boss ? 1.25 : 1) * (e.elite ? 1.3 : 1);
  if (A.lunge) {
    // a lendület eleje még a célra fordul – sétálva nem lehet kikerülni, csak kitéréssel
    if (A.t < m.act * 0.45 && m.shape === 'arc') { const want = angTo(e, p), df = ((want - A.a + Math.PI) % TAU + TAU) % TAU - Math.PI; A.a += clamp(df, -3 * dt, 3 * dt); }
    const k = Math.max(0, 1 - A.t / m.act); e.x += Math.cos(A.a) * A.lunge * k * dt; e.y += Math.sin(A.a) * A.lunge * k * dt;
  }
  if (m.shape === 'leap') { const k = clamp(A.t / m.act, 0, 1); e.x = A.sx + (A.tx - A.sx) * k; e.y = A.sy + (A.ty - A.sy) * k; e.z = Math.sin(k * Math.PI) * (e.boss ? 120 : 70); }
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
      for (let i = 0; i < m.n; i++) { const a = m.ring ? a0 + i * TAU / m.n + A.n * (m.twist || 0) : a0 + (m.n > 1 ? (i - (m.n - 1) / 2) * m.spread : rand(-m.spread, m.spread)); eBullet(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, a, m.spd * (e.sm || 1), { r: m.br, dmg: dmg * 0.9, col, homing: m.homing, life: m.life || 3.5, bounce: m.bounce, pierceP: m.pierce, big: m.br > 14 }); }
      sfx('shoot'); A.n++;
    }
    if (A.shots <= 0 && !m.burst) A.stop = true;
  } else if (m.shape === 'spin') {
    const a = angTo(e, p); e.x += Math.cos(a) * m.spd * dt; e.y += Math.sin(a) * m.spd * dt; e.face += dt * 18;
    if ((A.tick -= dt) <= 0) {
      A.tick = m.tick; vfx.ring(e.x, e.y, e.r, m.r, '#8a1a14', 0.25, 5); sfx('slash');
      if (pHitCheck(q => dist(e, q) < m.r + q.r * 0.5)) hurtPlayer(dmg * 0.8, e);
      if (Math.random() < 0.6) bloodSpray(e.x, e.y, rand(0, TAU), 4, 260, 1.2, BLOOD.demon, 1);
    }
  } else if (m.shape === 'pull') {
    if (Math.random() < 0.3) G.parts.push({ x: p.x + rand(-20, 20), y: p.y + rand(-20, 20), vx: (e.x - p.x) * 0.8, vy: (e.y - p.y) * 0.8, life: 0.5, max: 0.5, col: '#ff9ad0', size: 3 });
  }
}
function leapLand(e, A, m) {
  e.z = 0; const p = G.p, dmg = eDmg() * m.dmg * (e.boss ? 1.25 : 1);
  if (pHitCheck(q => dist(e, q) < m.r + q.r * 0.6)) hurtPlayer(dmg, e);
  vfx.ring(e.x, e.y, e.r, m.r * 1.2, '#8a7060', 0.4, 8); part(e.x, e.y, '#6a5a4a', 18, 240, 0.5, 4); vfx.shake(m.shake || 6); sfx('boom');
}
// főellenség fázisai
function bossPhase(b, dt) {
  if (b.intro > 0) { b.intro -= dt; return; }
  b.age = (b.age || 0) + dt;
  if (b.age > 200 && !b.enraged) { b.enraged = true; b.spd *= 1.2; b.sm = (b.sm || 1) * 1.15; G.banner = { small: true, title: b.bd.name + ' DÜHÖNG', sub: 'Túl sokáig tart a harc', line: '', t: 0, dur: 2.2, col: '#c2401f' }; sfx('roar'); }
  if (b.inv > 0) b.inv -= dt;
  const max = BOSS_MOVES[b.key].length, ph = Math.min(max, 1 + Math.floor((1 - b.hp / b.maxHp) * max));
  if (ph > b.phase) {
    b.phase = ph; b.inv = 1.2; b.act = null; G.charm = 0; G.beams.length = 0; G.shake = 16; sfx('roar'); b.spd *= 1.12;
    for (const k in b.cds) b.cds[k] = Math.min(b.cds[k], 1);
    part(b.x, b.y, RINGS[b.ri].col, 60, 360, 1, 4);
    if (b.key === 'lucifer' && ph >= 4) G.banner = { title: 'LUCIFER', sub: 'Az utolsó ítélet', line: '„Együtt zuhanunk, angyal. Mindörökké.”', t: 0, dur: 3, col: '#c08bff' };
    else if (b.key === 'lucifer') G.banner = { title: 'LUCIFER', sub: ph === 2 ? 'A Hajnalcsillag haragja' : 'A Bukott Fény utolsó lángja', line: ph === 2 ? '„Én vagyok a Fényhozó! Előttem a csillagok is meghajolnak!”' : '„Ha nem uralkodhatom a Mennyben, akkor semmi se maradjon!”', t: 0, dur: 3, col: '#c08bff' };
    else G.banner = { title: b.bd.name, sub: 'feldühödött', line: '', t: 0, dur: 1.8, col: RINGS[b.ri].col };
  }
}
function updBoss(b, dt) { if (b.intro > 0) b.intro -= dt; }

// ---------- támadásjelzések (a démonok alatt) ----------
function drawTelegraph(e) {
  const A = e.act; if (!A || A.ph !== 'wind') return;
  const m = A.m, k = clamp(A.t / (A.wind || m.wind), 0, 1), col = e.boss ? '#c84a2a' : '#c8703a';
  if (m.shape === 'leap') { ctx.save(); ctx.fillStyle = hexA(col, 0.1 + 0.25 * k); ctx.beginPath(); ctx.arc(A.tx, A.ty, m.r, 0, TAU); ctx.fill(); ctx.strokeStyle = hexA(col, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A.tx, A.ty, m.r * k, 0, TAU); ctx.stroke(); ctx.restore(); return; }
  if (m.shape === 'grab') { ctx.save(); ctx.fillStyle = hexA('#8a4ac8', 0.12 + 0.25 * k); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, m.r, A.a - m.half, A.a + m.half); ctx.closePath(); ctx.fill(); ctx.strokeStyle = hexA('#b07ae8', 0.8); ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); ctx.restore(); return; }
  if (m.shape === 'guard' || m.shape === 'mend') return;
  ctx.save();
  if (m.shape === 'arc') {
    const r = m.r + (m.lunge ? m.lunge * 0.18 : 0);
    ctx.fillStyle = hexA(col, 0.10 + 0.22 * k); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, r, A.a - m.half, A.a + m.half); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = hexA(col, 0.55); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, r * k, A.a - m.half, A.a + m.half); ctx.stroke();
  } else if (m.shape === 'circle' || m.shape === 'spin') {
    ctx.fillStyle = hexA(col, 0.08 + 0.18 * k); ctx.beginPath(); ctx.arc(e.x, e.y, m.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = hexA(col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, m.r * k, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(e.x, e.y, m.r, 0, TAU); ctx.stroke();
  } else if (m.shape === 'line') {
    const len = m.spd * m.act * 0.9;
    ctx.translate(e.x, e.y); ctx.rotate(A.a);
    ctx.fillStyle = hexA(col, 0.1 + 0.2 * k); ctx.fillRect(0, -m.w / 2, len, m.w);
    ctx.fillStyle = hexA(col, 0.45); ctx.fillRect(0, -m.w / 2, len * k, 3); ctx.fillRect(0, m.w / 2 - 3, len * k, 3);
  } else if (m.shape === 'proj' && m.ring) {
    ctx.strokeStyle = hexA(m.col, 0.3 + 0.5 * k); ctx.lineWidth = 3; ctx.setLineDash([4, 10]); ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 14 + 40 * k, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
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

function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${c[0]},${c[1]},${c[2]})`; }
