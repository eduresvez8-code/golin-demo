/* =====================================================================
   GOLÍN — PROGRESO ENTRE PICADITOS (funciones puras: sin DOM ni física)
   · Desbloqueos: algunos muñecos solo aparecen en la tienda después de
     cumplir un reto. Así cada picadito deja algo nuevo.
   · Canchas (niveles de dificultad): ganar un picadito abre la siguiente.
     Cada cancha suma su regla a las anteriores.
   Se prueba con `node tests.js`.
   ===================================================================== */
(function (root) {
  const GOLIN = root.GOLIN = root.GOLIN || {};

  /* Muñecos disponibles desde el primer picadito (el resto se desbloquea) */
  const STARTERS = ['poste', 'muro', 'rebotador', 'tendero', 'ninamal', 'cabezon', 'llave', 'veterano', 'chilena', 'gemelo', 'lechero', 'hincha'];

  /* Retos de desbloqueo. check(ev) recibe un evento del juego:
       {type:'shot', final, mult, contacts, goal}
       {type:'match', win, match, boss, goals, wonOnLastShot, wonOnFirstShot, level}
       {type:'run', win, reached, level} */
  const UNLOCKS = [
    { id:'kante',     check: ev => ev.type === 'run' },
    { id:'pirlito',   check: ev => ev.type === 'shot' && ev.contacts >= 12 },
    { id:'rambos',    check: ev => ev.type === 'shot' && ev.mult >= 6 },   // antes ×10: Cabezón ya no da Mult
    { id:'garra',     check: ev => ev.type === 'match' && ev.win && ev.wonOnLastShot },
    { id:'pesi',      check: ev => ev.type === 'match' && ev.goals >= 3 },
    { id:'cp7',       check: ev => ev.type === 'shot' && ev.final >= 3000 },
    { id:'bekam',     check: ev => ev.type === 'match' && ev.win && !!ev.boss },
    // ---- entrega de 12 muñecos nuevos ----
    { id:'cambista',   check: ev => ev.type === 'match' && ev.goals >= 1 },
    { id:'antena',     check: ev => ev.type === 'shot' && ev.contacts >= 6 },
    { id:'corneta',    check: ev => ev.type === 'shot' && (ev.walls || 0) >= 4 },
    { id:'abuela',     check: ev => ev.type === 'match' && (ev.plata || 0) >= 20 },
    { id:'madrugador', check: ev => ev.type === 'match' && ev.win && ev.wonOnFirstShot },
    { id:'tardon',     check: ev => ev.type === 'match' && ev.win && ev.wonOnLastShot },
    { id:'gato',       check: ev => ev.type === 'match' && ev.win && (ev.level || 1) >= 5 },
    { id:'costurera',  check: ev => ev.type === 'shot' && ev.contacts >= 8 },
    { id:'caliente',   check: ev => ev.type === 'shot' && ev.mult <= 0 },
    { id:'colector',   check: ev => ev.type === 'shot' && ev.final >= 5000 },
    { id:'justiciero', check: ev => ev.type === 'run' && ev.win && (ev.level || 1) >= 2 },
    { id:'capitan',    check: ev => ev.type === 'run' && ev.win && (ev.reached || 0) >= 9 },   // legendario: desde ahí, el jefe final lo ofrece
  ];

  /* Canchas: cada una incluye las reglas de las anteriores */
  const LEVELS = [
    { id:1, key:'potrero' },                    // sin cambios
    { id:2, key:'barrio',  quotaMult:1.2 },     // cuotas +20%
    { id:3, key:'liga',    shots:-1 },          // un tiro menos por partido
    { id:4, key:'clasico', bossMult:1.3 },      // jefes todavía más exigentes
    { id:5, key:'final',   noGoalPay:true, priceAdd:1 },   // perder no paga goles; todo cuesta +1
  ];
  function levelMods(level) {
    const m = { quotaMult:1, shots:0, bossMult:1, noGoalPay:false, priceAdd:0, lifeBonus: level === 1 ? 1 : 0 };   // Potrero: una vida de más
    for (const L of LEVELS) {
      if (L.id > level) break;
      if (L.quotaMult) m.quotaMult *= L.quotaMult;
      if (L.shots) m.shots += L.shots;
      if (L.bossMult) m.bossMult *= L.bossMult;
      if (L.noGoalPay) m.noGoalPay = true;
      if (L.priceAdd) m.priceAdd += L.priceAdd;
    }
    return m;
  }

  function newProfile() {
    return { version:1, unlocked: STARTERS.slice(), maxLevel:1, lastLevel:1, runs:0, wins:0, tutorialDone:false, seen:{}, shopVisits:0, eggsSeen:{}, bestShotEver:0, bestSeason:1 };
  }
  /* El perfil viene de localStorage: se reconstruye con solo lo que el juego conoce.
     Ids de muñecos que no existen, textos raros o números absurdos se descartan.
     (En GitHub Pages todas las páginas de la misma cuenta comparten localStorage.) */
  function sanitizeProfile(raw, knownIds) {
    const p = newProfile();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return p;
    const int = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : d);
    const flags = (o) => {
      const out = {};
      if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
      for (const k of Object.keys(o).slice(0, 500)) if (/^[\w:.-]{1,40}$/.test(k) && o[k] === true) out[k] = true;
      return out;
    };
    if (Array.isArray(raw.unlocked)) p.unlocked = [...new Set(STARTERS.concat(raw.unlocked.filter(id => typeof id === 'string' && knownIds.includes(id))))];
    p.maxLevel = int(raw.maxLevel, 1, LEVELS.length, 1);
    p.lastLevel = int(raw.lastLevel, 1, p.maxLevel, 1);
    for (const k of ['runs', 'wins', 'shopVisits', 'bestShotEver']) p[k] = int(raw[k], 0, 1e15, 0);
    p.bestSeason = int(raw.bestSeason, 1, 1e6, 1);
    p.tutorialVersion = int(raw.tutorialVersion, 0, 1e6, 0);
    p.tutorialDone = raw.tutorialDone === true;
    p.seen = flags(raw.seen); p.coachSeen = flags(raw.coachSeen); p.eggsSeen = flags(raw.eggsSeen);
    return p;
  }
  /* Picadito guardado (se guarda en cada tienda). Viene de localStorage, así que se reconstruye con lo que el juego
     conoce: ids reales, números en rango, casillas que existen. Si falta algo esencial devuelve null y no hay "Continuar".
     ctx: { dollIds, itemIds, bosses, mods, rods:[3,5,2,1], totalMatches, maxBench } */
  function sanitizeRun(raw, ctx) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.v !== 1) return null;
    const num = (v, lo, hi, d) => (typeof v === 'number' && isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d);
    const int = (v, lo, hi, d) => Math.floor(num(v, lo, hi, d));
    const dollId = v => (typeof v === 'string' && ctx.dollIds.includes(v) ? v : null);
    const itemId = v => (typeof v === 'string' && ctx.itemIds.includes(v) ? v : null);
    const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
    const doll = d => {
      if (!d || typeof d !== 'object' || !dollId(d.id)) return null;
      return { id: d.id, paid: int(d.paid, 0, 1e6, 0), value: num(d.value, -1e12, 1e12, 0), rojas: int(d.rojas, 0, 99, 0), expelledFor: d.expelledFor == null ? null : int(d.expelledFor, 0, 1e9, 0) };
    };
    const out = {
      v: 1, level: int(raw.level, 1, LEVELS.length, 1), season: int(raw.season, 1, 1e6, 1), match: int(raw.match, 0, ctx.totalMatches, 0),
      lastWin: raw.lastWin === true, retry: raw.retry === true, runCounted: raw.runCounted === true,
      total: num(raw.total, 0, 1e15, 0), metaBase: num(raw.metaBase, 0, 1e15, 0), matchStart: num(raw.matchStart, 0, 1e15, 0),
      quota: num(raw.quota, 0, 1e15, 0), matchQuota: num(raw.matchQuota, 0, 1e15, 0), bestShot: num(raw.bestShot, 0, 1e15, 0),
      plata: int(raw.plata, 0, 1e9, 0), lives: int(raw.lives, 0, 9, 0), maxLives: int(raw.maxLives, 1, 9, 3), won: int(raw.won, 0, 1e6, 0),
      played: int(raw.played, 0, 1e6, 0), legCap: int(raw.legCap, 0, 6, 2), rerollN: int(raw.rerollN, 0, 30, 0),
      hasShotRun: raw.hasShotRun === true, freePick: raw.freePick === true,
      plan: { bosses: {}, mods: {} }, runFlags: {}, stats: { goals: 0, use: {}, reached: 0 },
      pocket: arr(raw.pocket, 8).map(itemId).filter(Boolean), itemsBought: arr(raw.itemsBought, 300).map(itemId).filter(Boolean),
      offers: arr(raw.offers, 6).map(v => (v == null ? null : dollId(v))), shopItems: arr(raw.shopItems, 6).map(v => (v == null ? null : itemId(v))),
      bench: arr(raw.bench, ctx.maxBench).map(d => (d == null ? null : doll(d))), slots: [],
    };
    if (out.lives <= 0 || out.lives > out.maxLives + 1) return null;           // un picadito sin vidas ya terminó
    if (raw.plan && typeof raw.plan === 'object') {
      for (const [k, v] of Object.entries(raw.plan.bosses || {})) if (/^\d{1,2}$/.test(k) && ctx.bosses.includes(v)) out.plan.bosses[+k] = v;
      for (const [k, v] of Object.entries(raw.plan.mods || {})) if (/^\d{1,2}$/.test(k) && ctx.mods.includes(v)) out.plan.mods[+k] = v;
    }
    if (raw.runFlags && typeof raw.runFlags === 'object') for (const k of Object.keys(raw.runFlags).slice(0, 20)) if (/^\w{1,20}$/.test(k) && raw.runFlags[k] === true) out.runFlags[k] = true;
    if (raw.stats && typeof raw.stats === 'object') {
      out.stats.goals = int(raw.stats.goals, 0, 1e9, 0); out.stats.reached = int(raw.stats.reached, 0, 1e9, 0);
      for (const [k, v] of Object.entries(raw.stats.use || {})) if (dollId(k)) out.stats.use[k] = int(v, 0, 1e9, 0);
    }
    const seen = new Set();
    for (const s of arr(raw.slots, 20)) {
      if (!s || typeof s !== 'object' || !Number.isInteger(s.rod) || !Number.isInteger(s.i)) continue;
      if (s.rod < 0 || s.rod >= ctx.rods.length || s.i < 0 || s.i >= ctx.rods[s.rod] || seen.has(s.rod + ':' + s.i)) continue;
      const d = doll(s.doll); if (!d) continue;
      seen.add(s.rod + ':' + s.i); out.slots.push({ rod: s.rod, i: s.i, doll: d });
    }
    return out;
  }
  /* Qué muñecos puede ofrecer la tienda: desbloqueados y que no sean legendarios */
  function shopPool(roster, profile) { return roster.filter(d => d.shop && profile.unlocked.includes(d.id)); }
  /* Aplica un evento: devuelve la lista de ids recién desbloqueados (y los agrega al perfil) */
  function applyEvent(profile, ev) {
    const fresh = [];
    for (const u of UNLOCKS) if (!profile.unlocked.includes(u.id) && u.check(ev)) { profile.unlocked.push(u.id); fresh.push(u.id); }
    if (ev.type === 'run') {
      profile.runs++;
      if (ev.win) { profile.wins++; profile.maxLevel = Math.max(profile.maxLevel, Math.min(LEVELS.length, (ev.level || 1) + 1)); }
    }
    return fresh;
  }

  const api = { STARTERS, UNLOCKS, LEVELS, levelMods, newProfile, sanitizeProfile, sanitizeRun, shopPool, applyEvent };
  GOLIN.progress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
