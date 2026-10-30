/* =====================================================================
   GOLÍN — PUNTUACIÓN (funciones puras: sin DOM, sin física)
   Se prueba con `node tests.js`.

   Flujo de un tiro:
     const shot = newShot(ctx)             al disparar
     contact(shot, ev, cfg, rng) → fx[]    en cada contacto del balón
     goal(shot, ev, cfg) → fx[]            cuando un balón entra a un arco
     resolve(shot, cfg) → resultado        al terminar el tiro

   REGLA DE MULTIPLICADORES
     "+N Mult" (suma) se aplica en cada contacto, en vivo, sobre shot.mult.
     "×N Mult" (multiplica) se aplica UNA SOLA VEZ por tiro, al final, en
     resolve(), aunque el muñeco se haya tocado varias veces: se recorre el
     conjunto de muñecos tocados, no la lista de contactos.

   ORDEN DE RESOLUCIÓN (resolve)
     0. La Garra: +50% a los Puntos (antes de multiplicar).
     1. Sumas: ya están dentro de shot.mult (base 1 + El Diez + Cabezón + Cazagoles).
     2. ×N en orden fijo: Rambos → Chilena → El Fantasma → CP7 → El Veterano →
        El Madrugador → El Tardón → El Cabeza Caliente → La Mano.
     3. Bonus de gol ×1.5 / sin gol ×0.5 / autogol ×0.
   Con varios balones, si cualquiera entra al arco rival el tiro es gol
   (el gol manda sobre un autogol del otro balón).

   La Llave: lo que suma se multiplica por su factor (×2 por Llave vecina);
   lo que multiplica pasa de ×m a ×(1 + (m-1)·potencia); los manipuladores
   duplican su intensidad (más balones, más rebotes, más probabilidad…).
   ===================================================================== */
