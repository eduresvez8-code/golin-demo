/* =====================================================================
   GOLÍN — CONFIGURACIÓN ÚNICA
   Todos los números de balance y de "feel" viven en GOLIN.CFG.
   El panel de debug (tecla D) lo edita en vivo; se guarda en localStorage
   y se puede exportar/importar como JSON.
   Requiere js/roster.js cargado antes (de ahí salen los valores por
   defecto de cada muñeco).
   ===================================================================== */
(function (root) {
  const GOLIN = root.GOLIN = root.GOLIN || {};
  const STORAGE_KEY = 'golinCFG_v3';   // v3: solo se guardan los valores que cambiaste
  const store = () => (typeof window !== 'undefined' && window.localStorage) || null;   // en Node no hay persistencia

  function buildDefaults() {
    const d = {
      physics: {
        wallRest: 0.9,        // restitución de las bandas
        rivalRest: 0.85,      // restitución de los muñecos rivales
        drag: 0.15,           // amortiguación exponencial por segundo
        rollFric: 1.8,        // desaceleración constante (px/step por segundo)
        maxShot: 42,          // velocidad máxima del tiro (px por step de 60 Hz)
        stopSpeed: 0.25,      // bajo esta velocidad el balón se considera detenido
        substeps: 8,          // sub-pasos por frame (evita atravesar el Poste)
      },
      juice: {
        shake: 1.0,           // multiplicador global del temblor (además de la opción del jugador)
        hitstopMs: 60,        // micropausa en golpes que suben el multiplicador
        slowmoScale: 0.3,     // velocidad de la cámara lenta cerca del arco
        slowmoDur: 0.7,       // duración de la cámara lenta (s)
        goalShakeMax: 0.4,    // nivel 5: el temblor dura como máximo esto (s)
        comboEffects: 3,      // efectos en un tiro para llegar al nivel 4 (combo)
        stingerMult: 8,       // Mult a partir del cual suena el stinger (una vez por tiro)
      },
      scoring: {
        wallPts: 15,          // puntos por banda
        goalBonus: 1.5,       // ×Mult con gol en arco rival
        noGoalFactor: 0.5,    // ×Mult si el balón se detiene sin gol
        autogolFactor: 0,     // ×Mult en autogol (salvo La Mano)
      },
      economy: {
        shotsPerMatch: 5,     // tiros por partido (3–5)
        quotaBase: 300,
        quotaGrowth: 2.0,     // ×cuota por partido
        bossQuotaMult: 1.5,   // ×cuota adicional en partidos de jefe
        matchesPerRound: 3,
        rounds: 3,            // 3 rondas × 3 partidos = 9 partidos
        lives: 3,
        startPlata: 4,        // plata de bolsillo: evita la espiral sin salida si pierdes el partido 1
        rewardWin: 5,
        rewardShot: 3,        // por cada tiro sobrante
        rewardGoal: 1,        // por cada gol del partido
        rerollBase: 2,        // cambiar la vitrina: 2 → 4 → 8 → 16…
        shopSize: 3,
        benchSize: 3,
        legendaryDupPlata: 15,
        legendaryCap: 2,      // Legendarios a la vez (mesa + banca)
        legendaryCapMax: 3,   // tope al que llega La Vitrina Grande
        benchMax: 5,          // tope de espacios de banca (El Banquito)
        radioMult: 1,         // +Mult base de La Radio durante el partido
        alcanciaPlata: 2,     // plata extra por partido con La Alcancía
        talcoRoll: 0.45,      // El Talco: fricción de rodadura ×N en ese tiro
        polvoraWallPts: 2,    // La Pólvora: puntos de banda ×N en ese tiro
        itemsPerShop: 2,      // cosas del mostrador por visita
        pocketSize: 2,        // espacios del bolsillo para consumibles
        empanadaMult: 2,      // +Mult base de la empanada
        gaseosaMult: 2,       // ×plata del partido con la gaseosa
        stage1To: 3,          // partidos 1–3 usan rarity1
        stage2To: 7,          // partidos 4–7 usan rarity2; 8+ rarity3
        rarity1: { comun: 70, raro: 27, especial: 3 },
        rarity2: { comun: 50, raro: 35, especial: 15 },
        rarity3: { comun: 35, raro: 40, especial: 25 },
      },
      rivals: {
        enabled: true,
        keeperX: 300, keeperY: 100, keeperW: 40, keeperH: 20,
        defY: 160, defX1: 205, defX2: 395, defR: 14,
      },
      bosses: {
        gigantScale: 2,       // El Gigante: ancho del portero rival ×N
        barraSpeed: 1.4,      // Barra Loca: velocidad (rad/s de la oscilación)
        barraAmp: 105,        // Barra Loca: recorrido a cada lado (px)
        torcidaWind: 1.3,     // Cancha Torcida: empuje lateral (px/step por segundo)
      },
      tableMods: {
        enceradaDrag: 0.5, enceradaRoll: 0.6,   // Mesa encerada: el balón corre más
        gomaRest: 1.0,                          // Bandas de goma: rebotan sin perder
        pesadaRoll: 1.6, pesadaWallPts: 2,      // Tapete pesado: frena más, bandas ×2 puntos
      },
      dolls: {},
      items: {},
    };
    for (const doll of GOLIN.ROSTER) {
      d.dolls[doll.id] = Object.assign({ price: doll.price, rest: doll.rest }, doll.params);
    }
    for (const it of GOLIN.ITEMS) d.items[it.id] = { price: it.price, weight: it.weight };
    return d;
  }

  const clone = o => JSON.parse(JSON.stringify(o));
  /* Límites de seguridad: lo que venga de localStorage o de un JSON importado se recorta a estos
     rangos. Sin ellos, un valor absurdo (una banca de mil millones de puestos, 1e9 sub-pasos de
     física) colgaría la pestaña. Cualquier otro número debe ser finito y |v| ≤ 1e9. */
  const BOUNDS = {
    'physics.substeps': [1, 32], 'physics.maxShot': [1, 200], 'physics.stopSpeed': [0.01, 10],
    'economy.shotsPerMatch': [1, 10], 'economy.shopSize': [1, 6], 'economy.benchSize': [1, 8], 'economy.benchMax': [1, 8],
    'economy.pocketSize': [0, 6], 'economy.itemsPerShop': [0, 6], 'economy.legendaryCap': [0, 6], 'economy.legendaryCapMax': [0, 6],
    'economy.lives': [1, 9], 'economy.rounds': [1, 10], 'economy.matchesPerRound': [1, 10], 'economy.quotaGrowth': [1, 10],
    'economy.stage1To': [1, 100], 'economy.stage2To': [1, 100], 'juice.hitstopMs': [0, 1000], 'juice.slowmoDur': [0, 5],
    'juice.slowmoScale': [0.05, 1], 'juice.goalShakeMax': [0, 3],
  };
  function safeNumber(path, v) {
    if (typeof v !== 'number' || !isFinite(v)) return null;
    const b = BOUNDS[path];
    if (b) return Math.min(b[1], Math.max(b[0], v));
    return Math.min(1e9, Math.max(-1e9, v));
  }
  // Mezcla solo las claves que existen en el destino (así un JSON viejo no mete basura)
  function mergeKnown(dst, src, path = '') {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return dst;
    for (const k of Object.keys(dst)) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
      const p = path ? path + '.' + k : k;
      if (dst[k] && typeof dst[k] === 'object') mergeKnown(dst[k], src[k], p);
      else if (typeof dst[k] === 'number') { const v = safeNumber(p, src[k]); if (v !== null) dst[k] = v; }
      else if (typeof dst[k] === 'boolean' && typeof src[k] === 'boolean') dst[k] = src[k];
    }
    return dst;
  }

  const DEFAULTS = buildDefaults();
  const CFG = clone(DEFAULTS);
  try { if (store()) mergeKnown(CFG, JSON.parse(store().getItem(STORAGE_KEY) || '{}')); } catch (e) {}

  /* Se guardan solo las diferencias con los valores por defecto: así, si el juego cambia un valor
     por defecto, te llega el nuevo salvo que tú lo hayas tocado a mano en el debug. */
  function diff(cur, def) {
    const out = {};
    for (const k of Object.keys(cur)) {
      if (cur[k] && typeof cur[k] === 'object') { const d = diff(cur[k], def[k] || {}); if (Object.keys(d).length) out[k] = d; }
      else if (cur[k] !== def[k]) out[k] = cur[k];
    }
    return out;
  }
  function save() { try { if (store()) store().setItem(STORAGE_KEY, JSON.stringify(diff(CFG, DEFAULTS))); } catch (e) {} }
  function reset() { const fresh = clone(DEFAULTS); for (const k of Object.keys(CFG)) CFG[k] = fresh[k]; save(); }
  function exportJSON() { return JSON.stringify(CFG, null, 1); }
  function importJSON(text) { const data = JSON.parse(text); reset(); mergeKnown(CFG, data); save(); }
  function getPath(path) { return path.split('.').reduce((o, k) => (o ? o[k] : undefined), CFG); }
  function setPath(path, v) {
    const keys = path.split('.'), last = keys.pop();
    const o = keys.reduce((a, k) => (a && Object.prototype.hasOwnProperty.call(a, k) ? a[k] : undefined), CFG);
    if (!o || !Object.prototype.hasOwnProperty.call(o, last)) return;          // solo claves que ya existen
    if (typeof o[last] === 'number') { const n = safeNumber(path, v); if (n === null) return; o[last] = n; }
    else if (typeof o[last] === 'boolean') o[last] = !!v;
    else return;
    save();
  }
  /* Opciones del jugador (accesibilidad): solo claves conocidas, del tipo correcto y en rango. */
  const OPT_RANGES = { shake: [0, 1], master: [0, 1], music: [0, 1], sfx: [0, 1], textScale: [0.85, 1.35] };
  function sanitizeOptions(raw, defaults) {
    const out = Object.assign({}, defaults);
    if (!raw || typeof raw !== 'object') return out;
    for (const k of Object.keys(defaults)) {
      if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
      const v = raw[k];
      if (typeof defaults[k] === 'boolean') out[k] = v === true;
      else if (typeof v === 'number' && isFinite(v)) { const r = OPT_RANGES[k] || [0, 1]; out[k] = Math.min(r[1], Math.max(r[0], v)); }
    }
    return out;
  }

  GOLIN.CFG = CFG;
  GOLIN.CFG_DEFAULTS = DEFAULTS;
  GOLIN.config = { save, reset, exportJSON, importJSON, getPath, setPath, mergeKnown, clone, safeNumber, sanitizeOptions, BOUNDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = { CFG, DEFAULTS, config: GOLIN.config };
})(typeof globalThis !== 'undefined' ? globalThis : this);
