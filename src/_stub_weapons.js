// TARTALÉK: csak akkor kerül a buildbe, ha a src/weapons.js nincs benne (lásd build.py --only).
Object.assign(WEAPONS, {
  blade: { n: 'Égi Penge', short: 'Penge', kind: 'melee', col: '#ffe9a8', d: 'Közelharci suhintás.',
    update(p, ws, dt, aim) { if (aim !== null && ws.cd <= 0) { ws.cd = 0.456; slash(aim); } },
    icon(x, y, s) { ctx.translate(x, y); ctx.rotate(Math.PI / 4); drawBlade(0, 10 * s, s); },
    lv: ['+1', '+2', '+3', '+4'], morphs: [{ id: 'blade_a', n: 'Teszt A', d: 'teszt', i: '✦' }, { id: 'blade_b', n: 'Teszt B', d: 'teszt', i: '✧' }] },
  bow: { n: 'Szent Fény', short: 'Fény', kind: 'ranged', col: '#fff1c4', d: 'Fénylövedékek.',
    update(p, ws, dt, aim) { if (aim !== null && ws.cd <= 0) { ws.cd = 0.24; shoot(aim); } },
    icon(x, y, s) { ctx.fillStyle = '#fff6c8'; ctx.beginPath(); ctx.arc(x, y, 8 * s, 0, TAU); ctx.fill(); },
    lv: ['+1', '+2', '+3', '+4'], morphs: [{ id: 'bow_a', n: 'Teszt A', d: 'teszt', i: '✦' }, { id: 'bow_b', n: 'Teszt B', d: 'teszt', i: '✧' }] },
});
