// Füstteszt: NODE_PATH=$(npm root -g) node tools/smoke.js TheArkangel.html [képernyőkép-előtag]
// Purgatórium -> minden táj (fegyverváltással, táborharc) -> főellenség-aréna -> jutalom -> vissza a Purgatóriumba.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const file = path.resolve(process.argv[2] || 'TheArkangel.html'), shot = process.argv[3];
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await pg.goto('file://' + file);
  await pg.waitForTimeout(300);
  await pg.keyboard.press('Enter'); await pg.keyboard.press('Enter');
  const skipTalk = async () => { for (let i = 0; i < 80; i++) { const st = await pg.evaluate(() => ARK.state); if (st === 'choice') { await pg.evaluate(() => ARK.pick(0)); continue; } if (st !== 'talk') break; await pg.evaluate(() => { ARK.G.talk.t = 999; ARK.G.talk.at = 0; ARK.talkNext(); ARK.G.talk && (ARK.G.talk.at = 0); }); } };
  await pg.waitForTimeout(600); await skipTalk();
  if (shot) await pg.screenshot({ path: shot + '_hub.png' });
  const weapons = await pg.evaluate(() => Object.keys(ARK.WEAPONS));
  console.log('weapons:', weapons.join(', '));
  for (const ri of [0, 1, 2, 3, 4, 5, 6]) {
    await pg.evaluate(ri => { const G = ARK.G; if (ri === 6) G.defeated = [0, 1, 2, 3, 4, 5]; ARK.enterRing(ri); G.p.inv = 9999; }, ri);
    await skipTalk();
    const w = weapons[ri % weapons.length];
    await pg.evaluate(w => ARK.swapWeapon(w), w);
    // menj az első táborhoz
    const camp = await pg.evaluate(ri => { const G = ARK.G; const o = G.pois.find(o => o.ri === ri && o.type === 'camp'); G.p.x = o.x; G.p.y = o.y + 200; return o.title; }, ri);
    await pg.waitForTimeout(600); await skipTalk(); await pg.waitForTimeout(800);
    await pg.mouse.move(700, 350); await pg.mouse.down(); await pg.waitForTimeout(1800); await pg.mouse.up();
    if (shot) await pg.screenshot({ path: `${shot}_ring${ri}_${w}.png` });
    const st = await pg.evaluate(() => ({ en: ARK.G.enemies.filter(e => e.aggro).length, all: ARK.G.enemies.length, kills: ARK.G.kills, st: ARK.state, reg: ARK.G.curReg }));
    console.log(`ring ${ri} camp="${camp}" weapon=${w} aggro=${st.en}/${st.all} kills=${st.kills} state=${st.st} region=${st.reg}`);
    await skipTalk();
  }
  // főellenség
  await pg.evaluate(() => { const G = ARK.G; G.defeated = []; ARK.enterRing(1); const o = G.pois.find(o => o.ri === 1 && o.type === 'boss'); G.p.x = o.x; G.p.y = o.y + 150; G.p.inv = 9999; });
  await pg.waitForTimeout(500); await skipTalk(); await pg.waitForTimeout(2500);
  if (shot) await pg.screenshot({ path: shot + '_boss.png' });
  console.log('boss present:', await pg.evaluate(() => !!ARK.G.boss));
  await pg.evaluate(() => ARK.killEnemy(ARK.G.boss)); await pg.waitForTimeout(2300);
  console.log('after boss state:', await pg.evaluate(() => ARK.state));
  await pg.evaluate(() => ARK.pick(0)); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const G = ARK.G; if (G.portal) { G.p.x = G.portal.x; G.p.y = G.portal.y; } }); await pg.waitForTimeout(800);
  await skipTalk();
  console.log('back in hub:', await pg.evaluate(() => ({ hub: ARK.G.hub, defeated: ARK.G.defeated })));
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n') : 'no errors');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