(function (root) {
  const GOLIN = root.GOLIN = root.GOLIN || {};

  const scaleMult = (m, power) => 1 + (m - 1) * power;
  /* El Tardón: crece tiro a tiro. shotNo y total cuentan desde 1; en el último tiro vale cfg.dolls.tardon.xmult. */
  function tardonFactor(cfg, shotNo, total) {
    const x = cfg.dolls.tardon.xmult;
    return total <= 1 ? x : 1 + (x - 1) * Math.max(0, Math.min(1, (shotNo - 1) / (total - 1)));
  }

  /* ---------- posición: La Llave y estados de muñeco ----------
     slots: [{rod, i, doll}]; doll: {uid, id, value, muted?, expelled?} */
  function isActive(doll) { return !!doll && !doll.muted && !doll.expelled; }
  function activeOnTable(slots, id) { return slots.filter(s => s.doll && s.doll.id === id && isActive(s.doll)); }
  /* Potencia de un muñeco = cuánto se multiplica su efecto:
       La Llave       ×2 por cada Llave vecina inmediata en la misma barra
       El Arquitecto  ×2 por cada Arquitecto en la misma barra, a cualquier distancia
       El Capitán     ×2 al muñeco que lleva la cinta este partido (si El Capitán está en la mesa) */
  function powerOf(slots, slot, cfg) {
    let pw = 1;
    for (const s of slots) {
      if (s === slot || s.rod !== slot.rod || !s.doll || !isActive(s.doll)) continue;
      if (s.doll.id === 'llave' && Math.abs(s.i - slot.i) === 1) pw *= cfg.dolls.llave.factor;
    }
    if (slot.doll && slot.doll.captain && activeOnTable(slots, 'capitan').length) pw *= cfg.dolls.capitan.factor;
    return pw;
  }
  /* La Costurera: si sus dos vecinos son de la MISMA familia entre sí, cada uno gana +Mult al ser tocado.
     Devuelve el +Mult por contacto que gana el muñeco de `slot`. */
  function stitchBonus(slots, slot, cfg) {
    if (!slot.doll || !isActive(slot.doll)) return 0;
    const at = (rod, i) => slots.find(s => s.rod === rod && s.i === i);
    const fam = d => (root.GOLIN.DOLL[d.id] || {}).family;
    let bonus = 0;
    for (const dir of [-1, 1]) {
      const c = at(slot.rod, slot.i + dir);
      if (!c || !c.doll || c.doll.id !== 'costurera' || !isActive(c.doll)) continue;
      const other = at(slot.rod, slot.i + 2 * dir);
      if (other && other.doll && isActive(other.doll) && fam(other.doll) === fam(slot.doll)) bonus += cfg.dolls.costurera.mult * powerOf(slots, c, cfg);
    }
    return bonus;
  }
  const justicieroOn = slots => activeOnTable(slots, 'justiciero').length > 0;
  const calienteList = slots => activeOnTable(slots, 'caliente').map(s => s.doll.uid);
  /* El Gato: probabilidad total de atajar un autogol (varios gatos se combinan) */
  function gatoChance(slots, cfg) {
    return 1 - activeOnTable(slots, 'gato').reduce((a, s) => a * (1 - Math.min(1, cfg.dolls.gato.chance * powerOf(slots, s, cfg))), 1);
  }

  /* La Garra se decide al disparar: te quedan `shots` tiros o menos (contando
     este) y aún no llegaste a la cuota. No hace falta tocarla. */
  function garraState(slots, cfg, shotsLeftInclThis, total, quota) {
    const gs = activeOnTable(slots, 'garra');
    if (!gs.length) return null;
    const active = shotsLeftInclThis <= cfg.dolls.garra.shots && total < quota;
    const power = Math.max(...gs.map(s => powerOf(slots, s, cfg)));
    return { active, power };
  }
  /* El Diez: Mult base permanente. Kan-Té: rescates disponibles por tiro. */
  function baseMultOf(slots) { return 1 + activeOnTable(slots, 'diez').reduce((a, s) => a + s.doll.value, 0); }
  /* Potencia total de los Corneta activos (pasivo: no hace falta tocarlos) */
  function cornetaPower(slots, cfg) { return activeOnTable(slots, 'corneta').reduce((a, s) => a + powerOf(slots, s, cfg), 0); }
  function kanteRescues(slots, cfg) { return activeOnTable(slots, 'kante').reduce((a, s) => a + powerOf(slots, s, cfg), 0); }
  /* El Cacique: tiros extra que puede regalar cuando ibas a perder una vida (una vez por partido). */
  function diezList(slots, cfg) { return activeOnTable(slots, 'diez').map(s => ({ uid: s.doll.uid, power: powerOf(slots, s, cfg) })); }

  /* ---------- estado del tiro ---------- */
  function newShot(ctx = {}) {
    return {
      t: 0, points: 0, baseMult: ctx.baseMult || 1, mult: ctx.baseMult || 1,
      contacts: 0, effects: 0, distinct: new Set(),
      touched: new Map(),        // uid → {id, power, count}
      lastOwn: new Map(),        // ballId → último muñeco propio tocado {uid, id, power, muted}
      goal: false, goalTime: null, goals: 0, autogol: false, mano: 0, distinctAtGoal: 0,
      tenderoRate: 0, tenderoPaid: 0, tenderoOn: new Set(), cambistaOn: new Set(), plata: 0, split: new Set(),
      walls: 0, lastKind: new Map(), corneta: ctx.corneta || 0, cornetaUsed: false,   // bandas tocadas; de dónde venía cada balón; El Corneta
      garra: ctx.garra || null, kanteLeft: ctx.kante || 0, diez: ctx.diez || [],
      shotsLeft: ctx.shotsLeft,  // tiros que quedan en el partido CONTANDO este
      shotNo: ctx.shotNo,        // número de este tiro dentro del partido (1 = el primero)
      matchId: ctx.matchId,      // partido jugado (para El Cambista: paga una vez por partido)
      lostPrev: !!ctx.lostPrev,  // perdiste el partido anterior (La Revancha)
      justiciero: !!ctx.justiciero,          // anula lo malo de los malditos
      calientes: ctx.calientes || [],        // Cabezas Calientes en la mesa (restan si no los tocas)
    };
  }
  /* El Veterano se carga en los últimos N tiros del partido (N = window, cuenta regresiva) */
  const veteranoWindow = (cfg, shotsLeftInclThis) => shotsLeftInclThis !== undefined && shotsLeftInclThis <= cfg.dolls.veterano.window;
  function inheritBall(shot, fromId, toId) {
    if (shot.lastOwn.has(fromId)) shot.lastOwn.set(toId, shot.lastOwn.get(fromId));
    if (shot.lastKind.has(fromId)) shot.lastKind.set(toId, shot.lastKind.get(fromId));
  }

  /* ---------- efectos por muñeco (al contacto) ----------
     Cada caso recibe (shot, ev, p, fx, rng) donde p = cfg.dolls[id] y
     ev.power = potencia por Llaves. Empuja efectos a fx. */
  const pts = (fx, shot, v, src) => { shot.points += v; fx.push({ type:'pts', v, src }); };
  const addM = (fx, shot, v, src) => { shot.mult += v; fx.push({ type:'mult', v, src }); };
  const EFFECTS = {
    // El Poste: 20 → 40 → 80 → 160… dentro del mismo tiro, siempre y sin tope. Solo puntos.
    poste(s, ev, p, fx) { const n = s.touched.get(ev.doll.uid).count; pts(fx, s, p.pts * Math.pow(2, n - 1) * ev.power, 'poste'); },
    muro(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'muro'); },
    // El Lechero: solo el primer toque del tiro paga (+30)
    lechero(s, ev, p, fx) { if (s.touched.get(ev.doll.uid).count === 1) pts(fx, s, p.pts * ev.power, 'lechero'); },
    // El Hincha: +15 por contacto y +15 más si el balón venía de una banda
    hincha(s, ev, p, fx) { pts(fx, s, (p.pts + (ev.fromWall ? p.bonus : 0)) * ev.power, 'hincha'); },
    corneta(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'corneta'); },       // lo suyo es pasivo: la primera banda del tiro paga más (contact)
    abuela(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'abuela'); },         // lo suyo es pasivo: plata al ganar (economy.abuelaPay)
    rebotador(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'rebotador'); },
    tendero(s, ev, p, fx) {
      pts(fx, s, p.pts * ev.power, 'tendero');
      if (!s.tenderoOn.has(ev.doll.uid)) { s.tenderoOn.add(ev.doll.uid); s.tenderoRate += p.plata * ev.power; fx.push({ type:'tendero' }); }
    },
    ninamal(s, ev, p, fx) { pts(fx, s, ev.doll.value * ev.power, 'ninamal'); },
    veterano(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'veterano'); },   // el ×2 va al final (resolve)
    // Cabezón: +2 Mult en cada contacto, siempre (como en la v2 original). Se suma al momento (+N).
    cabezon(s, ev, p, fx) { addM(fx, s, p.mult * ev.power, 'cabezon'); },
    garra() {},                                             // pasiva: se resuelve al final
    pirlito(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'pirlito'); fx.push({ type:'pirlo', bounces: p.bounces * ev.power }); },
    kante(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'kante'); },   // el rescate es pasivo (física)
    rambos(s, ev, p, fx) { fx.push({ type:'rambos' }); },  // ×N al final
    llave(s, ev, p, fx) { pts(fx, s, p.pts, 'llave'); },
    chilena(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'chilena'); },
    pesi(s, ev, p, fx, rng) {
      pts(fx, s, p.pts * ev.power, 'pesi');
      if (rng() < Math.min(1, p.chance * ev.power)) fx.push({ type:'gambeta' });
    },
    cp7(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'cp7'); },
    gemelo(s, ev, p, fx) {
      pts(fx, s, p.pts * ev.power, 'gemelo');
      if (!s.split.has(ev.doll.uid)) { s.split.add(ev.doll.uid); fx.push({ type:'split', count: ev.power }); }
    },
    bekam(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'bekam'); fx.push({ type:'bekam', time: p.curveTime, turn: p.turn * ev.power }); },
    cambista(s, ev, p, fx) {                                // +plata solo la PRIMERA vez que lo tocas en cada tiro (el Tendero cobra todos los contactos)
      if (!s.cambistaOn.has(ev.doll.uid)) { s.cambistaOn.add(ev.doll.uid); const v = p.plata * ev.power; s.plata += v; fx.push({ type:'plata', v, src:'cambista' }); }
    },
    antena(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'antena'); },        // la atracción es física (game.js)
    // El Narrador: +12 por cada muñeco tuyo distinto que ya tocó el balón en este tiro (contándolo a él)
    narrador(s, ev, p, fx) { pts(fx, s, p.per * s.touched.size * ev.power, 'narrador'); },
    // El Canterano: puntos = lo que ha crecido (crece al ganar partidos, ver economy.canteranoGrow)
    canterano(s, ev, p, fx) { pts(fx, s, ev.doll.value * ev.power, 'canterano'); },
    madrugador(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'madrugador'); }, // ×N al final si es el primer tiro y gol
    tardon(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'tardon'); },         // ×N al final si es el último tiro y gol
    gato(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'gato'); },             // la atajada es pasiva (física)
    costurera(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'costurera'); },   // su premio lo cobran los vecinos (stitchBonus)
    caliente(s, ev, p, fx) { fx.push({ type:'caliente' }); },                  // ×N al final si lo tocaste
    colector() {},                                          // paga al cobrar el partido (economy.colectorPay)
    justiciero() {},                                        // no suma: protege de los malditos
    capitan() {},                                           // elige a quién le pone la cinta (powerOf)
    mano() {},                                              // actúa en el autogol
    diez() {},                                              // Mult base
  };

  /* ev: {ballId, kind:'wall'|'rival'|'own', key, doll?, power?, muted?} */
  function contact(shot, ev, cfg, rng = Math.random) {
    const fx = [];
    shot.contacts++;
    shot.distinct.add(ev.key);
    const fromWall = shot.lastKind.get(ev.ballId) === 'wall';
    shot.lastKind.set(ev.ballId, ev.kind);
    if (ev.kind === 'wall') {
      shot.walls++;
      let w = cfg.scoring.wallPts;
      if (!shot.cornetaUsed && shot.corneta > 0) { shot.cornetaUsed = true; w += cfg.scoring.wallPts * (cfg.dolls.corneta.wallMult - 1) * shot.corneta; }   // El Corneta: la primera banda del tiro paga más
      pts(fx, shot, w, 'wall');
    }
    else if (ev.kind === 'rival') fx.push({ type:'rival' });
    else if (ev.kind === 'own') {
      const d = ev.doll, power = ev.power || 1;
      shot.lastOwn.set(ev.ballId, { uid: d.uid, id: d.id, power, muted: !!ev.muted });
      if (ev.muted) fx.push({ type:'muted' });
      else {
        const prev = shot.touched.get(d.uid);
        shot.touched.set(d.uid, { id: d.id, power: Math.max(power, prev ? prev.power : 0), count: (prev ? prev.count : 0) + 1, front: !!ev.front });
        const before = fx.length;
        EFFECTS[d.id](shot, Object.assign({}, ev, { power, fromWall }), cfg.dolls[d.id], fx, rng);
        if (ev.stitch > 0) addM(fx, shot, ev.stitch, 'costurera');   // La Costurera premia a este vecino
        if (fx.length > before) shot.effects++;
      }
    }
    if (shot.tenderoRate > 0) {                          // cada contacto cobra, pero hay un tope de plata por tiro
      const room = Math.max(0, (cfg.dolls.tendero.cap || 1e9) - shot.tenderoPaid), v = Math.min(shot.tenderoRate, room);
      if (v > 0) { shot.tenderoPaid += v; shot.plata += v; fx.push({ type:'plata', v }); }
    }
    return fx;
  }

  /* ev: {ballId, which:'rival'|'own', time, manoAvailable?, manoPower?} */
  function goal(shot, ev, cfg) {
    const fx = [];
    let which = ev.which;
    if (which === 'own') {
      if (ev.manoAvailable && !shot.mano) { shot.mano = ev.manoPower || 1; which = 'rival'; fx.push({ type:'mano' }); }
      else { shot.autogol = true; fx.push({ type:'autogol' }); return fx; }
    }
    shot.goals++;
    if (!shot.goal) { shot.goal = true; shot.goalTime = ev.time; shot.distinctAtGoal = shot.distinct.size; }
    fx.push({ type:'goal' });
    return fx;
  }

  /* Resultado final del tiro. steps describe cada modificador en orden, para
     que la UI lo cuente paso a paso. */
  function resolve(shot, cfg) {
    const steps = [];
    let points = shot.points;
    if (shot.garra && shot.garra.active) {
      const f = 1 + cfg.dolls.garra.bonus * shot.garra.power;
      points *= f; steps.push({ key:'garra', on:'pts', f, pct: Math.round((f - 1) * 100) });
    }
    let mult = shot.mult;
    const touched = [...shot.touched.entries()].map(([uid, v]) => Object.assign({ uid }, v));
    const of = id => touched.filter(x => x.id === id);
    const apply = (key, f, extra) => { mult *= f; steps.push(Object.assign({ key, on:'mult', f }, extra)); };
    const fail = (key, extra) => steps.push(Object.assign({ key, on:'mult', f:1, fail:true }, extra));

    for (const r of of('rambos')) apply('rambos', scaleMult(cfg.dolls.rambos.xmult, r.power));
    for (const c of of('chilena')) {
      const need = cfg.dolls.chilena.needed;
      if (shot.goal && shot.distinctAtGoal >= need) apply('chilena', scaleMult(cfg.dolls.chilena.xmult, c.power), { n: shot.distinctAtGoal });
      else fail('chilena', { n: shot.goal ? shot.distinctAtGoal : shot.distinct.size, needed: need });
    }
    for (const c of of('cp7')) {                          // ×3 si juega de delantero (izquierda o centro); si no, ×1.5
      if (shot.goal) apply('cp7', scaleMult(c.front ? cfg.dolls.cp7.xmultFront : cfg.dolls.cp7.xmult, c.power), { front: !!c.front });
      else fail('cp7', {});
    }
    for (const v of of('veterano')) {
      if (veteranoWindow(cfg, shot.shotsLeft)) apply('veterano', scaleMult(cfg.dolls.veterano.xmult, v.power));
      else fail('veterano', {});
    }
    for (const m of of('madrugador')) {
      if (shot.goal && shot.shotNo === 1) apply('madrugador', scaleMult(cfg.dolls.madrugador.xmult, m.power));
      else fail('madrugador', {});
    }
    for (const m of of('tardon')) {                       // sube con cada tiro del partido: ×1 en el primero, ×xmult en el último (con o sin gol)
      const total = shot.shotNo - 1 + shot.shotsLeft, f = tardonFactor(cfg, shot.shotNo, total);
      if (f > 1) apply('tardon', scaleMult(f, m.power), { n: shot.shotNo, of: total });
      else fail('tardon', { n: shot.shotNo, of: total });
    }
    for (const c of of('caliente')) apply('caliente', scaleMult(cfg.dolls.caliente.xmult, c.power));
    // El Cabeza Caliente que NO tocaste resta plata (salvo que El Justiciero esté en la mesa)
    const penalty = shot.justiciero ? 0 : shot.calientes.filter(uid => !shot.touched.has(uid)).length * cfg.dolls.caliente.penalty;

    if (shot.goal) apply('goal', cfg.scoring.goalBonus);
    else if (shot.autogol) apply('autogol', cfg.scoring.autogolFactor);
    else apply('noGoal', cfg.scoring.noGoalFactor);

    const growth = [];
    for (const x of touched) if (x.id === 'ninamal') growth.push({ uid: x.uid, add: cfg.dolls[x.id].growth * x.power });
    if (shot.goal && shot.goals > 0) for (const d of shot.diez) growth.push({ uid: d.uid, add: cfg.dolls.diez.growth * d.power * shot.goals });

    return {
      steps, points, mult, final: Math.round(points * mult),
      growth,
      rambos: of('rambos').map(x => x.uid),
      plata: shot.plata, penalty,
      goal: shot.goal, autogol: shot.autogol && !shot.goal,
    };
  }

  /* Rambos: cuenta tiros tocándolo dentro del partido; a los N ve la roja y
     queda expulsado el partido SIGUIENTE que se juegue (played + 1). */
  function rambosTick(inst, cfg, played, justiciero) {
    if (justiciero) return false;                      // El Justiciero: Rambos no ve la roja
    inst.rojas = (inst.rojas || 0) + 1;
    if (inst.rojas >= cfg.dolls.rambos.redAfter) { inst.rojas = 0; inst.expelledFor = played + 1; return true; }
    return false;
  }
  const isExpelled = (inst, played) => inst.expelledFor === played;

  const api = { scaleMult, tardonFactor, isActive, powerOf, stitchBonus, justicieroOn, calienteList, gatoChance, garraState, veteranoWindow, baseMultOf, kanteRescues, cornetaPower, diezList,
    newShot, inheritBall, contact, goal, resolve, rambosTick, isExpelled, EFFECTS };
  GOLIN.scoring = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
