# The Arkangel – bővítési API (src/*.js részekhez)

A játék egyetlen HTML-fájl. Forrás: `src/core.html` (mag) + `src/weapons.js`, `src/upgrades.js`, `src/levels.js`.
A `build.py` a részeket a mag `/*@@PARTS@@*/` jelölője helyére fűzi (a fájl végén, a `requestAnimationFrame(frame)` előtt),
így a részek a mag minden függvényét és konstansát látják. Minden szöveg **magyarul**.

```
python3 build.py                                   # TheArkangel.html, minden résszel
python3 build.py --only weapons.js --out /tmp/a.html   # csak a saját részeddel (más részek kimaradnak; fegyver nélkül tartalék fegyverek)
NODE_PATH=$(npm root -g) node tools/smoke.js /tmp/a.html /tmp/shot   # füstteszt + képernyőképek, 0 = nincs JS-hiba
```

Koordináták: a képernyő 960×640 (HUD: y 0..64), `CX/CY` a képernyő közepe (csak kezelőfelülethez).
A játék **nyílt világban** fut (`src/world.js`): 168×128 csempe, csempe = `TS` (40 px), kamera: `CAM`.
`L, R, T, B` a **látott világrész** határai világkoordinátában (minden képkockában frissül) – ehhez érdemes igazítani mindent, ami képernyőnyi.
Ütközés: `tileAt(x,y)`, `walkable(x,y,r)`, `collideObst(c)`, `losClear(a,b)`, `findFree(x,y)`. Ellenség: `mkEnemy(típus, x, y, ri)` (`src/ai.js`).
A `roomEnter`/`roomClear` események egy harci találkozás (tábor, les, aréna) kezdetét/végét jelzik; `G.room` az éppen aktív találkozás vagy a táj.

## Globális állapot
- `G` – a futam. Fontos mezők: `p` (játékos), `enemies`, `bullets` (ellenséges és baráti is, `f:true` = baráti),
  `parts`, `texts`, `fx`, `hazards`, `room`, `rooms`, `ring` (0..6), `lvl` (legyőzött bűnök száma = nehézség),
  `hub` (Purgatóriumban vagy), `defeated`, `souls`, `blessings` (azonosítók), `relics` (azonosítók),
  `weapon` (aktív fegyver id), `slots = {melee, ranged}`, `ws` (fegyverenkénti állapot), `wlv` (fegyverszintek, 0..4),
  `morph` (fegyver id -> választott átalakulás id), `flags` (szabad tároló), `shake`, `hitstop`, `flash`.
- `G.p` – játékos: `x,y,r,hp,maxHp,spd,dmg (alap 12),fireDelay (0.24),atkSpd (=0.24/fireDelay),shotSpd (560),range (0.85 mp élettartam),
  shots (1),spreadA,pierce,homing,crit (0.05),size (5),back,burn,orbs,lifesteal,regen,dashCd,dashT,inv,grace/maxGrace,
  graceGain,novaMul,shield/shieldMax,soulMul,soulHeal,face (célzási szög),vx,vy,slow`.
  Az áldások ezeket módosítják; a fegyverek **ezekből** számolnak (sebzés = `p.dmg * szorzó`, sebesség `p.atkSpd`, extra lövedék `p.shots-1`, stb.).
- `state`: 'title' | 'story' | 'play' | 'pause' | 'choice' | 'talk' | 'dead' | 'win'.
- `gt` – globális idő (mp), animációkhoz.

## Harci segédfüggvények (magban)
- `hitEnemy(e, dmg, o)` – egy démon sebzése. `o`: `{crit, critAdd, critMul, kb (hátralökés px/s), kbA (irány), stun (mp), slow (mp), burn (mp), hitstop (mp), silentNum, tag}`. Kritet magától dob (`p.crit`). Igazat ad, ha talált.
- `hitCircle(x,y,r,dmg,o,skipSet)`, `hitArc(x,y,r,szög,félszög,dmg,o,skipSet)`, `hitLine(x1,y1,x2,y2,szélesség,dmg,o,skipSet)` – terület; a `skipSet` (Set) megakadályozza a többszöri találatot ugyanazon a lendületen belül. Visszaadja az eltalált démonokat.
- `eachEnemy(f)`, `enemiesNear(x,y,r)`, `nearestEnemy()`, `canHit(e)`.
- `cutBullets(pred)`, `cutBulletsCircle(x,y,r)`, `cutBulletsArc(x,y,r,a,half)` – ellenséges lövedékek törlése (hárítás); a darabszámot adja vissza.
- `pBullet(x,y,a,spd,o)` – baráti lövedék a közös csővezetéken (falnak ütközik, átszúr `pierce` szerint, követ `p.homing` szerint).
  `o`: `{r, dmg, life, pierce, col, ho (hitEnemy-opciók), onHit(e,b), onEnd(b), upd(b,dt) -> false = vége, ghost (falon átmegy), bounce, shape, drw(b) (saját rajz)}`.
  Ha `b.drw` létezik, a mag azt hívja a lövedék rajzolásához (a sötétítés fölött, 'lighter' módban), különben fénygömböt rajzol.
