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
      if (s.doll.id === 'arquitecto') pw *= cfg.dolls.arquitecto.factor;
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
  function kanteRescues(slots, cfg) { return activeOnTable(slots, 'kante').reduce((a, s) => a + powerOf(slots, s, cfg), 0); }
  /* El Cacique: tiros extra que puede regalar cuando ibas a perder una vida (una vez por partido). */
  function caciqueShots(slots, cfg) {
    return activeOnTable(slots, 'cacique').reduce((a, s) => a + cfg.dolls.cacique.shots * powerOf(slots, s, cfg), 0);
  }
  function diezList(slots, cfg) { return activeOnTable(slots, 'diez').map(s => ({ uid: s.doll.uid, power: powerOf(slots, s, cfg) })); }

  /* ---------- estado del tiro ---------- */
  function newShot(ctx = {}) {
    return {
      t: 0, points: 0, baseMult: ctx.baseMult || 1, mult: ctx.baseMult || 1,
      contacts: 0, effects: 0, distinct: new Set(),
      touched: new Map(),        // uid → {id, power, count}
      lastOwn: new Map(),        // ballId → último muñeco propio tocado {uid, id, power, muted}
      goal: false, goalTime: null, goals: 0, autogol: false, mano: 0, distinctAtGoal: 0,
      tenderoRate: 0, tenderoOn: new Set(), plata: 0, split: new Set(),
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
  function inheritBall(shot, fromId, toId) { if (shot.lastOwn.has(fromId)) shot.lastOwn.set(toId, shot.lastOwn.get(fromId)); }

  /* ---------- efectos por muñeco (al contacto) ----------
     Cada caso recibe (shot, ev, p, fx, rng) donde p = cfg.dolls[id] y
     ev.power = potencia por Llaves. Empuja efectos a fx. */
  const pts = (fx, shot, v, src) => { shot.points += v; fx.push({ type:'pts', v, src }); };
  const addM = (fx, shot, v, src) => { shot.mult += v; fx.push({ type:'mult', v, src }); };
  const EFFECTS = {
    // El Poste: el primer toque del tiro paga pts; el SEGUNDO (y solo ese) paga el doble.
    poste(s, ev, p, fx) { const n = s.touched.get(ev.doll.uid).count; pts(fx, s, p.pts * (n === 2 ? p.second : 1) * ev.power, 'poste'); },
    muro(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'muro'); },
    rebotador(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'rebotador'); },
    tendero(s, ev, p, fx) {
      pts(fx, s, p.pts * ev.power, 'tendero');
      if (!s.tenderoOn.has(ev.doll.uid)) { s.tenderoOn.add(ev.doll.uid); s.tenderoRate += p.plata * ev.power; fx.push({ type:'tendero' }); }
    },
    ninamal(s, ev, p, fx) { pts(fx, s, ev.doll.value * ev.power, 'ninamal'); },
    veterano(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'veterano'); },   // el ×2 va al final (resolve)
    // Cabezón: 30 → 60 → 120 → 240… dentro del mismo tiro, sin tope. Solo puntos.
    cabezon(s, ev, p, fx) { const n = s.touched.get(ev.doll.uid).count; pts(fx, s, p.pts * Math.pow(2, n - 1) * ev.power, 'cabezon'); },
    garra() {},                                             // pasiva: se resuelve al final
    pirlito(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'pirlito'); fx.push({ type:'pirlo', bounces: p.bounces * ev.power }); },
    kante(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'kante'); },   // el rescate es pasivo (física)
    rambos(s, ev, p, fx) { fx.push({ type:'rambos' }); },  // ×N al final
    llave(s, ev, p, fx) { pts(fx, s, p.pts, 'llave'); },
    chilena(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'chilena'); },
    fantasma(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'fantasma'); },
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
    cazagoles() {},                                         // +Mult al gol (ver goal())
    cambista(s, ev, p, fx) {                                // +plata la PRIMERA vez que lo tocas en cada partido
      const key = s.matchId === undefined ? 'sin-partido' : s.matchId;
      if (ev.doll.cambistaMatch !== key) { ev.doll.cambistaMatch = key; const v = p.plata * ev.power; s.plata += v; fx.push({ type:'plata', v, src:'cambista' }); }
    },
    antena(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'antena'); },        // la atracción es física (game.js)
    madrugador(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'madrugador'); }, // ×N al final si es el primer tiro y gol
    tardon(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'tardon'); },         // ×N al final si es el último tiro y gol
    gato(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'gato'); },             // la atajada es pasiva (física)
    costurera(s, ev, p, fx) { pts(fx, s, p.pts * ev.power, 'costurera'); },   // su premio lo cobran los vecinos (stitchBonus)
    caliente(s, ev, p, fx) { fx.push({ type:'caliente' }); },                  // ×N al final si lo tocaste
    arquitecto(s, ev, p, fx) { pts(fx, s, p.pts, 'arquitecto'); },            // su potencia la reparte en la barra (powerOf)
    colector() {},                                          // paga al cobrar el partido (economy.colectorPay)
    revancha(s, ev, p, fx) {
      pts(fx, s, p.pts * ev.power, 'revancha');
      if (s.lostPrev) addM(fx, s, p.mult * ev.power, 'revancha');          // si perdiste el partido anterior
    },
    justiciero() {},                                        // no suma: protege de los malditos
    capitan() {},                                           // elige a quién le pone la cinta (powerOf)
    mano() {},                                              // actúa en el autogol
    diez() {},                                              // Mult base
    cacique() {},                                           // salva la vida con un tiro extra (ver caciqueShots)
  };

  /* ev: {ballId, kind:'wall'|'rival'|'own', key, doll?, power?, muted?} */
  function contact(shot, ev, cfg, rng = Math.random) {
    const fx = [];
    shot.contacts++;
    shot.distinct.add(ev.key);
    if (ev.kind === 'wall') pts(fx, shot, cfg.scoring.wallPts, 'wall');
    else if (ev.kind === 'rival') fx.push({ type:'rival' });
    else if (ev.kind === 'own') {
      const d = ev.doll, power = ev.power || 1;
      shot.lastOwn.set(ev.ballId, { uid: d.uid, id: d.id, power, muted: !!ev.muted });
      if (ev.muted) fx.push({ type:'muted' });
      else {
        const prev = shot.touched.get(d.uid);
        shot.touched.set(d.uid, { id: d.id, power: Math.max(power, prev ? prev.power : 0), count: (prev ? prev.count : 0) + 1 });
        const before = fx.length;
        EFFECTS[d.id](shot, Object.assign({}, ev, { power }), cfg.dolls[d.id], fx, rng);
        if (ev.stitch > 0) addM(fx, shot, ev.stitch, 'costurera');   // La Costurera premia a este vecino
        if (fx.length > before) shot.effects++;
      }
    }
    if (shot.tenderoRate > 0) { shot.plata += shot.tenderoRate; fx.push({ type:'plata', v: shot.tenderoRate }); }
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
    const last = shot.lastOwn.get(ev.ballId);
    if (last && last.id === 'cazagoles' && !last.muted) {
      const v = cfg.dolls.cazagoles.mult * last.power;
      shot.mult += v; fx.push({ type:'mult', v, src:'cazagoles', uid: last.uid });
    }
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
    for (const f of of('fantasma')) {
      if (shot.goal && shot.goalTime < cfg.dolls.fantasma.time) apply('fantasma', scaleMult(cfg.dolls.fantasma.xmult, f.power), { t: shot.goalTime });
      else fail('fantasma', { t: shot.goal ? shot.goalTime : null });
    }
    for (const c of of('cp7')) {
      if (shot.goal) apply('cp7', scaleMult(cfg.dolls.cp7.xmult, c.power));
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
    for (const m of of('tardon')) {
      if (shot.goal && shot.shotsLeft === 1) apply('tardon', scaleMult(cfg.dolls.tardon.xmult, m.power));
      else fail('tardon', {});
    }
    for (const c of of('caliente')) apply('caliente', scaleMult(cfg.dolls.caliente.xmult, c.power));
    // El Cabeza Caliente que NO tocaste resta plata (salvo que El Justiciero esté en la mesa)
    const penalty = shot.justiciero ? 0 : shot.calientes.filter(uid => !shot.touched.has(uid)).length * cfg.dolls.caliente.penalty;
    if (shot.mano) apply('mano', scaleMult(cfg.dolls.mano.xmult, shot.mano));

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

  const api = { scaleMult, isActive, powerOf, stitchBonus, justicieroOn, calienteList, gatoChance, garraState, veteranoWindow, baseMultOf, kanteRescues, caciqueShots, diezList,
    newShot, inheritBall, contact, goal, resolve, rambosTick, isExpelled, EFFECTS };
  GOLIN.scoring = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
