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
       {type:'match', win, match, boss, goals, wonOnLastShot}
       {type:'run', win, reached} */
  const UNLOCKS = [
    { id:'kante',     check: ev => ev.type === 'run' },
    { id:'pirlito',   check: ev => ev.type === 'shot' && ev.contacts >= 12 },
    { id:'rambos',    check: ev => ev.type === 'shot' && ev.mult >= 10 },
    { id:'garra',     check: ev => ev.type === 'match' && ev.win && ev.wonOnLastShot },
    { id:'pesi',      check: ev => ev.type === 'match' && ev.goals >= 3 },
    { id:'cp7',       check: ev => ev.type === 'shot' && ev.final >= 3000 },
    { id:'bekam',     check: ev => ev.type === 'match' && ev.win && !!ev.boss },
    { id:'cazagoles', check: ev => ev.type === 'match' && ev.win && ev.match >= 6 },
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
    return { version:1, unlocked: STARTERS.slice(), maxLevel:1, lastLevel:1, runs:0, wins:0, tutorialDone:false, seen:{} };
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

  const api = { STARTERS, UNLOCKS, LEVELS, levelMods, newProfile, shopPool, applyEvent };
  GOLIN.progress = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