- `addFx({upd(dt) -> false ha vége, drw(), under:true|false, glw()})` – saját effekt-objektum. `under:true` a démonok alatt (talajjel), különben a sötétítés fölött. `glw()` a ragyogás-rétegbe rajzol: használd a `glowDot(x,y,r,col,alpha)` függvényt, vagy a `gctx`-et (világkoordinátás, már skálázva). Teremváltáskor törlődnek.
- `part(x,y,col,n,spd,life,size)` – részecskék. `floatText(x,y,szöveg,col,life,size)`.
- `vfx` paletta: `vfx.burst`, `vfx.spark(x,y,a,szórás,col,n,spd,life,size)`, `vfx.feathers(x,y,n,col)`, `vfx.ring(x,y,r0,r1,col,dur,w)`, `vfx.shake(n)`, `vfx.flash(a)`, `vfx.text`, `vfx.glyph(x,y,col,r,dur,spin)` (forgó rúnakör a talajon).
- Színek: `PAL.holy, gold, white, soul, blood, fire, ember, void, frost, storm, life, rose, shadow, bone`. Ritkaság: `RAR.common|rare|epic|legend|morph|relic` → `{n, c}`.
- `hexA('#rrggbb', alpha)` → rgba-szöveg. `arcDiff(a,b)`, `angTo(a,b)`, `dist(a,b)`, `rand`, `randi`, `choice`, `shuffle`, `clamp`, `segDist`.
- Hang: `sfx(név)` – meglévők: shoot, hit, kill, hurt, dash, pick, soul, door, roar, nova, holy, block, buy, laser, boom, charge, slash, coin, unlock.
  Újat így adhatsz: `SFX.saját = () => { tone(frekv, hossz, 'sine'|'square'|'sawtooth'|'triangle', hangerő, csúszás, késleltetés); noise(hossz, hangerő, szűrőfrekv, késl); };`
- Rajzolás: `ctx` (világkoordináták, a képernyőrázás már alkalmazva), `drawBlade(x,y,skála)`, `drawAngel(...)`, `SERIF`, `SANS` betűk.
- Ellenség mezői: `x,y,r,hp,maxHp,type,boss,dead,spawn,flash,burn,stun,slowT,kbx,kby` – nyugodtan tehetsz rá saját mezőt (pl. `e.mark`).

## Események (relikviákhoz, fegyverekhez)
`on(esemény, fn)` – feliratkozás (egyszer, betöltéskor). `emit` a magból jön. `modify(esemény, érték, ...)` láncban módosít.
- `emit`: `runStart`, `tick (dt)`, `hit (e, dmg, o)`, `kill (e)`, `hurt (dmg, forrás)`, `dash`, `nova`, `roomEnter (room)`, `roomClear (room)`,
  `bossKill (b)`, `ringEnter (ri)`, `hubEnter (honnanRi|null)`, `spawn (e)` (új démon, a kísértések erősítik), `relic (id)`, `offer (o)`, `talkEnd (room)`.
- `modify`: `dmgOut (d, e, o) -> d`, `dmgIn (d, forrás) -> d`, `revive (false) -> true` (ha igaz, a játékos nem hal meg; állítsd be te a hp-t).
Az ereklye-hookok mindig ellenőrizzék: `if (!hasRelic('id')) return;`.

## Fegyverek – `Object.assign(WEAPONS, { id: {...} })`
```
{ n: 'Teljes név', short: 'Rövid', kind: 'melee'|'ranged', col: '#hex' (a fegyver fő színe), d: 'leírás (a talapzatnál)',
  update(p, ws, dt, aim) { ... },   // minden képkockában; aim = célzási szög vagy null (nem támad). ws = G.ws[id] = {cd, t, ...saját};
                                    // ws.cd magától csökken p.atkSpd-vel szorozva; tartott/feltöltős fegyver: figyeld, mikor lesz aim null.
  drawHeld(p, ws) { ... },          // a fegyver rajza a játékos kezében (világkoordináták) – kötelező
  glow(p, ws) { glowDot(...) },     // opcionális ragyogás
  icon(x, y, s) { ... },            // ikon a HUD-on, talapzaton, kártyán (x,y középpont, s skála, ~1 = 40 px)
  onEquip(p, ws), onUnequip(p, ws), // opcionális
  lv: ['1. szint leírása', '2.', '3.', '4.'],   // fegyverszint-fejlesztések szövege (G.wlv[id] 1..4)
  morphs: [{ id, n, d, i }, { id, n, d, i }],   // két átalakulás; G.morph[id] tárolja a választottat (3. szinttől ajánlható)
}
```
A fegyver a `G.wlv[id]`-t és a `G.morph[id]`-t olvassa, és ennek megfelelően viselkedik. Az aktív fegyver állapota `wstate(id)`.

