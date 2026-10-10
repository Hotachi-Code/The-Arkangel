// Füstteszt: node tools/smoke.js <html> [screenshot-prefix]
// Futtatás: NODE_PATH=$(npm root -g) node tools/smoke.js TheArkangel.html /tmp/shot
// Végigmegy: cím -> Purgatórium -> minden fegyver kipróbálása -> minden gyűrű egy harci terme -> főellenség -> vissza.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = path.resolve(process.argv[2] || 'TheArkangel.html'), shot = process.argv[3];
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto('file://' + file);
  await pg.waitForTimeout(300);
  await pg.keyboard.press('Enter'); await pg.keyboard.press('Enter');
  const skipTalk = async () => { for (let i = 0; i < 80; i++) { const st = await pg.evaluate(() => ARK.state); if (st !== 'talk') break; await pg.evaluate(() => { ARK.G.talk.t = 999; ARK.G.talk.at = 0; ARK.talkNext(); ARK.G.talk && (ARK.G.talk.at = 0); }); } };
  await pg.waitForTimeout(500); await skipTalk();
  if (shot) await pg.screenshot({ path: shot + '_hub.png' });
  const weapons = await pg.evaluate(() => Object.keys(ARK.WEAPONS));
  console.log('weapons:', weapons.join(', '));
  const rings = [0, 1, 2, 3, 4, 5, 6];
  for (const ri of rings) {
    await pg.evaluate(ri => { const G = ARK.G; if (ri === 6) G.defeated = [0, 1, 2, 3, 4, 5]; ARK.enterRing(ri); }, ri);
    await skipTalk();
    const info = await pg.evaluate(() => { const G = ARK.G; const ks = Object.keys(G.rooms); const k = ks.find(k => G.rooms[k].type === 'normal' && !G.rooms[k].cleared) || ks.find(k => G.rooms[k].type === 'normal'); if (k) ARK.enterRoom(G.rooms[k], null); G.p.inv = 9999; return { rooms: ks.length, types: ks.map(k => G.rooms[k].type).join(',') }; });
    await skipTalk();
    const w = weapons[ri % weapons.length];
    await pg.evaluate(w => ARK.swapWeapon(w), w);
    await pg.waitForTimeout(900);
    await pg.mouse.move(820, 300); await pg.mouse.down(); await pg.waitForTimeout(1600); await pg.mouse.up(); await pg.waitForTimeout(300);
    if (shot) await pg.screenshot({ path: `${shot}_ring${ri}_${w}.png` });
    const st = await pg.evaluate(() => ({ en: ARK.G.enemies.length, kills: ARK.G.kills, st: ARK.state }));
    console.log(`ring ${ri} rooms=${info.rooms} [${info.types}] weapon=${w} enemiesLeft=${st.en} kills=${st.kills} state=${st.st}`);
    await skipTalk();
  }
  // főellenség + jutalom + vissza a Purgatóriumba
  await pg.evaluate(() => { const G = ARK.G; G.defeated = [0]; ARK.enterRing(1); });
  await skipTalk();
  await pg.evaluate(() => { const G = ARK.G; const k = Object.keys(G.rooms).find(k => G.rooms[k].type === 'boss'); ARK.enterRoom(G.rooms[k], null); G.p.inv = 9999; });
  await skipTalk(); await pg.waitForTimeout(3000);
  await pg.evaluate(() => ARK.killEnemy(ARK.G.boss)); await pg.waitForTimeout(2200);
  console.log('after boss state:', await pg.evaluate(() => ARK.state));
  if (shot) await pg.screenshot({ path: shot + '_choice.png' });
  await pg.evaluate(() => ARK.pick(0)); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const G = ARK.G; if (G.portal) { G.p.x = G.portal.x; G.p.y = G.portal.y; } }); await pg.waitForTimeout(800);
  await skipTalk();
  console.log('back in hub:', await pg.evaluate(() => ({ hub: ARK.G.hub, defeated: ARK.G.defeated })));
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
