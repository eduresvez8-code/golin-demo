/* =====================================================================
   GOLÍN — PICADITO, TIENDA Y ECONOMÍA (funciones puras: sin DOM ni física)
   Se prueba con `node tests.js`.
   Vocabulario: picadito = run · partido = serie de tiros para la cuota ·
   plata = monedas · cambiar la vitrina = reroll · banca = reserva.
   ===================================================================== */
(function (root) {
  const GOLIN = root.GOLIN = root.GOLIN || {};
  /* Jefes: los partidos 3 y 6 sortean entre BOSS_POOL; el 9 siempre es El Árbitro (jefe final). */
  const BOSS_POOL = ['gigante', 'barra', 'niebla', 'tacano', 'torcida'];
  const FINAL_BOSS = 'arbitro';
  const BOSSES = BOSS_POOL.concat([FINAL_BOSS]);
  /* Mesas especiales: el partido del medio de cada ronda (2, 5, 8) cambia una regla de la mesa. */
  const TABLE_MODS = ['encerada', 'goma', 'pesada'];

  const totalMatches = cfg => cfg.economy.matchesPerRound * cfg.economy.rounds;
  const isBoss = (match, cfg) => match % cfg.economy.matchesPerRound === 0;
  const roundOf = (match, cfg) => Math.ceil(match / cfg.economy.matchesPerRound);
  /* Jefe del partido (null si no es de jefe). En el modo sin fin los jefes se repiten en ciclo. */
  function bossFor(match, cfg, plan) {
    if (!isBoss(match, cfg)) return null;
    if (plan && plan.bosses[match]) return plan.bosses[match];
    if (match === totalMatches(cfg)) return FINAL_BOSS;
    return BOSS_POOL[(match / cfg.economy.matchesPerRound) % BOSS_POOL.length];   // modo sin fin
  }
  const isModMatch = (match, cfg) => match % cfg.economy.matchesPerRound === 2 % cfg.economy.matchesPerRound;
  function tableModFor(match, cfg, plan) {
    if (!isModMatch(match, cfg) || isBoss(match, cfg)) return null;
    if (plan && plan.mods[match]) return plan.mods[match];
    return TABLE_MODS[Math.floor(match / cfg.economy.matchesPerRound) % TABLE_MODS.length];
  }
  /* Sorteo del picadito: qué jefes y qué mesas especiales tocan (distintos entre sí). */
  function planRun(cfg, rng = Math.random) {
    const m = cfg.economy.matchesPerRound, n = totalMatches(cfg);
    const pool = BOSS_POOL.slice(), mods = TABLE_MODS.slice(), plan = { bosses:{}, mods:{} };
    const take = arr => arr.splice(Math.floor(rng() * arr.length) % arr.length, 1)[0];
    for (let k = m; k < n; k += m) plan.bosses[k] = take(pool.length ? pool : (pool.push(...BOSS_POOL), pool));
    plan.bosses[n] = FINAL_BOSS;
    for (let k = 2; k <= n; k += m) if (!isBoss(k, cfg)) plan.mods[k] = take(mods.length ? mods : (mods.push(...TABLE_MODS), mods));
    return plan;
  }
  const isFinalBoss = (match, cfg) => match === totalMatches(cfg);

  /* Redondeo "de tablero": múltiplos de 50 hasta 1.000; luego dos cifras significativas y media. */
  function niceQuota(q) {
    if (q < 1000) return Math.max(50, Math.round(q / 50) * 50);
    const p = Math.pow(10, Math.floor(Math.log10(q)) - 2) * 5;
    return Math.round(q / p) * p;
  }
  /* lm = modificadores de la cancha (progress.levelMods) */
  function quotaFor(match, cfg, lm) {
    const E = cfg.economy, L = lm || { quotaMult:1, bossMult:1 };
    return niceQuota(E.quotaBase * Math.pow(E.quotaGrowth, match - 1) * L.quotaMult * (isBoss(match, cfg) ? E.bossQuotaMult * L.bossMult : 1));
  }
  const priceOf = (id, cfg, lm) => cfg.dolls[id].price + ((lm && lm.priceAdd) || 0);
  const itemPrice = (id, cfg, lm) => cfg.items[id].price + ((lm && lm.priceAdd) || 0);
  /* Qué cosas puede ofrecer el mostrador ahora mismo.
     state: {legCap, legCapMax, benchSize, benchMax, bought:[ids comprados este picadito]} */
  function itemPool(cfg, items, state = {}) {
    const bought = state.bought || [];
    const legCapMax = state.legCapMax !== undefined ? state.legCapMax : cfg.economy.legendaryCapMax;
    const benchMax = state.benchMax !== undefined ? state.benchMax : cfg.economy.benchMax;
    return items.filter(it => {
      if (it.once && bought.includes(it.id)) return false;
      if (it.id === 'vitrina' && state.legCap >= legCapMax) return false;
      if (it.id === 'banquito' && state.benchSize >= benchMax) return false;
      return (cfg.items[it.id].weight || 0) > 0;
    });
  }
  /* Mostrador: N cosas distintas, sorteadas por peso */
  function rollItems(cfg, items, rng = Math.random, state = {}) {
    const pool = itemPool(cfg, items, state).slice(), out = [];
    while (out.length < cfg.economy.itemsPerShop && pool.length) {
      const tot = pool.reduce((a, it) => a + cfg.items[it.id].weight, 0);
      let x = rng() * tot, k = pool.length - 1;
      for (let i = 0; i < pool.length; i++) { x -= cfg.items[pool[i].id].weight; if (x < 0) { k = i; break; } }
      out.push(pool.splice(k, 1)[0].id);
    }
    return out;
  }

  /* Plata al terminar el partido. Perder no paga por jugar; los goles sí pagan.
     result: {win, shotsLeft, goals}. Los tiros saltados cuentan como sobrantes. */
  function matchRewards(result, cfg, lm) {
    const E = cfg.economy, lines = [];
    if (result.win) {
      lines.push({ key:'win', n:1, amount:E.rewardWin });
      if (result.shotsLeft > 0) lines.push({ key:'shots', n:result.shotsLeft, amount:result.shotsLeft * E.rewardShot });
    }
    if (result.goals > 0 && (result.win || !(lm && lm.noGoalPay))) lines.push({ key:'goals', n:result.goals, amount:result.goals * E.rewardGoal });
    if (result.alcancia) lines.push({ key:'alcancia', n:1, amount:E.alcanciaPlata });
    if (result.gaseosa) {
      const sub = lines.reduce((a, l) => a + l.amount, 0);
      if (sub > 0) lines.push({ key:'gaseosa', n:1, amount: Math.round(sub * (E.gaseosaMult - 1)) });
    }
    return { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
  }

  /* Cambiar la vitrina: 2 → 4 → 8 → 16… dentro de la misma visita (n = cambios ya hechos). */
  const rerollCost = (n, cfg) => cfg.economy.rerollBase * Math.pow(2, n);
  /* Vender devuelve la mitad de lo pagado, redondeando hacia abajo. Descartar: 0. */
  const sellValue = inst => Math.floor((inst.paid || 0) / 2);

  function rarityWeights(match, cfg) {
    const E = cfg.economy;
    return match <= E.stage1To ? E.rarity1 : match <= E.stage2To ? E.rarity2 : E.rarity3;
  }
  /* Vitrina: N muñecos sin repetir. Primero se sortea la rareza por peso y luego
     un muñeco de esa rareza. Los Legendarios (shop:false) nunca entran. */
  /* roster puede venir ya filtrado por desbloqueos (progress.shopPool) */
  function rollShop(match, cfg, roster, rng = Math.random) {
    const weights = rarityWeights(match, cfg), picked = [];
    const pool = roster.filter(d => d.shop && d.rarity !== 'legendario');
    for (let k = 0; k < cfg.economy.shopSize; k++) {
      const left = pool.filter(d => !picked.includes(d.id));
      if (!left.length) break;
      const rars = Object.keys(weights).filter(r => weights[r] > 0 && left.some(d => d.rarity === r));
      const choices = rars.length ? rars : [...new Set(left.map(d => d.rarity))];
      const tot = choices.reduce((a, r) => a + (weights[r] || 1), 0);
      let x = rng() * tot, rar = choices[choices.length - 1];
      for (const r of choices) { x -= (weights[r] || 1); if (x < 0) { rar = r; break; } }
      const of = left.filter(d => d.rarity === rar);
      picked.push(of[Math.floor(rng() * of.length) % of.length].id);
    }
    return picked;
  }

  /* Legendario por vencer al jefe: 3 → La Mano, 6 → El Diez, 9 (jefe final) → El Cacique. */
  function legendaryFor(match, cfg) {
    const m = cfg.economy.matchesPerRound;
    return match === m ? 'mano' : match === 2 * m ? 'diez' : match === totalMatches(cfg) ? 'cacique' : null;
  }
  /* Qué pasa con el legendario ganado:
       'dup'     ya lo tienes → se paga plata en su lugar
       'capfull' llegaste al cupo de Legendarios → eliges cuál sueltas o rechazas el nuevo
       'choose'  hay cupo pero la banca está llena → eliges qué descartar
       'bench'   entra directo a la banca
     ownedLeg = ids de los Legendarios que ya tienes (mesa + banca). */
  function legendaryOutcome(id, ownedLeg, bench, cap) {
    if (ownedLeg.includes(id)) return 'dup';
    if (ownedLeg.length >= cap) return 'capfull';
    return bench.some(b => !b) ? 'bench' : 'choose';
  }
  /* Los Legendarios no se venden ni se descartan (solo salen al elegir en 'capfull'). */
  const canSell = doll => !!doll && doll.rarity !== 'legendario';

  const api = { BOSSES, BOSS_POOL, FINAL_BOSS, TABLE_MODS, totalMatches, isBoss, roundOf, bossFor, isFinalBoss, niceQuota, quotaFor, matchRewards,
    tableModFor, planRun, priceOf, itemPrice, rollItems, itemPool, canSell,
    rerollCost, sellValue, rarityWeights, rollShop, legendaryFor, legendaryOutcome };
  GOLIN.economy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