## Fejlesztések – `UPG.offers(src, n)` és `BL`
- `BL` – áldások tömbje: `{ id, n, d, i (ikon-karakter), rar, max?, w? (csak ha ez a fegyver nálad van), req?() , a(p) }`. Bővíthető: `BL.push(...)`.
- `applyBlessing(b)`, `gainRelic(id)`, `blessOffer(b)`, `relicOffer(id)`, `blessOk(b)`, `takeOffer(o)`.
- Ajánlat-objektum: `{ kind:'bless'|'weapon'|'morph'|'relic'|'fuse'|'heal', id, n, d, i, icon?(x,y,s), rar, col?, price?, apply() }`.
- `UPG.offers(src, n)` – a mag ezt hívja. **Erősítés csak a bűntől jön**: a `src/tempt.js` felülírja, így 'boss' → a legyőzött bűn kísértései (`TEMPTS`), 'morph' → átalakulás, minden más üres. Bolt, Égi Oltár, ereklyeoltár nincs, az `npc.reward` nem ad választást.
- `TEMPTS` – a bűnök kísértései: `{ ri, id, n, i, d (rád hat), d2 (a démonokra hat), p(játékos), e(G.em) }`. A felvettek: `G.tempts`. A démonok szorzói: `G.em = { hp, spd, atk, sm, shots, dmg, homing, armor }`; a `spawn` esemény (`mkEnemy`, `spawnBoss`) alkalmazza őket, `G.eDmgMul` az `eDmg()`-t, `G.eHoming` az ellenséges lövedékeket módosítja.
- `UPG.afterSin(kész)` – a kísértés után: minden fegyver +1 szint, a 3. szinttől átalakulás-választás.
- Kapuzár: belépéskor `G.sealed = ri`, a játékos addig nem hagyhatja el a tájat, amíg a bűn él (`sealUpdate` a `world.js`-ben).
- `openChoice(src, cb, opts?)` – választóképernyő (opts nélkül `UPG.offers(src,3)`).
- `RELICS` – `Object.assign(RELICS, { id: { n, d, i, col, rar, apply?(p) } })`.

## Pályák és történet – `LEVELS`
```
LEVELS[ri] = {                         // ri 0..6 (Bujaság..Kevélység)
  intro: [sor, ...],                   // a gyűrűbe lépéskor
  bossTalk: [sor, ...],                // a főellenség termébe lépéskor, utána jön a harc
  rooms: [{ x, y,                      // rácskoordináta; a szomszédos termek között automatikusan ajtó lesz
    type: 'start'|'normal'|'treasure'|'shop'|'shrine'|'boss',   // pontosan egy start és egy boss
    title: 'Terem neve',               // belépéskor halványan kiírva
    obst: [[tx, ty, w, h], ...],       // akadályok csempékben (3D kőtömbként rajzolva)
    waves: [ [[típus, tx, ty], ...], [...] ],   // egymás utáni hullámok (normal teremben kötelező legalább egy)
    npc: { tx, ty, name, look:'soul'|'guide', talk: [sor...], reward: 'story'|'shrine'|... },  // a terem megtisztítása után szól
    enterTalk: [sor, ...] }]           // belépéskor egyszer
}
LEVELS.hub = { guide: 'Vergiliusz', intro: [sor...], after: [[...],[...], ... 6 db] }  // after[k]: k+1 legyőzött bűn után
LEVELS.epilogue = [sor, ...]           // Lucifer bukása után
sor = 'narrátor szövege' | { who: 'Név', text: '...', col?: '#hex' }
```
Démontípusok (`ET`): imp, fly, spitter, brute, wisp, splitter, mini, turret, teleporter, shadow.
Ajtók helye: fent és lent középen (tx 11..16), bal és jobb oldalt középen (ty 5..10) – ezeket hagyd szabadon.
A játékos a szemközti ajtónál vagy a terem közepén (kb. tx 14, ty 9) lép be.
