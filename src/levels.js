// The Arkangel – kézzel épített pályák és történet (LEVELS)
// Hét gyűrű, Purgatórium (Vergiliusz), epilógus és a címképernyő története.
(() => {
  // ---------- segédek ----------
  const ANG = '#ffe27a', VIR = '#bfe6ff', SOUL = '#8fe8ff';
  const a = text => ({ who: 'Arkangyal', text, col: ANG });
  const v = text => ({ who: 'Vergiliusz', text, col: VIR });
  const s = (who, text) => ({ who, text, col: SOUL });
  const d = (who, col) => text => ({ who, text, col });
  // vízszintes tükrözés (a terem 28 csempe széles)
  const mir = (...rs) => { const o = []; for (const [x, y, w, h] of rs) { o.push([x, y, w, h]); if (28 - x - w !== x) o.push([28 - x - w, y, w, h]); } return o; };
  // tükrözés mindkét tengelyre (16 csempe magas)
  const quad = (...rs) => { const o = []; for (const r of mir(...rs)) { o.push(r); const [x, y, w, h] = r; if (16 - y - h !== y) o.push([x, 16 - y - h, w, h]); } return o; };
  // hullám-segéd: 'imp 5 3, wisp 22 3' -> [['imp',5,3],['wisp',22,3]]
  const W = str => str.split(',').map(q => { const [t, x, y] = q.trim().split(/\s+/); return [t, +x, +y]; });

  // ======================================================================
  // PURGATÓRIUM – Vergiliusz
  // ======================================================================
  LEVELS.hub = {
    guide: 'Vergiliusz',
    intro: [
      'Szürke hajnal egy hegyoldalon, amely sosem ér véget. Hét kapu áll előtted, és egy árny, aki rád várt.',
      v('Üdvözöllek, Arkangyal. Vergiliusz vagyok. Egyszer egy költőt vezettem le a mélybe. Most téged vezetlek.'),
      v('Ez a Purgatórium, a tisztulás hegye. Innen nyílik a Pokol hét gyűrűje – hét bűn, hét démon, hét kapu.'),
      v('A talapzatokon fegyverek várnak. Három közelharci – köztük egy kasza – és három távolsági.'),
      v('Egy közelharci és egy távolsági fegyvert vihetsz. Lépj a talapzatra a cseréhez; harc közben X-szel váltasz.'),
      v('Az első hat kaput bármilyen sorrendben járhatod. Minden elbukott bűn letör egy lakatot a hetedikről, a Kevélységéről.'),
      v('Vigyázz: minden gyűrűnek átka van. A bűn ott ül a levegőben, és rád is rád tapad, amíg ott jársz.'),
      v('És minél több bűnt döntesz le, annál keményebben áll ellen a többi. A Pokol tanul. Tanulj te is.'),
      a('És ha elesem?'),
      v('Akkor a fényed visszatér az Éghez, és minden elölről kezdődik. Itt nincs második esély – csak újabb.'),
    ],
    after: [
      [v('Az első lakat lehullott. Hallod? A Pokol most már tudja a neved.'),
        v('Ne bízd el magad. A legyőzött bűn is visszanéz rád – csak most már belülről.')],
      [v('Kettő. Látom a szárnyadon a koromfoltokat. Nem szégyen: csak az marad tiszta, aki sosem szállt alá.'),
        a('Minden lélek, akit odalent látok… mind azt hitte, hogy neki jár valami.'),
        v('Jegyezd meg ezt a mondatot. Még szükséged lesz rá.')],
      [v('Három bűn – a hegy fele. Tudod már, mi a közös bennük?'),
        a('Mindegyik egy kicsit önmagát tette a középpontba.'),
        v('Igen. Ezért áll a Kevélység kapuja a hat közepén. Mindegyik belőle nő ki, mint ág a törzsből.')],
      [v('Négy. Dante ezen a ponton sírt. Te nem sírsz – de látom, hogy hallgatsz. Az is gyász.'),
        v('Ne keményedj meg. A harag és a gőg is így kezdődik: azzal, hogy már semmi sem fáj.')],
      [v('Öt. A hetedik kapu reszket. Lucifer érzi, hogy jössz – és mégsem fél. Pontosan ez a bűne.'),
        a('Mit tudsz róla, költő?'),
        v('Azt, hogy ő volt a legfényesebb. És hogy a fény, amely csak önmagát nézi, jéggé fagy.')],
      [v('Mind a hat lakat lehullott. Én innen nem kísérhetlek. A jég alatt nincs helye költőnek, csak csendnek.'),
        v('Ne gyűlöld őt. Ő is fény volt egyszer. Ezt soha ne feledd – és azt se, hogy ő elfelejtette.'),
        a('Visszajövök, Vergiliusz.'),
        v('Tudom. Az alázatosak mindig visszatalálnak. Menj.')],
    ],
  };
  // a Vergiliusz-párbeszéd minden visszatéréskor újra elérhető (a mag csak egyszer állítaná vissza)
  on('hubEnter', from => { if (from !== null && from !== undefined && G && G.flags) G.flags.hubTalk2 = false; });
  // párbeszéd alatt a mag nem halványítja ki a belépési sötétítést – félig tüntessük el, hogy a terem látsszon a szöveg mögött
  const dimForTalk = () => { if (G && G.fade > 0.4) G.fade = 0.4; };
  on('roomEnter', room => { if (state === 'talk' || (room && room.enterTalk && !room.enterTalked)) dimForTalk(); });
  on('ringEnter', ri => { if (LEVELS[ri] && LEVELS[ri].intro) dimForTalk(); });

  // ======================================================================
  // I. BUJASÁG – Asmodeus
  // ======================================================================
  const C0 = RINGS[0].col, ASM = d('Asmodeus', C0);
  LEVELS[0] = {
    intro: [
      'Az első kapu mögött szél üvölt. Nem hideg: meleg, illatos, és soha, soha nem áll el.',
      'Lelkek sodródnak benne, mint seregélyek a viharban. Egymásba kapaszkodnak, és mégis egyedül vannak.',
      v('Itt azok bűnhődnek, akik a vágyat az ész fölé emelték. A szél, amely hajtja őket, a saját szenvedélyük.'),
      v('Ne nézz sokáig a szemükbe. Az átok elbűvöl: aki megérint, egy pillanatra kiveszi a kezedből a fegyvert.'),
    ],
    bossTalk: [
      'Selyemfüggönyök hullámzanak, pedig itt nincs szél. Mögöttük valaki nevet – halkan, szinte kedvesen.',
      ASM('Egy angyal… milyen ritka vendég. Fáradt lehetsz. Hány ezer éve nem ölelt meg senki?'),
      a('A szeretet nem kalitka, Asmodeus. Te bilincset kovácsoltál belőle.'),
      ASM('A bilincs is ölelés, ha elég szorosan tartod. Maradj. Itt mindenki marad.'),
      a('Én nem. És ők sem fognak.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Vágy Kapuja',
        obst: quad([5, 3, 1, 1], [9, 3, 1, 1]) },
      { x: -1, y: 0, type: 'shrine', title: 'Szemiramisz Hamvai',
        obst: mir([7, 3, 1, 3], [7, 10, 1, 3], [10, 3, 1, 1], [10, 12, 1, 1]) },
      { x: 0, y: -1, type: 'normal', title: 'A Szélvihar Csarnoka',
        obst: mir([5, 3, 3, 1], [7, 4, 2, 1], [5, 12, 3, 1], [7, 11, 2, 1]),
        waves: [W('imp 6 6, imp 21 6, wisp 14 4, imp 9 12'),
          W('spitter 5 4, spitter 22 4, imp 9 12, imp 18 12, wisp 14 5')] },
      { x: -1, y: -1, type: 'normal', title: 'Az Ölelkező Árnyak Kertje',
        obst: quad([4, 3, 4, 1], [4, 4, 1, 2]),
        waves: [W('wisp 9 5, wisp 18 5, imp 6 11, imp 21 11'),
          W('imp 6 6, imp 21 6, spitter 9 11, spitter 18 11, wisp 14 4')],
        npc: { tx: 13, ty: 5, name: 'Paolo és Francesca', look: 'soul', reward: 'story', talk: [
          'Két árny lebeg a sövények között, összefonódva. A szél tépi őket, de egymást nem engedik el.',
          s('Francesca', 'Ne riadj meg, fénylő. Mi nem bántunk senkit. Csak egymást szerettük – rosszkor, rossz helyen.'),
          s('Paolo', 'Egy könyvet olvastunk, Lancelot és Ginevra csókjáról. Azon a napon tovább már nem olvastunk.'),
          s('Francesca', 'Nincs nagyobb fájdalom, mint a boldog időre emlékezni a nyomorúságban.'),
          a('Nem ítélni jöttem. Csak a bűnt, amely ezt a szelet fújja.'),
          s('Paolo', 'Akkor vidd ezt. Egy szikrát abból, ami tiszta volt bennünk – mielőtt bűn lett belőle.'),
        ] } },
      { x: 1, y: -1, type: 'shop',  // a bolt nevét a mag írja ki
        obst: quad([3, 2, 3, 1]) },
      { x: 0, y: -2, type: 'normal', title: 'A Rózsaszín Örvény',
        obst: [[9, 4, 1, 1], [18, 4, 1, 1], [9, 11, 1, 1], [18, 11, 1, 1], [7, 7, 1, 2], [20, 7, 1, 2], [13, 3, 2, 1], [13, 12, 2, 1]],
        waves: [W('wisp 5 3, wisp 22 3, wisp 5 12, wisp 22 12'),
          W('imp 4 4, imp 23 4, imp 4 11, imp 23 11, spitter 14 4'),
          W('spitter 6 3, spitter 21 3, wisp 6 12, wisp 21 12, imp 10 7, imp 17 7')] },
      { x: 1, y: -2, type: 'treasure', title: 'A Fehér Rózsa Oltára',
        obst: [...quad([10, 5, 1, 1]), ...quad([4, 3, 2, 2])] },
      { x: 0, y: -3, type: 'normal', title: 'Kleopátra Lépcsője',
        obst: mir([4, 3, 6, 1], [6, 5, 3, 1], [4, 12, 6, 1], [6, 10, 3, 1]),
        enterTalk: ['Királynők és hősök árnyai keringenek a lépcsőn: Kleopátra, Dídó, Helené. Mind egy ölelésért adták oda a birodalmukat.'],
        waves: [W('imp 5 6, imp 22 6, imp 5 9, imp 22 9, spitter 14 3'),
          W('wisp 8 7, wisp 19 7, spitter 4 2, spitter 23 2, imp 4 13, imp 23 13'),
          W('spitter 10 2, spitter 17 2, wisp 5 7, wisp 22 7, imp 9 13, imp 18 13, imp 14 4')] },
      { x: 0, y: -4, type: 'boss', title: 'Asmodeus Nászterme',
        obst: quad([4, 3, 1, 1]) },
    ],
  };

  // ======================================================================
  // II. TORKOSSÁG – Belzebub
  // ======================================================================
  const C1 = RINGS[1].col, BEL = d('Belzebub', C1);
  LEVELS[1] = {
    intro: [
      'Hideg, nehéz eső hull, fekete és zsíros. A föld bűzlik, mint egy tál, amelyet soha senki nem mosott el.',
      'A sárban lelkek fetrengenek. Valaha ettek, ittak, faltak – most őket falja az eső.',
      v('Torkosság. Nem a kenyér bűne, Arkangyal, hanem a mértéké. Itt mindenki többet akart, mint amennyi elég.'),
      v('A démonok itt felfalják a fényed, és ahol meghalnak, lassító epe marad utánuk. Ne állj bele.'),
    ],
    bossTalk: [
      'A hosszú asztalon lakoma rothad. Legyek zúgnak felette, mint egy kórus, amely egyetlen szót ismer: még.',
      BEL('Szárnyak! Fehér, ropogós szárnyak! Ezer éve nem kóstoltam fényt.'),
      a('Minden falatod egy lélek, amelyet sosem töltöttél meg. Üres vagy, Belzebub.'),
      BEL('ÜRES? Én vagyok maga az éhség! Mindent felfalok – az eget is, ha kell!'),
      a('Akkor kezdd velem. Torkodon akadok.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Fekete Eső Kapuja',
        obst: quad([6, 3, 2, 1], [6, 4, 1, 1]) },
      { x: 1, y: 0, type: 'normal', title: 'A Sárlakoma',
        obst: mir([6, 4, 2, 2], [6, 10, 2, 2]),
        waves: [W('splitter 5 3, splitter 22 3, imp 9 12, imp 18 12'),
          W('fly 4 3, fly 5 3, fly 22 12, fly 23 12, brute 14 3')] },
      { x: 1, y: 1, type: 'treasure', title: 'Az Érintetlen Asztal',
        obst: [[9, 4, 10, 1], ...quad([5, 3, 1, 1])] },
      { x: 2, y: 0, type: 'normal', title: 'A Sártenger',
        obst: [[5, 3, 3, 2], [20, 3, 3, 2], [8, 11, 2, 2], [18, 11, 2, 2], [5, 12, 1, 1], [22, 12, 1, 1]],
        waves: [W('splitter 9 3, splitter 18 3, fly 4 12, fly 23 12, imp 14 4'),
          W('brute 5 7, brute 22 7, fly 10 2, fly 17 2, splitter 14 4')],
        npc: { tx: 14, ty: 5, name: 'Ciacco', look: 'soul', reward: 'story', talk: [
          'Egy lélek emelkedik fel a sárból, csöpögő arccal. Rád néz, és mintha nevetni próbálna.',
          s('Ciacco', 'Ismersz? Nem. Senki sem ismer. Firenzében Ciaccónak hívtak – a Disznónak. Kinevettek, de etettek.'),
          s('Ciacco', 'Esznek itt mind, örökké. Egy falat sem tölt meg, mert az éhség nem a gyomorban lakik.'),
          a('Akkor hol?'),
          s('Ciacco', 'Abban a lyukban, amit Isten helyett tömtünk be kenyérrel, borral, bármivel. A lyuk csak nőtt.'),
          s('Ciacco', 'Ha visszatérsz a fénybe, említs meg valakinek. Egy név, amit szeretettel mondanak ki – az táplál.'),
        ] } },
      { x: 2, y: -1, type: 'shop',  // a bolt nevét a mag írja ki
        obst: [[3, 2, 2, 2], [23, 2, 2, 2], [3, 12, 2, 2], [23, 12, 2, 2]] },
      { x: 3, y: -1, type: 'shrine', title: 'A Böjtölők Oltára',
        obst: quad([9, 4, 1, 2], [6, 3, 1, 1]) },
      { x: 3, y: 0, type: 'normal', title: 'Kerberosz Vályúja',
        obst: [[5, 3, 18, 1], [5, 12, 18, 1]],
        enterTalk: ['Három torok morog valahol a sötétben. A vályú üres, de Kerberosz kutyái még mindig nyalják.'],
        waves: [W('brute 6 6, brute 21 6, imp 8 13, imp 19 13'),
          W('splitter 6 9, splitter 21 9, fly 9 2, fly 10 2, fly 17 2, fly 18 2'),
          W('brute 14 5, splitter 6 6, splitter 21 6, imp 4 13, imp 23 13, fly 14 5')] },
      { x: 4, y: 0, type: 'normal', title: 'A Hízott Legyek Kamrája',
        obst: quad([5, 3, 1, 1], [8, 4, 1, 1], [11, 4, 1, 1]),
        waves: [W('fly 5 6, fly 6 6, fly 21 6, fly 22 6, fly 13 3, fly 14 3, splitter 8 12, splitter 19 12'),
          W('brute 6 4, brute 21 4, splitter 14 4, imp 6 11, imp 21 11, fly 9 13, fly 18 13'),
          W('brute 7 7, brute 20 7, splitter 9 2, splitter 18 2, fly 4 13, fly 23 13, imp 14 4')] },
      { x: 5, y: 0, type: 'boss', title: 'Belzebub Ebédlője',
        obst: mir([4, 3, 1, 1], [4, 12, 1, 1]) },
    ],
  };

  // ======================================================================
  // III. FÖSVÉNYSÉG – Mammon
  // ======================================================================
  const C2 = RINGS[2].col, MAM = d('Mammon', C2);
  LEVELS[2] = {
    intro: [
      'Aranyból rakott hegyek magasodnak. Alattuk lelkek görgetnek hatalmas súlyokat, és egymásnak ütköztetik őket.',
      '„Miért fogod?” – kiáltja az egyik. „Miért szórod?” – feleli a másik. Aztán megfordulnak, és kezdik elölről.',
      v('Fösvények és tékozlók. Egyik sem tudta, mire való a kincs. Itt egymás terhét görgetik az idők végezetéig.'),
      v('Vigyázz a zsebedre: minden találat lelkeket lop. Öld meg a tolvajt, és visszakapod, ami a tiéd.'),
    ],
    bossTalk: [
      'Pénzérmék hullanak a mennyezetről, véget nem érő esőként. Mindegyiken egy arc: egy eladott lélek arca.',
      MAM('Á, egy vevő! Vagy eladó? Mondd az árad, angyal. Mindennek van ára. A fénynek is.'),
      a('A kegyelemnek nincs ára. Ezért nem érted soha.'),
      MAM('Ami ingyen van, az semmit sem ér. Ezt idelent minden lélek tudja, aki számol.'),
      a('Akkor számold meg a napjaidat, Mammon. Kevesebb van belőlük, mint aranyad.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Pénzváltók Kapuja',
        obst: mir([5, 3, 2, 1], [5, 12, 2, 1], [9, 3, 1, 1], [9, 12, 1, 1]) },
      { x: 0, y: 1, type: 'normal', title: 'A Görgetett Terhek Útja',
        obst: [[6, 4, 2, 2], [20, 4, 2, 2], [9, 10, 2, 2], [17, 10, 2, 2]],
        waves: [W('imp 5 3, imp 22 3, turret 14 4, imp 9 13'),
          W('teleporter 5 12, teleporter 22 12, imp 4 3, imp 23 3, turret 14 4')] },
      { x: -1, y: 1, type: 'shop',  // a bolt nevét a mag írja ki
        obst: quad([3, 3, 1, 2], [5, 2, 2, 1]) },
      { x: 1, y: 1, type: 'normal', title: 'Midász Kertje',
        obst: quad([6, 3, 1, 1], [9, 4, 1, 1], [5, 6, 1, 1]),
        waves: [W('turret 6 7, turret 21 7, imp 10 2, imp 17 2, imp 14 12'),
          W('teleporter 9 2, teleporter 18 2, imp 4 13, imp 23 13, imp 10 13, turret 14 4')],
        npc: { tx: 14, ty: 4, name: 'Midász király', look: 'soul', reward: 'story', talk: [
          'Aranyszobrok állnak a kertben: egy kutya, egy rózsa, egy kislány. Mellettük egy öreg ül, kesztyűs kézzel.',
          s('Midász', 'Ne érj hozzám! …Bocsáss meg. Megszokás. Amihez hozzáértem, arannyá vált. A kenyér. A bor. A lányom.'),
          s('Midász', 'Kértem az isteneket, és megadták. Ez a legkegyetlenebb, amit egy isten tehet: megadja, amit kérsz.'),
          a('És most mit kérnél?'),
          s('Midász', 'Egy almát, amely alma marad. Egy kezet, amely kéz marad, ha megfogom.'),
          s('Midász', 'Nincs már mit adnom, csak ezt. Fogd – ez az egyetlen, amit nem változtattam arannyá.'),
        ] } },
      { x: 1, y: 2, type: 'treasure', title: 'Az Elásott Kincs',
        obst: [...quad([8, 4, 2, 1]), ...mir([5, 7, 1, 2])] },
      { x: 0, y: 2, type: 'normal', title: 'Az Aranyhegyek Hágója',
        obst: mir([4, 3, 3, 3], [8, 3, 1, 1], [4, 11, 3, 2], [8, 12, 1, 1]),
        waves: [W('turret 10 3, turret 17 3, imp 4 13, imp 23 13, imp 9 8'),
          W('teleporter 8 6, teleporter 19 6, turret 14 4, imp 5 7, imp 22 7, imp 14 12'),
          W('turret 9 12, turret 18 12, teleporter 4 2, teleporter 23 2, imp 10 5, imp 17 5')] },
      { x: -1, y: 2, type: 'shrine', title: 'A Tékozlók Oltára',
        obst: mir([8, 3, 1, 1], [8, 12, 1, 1], [5, 5, 1, 1], [5, 10, 1, 1]) },
      { x: 0, y: 3, type: 'normal', title: 'A Kincstár Tornya',
        obst: [[6, 3, 2, 1], [20, 3, 2, 1], [6, 12, 2, 1], [20, 12, 2, 1], [9, 6, 1, 4], [18, 6, 1, 4]],
        enterTalk: ['A kincstár falai pénzeszsákokból épültek. Belülről valaki számol, egyre hangosabban: ezer, ezeregy, ezerkettő…'],
        waves: [W('turret 4 3, turret 23 3, turret 14 4, imp 6 13, imp 21 13, imp 10 13'),
          W('teleporter 7 7, teleporter 20 7, teleporter 14 12, imp 4 12, imp 23 12, turret 14 4'),
          W('turret 7 2, turret 20 2, teleporter 4 13, teleporter 23 13, imp 11 5, imp 16 5, imp 14 12')] },
      { x: 0, y: 4, type: 'boss', title: 'Mammon Kincstára',
        obst: quad([4, 3, 2, 1]) },
    ],
  };

  // ======================================================================
  // IV. RESTSÉG – Belfegor
  // ======================================================================
  const C3 = RINGS[3].col, BLF = d('Belfegor', C3);
  LEVELS[3] = {
    intro: [
      'Szürke köd. A víz nem folyik, csak áll, és buborékok szállnak fel belőle, mint elfojtott sóhajok.',
      'A mocsár mélyén lelkek alszanak. Nem álmodnak: az álomhoz is akarni kellene valamit.',
      v('A restség a legcsendesebb bűn. Nem tesz rosszat – csak jót sem. És a világ ebbe hal bele, lassan.'),
      v('A köd elnyeli a fényt, és minden seb nehezebbé teszi a szárnyad. Ne állj meg. Itt a megállás maga a halál.'),
    ],
    bossTalk: [
      'Óriási test hever ködpárnákon. Horkolása megrázza a falakat. Az egyik szeme lassan, nagyon lassan kinyílik.',
      BLF('Mmm… már megint egy hős. Minek? Minden harc véget ér. Minden fény kialszik. Feküdj le mellém.'),
      a('Te nem pihensz, Belfegor. Te feladtad. A kettő nem ugyanaz.'),
      BLF('Feladni a legbölcsebb. Látod? Már te is fáradt vagy. Érzed, ahogy elnehezül a szárnyad…'),
      a('Érzem. És mégis felemelem.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Mocsár Pereme',
        obst: [[5, 3, 2, 1], [21, 11, 2, 1], [8, 12, 1, 1], [19, 3, 1, 1]] },
      { x: -1, y: 0, type: 'normal', title: 'A Ködfátyol',
        obst: mir([6, 3, 1, 1], [9, 5, 1, 1], [6, 11, 1, 1], [9, 10, 1, 1]),
        waves: [W('wisp 5 3, wisp 22 3, brute 14 4, wisp 14 12'),
          W('turret 6 7, turret 21 7, wisp 9 2, wisp 18 2, brute 14 12')] },
      { x: -2, y: 0, type: 'normal', title: 'Belacqua Sziklája',
        obst: [[4, 3, 4, 2], [20, 3, 4, 2], [5, 11, 3, 2], [20, 11, 3, 2], [9, 4, 1, 1], [18, 4, 1, 1]],
        waves: [W('brute 6 7, brute 21 7, wisp 10 2, wisp 17 2'),
          W('turret 9 11, turret 18 11, wisp 4 13, wisp 23 13, brute 14 4')],
        npc: { tx: 14, ty: 5, name: 'Belacqua', look: 'soul', reward: 'story', talk: [
          'Egy szikla árnyékában valaki ül, térdét átkarolva, fejét lehajtva. Fel sem néz, amikor megszólal.',
          s('Belacqua', 'Ó, egy angyal. Ne siess annyira. Ülj le egy kicsit. Én már… mióta is ülök? Mindegy.'),
          s('Belacqua', 'Lantokat faragtam. Mindig azt mondtam: holnap megbánom, holnap imádkozom, holnap élek. A holnap nem jött el.'),
          a('Miért nem keltél fel?'),
          s('Belacqua', 'Mert ülni könnyebb. A restség nem fáradtság. Az a hit, hogy semmi sem ér annyit, hogy felállj érte.'),
          s('Belacqua', 'Te felálltál. Az egész Égből leszálltál. Fogd ezt – nekem túl nehéz volna odaadni. …Na jó. Tessék.'),
        ] } },
      { x: -1, y: -1, type: 'shrine', title: 'A Virrasztók Oltára',
        obst: quad([8, 4, 1, 1], [5, 6, 1, 1]) },
      { x: 0, y: -1, type: 'normal', title: 'Az Alvók Tava',
        obst: [[6, 5, 4, 1], [18, 5, 4, 1], [6, 10, 4, 1], [18, 10, 4, 1], [9, 3, 1, 2], [18, 3, 1, 2]],
        waves: [W('brute 5 3, brute 22 3, wisp 14 4, wisp 7 12, wisp 20 12'),
          W('turret 7 7, turret 20 7, brute 14 12, wisp 4 2, wisp 23 2, wisp 14 4')] },
      { x: 1, y: -1, type: 'treasure', title: 'A Félbehagyott Mű',
        obst: [[5, 3, 3, 1], [21, 4, 1, 3], [6, 11, 1, 2], [19, 12, 3, 1]] },
      { x: -1, y: -2, type: 'shop',  // a bolt nevét a mag írja ki
        obst: quad([3, 2, 2, 1]) },
      { x: 0, y: -2, type: 'normal', title: 'A Szürke Gát',
        obst: [[4, 4, 8, 1], [16, 4, 8, 1], [4, 11, 8, 1], [16, 11, 8, 1]],
        waves: [W('turret 6 2, turret 21 2, brute 6 13, brute 21 13, wisp 14 6'),
          W('wisp 5 7, wisp 22 7, wisp 9 2, wisp 18 2, brute 14 12, turret 14 5'),
          W('brute 6 7, brute 21 7, turret 9 13, turret 18 13, wisp 4 2, wisp 23 2')] },
      { x: 0, y: -3, type: 'normal', title: 'A Soha Meg Nem Tett Lépcső',
        obst: mir([5, 3, 1, 1], [7, 5, 1, 1], [9, 3, 1, 1], [5, 12, 1, 1], [7, 10, 1, 1], [9, 12, 1, 1]),
        enterTalk: ['A lépcsőfokokon félbehagyott dolgok hevernek: egy levél aláírás nélkül, egy kenyér, amit nem osztottak meg, egy ima első szava.'],
        waves: [W('brute 5 6, brute 22 6, turret 14 4, wisp 4 13, wisp 23 13, wisp 14 12'),
          W('turret 6 2, turret 21 2, brute 9 9, brute 18 9, wisp 11 4, wisp 16 4'),
          W('brute 14 4, brute 5 9, brute 22 9, turret 9 13, turret 18 13, wisp 4 2, wisp 23 2')] },
      { x: 0, y: -4, type: 'boss', title: 'Belfegor Ágya',
        obst: quad([4, 2, 2, 1]) },
    ],
  };

  // ======================================================================
  // V. HARAG – Sátán
  // ======================================================================
  const C4 = RINGS[4].col, SAT = d('Sátán', C4);
  LEVELS[4] = {
    intro: [
      'A Styx itt nem víz, hanem forrongó sár. Benne lelkek marcangolják egymást – és ha nincs más, a saját húsukat.',
      'Mélyebben, a felszín alatt mások gurgulázva dünnyögnek. Ők a magukba fojtott düh foglyai.',
      v('Harag. Az egyetlen bűn, amely igaznak érzi magát. Ezért a legnehezebb kitörni belőle.'),
      v('Az átok tombolóvá teszi a sebzett démonokat, és holtukban szétrobbannak. Üss messziről, vagy lépj el időben.'),
    ],
    bossTalk: [
      'Az izzó kohóban egy alak kalapál – nem fegyvert, hanem önmagát. Minden ütésre szikra és ordítás felel.',
      SAT('TE! Tudod, mióta várok valakire, akit gyűlölhetek? Önmagamat már unom!'),
      a('A haragod egyszer igazságért kiáltott. Mikor felejtetted el, miért?'),
      SAT('Az igazság gyenge! A düh erős! Éget, pusztít, és SOSEM kér bocsánatot!'),
      a('Akkor majd én kérek helyetted. Miután eloltottalak.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Styx Partja',
        obst: [[4, 12, 6, 1], [18, 12, 6, 1], [5, 3, 1, 1], [22, 3, 1, 1]] },
      { x: 1, y: 0, type: 'normal', title: 'A Fortyogó Gázló',
        obst: [[5, 3, 1, 1], [8, 4, 1, 1], [11, 5, 1, 1], [16, 10, 1, 1], [19, 11, 1, 1], [22, 12, 1, 1]],
        waves: [W('imp 5 6, imp 22 9, imp 14 4, spitter 9 12'),
          W('brute 21 4, imp 6 12, imp 10 2, spitter 18 2, spitter 4 13')] },
      { x: 1, y: -1, type: 'shrine', title: 'A Megbékélés Oltára',
        obst: quad([9, 4, 1, 1], [6, 3, 1, 1]) },
      { x: 2, y: 0, type: 'normal', title: 'Phlegyas Révje',
        obst: [[4, 3, 8, 1], [16, 3, 8, 1], [6, 11, 2, 2], [20, 11, 2, 2]],
        waves: [W('imp 5 5, imp 22 5, spitter 9 12, spitter 18 12, imp 14 12'),
          W('brute 6 7, brute 21 7, imp 4 2, imp 23 2, spitter 14 5')],
        npc: { tx: 13, ty: 5, name: 'Filippo Argenti', look: 'soul', reward: 'story', talk: [
          'Egy sárlepte alak kapaszkodik a rév szélébe. A szeme ég, a foga csikorog. Mielőtt szólnál, ő ordít.',
          s('Filippo Argenti', 'Mit bámulsz, tollas?! Takarodj a révemről! Ez az én sárom, az én folyóm, az én dühöm!'),
          s('Filippo Argenti', 'Firenzében ezüsttel patkoltattam a lovamat. Ezüsttel! Mindenki félt tőlem. Mindenki.'),
          a('És szeretett valaki?'),
          s('Filippo Argenti', '…Ez nem kérdés. Ez… fogd be! A düh legalább melegít. A szeretet csak cserben hagy.'),
          'Filippo a saját karjába mar, aztán hirtelen elhallgat. Valamit a lábad elé hajít, rád sem néz.',
          s('Filippo Argenti', 'Vidd. Nem neked adom. Csak nem akarom, hogy itt legyen, amikor újra dühös leszek.'),
        ] } },
      { x: 2, y: 1, type: 'shop',  // a bolt nevét a mag írja ki
        obst: quad([3, 3, 1, 1], [5, 2, 1, 1]) },
      { x: 3, y: 0, type: 'normal', title: 'Dísz Városának Kapuja',
        obst: [[4, 4, 1, 8], [23, 4, 1, 8], [7, 3, 1, 1], [20, 3, 1, 1], [7, 12, 1, 1], [20, 12, 1, 1]],
        enterTalk: [
          'Vörös tornyok magasodnak, izzó vasfalak. Dísz városa, a mélyebb Pokol kapuja. A bástyákon fúriák sikoltoznak.',
          v('Itt egyszer engem is visszautasítottak. Ne félj. Ami bezárul a harag előtt, megnyílik a türelemnek.'),
        ],
        waves: [W('imp 8 6, imp 19 6, imp 8 9, imp 19 9, spitter 14 4, spitter 14 12'),
          W('brute 10 3, brute 17 3, spitter 6 13, spitter 21 13, imp 14 4'),
          W('brute 14 4, imp 6 6, imp 21 6, imp 6 9, imp 21 9, spitter 10 13, spitter 17 13')] },
      { x: 3, y: 1, type: 'treasure', title: 'A Kihűlt Tűzhely',
        obst: [...quad([10, 5, 1, 1]), [6, 3, 2, 2], [20, 11, 2, 2]] },
      { x: 4, y: 0, type: 'normal', title: 'A Lángoló Sírok',
        obst: quad([5, 3, 2, 1], [9, 3, 2, 1], [7, 5, 2, 1]),
        waves: [W('spitter 5 2, spitter 22 2, spitter 5 13, spitter 22 13, imp 14 4, imp 14 12'),
          W('brute 7 8, brute 20 8, imp 4 4, imp 23 4, imp 4 11, imp 23 11, spitter 14 4'),
          W('brute 10 2, brute 17 2, brute 14 12, spitter 6 7, spitter 21 7, imp 8 12, imp 19 12, imp 14 4')] },
      { x: 5, y: 0, type: 'boss', title: 'Sátán Kohója',
        obst: mir([4, 3, 1, 1], [4, 12, 1, 1]) },
    ],
  };

  // ======================================================================
  // VI. IRIGYSÉG – Leviatán
  // ======================================================================
  const C5 = RINGS[5].col, LEV = d('Leviatán', C5);
  LEVELS[5] = {
    intro: [
      'Zöld fény szivárog a falakból. Mindenhol szemek nyílnak, és mind téged figyel. Nem gyűlölettel: éhséggel.',
      'A lelkek itt egymás vállára dőlnek, mint a vakok. Drót varrja össze a szemhéjukat, hogy ne lássák, ami a másé.',
      v('Irigység. A bűn, amely nem élvez semmit. A torkos legalább eszik. Az irigy csak néz, és fáj neki, amit lát.'),
      v('Itt minden találat a Kegyelmedet rabolja. És vigyázz az árnyakkal: gyorsabbak a gondolatnál.'),
    ],
    bossTalk: [
      'Zöld víz tölti meg a termet, benne kígyótest tekereg. Pikkelyein a te arcod tükröződik, ezerszer.',
      LEV('Milyen szép… milyen igazságtalan. Miért te kaptad a szárnyakat? Én is fénynek születtem!'),
      a('Nem vettem el tőled semmit, Leviatán.'),
      LEV('Épp ez az! Neked nem kellett elvenned semmit. Neked csak ADATOTT. Ezt sosem bocsátom meg.'),
      a('Nem is a te dolgod megbocsátani. Csak elengedni.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Lezárt Szemek Kapuja',
        obst: quad([6, 3, 1, 1], [8, 4, 1, 1]) },
      { x: -1, y: 0, type: 'normal', title: 'A Tükrök Folyosója',
        obst: mir([5, 4, 1, 1], [8, 4, 1, 1], [5, 11, 1, 1], [8, 11, 1, 1], [11, 4, 1, 1], [11, 11, 1, 1]),
        waves: [W('teleporter 6 7, teleporter 21 7, wisp 14 4, wisp 14 12'),
          W('splitter 6 2, splitter 21 2, wisp 9 13, wisp 18 13, teleporter 14 4')] },
      { x: 1, y: 0, type: 'normal', title: 'A Suttogók Csarnoka',
        obst: [[6, 3, 1, 4], [21, 3, 1, 4], [6, 10, 1, 3], [21, 10, 1, 3], [9, 3, 2, 1], [17, 12, 2, 1]],
        waves: [W('wisp 4 3, wisp 23 3, splitter 14 4, teleporter 14 12'),
          W('teleporter 9 6, teleporter 18 9, splitter 4 13, splitter 23 13, wisp 14 4')] },
      { x: -1, y: -1, type: 'shop',  // a bolt nevét a mag írja ki
        obst: quad([3, 3, 2, 1]) },
      { x: 0, y: -1, type: 'shrine', title: 'A Varrott Szemhéjak Oltára',
        obst: quad([9, 4, 1, 1], [5, 4, 1, 1], [7, 2, 1, 1]) },
      { x: 1, y: -1, type: 'treasure', title: 'A Másé Kertje',
        obst: [...quad([5, 3, 2, 2]), ...mir([9, 5, 1, 1])] },
      { x: 0, y: 1, type: 'normal', title: 'Sziena Fala',
        obst: [[4, 4, 7, 1], [17, 4, 7, 1], [6, 11, 2, 2], [20, 11, 2, 2]],
        waves: [W('teleporter 5 2, teleporter 22 2, wisp 9 12, wisp 18 12, splitter 14 6'),
          W('splitter 5 7, splitter 22 7, teleporter 14 12, wisp 9 2, wisp 18 2, shadow 14 5')],
        npc: { tx: 14, ty: 5, name: 'Sapia', look: 'soul', reward: 'story', talk: [
          'Egy asszony ül a fal tövében. A szemhéját drót varrja össze, mégis feléd fordítja az arcát.',
          s('Sapia', 'Ki vagy? A hangod fényes. Nem látlak – ennyi jár annak, aki egész életében rosszra nézett.'),
          s('Sapia', 'Sienában éltem. Amikor a városom vereséget szenvedett, ujjongtam. Az ő bukásuk az én győzelmemnek tűnt.'),
          s('Sapia', 'Az irigy nem azt akarja, ami a másé. Azt akarja, hogy a másiknak se legyen. Ez a különbség – és ez a pokol.'),
          a('És most?'),
          s('Sapia', 'Most örülök, hogy fényes vagy, pedig nem látlak. Tanulok, lassan. Fogd ezt – szívből adom. Először.'),
        ] } },
      { x: 0, y: 2, type: 'normal', title: 'A Zöld Szemek Labirintusa',
        obst: [[4, 3, 1, 4], [4, 3, 4, 1], [23, 3, 1, 4], [20, 3, 4, 1], [4, 10, 1, 3], [4, 12, 4, 1], [23, 10, 1, 3], [20, 12, 4, 1],
          [9, 6, 1, 4], [18, 6, 1, 4]],
        enterTalk: ['A falakon szemek nyílnak, és suttognak: „Neki több jutott. Neki könnyebb. Miért ő?” A hang a tiéd.'],
        waves: [W('wisp 6 5, wisp 21 5, teleporter 6 10, teleporter 21 10, splitter 14 4, splitter 14 12'),
          W('teleporter 10 2, teleporter 17 2, splitter 2 2, splitter 25 2, wisp 7 13, wisp 20 13, shadow 14 4'),
          W('shadow 6 7, splitter 21 7, teleporter 2 13, teleporter 25 13, wisp 11 4, wisp 16 4, splitter 14 12')] },
      { x: 0, y: 3, type: 'boss', title: 'Leviatán Tükörtava',
        obst: quad([4, 3, 1, 1], [7, 2, 1, 1]) },
    ],
  };

  // ======================================================================
  // VII. KEVÉLYSÉG – Lucifer
  // ======================================================================
  const C6 = RINGS[6].col, LUC = d('Lucifer', C6);
  LEVELS[6] = {
    intro: [
      'A hetedik kapu mögött nincs tűz. Csak jég: a Kocitosz tava, amelyet egy bukott angyal szárnyai fagyasztanak.',
      'Ide nem hallatszik be semmi. Se sírás, se ima. Csak a szél, amely egyetlen szót ismétel: én, én, én.',
      v('Innen nem kísérhetlek, csak a hangom jön veled. Hallgass ide: minden bűn, amit láttál, ebből a jégből nőtt ki.'),
      v('Az átok itt magához húz: a démonok aurája vonzza a lépteidet. A gőg is így húz – lefelé, míg fölfelé hiszed magad.'),
    ],
    bossTalk: [
      'A tó közepén trón áll, rajta ő ül. Szárnyai – egykor hat pár fény – most fagyos szelet vernek, amely mindent megdermeszt.',
      LUC('Nézd meg jól, Isten kutyája. Ez a trón az enyém. Senki nem adta. Én vettem el.'),
      a('Ezért nem melegít. Amit elveszel, sosem lesz igazán a tiéd.'),
      LUC('Bujaság, torkosság, kapzsiság, restség, harag, irigység – mind az én gyermekem. Mind azt mondja: én.'),
      a('Tudom. Hat gyűrűn át tanultam. Mindegyik gyökere te vagy: aki nem akart szolgálni, csak uralkodni.'),
      LUC('Akkor gyere, kicsi testvér. Megtanítom az utolsó leckét: milyen elbukni.'),
    ],
    rooms: [
      { x: 0, y: 0, type: 'start', title: 'A Jég Kapuja',
        obst: quad([5, 3, 1, 1], [8, 3, 1, 1], [5, 6, 1, 1]) },
      { x: 0, y: 1, type: 'normal', title: 'Kaina Jégmezeje',
        obst: [[5, 4, 2, 1], [21, 4, 2, 1], [8, 11, 3, 1], [17, 11, 3, 1], [9, 3, 1, 1], [18, 3, 1, 1]],
        waves: [W('spitter 5 2, spitter 22 2, brute 14 4, wisp 7 13, wisp 20 13'),
          W('teleporter 9 6, teleporter 18 6, turret 14 4, brute 5 12, brute 22 12, spitter 14 12')] },
      { x: -1, y: 1, type: 'shrine', title: 'Az Alázat Oltára',
        obst: mir([7, 3, 1, 1], [7, 12, 1, 1], [9, 4, 1, 1], [9, 11, 1, 1]) },
      { x: 1, y: 1, type: 'normal', title: 'Antenóra',
        obst: mir([5, 3, 1, 3], [5, 10, 1, 3], [8, 7, 2, 2]),
        waves: [W('wisp 7 2, wisp 20 2, spitter 7 13, spitter 20 13, brute 14 4'),
          W('turret 10 3, turret 17 3, teleporter 4 13, teleporter 23 13, brute 14 12, spitter 14 4'),
          W('brute 7 5, brute 20 5, wisp 4 2, wisp 23 2, spitter 10 13, spitter 17 13')] },
      { x: 1, y: 2, type: 'normal', title: 'A Kőterhek Útja',
        obst: [[4, 3, 3, 2], [21, 3, 3, 2], [4, 11, 3, 2], [21, 11, 3, 2], [9, 5, 1, 1], [18, 5, 1, 1], [9, 10, 1, 1], [18, 10, 1, 1]],
        waves: [W('brute 6 7, brute 21 7, spitter 10 2, spitter 17 2, wisp 14 12'),
          W('turret 8 13, turret 19 13, teleporter 14 4, wisp 4 2, wisp 23 2, spitter 14 12')],
        npc: { tx: 14, ty: 5, name: 'Omberto Aldobrandeschi', look: 'soul', reward: 'story', talk: [
          'Egy lélek görnyed egy hatalmas kő alatt. Ide, a jég közé is magával hozta, és nem teszi le.',
          s('Omberto', 'Ne hajolj le hozzám, angyal. Ez a kő az én dolgom. Én raktam a vállamra – a nevemmel együtt.'),
          s('Omberto', 'Aldobrandeschi. Grófok, várak, ősök. Úgy büszkélkedtem a véremmel, hogy mindenki mást a porban láttam.'),
          s('Omberto', 'Azt mondják, a gőgöm ölt meg. Igazuk van. És a családomat is magammal rántottam.'),
          a('Mégis vállalod a követ.'),
          s('Omberto', 'Mert csak lehajtott fejjel látod: a föld, amin jársz, nem a tiéd. Vidd ezt, és járj alázattal.'),
        ] } },
      { x: 2, y: 2, type: 'treasure', title: 'A Lehullott Koronák',
        obst: [...quad([9, 4, 1, 1]), ...quad([4, 2, 2, 1])] },
      { x: 2, y: 3, type: 'normal', title: 'A Tükörjég',
        obst: [[5, 3, 1, 1], [7, 5, 1, 1], [5, 7, 1, 1], [22, 12, 1, 1], [20, 10, 1, 1], [22, 8, 1, 1], [10, 12, 2, 1], [16, 3, 2, 1]],
        waves: [W('teleporter 6 12, teleporter 21 3, wisp 10 4, wisp 17 11, spitter 14 4, spitter 14 12'),
          W('brute 9 8, brute 18 8, turret 4 13, turret 23 2, spitter 4 2, spitter 23 13, wisp 14 4'),
          W('shadow 14 4, teleporter 8 2, teleporter 19 13, brute 6 10, spitter 21 5, wisp 10 13, wisp 17 2')] },
      { x: 1, y: 3, type: 'normal', title: 'Ptolomea',
        obst: [[6, 3, 16, 1], [6, 12, 16, 1], [6, 4, 1, 2], [21, 4, 1, 2], [6, 10, 1, 2], [21, 10, 1, 2]],
        enterTalk: ['Itt azok fekszenek, akik a vendégüket árulták el. A könnyük a szemükre fagyott, így még sírni sem tudnak.'],
        waves: [W('brute 9 6, brute 18 9, spitter 2 2, spitter 25 2, spitter 2 13, spitter 25 13'),
          W('teleporter 9 9, teleporter 18 6, turret 14 5, wisp 4 13, wisp 23 2, brute 14 11'),
          W('brute 4 2, brute 23 13, spitter 9 7, spitter 18 8, wisp 10 13, wisp 17 2, teleporter 14 5')] },
      { x: 0, y: 3, type: 'shop',  // a bolt nevét a mag írja ki
        obst: quad([3, 2, 1, 2], [6, 2, 1, 1]) },
      { x: 0, y: 4, type: 'normal', title: 'A Bukott Kórus Terme',
        obst: quad([5, 3, 1, 1], [8, 3, 1, 1], [5, 5, 1, 1], [8, 5, 1, 1]),
        waves: [W('wisp 6 7, wisp 21 7, wisp 10 2, wisp 17 2, spitter 14 12, brute 14 4'),
          W('teleporter 4 2, teleporter 23 2, turret 10 13, turret 17 13, brute 6 7, brute 21 7, spitter 14 4')],
        npc: { tx: 14, ty: 5, name: 'Bukott Angyal', look: 'soul', reward: 'story', talk: [
          'A jégben egy angyal térdel. Szárnyai csonkok, glóriája repedt jégkorong. Rád emeli a tekintetét, és elmosolyodik.',
          s('Bukott Angyal', 'Ismerlek. Egy kórusban énekeltünk, réges-régen. Te a harmadik sorban álltál. Én az elsőben.'),
          s('Bukott Angyal', 'Amikor ő felállt, és azt mondta: „Nem szolgálok”, olyan szép volt. Olyan fényes. Követtük. Mindannyian.'),
          a('Megbántad?'),
          s('Bukott Angyal', 'A megbánáshoz alázat kell. Azt fent hagytam, a szárnyaimmal együtt. Csak a hiányát érzem, mint egy levágott tagot.'),
          s('Bukott Angyal', 'Ő nem fél tőled. Ez a gyengesége. Vedd el az utolsó tollamat, ami még fehér. Neki szántam.'),
        ] } },
      { x: -1, y: 4, type: 'normal', title: 'Judekka Küszöbe',
        obst: [[5, 3, 2, 2], [21, 3, 2, 2], [5, 11, 2, 2], [21, 11, 2, 2], [9, 4, 1, 1], [18, 4, 1, 1], [9, 11, 1, 1], [18, 11, 1, 1]],
        enterTalk: [
          'A fagy itt már nem hideg, csak csend. A jégbe zárt lelkek arca felfelé néz, és egyik sem pislog.',
          LUC('Hallom a szárnyaidat, kicsi testvér. Hat bűnön tapostál át, hogy idejöjj. Büszke vagy rá?'),
          a('Nem. Hálás vagyok.'),
          LUC('Hazudsz. Mindenki büszke. Én csak elsőként mertem kimondani.'),
        ],
        waves: [W('brute 7 7, brute 20 7, spitter 4 2, spitter 23 2, turret 14 4, wisp 4 13, wisp 23 13'),
          W('teleporter 10 2, teleporter 17 2, shadow 14 12, spitter 7 8, spitter 20 8, brute 3 13, brute 24 13'),
          W('shadow 7 2, shadow 20 2, brute 14 4, turret 3 3, turret 24 12, wisp 10 13, wisp 17 13, spitter 14 12')] },
      { x: -1, y: 5, type: 'boss', title: 'A Jégtrón',
        obst: quad([4, 3, 1, 1], [8, 2, 1, 1]) },
    ],
  };

  // ======================================================================
  // EPILÓGUS
  // ======================================================================
  LEVELS.epilogue = [
    'Lucifer zuhan. Nem lefelé – mélyebbre már nem lehet –, hanem befelé, a saját jegébe, míg csak egy hideg csillag marad belőle.',
    'A Kocitosz tava megreped. A résekből fény szivárog: nem a tiéd, hanem azoké, akiket a jég fogva tartott.',
    v('Látod, Arkangyal? Nem te győzted le. Ő bukott el, újra. A gőg mindig önmaga alá zuhan.'),
    a('És a lelkek? Francesca, Ciacco, Sapia, Omberto… mi lesz velük?'),
    v('Az ő útjuk a hegy. A Purgatórium kapui nyitva állnak. Hogy elindulnak-e fölfelé, az már az ő akaratuk.'),
    a('És velem?'),
    v('Te megtanultad, mi a bűn: a szív, amely csak önmaga felé hajlik. Most menj haza, és tanítsd meg, mi az ellenkezője.'),
    'Az Arkangyal kitárja szárnyait. A koromfoltok megmaradnak rajtuk – de most már fényt vernek vissza. És fölötte újra látszanak a csillagok.',
  ];

  // ======================================================================
  // A címképernyő története (10 sor; az utolsó kettő nagy, arany)
  // ======================================================================
  STORY.splice(0, STORY.length,
    'Kezdetben volt a Fény, és a Fény szeretet volt.',
    'Egy angyal azonban fényesebb akart lenni a Fénynél.',
    '„Nem szolgálok” — mondta Lucifer, és lezuhant.',
    'Kevélységéből hat bűn született, hat gyűrű a mélyben:',
    'Bujaság. Torkosság. Fösvénység. Restség. Harag. Irigység.',
    'És legalul, a jég trónján, ő maga: a Kevélység.',
    'A Purgatórium kapuinál egy régi költő árnya vár, hogy utat mutasson.',
    'Az Ég elküldte utolsó harcosát, hogy megértse a bűnt — és megtörje.',
    'Te vagy az Arkangyal.',
    'Szállj alá.');
})();
