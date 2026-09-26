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
  const STARTERS = ['poste', 'muro', 'rebotador', 'tendero', 'ninamal', 'cabezon', 'llave', 'veterano', 'chilena', 'fantasma', 'gemelo'];

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
    { id:'cazagoles', check: ev => ev.type === 'match' && ev.win && ev.match >= 6 },
    // ---- entrega de 12 muñecos nuevos ----
    { id:'cambista',   check: ev => ev.type === 'match' && ev.goals >= 1 },
    { id:'antena',     check: ev => ev.type === 'shot' && ev.contacts >= 6 },
    { id:'madrugador', check: ev => ev.type === 'match' && ev.win && ev.wonOnFirstShot },
    { id:'tardon',     check: ev => ev.type === 'match' && ev.win && ev.wonOnLastShot },
    { id:'gato',       check: ev => ev.type === 'match' && ev.win && (ev.level || 1) >= 5 },
    { id:'costurera',  check: ev => ev.type === 'shot' && ev.contacts >= 8 },
    { id:'caliente',   check: ev => ev.type === 'shot' && ev.mult <= 0 },
    { id:'arquitecto', check: ev => ev.type === 'run' && ev.win },
    { id:'colector',   check: ev => ev.type === 'shot' && ev.final >= 5000 },
    { id:'revancha',   check: ev => ev.type === 'match' && !ev.win },
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
    const m = { quotaMult:1, shots:0, bossMult:1, noGoalPay:false, priceAdd:0 };
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
    return { version:1, unlocked: STARTERS.slice(), maxLevel:1, lastLevel:1, runs:0, wins:0, tutorialDone:false, seen:{}, shopVisits:0, eggsSeen:{}, bestShotEver:0 };
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
    for (const k of ['runs', 'wins', 'shopVisits', 'bestShotEver']) p[k] = int(raw[k], 0, 1e12, 0);
    p.tutorialVersion = int(raw.tutorialVersion, 0, 1e6, 0);
    p.tutorialDone = raw.tutorialDone === true;
    p.seen = flags(raw.seen); p.coachSeen = flags(raw.coachSeen); p.eggsSeen = flags(raw.eggsSeen);
    return p;
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

  const api = { STARTERS, UNLOCKS, LEVELS, levelMods, newProfile, sanitizeProfile, shopPool, applyEvent };
  GOLIN.progress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
