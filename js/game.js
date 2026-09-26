/* =====================================================================
   GOLÍN — MOTOR: física, mesa, input, render y flujo del partido.
   Depende de: Matter.js, js/roster.js, js/config.js, js/strings.js, js/audio.js
   ===================================================================== */
'use strict';
const { Engine, World, Bodies, Body, Events, Query } = Matter;
const CFG = GOLIN.CFG, t = GOLIN.t, DOLL = GOLIN.DOLL;
const dc = id => CFG.dolls[id];

/* ===================== GEOMETRÍA DE LA MESA ===================== */
const CW = 600, CH = 940;
const T = { l:40, r:560, t:40, b:900 };               // interior del campo
const GR = { x1:215, x2:385 };                         // arco rival (arriba)
const GO = { x1:235, x2:365 };                         // arco propio (abajo)
const BALL_R = 11;
const RODS = [                                         // índice 0 = adelante (arriba)
  { y:225, n:3 },   // Delantera
  { y:405, n:5 },   // Medio
  { y:580, n:2 },   // Defensa
  { y:705, n:1 },   // Portero
];
const KICK = { y1:765, y2:845, y:805 };
const MAX_BALLS = 8;

/* ===================== ESTADO ===================== */
const G = {
  state:'aim', match:1, quota:0, total:0, shotsLeft:0, plata:0, lives:3,
  won:0, bestShot:0, goals:0, lastWin:false, hasShot:false,
  slots:[], offers:[], rerollN:0, sellMode:false, selectedOffer:null, pick:null,
  ballX:300, fast:false,
};
RODS.forEach((rod, ri) => {
  for (let i = 0; i < rod.n; i++) G.slots.push({ rod:ri, i, x: T.l + (T.r - T.l) * (i + 1) / (rod.n + 1), y: rod.y, doll:null, body:null });
});
let shot = null, balls = [], dollUid = 1;
Object.assign(G, { played:0, boss:null, forceBoss:null, endless:false, manoUsed:false, reachedQuota:false, bench:[], stats:{ goals:0, use:{}, reached:1 } });

/* Opciones del jugador (accesibilidad). Se guardan aparte de la config de balance. */
const OPT = GOLIN.config.sanitizeOptions(
  (() => { try { return JSON.parse(localStorage.getItem('golinOptions') || '{}'); } catch (e) { return {}; } })(),
  { shake:1, reduceFlashes:false, fast:false, colorblind:false, master:0.8, music:0.5, sfx:0.9, textScale:1 });
function saveOptions() { try { localStorage.setItem('golinOptions', JSON.stringify(OPT)); } catch (e) {} }

/* ¿Pantalla táctil? Cambia textos ("toca" en vez de "clic") y agranda las zonas para el dedo.
   ¿Pantalla angosta (celular, tableta vertical)? Entonces el panel lateral es una hoja que sube desde abajo. */
const MQ_COARSE = matchMedia('(pointer: coarse)'), MQ_COMPACT = matchMedia('(max-width: 900px)');
GOLIN.touch = MQ_COARSE.matches;
const isCompact = () => MQ_COMPACT.matches;
function setTouch(v) { if (GOLIN.touch === v) return; GOLIN.touch = v; tableDirty = true; refreshTexts(); }

/* Progreso entre picaditos (desbloqueos, canchas, tutorial). Lógica pura en js/progress.js */
const PR = GOLIN.progress;
const PROFILE = PR.sanitizeProfile((() => { try { return JSON.parse(localStorage.getItem('golinProfile') || '{}'); } catch (e) { return {}; } })(), GOLIN.ROSTER.map(d => d.id));
function saveProfile() { try { localStorage.setItem('golinProfile', JSON.stringify(PROFILE)); } catch (e) {} }
let LM = PR.levelMods(1);                   // reglas de la cancha actual
Object.assign(G, { metaBase:0, matchStart:0, matchQuota:0, retry:false, level:1, plan:null, mod:null, pocket:[], shopItems:[], matchFlags:{}, nextShot:{}, runFlags:{}, itemsBought:[], legCap:2, caciqueUsed:false, windDir:1, wonOnLastShot:false });
/* Desbloqueos: se revisan con cada tiro, partido y picadito */
function progressEvent(ev) {
  const fresh = PR.applyEvent(PROFILE, ev);
  saveProfile();
  fresh.forEach((id, i) => setTimeout(() => {
    bigText(t('unlock.title'), '#f4ead5', 1600, DOLL[id].name); SFX.levelup(); SFX.stinger();
    LOG.shop({ type:'unlock', id });
  }, 400 + i * 1700));
  return fresh;
}

/* ===================== UTILIDADES ===================== */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.round(n).toLocaleString('es-ES', { useGrouping: true });
const fm = m => (Math.abs(m - Math.round(m)) < 1e-9 ? String(Math.round(m)) : (Math.round(m * 100) / 100).toString());
const now = () => performance.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = ms => sleep(G.fast ? ms / 5 : ms);
const nice = q => Math.max(50, Math.round(q / 50) * 50);
function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
/* Los números del marcador se achican si no caben (modo sin fin en un celular: 123.456.789 / 234.567.890) */
function fitBoardText() {
  document.querySelectorAll('#board .cell b').forEach(el => {
    el.style.fontSize = '';
    const max = el.parentElement.clientWidth - 10; if (max <= 0) return;
    let fs = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > max && fs > 9) { fs -= 1; el.style.fontSize = fs + 'px'; }
  });
}
function countUp(el, from, to, ms, onTick) {
  return new Promise(res => {
    const dur = G.fast ? ms / 5 : ms; const t0 = now(); let shown = null;
    (function f() {
      const k = Math.min(1, (now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const v = Math.round(from + (to - from) * e);
      if (v !== shown) { el.textContent = fmt(v); shown = v; if (onTick) onTick(k); }
      if (k < 1) requestAnimationFrame(f); else { fitBoardText(); res(); }
    })();
  });
}

/* ===================== FÍSICA (Matter.js) ===================== */
const engine = Engine.create();
engine.gravity.x = 0; engine.gravity.y = 0; engine.gravity.scale = 0;
engine.positionIterations = 8; engine.velocityIterations = 6;
const getV = b => Body.getVelocity(b);
const walls = [];
function addWall(x, y, w, h, angle = 0) {
  const b = Bodies.rectangle(x, y, w, h, { isStatic:true, restitution:0, friction:0, frictionStatic:0, angle });
  b.plugin = { kind:'wall' };
  World.add(engine.world, b); walls.push(b); return b;
}
addWall(T.l - 40, CH / 2, 80, CH + 300);
addWall(T.r + 40, CH / 2, 80, CH + 300);
addWall((T.l - 80 + GR.x1) / 2, T.t - 40, GR.x1 - (T.l - 80), 80);
addWall((GR.x2 + T.r + 80) / 2, T.t - 40, T.r + 80 - GR.x2, 80);
addWall((T.l - 80 + GO.x1) / 2, T.b + 40, GO.x1 - (T.l - 80), 80);
addWall((GO.x2 + T.r + 80) / 2, T.b + 40, T.r + 80 - GO.x2, 80);
addWall(CW / 2, T.t - 110, 400, 40);
addWall(CW / 2, T.b + 110, 400, 40);
const corners = [[T.l, T.t], [T.r, T.t], [T.l, T.b], [T.r, T.b]].map(([x, y]) => addWall(x, y, 56, 56, Math.PI / 4));
function addSensor(x1, x2, y, which) {
  const b = Bodies.rectangle((x1 + x2) / 2, y, x2 - x1, 48, { isStatic:true, isSensor:true });
  b.plugin = { kind:'goal', goal:which }; World.add(engine.world, b);
}
addSensor(GR.x1, GR.x2, T.t - 36, 'rival');
addSensor(GO.x1, GO.x2, T.b + 36, 'own');

function makeDoll(id, paid) {
  const p = dc(id);
  return { uid: dollUid++, id, rarity: DOLL[id].rarity, paid, value: p.base !== undefined ? p.base : 0, hitT:-9999, nx:0, ny:1, rojas:0, expelledFor:null };
}
/* Estados que cambian qué muñecos actúan: El Árbitro (delantera muda) y la roja de Rambos. */
function isMuted(slot) { return G.boss === 'arbitro' && slot.rod === 0; }
function refreshDollStates() {
  for (const s of G.slots) if (s.doll) { s.doll.muted = isMuted(s); s.doll.expelled = SC.isExpelled(s.doll, G.played); }
}
function rebuildDolls() {
  refreshDollStates();
  for (const s of G.slots) {
    if (s.body) { World.remove(engine.world, s.body); s.body = null; }
    if (!s.doll || s.doll.expelled) continue;          // expulsado: sale de la mesa, sin colisión
    const shape = DOLL[s.doll.id].shape;
    const opts = { isStatic:true, restitution:0, friction:0, frictionStatic:0 };
    const b = shape.kind === 'rect'
      ? Bodies.rectangle(s.x, s.y, shape.w, shape.h, Object.assign(opts, { chamfer:{ radius: shape.h / 2 - 1 } }))
      : Bodies.circle(s.x, s.y, shape.r, opts);
    b.plugin = { kind:'doll', slot:s };
    World.add(engine.world, b); s.body = b;
  }
}
const dollBodies = () => G.slots.filter(s => s.body).map(s => s.body);

let ballSeq = 1;
function spawnBall(x, y, vx = 0, vy = 0, parent = null) {
  const body = Bodies.circle(x, y, BALL_R, {
    restitution:0, friction:0, frictionStatic:0, frictionAir:0, inertia:Infinity, collisionFilter:{ group:-1 },
  });
  const b = { id: ballSeq++, body, alive:true, moving:false, still:0, trail:[], slowmo:false,
    lastHit: parent ? Object.assign({}, parent.lastHit) : {},
    pirlo:0, gambeta:false, bekam:null, curve:null };
  body.plugin = { kind:'ball', ball:b };
  World.add(engine.world, body);
  Body.setVelocity(body, { x:vx, y:vy });
  balls.push(b); return b;
}
function resetBall() {
  for (const b of balls) World.remove(engine.world, b.body);
  balls = [];
  spawnBall(G.ballX, KICK.y);
}

let pendingHits = [], pendingGoals = [], pendingSplits = [];
Events.on(engine, 'collisionStart', ev => {
  for (const p of ev.pairs) {
    const a = p.bodyA, c = p.bodyB;
    const ballBody = a.plugin.kind === 'ball' ? a : (c.plugin.kind === 'ball' ? c : null);
    if (!ballBody) continue;
    const other = ballBody === a ? c : a;
    const bo = ballBody.plugin.ball;
    if (!bo.alive || other.plugin.kind === 'ball') continue;
    if (other.plugin.kind === 'goal') { pendingGoals.push({ bo, which: other.plugin.goal }); continue; }
    const n = { x: p.collision.normal.x, y: p.collision.normal.y };
    const dx = ballBody.position.x - other.position.x, dy = ballBody.position.y - other.position.y;
    if (n.x * dx + n.y * dy < 0) { n.x = -n.x; n.y = -n.y; }   // normal apuntando hacia el balón
    pendingHits.push({ bo, other, n, vIn: getV(ballBody) });
  }
});

function restitutionOf(body) {
  const k = body.plugin.kind;
  if (k === 'wall') return phys('wallRest');
  if (k === 'rival') return CFG.physics.rivalRest;
  const slot = body.plugin.slot, id = slot.doll.id;
  if (slot.doll.muted) return 0.85;                    // con El Árbitro choca, pero sin efecto
  let e = dc(id).rest;
  if (id === 'rebotador') e = 1 + (e - 1) * powerOf(slot);
  return e;
}
const RIVAL_GOAL = { x: CW / 2, y: T.t - 10 };
function dirToGoal(p) { const dx = RIVAL_GOAL.x - p.x, dy = RIVAL_GOAL.y - p.y, l = Math.hypot(dx, dy) || 1; return { x: dx / l, y: dy / l }; }

/* Un sub-paso de simulación. Matter detecta y separa; la respuesta del rebote es
   nuestra (reflexión con restitución por objeto) para que el feel sea 100% tuneable. */
function physicsStep(ms) {
  pendingHits = []; pendingGoals = []; pendingSplits = [];
  moveRivals(ms);
  Engine.update(engine, ms);
  shot.t += ms / 1000;

  const outV = new Map();
  for (const h of pendingHits) {
    const bo = h.bo; if (!bo.alive) continue;
    const v = outV.get(bo) || h.vIn;
    let e = restitutionOf(h.other);
    if (bo.pirlo > 0) { e = Math.max(e, 1); bo.pirlo--; activated('pirlito'); }   // Pirlito: rebotes sin pérdida
    const vn = v.x * h.n.x + v.y * h.n.y;
    let out = { x: v.x, y: v.y };
    if (vn < 0) {
      out = { x: v.x - (1 + e) * vn * h.n.x, y: v.y - (1 + e) * vn * h.n.y };
      const o = h.other.plugin;
      if (o.kind === 'doll' && o.slot.doll.id === 'rebotador' && !o.slot.doll.muted) {
        activated('rebotador');
        const outN = -vn * e, k = dc('rebotador').minKick;
        if (outN < k) { out.x += (k - outN) * h.n.x; out.y += (k - outN) * h.n.y; }
      }
    }
    // Pesi: la gambeta pendiente redirige ESTE rebote hacia el arco rival, misma velocidad
    if (bo.gambeta) {
      const d = dirToGoal(bo.body.position);
      if (d.x * h.n.x + d.y * h.n.y > 0.05) {
        const sp = Math.hypot(out.x, out.y); out = { x: d.x * sp, y: d.y * sp }; bo.gambeta = false; activated('pesi');
        popText(t('fx.gambeta'), bo.body.position.x, bo.body.position.y - 24, 20, '#f4ead5', 'text'); SFX.gambeta();
      }
    }
    // Bekam: el siguiente rebote en banda sale con comba
    if (bo.bekam && h.other.plugin.kind === 'wall') {
      bo.curve = { left: bo.bekam.time, turn: bo.bekam.turn }; bo.bekam = null; activated('bekam');
      popText(t('fx.comba'), bo.body.position.x, bo.body.position.y - 24, 18, '#f4ead5', 'text'); SFX.comba();
    }
    if (h.other.plugin.kind === 'rival') {           // la Barra Loca empuja: suma su velocidad normal
      const rv = rivals.find(r => r.body === h.other);
      if (rv && rv.vx) { const push = rv.vx * h.n.x; if (push > 0) { out.x += push * h.n.x; out.y += push * h.n.y; } }
    }
    const sp = Math.hypot(out.x, out.y), cap = CFG.physics.maxShot * 1.4;
    if (sp > cap) { out.x *= cap / sp; out.y *= cap / sp; }
    outV.set(bo, out);
    onContact(bo, h.other, h.n, Math.max(0, -vn));
  }
  for (const [bo, v] of outV) Body.setVelocity(bo.body, v);

  for (const sp of pendingSplits) doSplit(sp.bo, sp.count);
  for (const g of pendingGoals) {
    const bo = g.bo; if (!bo.alive) continue;
    // El Gato: cada vez que un balón va a entrar en tu arco, tira su probabilidad de atajarlo
    if (g.which === 'own' && Math.random() < SC.gatoChance(G.slots, CFG)) { gatoSave(bo); continue; }
    bo.alive = false; bo.moving = false;
    World.remove(engine.world, bo.body);
    onGoal(bo, g.which, bo.body.position);
  }

  const dt = ms / 1000;
  for (const bo of balls) {
    if (!bo.alive || !bo.moving) continue;
    let v = getV(bo.body), sp = Math.hypot(v.x, v.y);
    for (const s of G.slots) {                       // La Antena: tirón suave hacia ella
      if (!s.doll || s.doll.id !== 'antena' || !SC.isActive(s.doll)) continue;
      const p = dc('antena'), dx = s.x - bo.body.position.x, dy = s.y - bo.body.position.y, d = Math.hypot(dx, dy);
      if (d < p.radius && d > 1) {
        const k = p.pull * powerOf(s) * dt * (1 - d / p.radius);
        v = { x: v.x + dx / d * k, y: v.y + dy / d * k }; sp = Math.hypot(v.x, v.y);
        if (!bo.antenaHit) { bo.antenaHit = true; activated('antena'); }
      }
    }
    // Cancha Torcida: un empujón lateral constante
    if (G.boss === 'torcida' && sp > 0.05) { v = { x: v.x + G.windDir * CFG.bosses.torcidaWind * dt, y: v.y }; sp = Math.hypot(v.x, v.y); }
    // Bekam: fuerza lateral suave que curva el balón hacia el arco rival
    if (bo.curve && bo.curve.left > 0 && sp > 0.5) {
      const want = dirToGoal(bo.body.position);
      const cur = Math.atan2(v.y, v.x), tgt = Math.atan2(want.y, want.x);
      let diff = tgt - cur; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
      const step = clamp(diff, -bo.curve.turn * dt, bo.curve.turn * dt), na = cur + step;
      v = { x: Math.cos(na) * sp, y: Math.sin(na) * sp };
      bo.curve.left -= dt;
      if (Math.random() < 0.5) particles.push({ x:bo.body.position.x, y:bo.body.position.y, vx:0, vy:0, t:now(), life:500, color:'#f4ead5', size:3 });
    }
    const k = phys('drag') * (shot.t > 12 ? 5 : 1);
    let ns = sp * Math.exp(-k * dt) - phys('rollFric') * dt;
    if (ns < 0) ns = 0;
    // Kan-Té: una vez por tiro, rescata un balón que se va a detener sin gol
    if (shot.kanteLeft > 0 && ns < dc('kante').trigger && !shot.goal && shot.t > 0.3) {
      shot.kanteLeft--; kanteRescue(bo); continue;
    }
    if (sp > 1e-6) Body.setVelocity(bo.body, { x: v.x / sp * ns, y: v.y / sp * ns });
    if (ns < CFG.physics.stopSpeed) {
      bo.still += dt;
      if (bo.still > 0.15) { bo.moving = false; Body.setVelocity(bo.body, { x:0, y:0 }); }
    } else bo.still = 0;
    const p = bo.body.position;   // red de seguridad por si algo atraviesa una pared
    if (p.x < -50 || p.x > CW + 50 || p.y < -150 || p.y > CH + 150) { bo.alive = false; bo.moving = false; World.remove(engine.world, bo.body); }
  }
}
/* ===================== RIVALES Y JEFES =====================
   Portero rival (1) frente al arco rival y defensa rival (2) entre tu delantera y ese
   portero. No dan puntos ni efectos; cuentan como "cosa distinta" para Chilena.
   El Gigante: portero ×2 de ancho. Barra Loca: la defensa rival oscila de lado a lado. */
let rivals = [], rivalPhase = 0;
function buildRivals() {
  tableDirty = true;
  for (const r of rivals) World.remove(engine.world, r.body);
  rivals = [];
  const R = CFG.rivals; if (!R.enabled) return;
  const kw = R.keeperW * (G.boss === 'gigante' ? CFG.bosses.gigantScale : 1);
  const opts = { isStatic:true, restitution:0, friction:0, frictionStatic:0 };
  const add = (body, role, baseX) => { body.plugin = { kind:'rival', role }; World.add(engine.world, body); rivals.push({ body, role, baseX, y: body.position.y, vx: 0 }); };
  add(Bodies.rectangle(R.keeperX, R.keeperY, kw, R.keeperH, Object.assign({ chamfer:{ radius: R.keeperH / 2 - 1 } }, opts)), 'keeper', R.keeperX);
  add(Bodies.circle(R.defX1, R.defY, R.defR, Object.assign({}, opts)), 'def', R.defX1);
  add(Bodies.circle(R.defX2, R.defY, R.defR, Object.assign({}, opts)), 'def', R.defX2);
  rivalPhase = 0;
}
function moveRivals(ms) {
  if (G.boss !== 'barra') return;
  rivalPhase += CFG.bosses.barraSpeed * ms / 1000;
  const off = Math.sin(rivalPhase) * CFG.bosses.barraAmp;
  for (const r of rivals) if (r.role === 'def') {
    const nx = clamp(r.baseX + off, T.l + CFG.rivals.defR + 4, T.r - CFG.rivals.defR - 4);
    r.vx = (nx - r.body.position.x) / Math.max(ms, 1) * (1000 / 60);   // px por step de 60 Hz
    Body.setPosition(r.body, { x: nx, y: r.y });
  }
}
const rivalBodies = () => rivals.map(r => r.body);
/* El Gato: el balón que iba a tu arco rebota hacia afuera */
function gatoSave(bo) {
  const p = bo.body.position, v = getV(bo.body);
  Body.setPosition(bo.body, { x: clamp(p.x, GO.x1 + 14, GO.x2 - 14), y: T.b - BALL_R - 4 });
  Body.setVelocity(bo.body, { x: v.x * 0.6, y: -Math.max(6, Math.abs(v.y) * 0.8) });
  const gs = G.slots.find(s => s.doll && s.doll.id === 'gato' && SC.isActive(s.doll));
  if (gs) { gs.doll.hitT = now(); streaks.push({ x1: gs.x, y1: gs.y, x2: p.x, y2: T.b - 10, t: now() }); }
  bigText(t('fx.gato'), '#f4ead5', 1100, '', { prio:'now', small:true });
  SFX.kante(); sparks(p.x, T.b - 10, '#f4ead5', 16, 4); activated('gato');
}
function kanteRescue(bo) {
  const p = bo.body.position, d = dirToGoal(p), f = dc('kante').force;
  Body.setVelocity(bo.body, { x: d.x * f, y: d.y * f }); bo.still = 0;
  const ks = G.slots.find(s => s.doll && s.doll.id === 'kante' && SC.isActive(s.doll));
  if (ks) { ks.doll.hitT = now(); ks.doll.nx = 0; ks.doll.ny = 1; streaks.push({ x1:ks.x, y1:ks.y, x2:p.x, y2:p.y, t:now() }); }
  popText(t('fx.kante'), p.x, p.y - 26, 22, '#f4ead5', 'text'); SFX.kante();
  sparks(p.x, p.y, '#f4ead5', 16, 4);
  stats('kante', 1); activated('kante');
}

/* ===================== PUNTUACIÓN EN VIVO (la lógica pura está en js/scoring.js) ===================== */
const SC = GOLIN.scoring;
const powerOf = slot => SC.powerOf(G.slots, slot, CFG);
const scaleMult = SC.scaleMult;
function stats(id, n) { G.stats.use[id] = (G.stats.use[id] || 0) + n; }
/* Registro de efectos que realmente se dispararon (para verificar los 21 muñecos) */
const ACTIVATED = {};
function activated(id) { ACTIVATED[id] = (ACTIVATED[id] || 0) + 1; }
/* Reglas de la mesa que cambian valores de física o de puntuación */
const shotItems = () => ((G.state === 'shooting' && shot ? shot.items : G.nextShot) || {});
function phys(k) {
  let v = CFG.physics[k]; const M = CFG.tableMods;
  if (k === 'rollFric' && shotItems().talco) v *= CFG.economy.talcoRoll;     // El Talco: el balón se desliza
  if (G.mod === 'encerada') { if (k === 'drag') v *= M.enceradaDrag; if (k === 'rollFric') v *= M.enceradaRoll; }
  if (G.mod === 'goma' && k === 'wallRest') v = Math.max(v, M.gomaRest);
  if (G.mod === 'pesada' && k === 'rollFric') v *= M.pesadaRoll;
  return v;
}
/* Lo que paga una BANDA. Siempre vale scoring.wallPts (15); SOLO estas reglas lo cambian,
   y cada una se anuncia en la barra ("Bandas ×2 · Tapete pesado") y en cada banda doblada:
     · Tapete pesado (mesa especial de los partidos 2, 5 u 8): ×2
     · La Pólvora (consumible, un tiro): ×2
     · El Tacaño (jefe): las bandas no pagan */
function wallRule() {
  let m = 1; const reasons = [];
  if (shotItems().polvora) { m *= CFG.economy.polvoraWallPts; reasons.push('polvora'); }
  if (G.mod === 'pesada') { m *= CFG.tableMods.pesadaWallPts; reasons.push('pesada'); }
  if (G.boss === 'tacano') { m = 0; reasons.push('tacano'); }
  return { m, reasons };
}
function scoringCfg() {
  const w = CFG.scoring.wallPts * wallRule().m;
  return w === CFG.scoring.wallPts ? CFG : Object.assign({}, CFG, { scoring: Object.assign({}, CFG.scoring, { wallPts: w }) });
}
function beginShot() {
  refreshDollStates();
  return SC.newShot({
    baseMult: SC.baseMultOf(G.slots) + (G.nextShot.empanada ? CFG.economy.empanadaMult : 0) + (G.matchFlags.radio ? CFG.economy.radioMult : 0),
    garra: SC.garraState(G.slots, CFG, G.shotsLeft, G.total, G.quota),
    shotsLeft: G.shotsLeft, shotNo: (G.shotsTaken || 0) + 1, matchId: G.played, lostPrev: G.lostPrev,
    justiciero: SC.justicieroOn(G.slots), calientes: SC.calienteList(G.slots),
    kante: SC.kanteRescues(G.slots, CFG),
    diez: SC.diezList(G.slots, CFG),
  });
}
function onContact(bo, other, n, impact) {
  const key = other.id, last = bo.lastHit[key];
  bo.lastHit[key] = shot.t;
  if (last !== undefined && shot.t - last < 0.09) return;          // anti-rebote de eventos
  if (G.state !== 'shooting') return;
  const kind = other.plugin.kind === 'wall' ? 'wall' : other.plugin.kind === 'rival' ? 'rival' : 'own';
  const ev = { ballId: bo.id, kind, key: 'b' + other.id };
  let slot = null;
  if (kind === 'own') { slot = other.plugin.slot; ev.doll = slot.doll; ev.power = powerOf(slot); ev.muted = !!slot.doll.muted; ev.stitch = SC.stitchBonus(G.slots, slot, CFG); }
  const fx = SC.contact(shot, ev, scoringCfg(), Math.random);
  presentContact(bo, other, slot, n, impact, fx, ev.power || 1);
}
/* Traduce los efectos puros (fx) a juice, sonido y banderas físicas del balón. */
function presentContact(bo, other, slot, n, impact, fx, power) {
  const px = bo.body.position.x - n.x * BALL_R, py = bo.body.position.y - n.y * BALL_R;
  const pitch = shot.pitch = (shot.pitch || 0) + 1;
  let multHit = false, gavePts = false;
  if (slot) {
    const d = slot.doll; d.hitT = now(); d.nx = n.x; d.ny = n.y;
    if (power > 1 && !d.muted) {
      flashLlaves(slot);
      if (G.slots.some(x => x.rod === slot.rod && Math.abs(x.i - slot.i) === 1 && x.doll && x.doll.id === 'llave')) activated('llave');
      if (G.slots.some(x => x !== slot && x.rod === slot.rod && x.doll && x.doll.id === 'arquitecto' && SC.isActive(x.doll))) activated('arquitecto');
      if (d.captain) activated('capitan');
    }
    stats(d.id, 1);
  }
  for (const f of fx) {
    switch (f.type) {
      case 'pts': addPoints(f.v, px, py, f.src === 'wall'); gavePts = true; if (['poste', 'muro', 'ninamal', 'cabezon'].includes(f.src)) activated(f.src); break;
      case 'mult': addMult(f.v, px, py); multHit = true; activated(f.src); break;
      case 'plata': activated(f.src || 'tendero'); G.plata += f.v; updateBoard(); popText('+' + f.v, px + 18, py + 14, 13, '#ffc93c', 'plata'); SFX.coin(); break;
      case 'tendero': popText(t('fx.tendero'), slot.x, slot.y - 30, 16, '#f4ead5', 'text'); break;
      case 'pirlo': bo.pirlo = Math.max(bo.pirlo, f.bounces); popText(t('fx.pirlito'), slot.x, slot.y - 30, 14, '#f4ead5', 'text'); break;
      case 'gambeta': bo.gambeta = true; break;
      case 'bekam': bo.bekam = { time: f.time, turn: f.turn }; break;
      case 'split': pendingSplits.push({ bo, count: f.count }); activated('gemelo'); break;
      case 'muted': popText('🚫', slot.x, slot.y - 26, 16, '#f4ead5', 'text'); break;
    }
  }
  const kind = other.plugin.kind;
  if (kind === 'wall') { SFX.toc(pitch, impact); wallFlashes.push({ x:px, y:py, nx:n.x, ny:n.y, t:now() }); }
  else if (kind === 'rival') { SFX.clac(pitch, impact, true); const rv = rivals.find(r => r.body === other); if (rv) rv.hitT = now(); }
  else if (multHit) SFX.multHit(pitch);
  else SFX.clac(pitch, impact, false, gavePts);
  sparks(px, py, '#ffffff', multHit ? 18 : (gavePts && kind !== 'wall' ? 8 : 4), multHit ? 5 : 3);
  if (multHit) {
    hitstop = CFG.juice.hitstopMs;
    addShake(CFG.juice.shake * clamp(1.5 + 0.35 * shot.mult, 1.5, 12), 0.3);
    rings.push({ x:other.position.x, y:other.position.y, t:now(), color:'#E63946' });
  }
  MUSIC.setIntensity(shot.effects >= CFG.juice.comboEffects ? 4 : shot.contacts >= 8 ? 3 : shot.contacts >= 4 ? 2 : 0);
  updateShotbar();
}
function addPoints(v, x, y, wall) {
  shot.points += 0;   // el valor ya lo sumó scoring.contact
  const k = Math.log2(1 + v / 8);
  // una banda que no paga lo normal lleva su etiqueta ("×2"), para que nunca sea un misterio
  const tag = wall && v !== CFG.scoring.wallPts ? '×' + fm(v / CFG.scoring.wallPts) : '';
  popText('+' + fmt(v), x, y, (wall ? 11 : 13) + 6 * k, '#2EC4B6', 'pts', tag);
  bumpNext.pts = true;
}
function addMult(v, x, y) {
  popText(`+${fm(v)}`, x, y - 6, 24 + 3 * Math.min(v, 8), '#E63946', 'mult');
  bumpNext.mult = true;
}
function doSplit(bo, count) {
  if (!bo.alive) return;
  const alive = balls.filter(b => b.alive).length;
  const extra = Math.min(count, MAX_BALLS - alive);
  if (extra <= 0) return;
  const v = getV(bo.body), N = extra + 1, a = dc('gemelo').angle * Math.PI / 180, p = bo.body.position;
  for (let j = 0; j < N; j++) {
    const ang = (j - (N - 1) / 2) * a, c = Math.cos(ang), s = Math.sin(ang);
    const nv = { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
    if (j === 0) Body.setVelocity(bo.body, nv);
    else { const nb = spawnBall(p.x, p.y, nv.x, nv.y, bo); nb.moving = true; SC.inheritBall(shot, bo.id, nb.id); }
  }
  popText(t('fx.gemelo'), p.x, p.y - 26, 20, '#f4ead5', 'text'); SFX.split();
}
function onGoal(bo, which, pos) {
  const manoSlot = G.slots.find(s => s.doll && s.doll.id === 'mano' && SC.isActive(s.doll));
  const fx = SC.goal(shot, { ballId: bo.id, which, time: shot.t, manoAvailable: !!manoSlot && !G.manoUsed,
    manoPower: manoSlot ? powerOf(manoSlot) : 1 }, CFG);
  for (const f of fx) {
    if (f.type === 'mano') {
      G.manoUsed = true; manoSlot.doll.hitT = now(); activated('mano');
      hands.push({ x: pos.x, y: T.b - 10, t: now() });
      popText(t('fx.mano'), pos.x, T.b - 60, 24, '#f4ead5', 'text'); stats('mano', 1);
    } else if (f.type === 'goal') {
      bigText(t('fx.goal'), '#f4ead5', 1200, '', { prio:'now' }); SFX.goal(); addShake(CFG.juice.shake * 9, CFG.juice.goalShakeMax);
      confetti(which === 'own' ? CW / 2 : pos.x, T.t, 1);
    } else if (f.type === 'autogol') {
      bigText(t('fx.autogol'), '#E63946', 1200, '', { prio:'now' }); SFX.autogol(); addShake(CFG.juice.shake * 5, 0.3);
      flash('red'); confetti(pos.x, T.b, -1, '#7A4420');
    } else if (f.type === 'mult') {
      const s = G.slots.find(x => x.doll && x.doll.uid === f.uid);
      addMult(f.v, s ? s.x : pos.x, s ? s.y : pos.y); stats('cazagoles', 1); activated('cazagoles');
      if (s) { s.doll.hitT = now(); rings.push({ x:s.x, y:s.y, t:now(), color:'#E63946' }); }
    }
  }
  updateShotbar();
}

/* ===================== JUICE ===================== */
const popups = [], particles = [], rings = [], wallFlashes = [], links = [], streaks = [], hands = [];
let shakeAmp = 0, shakeUntil = 0, hitstop = 0, slowmoLeft = 0, timeScale = 1, redFlash = -9999;
const bumpNext = { pts:false, mult:false };
/* kind: 'pts' ficha cian · 'mult' sello rojo · 'plata' círculo dentado · 'text' placa de texto */
function popText(text, x, y, size, color, kind = 'text', tag = '') { size *= TXT_K; popups.push({ text, x, y, size, color, kind, tag, t:now(), life: 900 + size * 12, vx:(Math.random() - 0.5) * 30 }); }
/* Textos grandes en cola: se muestran de a uno. prio 'now' (gol, autogol) pasa adelante de todo.
   small = cartel más chico para avisos cortos ("¡Casi!", consumibles). */
const bigQ = []; let bigCur = null;
function bigText(text, color, life = 1200, sub = '', opts = {}) {
  const item = { text, color, life, sub, prio: opts.prio || 'normal', small: !!opts.small };
  if (item.prio === 'now') {
    for (let i = bigQ.length - 1; i >= 0; i--) if (bigQ[i].prio !== 'now') bigQ.splice(i, 1);
    if (bigCur && bigCur.prio !== 'now') bigCur = null;
  }
  if (bigQ.length < 4) bigQ.push(item);
}
function sparks(x, y, color, n, spd) {
  if (OPT.reduceFlashes) n = Math.ceil(n * 0.3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random());
    particles.push({ x, y, vx:Math.cos(a) * v * 60, vy:Math.sin(a) * v * 60, t:now(), life:250 + Math.random() * 300, color, size:2 + Math.random() * 2 });
  }
}
function confetti(x, y, dir, only) {
  const cols = ['#F4EAD5', '#C9803A', '#FFFFFF', '#7A4420', '#2B59C3', '#FF3D8B'];   // nunca cian/rojo/amarillo
  const n = OPT.reduceFlashes ? 25 : 90;
  for (let i = 0; i < n; i++) {
    const a = (dir > 0 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 2.2, v = 150 + Math.random() * 520;
    particles.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, t:now(), life:900 + Math.random() * 900, color: only || cols[i % cols.length], size:3 + Math.random() * 3, drag:true });
  }
}
function addShake(a, dur = 0.3) {
  a *= OPT.shake;
  if (a <= 0) return;
  shakeAmp = Math.max(shakeAmp, a); shakeUntil = Math.max(shakeUntil, now() + dur * 1000);
}
/* Destellos de pantalla completa: nunca más de 3 por segundo (WCAG 2.3.1) */
const flashTimes = [];
function flash(kind) {
  const n = now();
  while (flashTimes.length && n - flashTimes[0] > 1000) flashTimes.shift();
  if (flashTimes.length >= 3 || OPT.reduceFlashes) return;
  flashTimes.push(n); if (kind === 'red') redFlash = n;
}
function flashLlaves(slot) {
  for (const s of G.slots) if (s.rod === slot.rod && Math.abs(s.i - slot.i) === 1 && s.doll && s.doll.id === 'llave') {
    s.doll.hitT = now(); s.doll.nx = 0; s.doll.ny = 1;
    links.push({ x1:slot.x, y1:slot.y, x2:s.x, y2:s.y, t:now() });
  }
}

/* ===================== FLUJO DEL JUEGO ===================== */
function shoot(vx, vy, power) {
  audio();
  G.hasShot = true;
  shot = beginShot();                      // antes de descontar el tiro (La Garra cuenta este)
  shot.items = G.nextShot; G.nextShot = {};
  if (shot.items.pito) closeOwnGoal(true);
  G.state = 'shooting'; G.shotsLeft--; G.shotsTaken = (G.shotsTaken || 0) + 1;
  const b = balls[0]; b.moving = true;
  Body.setVelocity(b.body, { x:vx, y:vy });
  SFX.shoot(power); addShake(CFG.juice.shake * 1.5 * power, 0.15);
  timeScale = 1; slowmoLeft = 0; hitstop = 0;
  $('shotbar').innerHTML = '';
  updateBoard(); updateShotbar(); hideTooltip();
}
/* El pito: tapa tu arco durante un tiro (no puede haber autogol) */
let pitoWall = null;
function closeOwnGoal(on) {
  if (on && !pitoWall) { pitoWall = Bodies.rectangle(CW / 2, T.b + 4, GO.x2 - GO.x1 + 20, 10, { isStatic:true, restitution:0, friction:0 }); pitoWall.plugin = { kind:'wall' }; World.add(engine.world, pitoWall); walls.push(pitoWall); }
  if (!on && pitoWall) { World.remove(engine.world, pitoWall); walls.splice(walls.indexOf(pitoWall), 1); pitoWall = null; }
}
/* Usar una cosa del bolsillo (solo antes de disparar) */
function useItem(i) {
  const id = G.pocket[i]; if (!id || G.state !== 'aim') return;
  const it = GOLIN.ITEM[id];
  if (it.when === 'shot' && G.nextShot[id]) { SFX.error(); return; }
  if ((id === 'gaseosa' && G.matchFlags.gaseosa) || (id === 'radio' && G.matchFlags.radio)) { SFX.error(); return; }
  G.pocket.splice(i, 1);
  if (id === 'tiza') G.shotsLeft++;
  else if (id === 'gaseosa') G.matchFlags.gaseosa = true;
  else if (id === 'radio') G.matchFlags.radio = true;
  else G.nextShot[id] = true;
  bigText(t('item.' + id + '.used'), '#f4ead5', 1000, '', { small:true }); SFX.levelup();
  LOG.item(id); updateBoard(); updateShotbar(); renderSide();
  if (id === 'polvora') coach('walls2');
}
function checkSlowmo() {
  for (const bo of balls) {
    if (!bo.alive || !bo.moving || bo.slowmo) continue;
    const p = bo.body.position, v = getV(bo.body), look = 0.3 * 60;
    const fx = p.x + v.x * look, fy = p.y + v.y * look;
    let hit = false;
    if (p.y > T.t && fy < T.t - 6) { const k = (p.y - T.t) / (p.y - fy), cx = p.x + (fx - p.x) * k; hit = cx > GR.x1 + 6 && cx < GR.x2 - 6; }
    if (p.y < T.b && fy > T.b + 6) { const k = (T.b - p.y) / (fy - p.y), cx = p.x + (fx - p.x) * k; hit = hit || (cx > GO.x1 + 6 && cx < GO.x2 - 6); }
    if (hit) { bo.slowmo = true; slowmoLeft = CFG.juice.slowmoDur; SFX.slowmo(); }
  }
}
function endShot() {
  G.state = 'settle'; timeScale = 1; slowmoLeft = 0;
  closeOwnGoal(false);
  // "¡Casi!": un balón quedó quieto al lado del arco rival
  if (!shot.goal && balls.some(b => b.alive && b.body.position.y < T.t + 70 && b.body.position.x > GR.x1 - 30 && b.body.position.x < GR.x2 + 30))
    bigText(t('fx.almost'), '#f4ead5', 900, '', { small:true });
  setTimeout(scoreShot, shot.goal || shot.autogol ? 150 : 220);
}

function stepLabel(st) {
  switch (st.key) {
    case 'garra': return t('mod.garra', { pct: st.pct });
    case 'chilena': return st.fail ? t('mod.chilenaFail', { n: st.n, needed: st.needed }) : t('mod.chilena', { n: st.n });
    case 'fantasma': return st.fail ? t('mod.fantasmaFail', { t: st.t == null ? '—' : st.t.toFixed(1) }) : t('mod.fantasma', { t: st.t.toFixed(2) });
    case 'veterano': return st.fail ? t('mod.veteranoFail') : t('mod.veterano');
    default: return t('mod.' + st.key + (st.fail && GOLIN.STRINGS.es['mod.' + st.key + 'Fail'] ? 'Fail' : ''));
  }
}
async function scoreShot() {
  G.state = 'scoring'; G.fast = OPT.fast;
  const s = shot, R = SC.resolve(shot, CFG), tally = $('tally');
  const lvl = celebrationLevel(s, R);
  $('tPts').textContent = '0'; $('tMult').textContent = '×' + fm(s.mult);
  $('tMods').innerHTML = ''; $('tFinal').textContent = '0'; $('tFinalRow').classList.remove('show'); $('tNote').className = 'tnote';
  tally.className = 'show lvl' + lvl;
  let lastTick = 0;
  const ticker = k => { const n = now(); if (n - lastTick > 45) { lastTick = n; SFX.tick(k); } };
  tallyMult = s.mult;
  await countUp($('tPts'), 0, s.points, 300, ticker);
  SFX.thunk(0.5); bump($('tPts'));
  await wait(110);
  let points = s.points, mult = s.mult;
  for (const st of R.steps) if (!st.fail && st.f > 1 && st.key !== 'goal') activated(st.key);
  for (const st of R.steps) {
    const row = document.createElement('div');
    row.className = 'mod ' + (st.fail ? 'fail' : st.f >= 1 ? 'good' : 'bad');
    row.innerHTML = `<span>${stepLabel(st)}</span><b class="${st.on === 'pts' ? 'on-pts' : 'on-mult'}">×${fm(st.f)}</b>`;
    $('tMods').appendChild(row);
    await wait(140);
    if (!st.fail && st.f !== 1) {
      if (st.on === 'pts') { points *= st.f; $('tPts').textContent = fmt(points); bump($('tPts')); }
      else { mult *= st.f; tallyMult = mult; $('tMult').textContent = '×' + fm(mult); bump($('tMult')); }
      SFX.thunk(st.f > 1 ? 1 : 0.6);
      if (st.f > 1 && st.on === 'mult') addShake(CFG.juice.shake * clamp(2 + mult * 0.3, 2, 12), 0.3);
    }
    await wait(120);
  }
  const final = R.final;
  $('tFinalRow').classList.add('show');
  const el = $('tFinal'); el.classList.add('rolling');
  if (final > 0) await countUp(el, 0, final, clamp(300 + Math.log10(final + 1) * 200, 300, 1100), ticker);
  el.classList.remove('rolling'); bump(el);
  SFX.thunk(1.3);
  if (lvl >= 3) addShake(CFG.juice.shake * clamp(2 + Math.log10(final + 1) * 1.5, 2, 10), lvl >= 5 ? CFG.juice.goalShakeMax : 0.3);
  if (lvl >= 4 && !s._stinger) { s._stinger = true; SFX.stinger(); }
  if (final === 0 && !s.goal) { $('tNote').textContent = t('fx.miss'); $('tNote').className = 'tnote show'; }
  LOG.shot({ final, points: Math.round(R.points), mult: +R.mult.toFixed(2), goal: s.goal, autogol: R.autogol, contacts: s.contacts,
    secs: +s.t.toFixed(1), touched: [...s.touched.values()].map(x => x.id), items: Object.keys(s.items || {}) });
  progressEvent({ type:'shot', final, mult: R.mult, contacts: s.contacts, goal: s.goal });
  const firstShot = !G.hasShotRun; G.hasShotRun = true;
  // récord del picadito: engancha a "un tiro más"
  if (final > G.bestShot && G.bestShot > 0) { $('tNote').textContent = t('fx.best'); $('tNote').className = 'tnote show best'; SFX.stinger(); addShake(CFG.juice.shake * 5, 0.3); }
  G.bestShot = Math.max(G.bestShot, final);
  if (final > (PROFILE.bestShotEver || 0)) { PROFILE.bestShotEver = final; saveProfile(); }   // grafiti de la reja
  await wait(final > 0 ? 180 : 60);

  // Escaladores (Niña Mal, Veterano, El Diez): crecen al terminar el tiro
  for (const gr of R.growth) {
    const sl = G.slots.find(x => x.doll && x.doll.uid === gr.uid); if (!sl) continue;
    sl.doll.value += gr.add; sl.doll.hitT = now(); sl.doll.nx = 0; sl.doll.ny = 1; activated(sl.doll.id);
    popText(t('fx.levelUp', { n: sl.doll.value }), sl.x, sl.y - 30, 20, '#f4ead5', 'text');
    SFX.levelup(); await wait(160);
  }
  // Rambos: cuenta tiros tocándolo; a los 3, roja para el partido siguiente
  for (const uid of R.rambos) {
    const sl = G.slots.find(x => x.doll && x.doll.uid === uid); if (!sl) continue;
    if (s.justiciero && SC.justicieroOn(G.slots)) { activated('justiciero'); continue; }   // El Justiciero: sin roja
    if (SC.rambosTick(sl.doll, CFG, G.played, s.justiciero)) { popText(t('fx.roja'), sl.x, sl.y - 30, 24, '#E63946', 'text'); SFX.whistle(); await wait(300); }
  }
  // El Cabeza Caliente que no tocaste: −plata (El Justiciero lo evita)
  if (R.penalty > 0) {
    G.plata = Math.max(0, G.plata - R.penalty); updateBoard(); SFX.error();
    for (const uid of s.calientes) if (!s.touched.has(uid)) {
      const sl = G.slots.find(x => x.doll && x.doll.uid === uid);
      if (sl) { sl.doll.hitT = now(); popText('-' + dc('caliente').penalty, sl.x, sl.y - 26, 16, '#FFC93C', 'plata'); }
    }
  } else if (s.justiciero && s.calientes.some(uid => !s.touched.has(uid))) activated('justiciero');
  await wait(final > 0 ? 200 : 80);
  tally.className = ''; tallyMult = 1; MUSIC.setIntensity(0);
  const before = G.total;
  G.total += final; if (s.goal) { G.goals++; G.stats.goals++; }
  if (final > 0) await countUp($('bTotal'), before, G.total, 380, ticker);
  updateBoard();
  // cuánto falta para la cuota: siempre saber qué tan cerca estás
  if (before < G.quota && G.total >= G.quota) {
    G.reachedQuota = true; G.wonOnLastShot = G.shotsLeft === 0; G.wonOnFirstShot = G.shotsTaken === 1;
    $('board').classList.add('victory'); SFX.victory();
    bigText(t('fx.quota'), '#FFC93C', 1300);
    await wait(650);
  }
  if (G.shotsLeft <= 0 && G.total < G.quota && !G.caciqueUsed) {
    const extra = SC.caciqueShots(G.slots, CFG);          // El Cacique: una vez por partido, un tiro más
    if (extra > 0) {
      G.caciqueUsed = true; G.shotsLeft += extra; activated('cacique');
      const sl = G.slots.find(x => x.doll && x.doll.id === 'cacique' && SC.isActive(x.doll));
      if (sl) { sl.doll.hitT = now(); rings.push({ x:sl.x, y:sl.y, t:now(), color:'#D4A017' }); }
      bigText(t('fx.cacique'), '#D4A017', 1500, t('fx.caciqueSub', { n: extra }));
      SFX.stinger(); addShake(CFG.juice.shake * 4, 0.3);
      updateBoard();
    }
  }
  if (G.shotsLeft <= 0) { await wait(250); return endMatch(G.total >= G.quota); }
  resetBall(); G.state = 'aim'; updateShotbar(); renderSide();
  if (firstShot) coach('bounce');
}
/* Escalera de celebración del manual (1 toque · 2 suma · 3 multiplica · 4 combo · 5 gol) */
function celebrationLevel(s, R) {
  if (s.goal) return 5;
  if (s.effects >= CFG.juice.comboEffects) return 4;
  if (s.mult > s.baseMult || R.steps.some(x => x.on === 'mult' && x.f > 1 && x.key !== 'goal')) return 3;
  if (s.points > 0) return 2;
  return 1;
}
function skipShots() {
  if (!G.reachedQuota || G.state !== 'aim') return;
  endMatch(true);
}
/* ===================== PARTIDO → TIENDA → PARTIDO (lógica pura en js/economy.js) ===================== */
const EC = GOLIN.economy;
function endMatch(win) {
  if (G.state === 'matchend') return;
  G.state = 'matchend'; G.lastWin = win;
  const rw = EC.matchRewards({ win, shotsLeft: G.shotsLeft, goals: G.goals, gaseosa: !!G.matchFlags.gaseosa, alcancia: !!G.runFlags.alcancia, colector: EC.colectorPay(G.slots, CFG, DOLL) }, CFG, LM);
  if (rw.lines.some(l => l.key === 'colector')) activated('colector');
  if (win) G.won++; else G.lives--;
  // Marcador acumulado: al ganar, la meta alcanzada es la base del próximo partido y lo que sobra se arrastra.
  // Al perder, el partido se repite desde el marcador con el que empezó.
  if (win) { G.metaBase = G.quota; G.retry = false; } else G.retry = true;
  LOG.endMatch({ win, total: G.total - G.matchStart, marcador: G.total, reward: rw.total, shotsLeft: G.shotsLeft });
  progressEvent({ type:'match', win, match: G.match, boss: G.boss, goals: G.goals, wonOnLastShot: G.wonOnLastShot, wonOnFirstShot: G.wonOnFirstShot, level: G.level });
  G.stats.reached = Math.max(G.stats.reached || 0, G.match);
  updateBoard(); updateShotbar();
  showMatchEnd(win, rw);               // la UI cobra la plata y luego llama a afterMatch()
}
function afterMatch(win) {
  if (!win && G.lives <= 0) return showFinal(false);
  const legs = win ? EC.legendaryChoices(G.match, CFG, PROFILE.unlocked) : [];
  if (legs.length > 1) return showLegendaryPick(legs, id => grantLegendary(id, () => afterLegendary(win)));
  if (legs.length) return grantLegendary(legs[0], () => afterLegendary(win));
  afterLegendary(win);
}
function afterLegendary(win) {
  if (win && EC.isFinalBoss(G.match, CFG) && !G.endless) return showFinal(true);
  openShop();
}
const allDolls = () => G.slots.filter(s => s.doll).map(s => s.doll).concat(G.bench.filter(Boolean));
const legendaryIds = () => allDolls().filter(d => d.rarity === 'legendario').map(d => d.id);
/* Dónde está cada Legendario (para poder soltar uno cuando el cupo está lleno) */
function legendarySpots() {
  const out = [];
  G.slots.forEach(s => { if (s.doll && s.doll.rarity === 'legendario') out.push({ where:'slot', slot:s, doll:s.doll }); });
  G.bench.forEach((d, i) => { if (d && d.rarity === 'legendario') out.push({ where:'bench', i, doll:d }); });
  return out;
}
/* Suelta un Legendario para hacerle espacio al nuevo (único modo de perder uno) */
function swapLegendary(spot, inst) {
  if (spot.where === 'bench') { G.bench[spot.i] = inst; }
  else {
    spot.slot.doll = null;
    const free = G.bench.indexOf(null);
    if (free >= 0) G.bench[free] = inst; else spot.slot.doll = inst;
    rebuildDolls();
  }
  SFX.place(); renderSide();
}
/* Legendario al vencer a un jefe: a la banca; si está llena, el jugador elige qué descartar; si ya lo tiene, plata. */
function grantLegendary(id, done) {
  const out = EC.legendaryOutcome(id, legendaryIds(), G.bench, G.legCap);
  const inst = makeDoll(id, 0);
  if (out === 'dup') { G.plata += CFG.economy.legendaryDupPlata; updateBoard(); SFX.caja(4); }
  else if (out === 'bench') G.bench[G.bench.indexOf(null)] = inst;
  showLegendary(id, out, inst, done);
}
function openShop() {
  G.state = 'shop'; G.sellMode = false; G.selectedOffer = null; G.pick = null; G.rerollN = 0;
  $('board').classList.remove('victory');
  endDrag();
  G.offers = EC.rollShop(G.match, CFG, PR.shopPool(GOLIN.ROSTER, PROFILE));
  G.shopItems = EC.rollItems(CFG, GOLIN.ITEMS, Math.random, itemState());
  MUSIC.setMode('shop'); MUSIC.setIntensity(0);
  resetBall(); renderSide(); updateShotbar(); updateBoard();
  playShopIntro(() => { if (isCompact()) openSheet(); coach('shop'); if (legendaryIds().length) coach('legend'); else if (G.pocket.length || G.shopItems.length) coach('items'); });
}
function rerollShop() {
  const c = EC.rerollCost(G.rerollN, CFG);
  if (G.plata < c) { noPlata(null); return; }
  G.plata -= c; G.rerollN++; G.selectedOffer = null;
  G.offers = EC.rollShop(G.match, CFG, PR.shopPool(GOLIN.ROSTER, PROFILE));
  LOG.shop({ type:'reroll', cost: c });
  SFX.caja(1); updateBoard(); renderSide();
}
function nextMatchNumber() { return G.lastWin ? G.match + 1 : G.match; }
function startNextMatch() {
  audio();
  G.match = nextMatchNumber();
  startMatch();
}
function startMatch() {
  endDrag();
  G.boss = G.forceBoss || EC.bossFor(G.match, CFG, G.plan);
  G.mod = G.boss ? null : EC.tableModFor(G.match, CFG, G.plan);
  G.lostPrev = G.retry;                            // La Revancha: ¿perdiste el partido anterior?
  if (G.retry) G.total = G.matchStart; else G.matchStart = G.total;
  for (const s of G.slots) if (s.doll) s.doll.captain = false;   // la cinta se elige cada partido
  G.wonOnFirstShot = false;
  G.matchQuota = EC.quotaFor(G.match, CFG, LM);
  G.quota = G.metaBase + G.matchQuota;              // meta acumulada del picadito
  G.shotsLeft = shotsPerMatch(); G.shotsTaken = 0; G.goals = 0;
  G.matchFlags = {}; G.nextShot = {}; G.caciqueUsed = false; G.wonOnLastShot = false; G.windDir = Math.random() < 0.5 ? -1 : 1;
  LOG.startMatch({ match: G.match, boss: G.boss, mod: G.mod, quota: G.matchQuota, meta: G.quota, carry: G.total - G.metaBase, shotsAllowed: G.shotsLeft,
    table: G.slots.filter(s => s.doll).map(s => s.doll.id), plata: G.plata });
  G.sellMode = false; G.selectedOffer = null; G.pick = null; shot = null;
  closeSheet();
  G.played++; G.manoUsed = false; G.reachedQuota = false;
  for (const s of G.slots) if (s.doll) s.doll.rojas = 0;   // Rambos: la cuenta de tiros es por partido
  $('board').classList.remove('victory');
  buildRivals(); rebuildDolls(); resetBall();
  if (G.boss) { G.state = 'bossintro'; showBossIntro(G.boss); }
  else beginMatchPlay();
  updateBoard(); renderSide(); updateShotbar();
}
function beginMatchPlay() {
  G.state = 'aim'; MUSIC.setMode('match'); MUSIC.setIntensity(0);
  $('panel').classList.add('hidden');
  // la meta ya viene cubierta por lo que arrastraste del partido anterior
  if (G.total >= G.quota) G.reachedQuota = true;
  // El Capitán: antes del primer tiro eliges a quién le pones la cinta
  const cap = G.slots.find(s => s.doll && s.doll.id === 'capitan' && SC.isActive(s.doll));
  if (cap && G.slots.some(s => s.doll && s.doll.id !== 'capitan' && SC.isActive(s.doll)) && !G.captainAsked) {
    G.captainAsked = true; return showCaptainPick(() => beginMatchPlay());   // al volver, ya no pregunta
  }
  G.captainAsked = false;
  bigText(G.mod ? t('mod.' + G.mod + '.name') : t('fx.match', { n:G.match }), '#f4ead5', 1700,
    G.mod ? t('mod.' + G.mod + '.rule') : t('fx.quotaSub', { q:fmt(G.quota), f:fmt(Math.max(0, G.quota - G.total)) }));
  updateShotbar(); renderSide();
  coach(G.match === 1 && !G.hasShotRun ? 'aim' : G.match === 2 ? 'table' : null);
  if (G.mod) coach(wallRule().m !== 1 ? 'walls2' : 'mod');
}
function shotsPerMatch() { return Math.max(1, CFG.economy.shotsPerMatch + LM.shots); }
function resetRun(level) {
  if (level) { PROFILE.lastLevel = Math.min(level, PROFILE.maxLevel); saveProfile(); }
  G.level = PROFILE.lastLevel || 1; LM = PR.levelMods(G.level);
  G.plan = EC.planRun(CFG); G.pocket = []; G.hasShotRun = false;
  G.runFlags = {}; G.itemsBought = []; G.legCap = CFG.economy.legendaryCap;
  LOG.startRun({ level: G.level, plan: G.plan });
  for (const s of G.slots) s.doll = null;
  Object.assign(G, { total:0, metaBase:0, matchStart:0, retry:false, match:1, played:0, plata:CFG.economy.startPlata, lives:CFG.economy.lives, won:0, bestShot:0, lastWin:false,
    endless:false, bench: new Array(CFG.economy.benchSize).fill(null), stats:{ goals:0, use:{}, reached:1 } });
  $('panel').classList.add('hidden'); $('tally').className = '';
  startMatch();
}
function continueEndless() { G.endless = true; $('panel').classList.add('hidden'); openShop(); }

/* ===================== TIENDA Y BANCA: acciones ===================== */
function noPlata(offerIdx) {
  SFX.error();
  const el = offerIdx !== null ? document.querySelector(`.card[data-i="${offerIdx}"] .price`) : $('bReroll');
  if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  shopToast(t('fx.noPlata'));
}
/* target: {slot} | {bench: i} */
function buy(idx, target) {
  const id = G.offers[idx]; if (!id) return;
  const price = EC.priceOf(id, CFG, LM);
  if (target.slot && target.slot.doll) { SFX.error(); shopToast(t('shop.noSlot')); return; }
  if (target.bench !== undefined && G.bench[target.bench]) { SFX.error(); shopToast(t('shop.benchFull')); return; }
  if (G.plata < price) { noPlata(idx); return; }
  G.plata -= price;
  const inst = makeDoll(id, price); inst.hitT = now();
  G.offers[idx] = null; G.selectedOffer = null;
  if (target.slot) {
    target.slot.doll = inst; rebuildDolls();
    popText(t('fx.signed'), target.slot.x, target.slot.y - 26, 16, '#f4ead5', 'text'); sparks(target.slot.x, target.slot.y, '#f4ead5', 16, 3);
  } else G.bench[target.bench] = inst;
  SFX.caja(2); SFX.place();
  LOG.shop({ type:'buy', id, price, to: target.slot ? 'mesa' : 'banca' });
  updateBoard(); renderSide();
}
const itemState = () => ({ legCap: G.legCap, legCapMax: CFG.economy.legendaryCapMax, benchSize: G.bench.length, benchMax: CFG.economy.benchMax, bought: G.itemsBought });
function buyItem(i) {
  const id = G.shopItems[i]; if (!id) return;
  const price = EC.itemPrice(id, CFG, LM), when = GOLIN.ITEM[id].when;
  if (when !== 'run' && G.pocket.length >= CFG.economy.pocketSize) { SFX.error(); shopToast(t('shop.pocketFull')); return; }
  if (G.plata < price) { noPlata(null); return; }
  G.plata -= price; G.shopItems[i] = null; G.itemsBought.push(id);
  if (when === 'run') applyRunItem(id); else G.pocket.push(id);
  SFX.caja(2); LOG.shop({ type:'item', id, price, when });
  updateBoard(); renderSide();
}
/* Cosas que duran todo el picadito: se aplican al comprarlas */
function applyRunItem(id) {
  if (id === 'vitrina') G.legCap = Math.min(CFG.economy.legendaryCapMax, G.legCap + 1);
  else if (id === 'banquito') { if (G.bench.length < CFG.economy.benchMax) G.bench.push(null); }
  else if (id === 'alcancia') G.runFlags.alcancia = true;
  shopToast(t('item.' + id + '.used'));
}
function buyToBench(idx) {
  const free = G.bench.indexOf(null);
  if (free < 0) { SFX.error(); shopToast(t('shop.benchFull')); return; }
  buy(idx, { bench: free });
}
const noSell = () => { SFX.error(); shopToast(t('shop.noSell')); };
function sellSlot(slot) {
  const d = slot.doll; if (!d) return;
  if (!EC.canSell(d)) return noSell();
  const back = EC.sellValue(d);
  G.plata += back; LOG.shop({ type:'sell', id: slot.doll.id, back }); slot.doll = null; rebuildDolls();
  SFX.caja(1); popText('+' + back, slot.x, slot.y - 20, 16, '#FFC93C', 'plata');
  updateBoard(); renderSide();
}
function sellBench(i) {
  const d = G.bench[i]; if (!d) return;
  if (!EC.canSell(d)) return noSell();
  G.plata += EC.sellValue(d); G.bench[i] = null; SFX.caja(1); updateBoard(); renderSide();
}
function discardBench(i) { if (!G.bench[i]) return; if (!EC.canSell(G.bench[i])) return noSell(); G.bench[i] = null; SFX.sell(); renderSide(); }
function placeDoll(inst, slot) { slot.doll = inst; inst.hitT = now(); inst.nx = 0; inst.ny = 1; }
/* Soltar lo arrastrado sobre un destino: hueco de la mesa o hueco de la banca. Si está ocupado, intercambian. */
function dropOn(src, dst) {
  if (src.kind === 'buy') return buy(src.idx, dst);
  const take = () => src.kind === 'move' ? src.from.doll : G.bench[src.bench];
  const put = v => { if (src.kind === 'move') src.from.doll = v; else G.bench[src.bench] = v; };
  const moving = take(); if (!moving) return;
  if (dst.slot) { if (dst.slot === src.from) return; const prev = dst.slot.doll; placeDoll(moving, dst.slot); put(prev); }
  else { if (src.kind === 'bench' && src.bench === dst.bench) return; const prev = G.bench[dst.bench]; G.bench[dst.bench] = moving; put(prev); }
  rebuildDolls(); SFX.place(); renderSide();
}

/* ===================== INPUT ===================== */
const canvas = $('game'), ctx = canvas.getContext('2d');
let VIEW_K = 1;
let TXT_K = 1;          // en pantallas chicas los textos de la mesa crecen un poco para que se lean
function toWorld(cx, cy) {
  const r = canvas.getBoundingClientRect();
  return { x: (cx - r.left) * CW / r.width, y: (cy - r.top) * CH / r.height, inside: cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom };
}
function slotAt(x, y, maxD = 36) {
  let best = null, bd = maxD;
  for (const s of G.slots) { const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
  return best;
}
function dollAt(x, y, fat) {
  const pad = fat ? 12 : 0;                               // el dedo es más grueso que el ratón
  for (const s of G.slots) if (s.doll) {
    const sh = DOLL[s.doll.id].shape;
    const hit = sh.kind === 'rect' ? Math.abs(x - s.x) < sh.w / 2 + 4 + pad && Math.abs(y - s.y) < sh.h / 2 + 6 + pad : Math.hypot(x - s.x, y - s.y) < Math.max(sh.r, 12) + 5 + pad;
    if (hit) return s;
  }
  return null;
}
let aim = null, drag = null, lastAimStep = -1, kickDrag = null;
const fatFinger = e => e.pointerType === 'touch' || e.pointerType === 'pen';
function moveBallTo(p) {
  const b = balls[0]; if (!b) return;
  G.ballX = clamp(p.x, T.l + 24, T.r - 24);
  Body.setPosition(b.body, { x:G.ballX, y:clamp(p.y, KICK.y1, KICK.y2) });
}
/* El tiro se arma con un "dedo virtual" que arranca sobre el balón: jalar desde el balón o desde
   cualquier parte de la mesa da el mismo resultado. En el celular el dedo no tapa el balón. */
function startAim(p, e, doll) {
  const bp = balls[0].body.position;
  aim = { x:p.x, y:p.y, ox:bp.x - p.x, oy:bp.y - p.y, sx:e.clientX, sy:e.clientY, t:performance.now(), doll, pid:e.pointerId };
  lastAimStep = -1;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
}
canvas.addEventListener('pointerdown', e => {
  audio();
  if (fatFinger(e)) setTouch(true);
  if (G.paused) return;                     // tutorial abierto: el juego está en pausa
  if (e.pointerType === 'mouse' && e.button !== 0) return;     // solo el botón principal
  if (aim || kickDrag) return;              // un segundo dedo no cuenta
  const p = toWorld(e.clientX, e.clientY), fat = fatFinger(e);
  hideTooltip();
  if (G.state === 'scoring') { G.fast = true; return; }
  if (G.state === 'aim') {
    const b = balls[0]; if (!b) return;
    const bp = b.body.position;
    if (Math.hypot(p.x - bp.x, p.y - bp.y) < (fat ? 70 : 40)) startAim(p, e, null);
    else if (p.y > KICK.y1 - 10 && p.y < KICK.y2 + 10 && p.x > T.l && p.x < T.r) {        // zona de saque: mover el balón
      moveBallTo(p); tone(420, 0.05, 'sine', 0.12);
      kickDrag = { pid:e.pointerId };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    else if (p.y < KICK.y1 - 10) startAim(p, e, dollAt(p.x, p.y, fat));                     // tiro desde cualquier parte
    return;
  }
  if (G.state === 'shop') {
    const s = dollAt(p.x, p.y, fat);
    if (s && G.sellMode) { sellSlot(s); return; }
    if (s) { startDrag({ kind:'move', from:s }, e); return; }          // al soltar: arrastre o toque
    const empty = slotAt(p.x, p.y, fat ? 44 : 28);
    if (empty && !empty.doll) {
      if (G.selectedOffer !== null) buy(G.selectedOffer, { slot: empty });
      else if (G.pick) placePick({ slot: empty });
    } else if (G.selectedOffer !== null || G.pick) clearPick();
  }
});
canvas.addEventListener('pointermove', e => {
  const p = toWorld(e.clientX, e.clientY);
  if (kickDrag) { if (e.pointerId === kickDrag.pid) moveBallTo(p); return; }
  if (aim) {
    if (e.pointerId !== aim.pid) return;
    aim.x = p.x; aim.y = p.y;
    const ap = aimPower(), step = ap.cancel ? -1 : Math.floor(ap.power * 10);
    if (step !== lastAimStep) { if (step >= 0) SFX.aim(step / 10); if (step === 2 && lastAimStep === -1) SFX.place(); lastAimStep = step; }
    return;
  }
  if (drag || e.pointerType !== 'mouse') return;          // el tooltip por "pasar encima" es solo para ratón
  const s = dollAt(p.x, p.y);
  if (s && (G.state === 'aim' || G.state === 'shop')) showTooltip(s, e.clientX, e.clientY); else hideTooltip();
});
canvas.addEventListener('pointerup', e => {
  if (kickDrag) { kickDrag = null; return; }
  if (!aim || e.pointerId !== aim.pid) return;
  const pw = aimPower(), a = aim; aim = null;
  const moved = Math.hypot(e.clientX - a.sx, e.clientY - a.sy);
  if (pw.cancel) {                                    // soltaste dentro del 20%: no hay tiro
    if (moved < 10 && a.doll && performance.now() - a.t < 450) showTooltipAt(a.doll, 3500);   // fue un toque: qué hace el muñeco
    else if (moved >= 10) SFX.place();
    return;
  }
  if (G.state === 'aim') shoot(pw.dx * pw.speed, pw.dy * pw.speed, pw.power);
});
// el sistema se robó el toque (notificación, gesto de iOS…): no se dispara nada
const cancelAim = () => { aim = null; kickDrag = null; };
canvas.addEventListener('pointercancel', cancelAim);
canvas.addEventListener('lostpointercapture', e => {
  if (aim && e.pointerId === aim.pid) aim = null;
  if (kickDrag && e.pointerId === kickDrag.pid) kickDrag = null;
});
window.addEventListener('blur', cancelAim);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hideTooltip(); });
const MAX_DRAG = 170;
const AIM_MIN = 0.2;     // por debajo del 20% de estiramiento el tiro se cancela al soltar
function aimPower() {
  const bp = balls[0].body.position, vx = aim.x + aim.ox, vy = aim.y + aim.oy;
  const dx = bp.x - vx, dy = bp.y - vy, len = Math.hypot(dx, dy) || 1;
  const power = clamp(len / MAX_DRAG, 0, 1), cancel = power < AIM_MIN;
  return { dx: dx / len, dy: dy / len, power, cancel, speed: CFG.physics.maxShot * power, len: Math.min(len, MAX_DRAG) };
}
/* Tocar y colocar (sin arrastrar): se toca un muñeco (vitrina, banca o mesa) y luego el destino. */
function samePick(a, d) { return a && a.kind === d.kind && (a.kind === 'bench' ? a.bench === d.bench : a.from === d.from); }
function placePick(dst) { const src = G.pick; G.pick = null; if (src) dropOn(src, dst); else renderSide(); }
function clearPick() { G.pick = null; G.selectedOffer = null; renderSide(); }
function afterPickChange() {
  renderSide();
  if (isCompact() && (G.selectedOffer !== null || G.pick)) closeSheet();      // que se vea la mesa para elegir el hueco
}
/* Un toque (sin arrastre) sobre algo de la tienda. info: {kind:'buy', idx} | {kind:'bench', bench} | {kind:'move', from} */
function tapShop(info) {
  if (G.state !== 'shop') return;
  if (info.kind === 'buy') { G.pick = null; G.selectedOffer = G.selectedOffer === info.idx ? null : info.idx; SFX.place(); afterPickChange(); return; }
  const here = info.kind === 'bench' ? { bench: info.bench } : { slot: info.from };
  if (G.selectedOffer !== null) { buy(G.selectedOffer, here); return; }
  if (G.pick && !samePick(G.pick, info)) { placePick(here); return; }
  if (G.pick) { clearPick(); return; }
  G.pick = info.kind === 'bench' ? { kind:'bench', bench:info.bench } : { kind:'move', from:info.from };
  SFX.place(); afterPickChange();
  if (info.kind === 'move') showTooltipAt(info.from, 3500);
}
/* Arrastre en la tienda: carta → mesa/banca, mesa → mesa/banca, banca → mesa/banca.
   Robusto: si el navegador interrumpe el arrastre (pointercancel, arrastre nativo de una imagen,
   la ventana pierde el foco o se suelta fuera), la ficha fantasma SIEMPRE se borra. */
function startDrag(info, e) {
  endDrag();
  drag = Object.assign(info, { sx:e.clientX, sy:e.clientY, moved:false, ghost:null, hover:null, pid:e.pointerId, lift: fatFinger(e) ? 44 : 0 });
  hideTooltip();
}
function endDrag() {
  if (drag && drag.ghost) drag.ghost.remove();
  document.querySelectorAll('.ghost').forEach(g => g.remove());
  document.querySelectorAll('.bslot.hover').forEach(x => x.classList.remove('hover'));
  drag = null;
}
function dragDoll(d) { return d.kind === 'buy' ? { id: G.offers[d.idx] } : d.kind === 'move' ? d.from.doll : G.bench[d.bench]; }
window.addEventListener('pointermove', e => {
  if (!drag) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { endDrag(); return; }   // se soltó sin que llegara el pointerup
  const dd = dragDoll(drag);
  if (!dd) { endDrag(); return; }
  if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
    drag.moved = true;
    const g = document.createElement('img'); g.className = 'ghost'; g.draggable = false; g.src = dollIcon(dd.id, 96);
    document.body.appendChild(g); drag.ghost = g;
  }
  if (e.pointerId !== drag.pid) return;
  // con el dedo, la ficha va un poco más arriba para que se vea (y se apunta con ella)
  const gy = e.clientY - drag.lift;
  if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = gy + 'px'; }
  drag.hover = null;
  for (const y of drag.lift ? [gy, e.clientY] : [e.clientY]) {
    const p = toWorld(e.clientX, y);
    if (p.inside) { const s = slotAt(p.x, p.y, drag.lift ? 44 : 36); if (s && !(drag.kind === 'buy' && s.doll) && s !== drag.from) { drag.hover = { slot: s }; break; } }
    else {
      const el = document.elementFromPoint(e.clientX, y), b = el && el.closest('.bslot');
      if (b) { drag.hover = { bench: +b.dataset.b }; break; }
    }
  }
  document.querySelectorAll('.bslot').forEach(x => x.classList.toggle('hover', !!(drag.hover && drag.hover.bench === +x.dataset.b)));
});
window.addEventListener('pointerup', e => {
  if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pid)) return;
  const d = drag; endDrag();
  if (G.state !== 'shop') return;
  if (d.moved) { G.pick = null; G.selectedOffer = null; if (d.hover) dropOn(d, d.hover); else renderSide(); }
  else tapShop(d);
});
window.addEventListener('pointercancel', endDrag);
window.addEventListener('blur', endDrag);
document.addEventListener('visibilitychange', () => { if (document.hidden) endDrag(); });
document.addEventListener('dragstart', e => e.preventDefault());   // nada de arrastre nativo de imágenes
['touchend', 'click', 'keydown'].forEach(ev => window.addEventListener(ev, () => audio(), { capture:true, passive:true }));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAim(); return; }
  if (typeof AC !== 'undefined' && AC && AC.state !== 'running') AC.resume().catch(() => {});
});
MQ_COARSE.addEventListener && MQ_COARSE.addEventListener('change', e => setTouch(e.matches));
MQ_COMPACT.addEventListener && MQ_COMPACT.addEventListener('change', () => { closeSheet(); renderSide(); });

/* ===================== RAYCAST DE LA GUÍA (solo hasta el primer rebote) ===================== */
const probe = Bodies.circle(0, 0, BALL_R);
function raycast(ox, oy, dx, dy) {
  const bodies = walls.concat(dollBodies(), rivalBodies());
  for (let d = 4; d < 1500; d += 3) {
    const x = ox + dx * d, y = oy + dy * d;
    if (y < T.t - 12 && x > GR.x1 && x < GR.x2) return { x, y, goal:'rival' };
    if (y > T.b + 12 && x > GO.x1 && x < GO.x2) return { x, y, goal:'own' };
    Body.setPosition(probe, { x, y });
    const col = Query.collides(probe, bodies);
    if (col.length) {
      const c = col[0], other = c.bodyA === probe ? c.bodyB : c.bodyA;
      let n = { x: c.normal.x, y: c.normal.y };
      if (n.x * (x - other.position.x) + n.y * (y - other.position.y) < 0) n = { x: -n.x, y: -n.y };
      return { x: x - dx * 3, y: y - dy * 3, n };
    }
  }
  return { x: ox + dx * 1500, y: oy + dy * 1500 };
}

/* ===================== RENDER ("Rótulo de barrio", manual §Ilustración) ===================== */
function fitCanvas() {
  const st = $('stage').getBoundingClientRect();
  const s = Math.min(st.width / CW, st.height / CH);
  if (!(s > 0)) return;
  const w = Math.floor(CW * s), h = Math.floor(CH * s), dpr = Math.min(2, window.devicePixelRatio || 1);   // >2 no se nota y cuesta batería
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  VIEW_K = canvas.width / CW; tableDirty = true;
  TXT_K = clamp(0.8 / s, 1, 1.45);
}
window.addEventListener('resize', () => { fitCanvas(); fitBoardText(); });
// el espacio de la mesa cambia sin que cambie la ventana (barra del tiro, hoja, debug): se reajusta solo
if (window.ResizeObserver) new ResizeObserver(() => fitCanvas()).observe($('stage'));

/* La mesa estática se pinta una vez en una capa aparte (se repinta al cambiar tamaño, rivales o modo daltónico). */
let tableLayer = null, tableDirty = true;
function grainPattern(c) {
  const g = document.createElement('canvas'); g.width = g.height = 96;
  const x = g.getContext('2d');
  for (let i = 0; i < 900; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)'; x.fillRect(Math.random() * 96, Math.random() * 96, 1.5, 1.5); }
  return c.createPattern(g, 'repeat');
}
function hatchPattern(c) {                              // modo daltónico: patrón en el tapete
  const g = document.createElement('canvas'); g.width = g.height = 16;
  const x = g.getContext('2d'); x.strokeStyle = 'rgba(14,77,44,0.55)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(0, 16); x.lineTo(16, 0); x.stroke();
  return c.createPattern(g, 'repeat');
}
function paintTable() {
  if (!tableLayer) tableLayer = document.createElement('canvas');
  tableLayer.width = canvas.width; tableLayer.height = canvas.height;
  const c = tableLayer.getContext('2d');
  c.setTransform(VIEW_K, 0, 0, VIEW_K, 0, 0);
  // marco de madera con sombra plana y contorno de 6 px
  c.fillStyle = PAL.maderaOsc; c.fillRect(0, 0, CW, CH);
  pathRoundRect(c, 4, 4, CW - 8, CH - 8, 18); c.fillStyle = PAL.madera; c.fill();
  c.fillStyle = 'rgba(122,68,32,0.55)';
  for (let y = 12; y < CH; y += 22) c.fillRect(8, y, CW - 16, 2);        // vetas
  pathRoundRect(c, 4, 4, CW - 8, CH - 8, 18); c.lineWidth = 6; c.strokeStyle = PAL.tinta; c.stroke();
  // arcos (bolsillos con red)
  const pocket = (x1, x2, y1, y2, own) => {
    c.fillStyle = PAL.tinta; c.fillRect(x1, y1, x2 - x1, y2 - y1);
    c.strokeStyle = 'rgba(244,234,213,0.25)'; c.lineWidth = 1;
    for (let x = x1; x <= x2; x += 10) { c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y2); c.stroke(); }
    for (let y = y1; y <= y2; y += 10) { c.beginPath(); c.moveTo(x1, y); c.lineTo(x2, y); c.stroke(); }
    c.fillStyle = own ? PAL.maderaOsc : PAL.crema;
    c.font = `10px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(own ? t('table.goalOwn') : t('table.goalRival'), (x1 + x2) / 2, own ? CH - 16 : 16);
  };
  pocket(GR.x1, GR.x2, 0, T.t, false); pocket(GO.x1, GO.x2, T.b, CH, true);
  // tapete
  c.fillStyle = PAL.cancha; c.fillRect(T.l, T.t, T.r - T.l, T.b - T.t);
  const bands = 14, bh = (T.b - T.t) / bands; c.fillStyle = 'rgba(14,77,44,0.28)';
  for (let i = 1; i < bands; i += 2) c.fillRect(T.l, T.t + i * bh, T.r - T.l, bh);
  c.fillStyle = grainPattern(c); c.fillRect(T.l, T.t, T.r - T.l, T.b - T.t);
  if (OPT.colorblind) { c.fillStyle = hatchPattern(c); c.fillRect(T.l, T.t, T.r - T.l, T.b - T.t); }
  // líneas de cancha en crema
  c.strokeStyle = 'rgba(244,234,213,0.55)'; c.lineWidth = 3;
  c.strokeRect(T.l + 10, T.t + 10, T.r - T.l - 20, T.b - T.t - 20);
  const my = (T.t + T.b) / 2;
  c.beginPath(); c.moveTo(T.l + 10, my); c.lineTo(T.r - 10, my); c.stroke();
  c.beginPath(); c.arc(CW / 2, my, 58, 0, Math.PI * 2); c.stroke();
  c.strokeRect(160, T.t + 10, 280, 70); c.strokeRect(160, T.b - 80, 280, 70);
  // borde interior en tinta
  c.lineWidth = 6; c.strokeStyle = PAL.tinta; c.strokeRect(T.l, T.t, T.r - T.l, T.b - T.t);
  // postes de los arcos
  for (const [x, y] of [[GR.x1, T.t], [GR.x2, T.t], [GO.x1, T.b], [GO.x2, T.b]]) { circle(c, x, y, 6); inkFill(c, PAL.crema, 3); }
  // esquinas de madera
  for (const k of corners) { c.beginPath(); k.vertices.forEach((v, i) => i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)); c.closePath(); inkFill(c, PAL.madera, 5); }
  // barras propias y rivales: metal con reflejo blanco duro
  const rod = (y, own) => {
    c.fillStyle = 'rgba(26,20,35,0.35)'; c.fillRect(0, y + 3, CW, 5);
    c.fillStyle = PAL.plataOsc; c.fillRect(0, y - 4, CW, 8);
    c.fillStyle = PAL.plata; c.fillRect(0, y - 4, CW, 4);
    c.fillStyle = '#ffffff'; c.fillRect(0, y - 3, CW, 1.5);
    c.lineWidth = 2; c.strokeStyle = PAL.tinta; c.strokeRect(-2, y - 4, CW + 4, 8);
    pathRoundRect(c, own ? CW - 30 : -8, y - 11, 38, 22, 7); inkFill(c, own ? PAL.tinta : PAL.azul, 3);
  };
  for (const r of RODS) rod(r.y, true);
  if (CFG.rivals.enabled) { rod(CFG.rivals.keeperY, false); rod(CFG.rivals.defY, false); }
  // nombres de barra
  c.font = `9px ${FONT_NUM}`; c.textAlign = 'center';
  RODS.forEach((r, i) => { plateText(c, t('rodShort.' + i), 19, r.y - 22, 8, PAL.crema); });
  tableDirty = false;
}
function drawTable(tm) {
  if (tableDirty || !tableLayer) paintTable();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.restore();
  ctx.drawImage(tableLayer, 0, 0, CW, CH);
  // zona de saque
  if (G.state === 'aim') {
    ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(244,234,213,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(T.l + 6, KICK.y1 - 14); ctx.lineTo(T.r - 6, KICK.y1 - 14); ctx.stroke(); ctx.setLineDash([]);
  }
  if (G.boss === 'torcida') {                           // el viento de la cancha torcida
    ctx.fillStyle = 'rgba(244,234,213,0.16)'; ctx.font = `46px ${FONT_NUM}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const arrow = G.windDir > 0 ? '»' : '«', drift = ((tm / 25) % 80) * G.windDir;
    for (const y of [320, 500, 660]) for (let x = 60; x < 600; x += 160) ctx.fillText(arrow, ((x + drift) % 520 + 520) % 520 + 40, y);
  }
  if (G.nextShot && G.nextShot.pito || pitoWall) {       // el pito tapa tu arco
    pathRoundRect(ctx, GO.x1 - 6, T.b - 4, GO.x2 - GO.x1 + 12, 10, 4); inkFill(ctx, PAL.crema, 3);
  }
  // línea de gol rival latiendo
  ctx.strokeStyle = `rgba(244,234,213,${0.45 + 0.3 * Math.sin(tm / 300)})`; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(GR.x1 + 6, T.t); ctx.lineTo(GR.x2 - 6, T.t); ctx.stroke();
}
function drawSlots(tm) {
  for (const s of G.slots) {
    if (s.doll && !s.doll.expelled) continue;
    if (s.doll) continue;
    const hl = drag && drag.hover && drag.hover.slot === s, shop = G.state === 'shop';
    const waiting = shop && (G.selectedOffer !== null || G.pick);       // hay algo escogido: los huecos llaman
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = hl ? PAL.crema : waiting ? `rgba(244,234,213,${0.7 + 0.3 * Math.sin(tm / 120)})` : (shop ? `rgba(244,234,213,${0.45 + 0.25 * Math.sin(tm / 200)})` : 'rgba(244,234,213,0.18)');
    ctx.lineWidth = hl ? 4 : waiting ? 3 : 2;
    circle(ctx, s.x, s.y, hl ? (drag.lift ? 26 : 20) : waiting ? 16 + 2 * Math.sin(tm / 120) : 13); ctx.stroke(); ctx.setLineDash([]);
  }
}
function drawDoll(s, tm) {
  const d = s.doll, age = (tm - d.hitT) / 1000;
  const k = age < 1 ? Math.exp(-age * 9) * Math.cos(age * 42) : 0;       // squash & stretch amortiguado
  const flash = age < 0.6 ? Math.exp(-age * 10) * (OPT.reduceFlashes ? 0.35 : 1) : 0;
  const lifted = drag && drag.kind === 'move' && drag.moved && drag.from === s;
  ctx.save(); ctx.translate(s.x, s.y);
  if (G.state === 'shop' && G.pick && G.pick.kind === 'move' && G.pick.from === s) {     // escogido para moverlo
    ctx.setLineDash([5, 4]); circle(ctx, 0, 0, 28 + 2 * Math.sin(tm / 120)); ctx.strokeStyle = PAL.crema; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
  }
  if (d.expelled) {                                      // Rambos expulsado: fuera de la mesa, tarjeta roja visible
    drawFigure(ctx, d.id, { tm, alpha: 0.22 });
    drawCard(ctx, 12, -12, 18, PAL.rojo, 0.25);
    ctx.restore(); return;
  }
  const ang = Math.atan2(d.ny, d.nx);
  ctx.rotate(ang); ctx.scale(1 - 0.3 * k, 1 + 0.2 * k); ctx.rotate(-ang);
  // La Garra encendida antes de disparar
  if (d.id === 'garra' && G.state === 'aim') {
    const g = SC.garraState(G.slots, CFG, G.shotsLeft, G.total, G.quota);
    if (g && g.active) { circle(ctx, 0, 0, 26 + 3 * Math.sin(tm / 150)); ctx.fillStyle = 'rgba(244,234,213,0.35)'; ctx.fill(); }
  }
  // El Veterano "cargado": sus últimos tiros del partido
  const vetOn = d.id === 'veterano' && !d.muted && (G.state === 'aim' ? SC.veteranoWindow(CFG, G.shotsLeft) : shot && SC.veteranoWindow(CFG, shot.shotsLeft));
  if (vetOn) {
    circle(ctx, 0, 0, 25 + 3 * Math.sin(tm / 150)); ctx.fillStyle = 'rgba(244,234,213,0.35)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = multColor(); ctx.setLineDash([5, 4]); ctx.lineDashOffset = -tm / 40; ctx.stroke(); ctx.setLineDash([]);
  }
  drawFigure(ctx, d.id, { tm, flash, dim: d.muted, turn: lookAt(d, s.x, s.y, tm) + k * 0.35,
    alpha: lifted ? 0.35 : (d.id === 'fantasma' ? 0.8 + 0.15 * Math.sin(tm / 250) : 1) });
  ctx.restore();
  // estado "cargado" (manual: icono pequeño cuando crece o está marcado)
  if (d.muted) { drawWhistle(ctx, s.x + 12, s.y - 18, 12); drawCard(ctx, s.x - 14, s.y - 18, 12, PAL.amarillo, -0.2); }
  if (d.id === 'ninamal') drawPtsChip(ctx, String(d.value), s.x, s.y - 30, 10);
  if (d.captain) {                                   // cinta de capitán
    const R = (DOLL[d.id].shape.r || 12) + 2;
    ctx.beginPath(); ctx.arc(s.x, s.y, R, Math.PI * 0.55, Math.PI * 0.95); ctx.lineWidth = 6; ctx.strokeStyle = PAL.tinta; ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = PAL.oro; ctx.stroke();
    plateText(ctx, 'C', s.x - R * 0.85, s.y + R * 0.75, 9, PAL.oro);
  }
  if (d.id === 'costurera' && SC.isActive(d)) {       // hilo entre los vecinos si son de la misma familia
    const a = G.slots.find(x => x.rod === s.rod && x.i === s.i - 1), b = G.slots.find(x => x.rod === s.rod && x.i === s.i + 1);
    if (a && b && a.doll && b.doll && DOLL[a.doll.id].family === DOLL[b.doll.id].family) {
      ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(244,234,213,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 6); ctx.quadraticCurveTo(s.x, s.y - 34, b.x, b.y - 6); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  if (d.id === 'diez') drawMultStamp(ctx, '+' + d.value, s.x, s.y - 30, 10);
  if (d.id === 'rambos' && d.rojas > 0) for (let i = 0; i < d.rojas; i++) drawCard(ctx, s.x - 8 + i * 8, s.y - 28, 10, PAL.amarillo, 0.15);
  if (d.id === 'mano' && G.manoUsed) { ctx.fillStyle = 'rgba(26,20,35,0.5)'; circle(ctx, s.x, s.y, 18); ctx.fill(); }
  if (G.state === 'shop' && G.sellMode) {
    if (EC.canSell(d)) drawPlataChip(ctx, '+' + EC.sellValue(d), s.x, s.y + 30, 10);
    else { ctx.font = `10px ${FONT_NUM}`; plateText(ctx, '🔒', s.x, s.y + 30, 10, PAL.crema); }
  }
}
function drawLlaveLinks(tm) {
  for (const s of G.slots) {
    if (!s.doll || s.doll.id !== 'llave' || !SC.isActive(s.doll)) continue;
    for (const o of G.slots) if (o.rod === s.rod && Math.abs(o.i - s.i) === 1 && o.doll && o.doll.id !== 'llave') {
      ctx.strokeStyle = `rgba(244,234,213,${0.35 + 0.2 * Math.sin(tm / 250)})`; ctx.lineWidth = 4; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(o.x, o.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  for (let i = links.length - 1; i >= 0; i--) {
    const l = links[i], a = (tm - l.t) / 400; if (a > 1) { links.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(255,255,255,${1 - a})`; ctx.lineWidth = 7 * (1 - a);
    ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
  }
}
/* Los muñecos miran al balón cuando pasa cerca; si no, se mecen un poquito (cada uno a su ritmo). */
function lookAt(who, x, y, tm) {
  let target = Math.sin(tm / 900 + (who.uid || who.seed || 0) * 1.7) * 0.05;
  let best = 200;
  for (const b of balls) {
    if (!b.alive) continue;
    const dx = b.body.position.x - x, dy = b.body.position.y - y, dist = Math.hypot(dx, dy);
    if (dist < best) { best = dist; target = clamp(Math.atan2(dx, -dy), -0.55, 0.55); }
  }
  who.face = (who.face || 0) + (target - (who.face || 0)) * 0.12;
  return who.face;
}
function drawRivals(tm) {
  for (const r of rivals) {
    const b = r.body;
    ctx.save(); ctx.translate(b.position.x, b.position.y);
    const age0 = (tm - (r.hitT || -9999)) / 1000, kick = age0 < 1 ? Math.exp(-age0 * 9) * Math.cos(age0 * 42) * 0.35 : 0;
    if (r.seed === undefined) r.seed = rivals.indexOf(r) + 7;
    const turn = lookAt(r, b.position.x, b.position.y, tm) + kick;
    if (r.role === 'keeper') {
      const w = b.bounds.max.x - b.bounds.min.x, h = b.bounds.max.y - b.bounds.min.y;
      drawFigure(ctx, null, { rival:true, shape:{ kind:'rect', w, h }, head:'gorra', turn: turn * 0.4 });
    } else drawFigure(ctx, null, { rival:true, shape:{ kind:'circle', r: CFG.rivals.defR }, head: r.seed % 2 ? 'rapado' : 'despeinado', turn });
    const age = (tm - (r.hitT || -9999)) / 1000;
    if (age < 0.3) { circle(ctx, 0, 0, 18 + 20 * age); ctx.strokeStyle = `rgba(244,234,213,${1 - age / 0.3})`; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.restore();
  }
}
function drawBalls(tm) {
  for (const bo of balls) {
    if (!bo.alive) continue;
    const p = bo.body.position;
    if (bo.moving) { bo.trail.push({ x:p.x, y:p.y }); if (bo.trail.length > 14) bo.trail.shift(); } else if (bo.trail.length) bo.trail.shift();
    const curving = bo.curve && bo.curve.left > 0;
    bo.trail.forEach((q, i) => {
      const a = i / bo.trail.length;
      ctx.fillStyle = curving ? `rgba(244,234,213,${0.6 * a})` : `rgba(244,234,213,${0.28 * a})`;
      circle(ctx, q.x, q.y, BALL_R * (0.35 + 0.6 * a)); ctx.fill();
    });
    ctx.fillStyle = 'rgba(26,20,35,0.35)'; circle(ctx, p.x + 3, p.y + 4, BALL_R); ctx.fill();
    circle(ctx, p.x, p.y, BALL_R); inkFill(ctx, '#FFFFFF', 3);
    ctx.save(); circle(ctx, p.x, p.y, BALL_R - 1.5); ctx.clip();
    const rot = (p.x + p.y) / 9;                        // parches que ruedan
    ctx.fillStyle = PAL.tinta;
    for (let i = 0; i < 5; i++) { const a = rot + i * Math.PI * 2 / 5; circle(ctx, p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8, 2.6); ctx.fill(); }
    ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = rot + i * Math.PI * 2 / 5 + 0.6; const x = p.x + Math.cos(a) * 3.6, y = p.y + Math.sin(a) * 3.6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(p.x - 3, p.y - 3, 4, Math.PI, Math.PI * 1.5); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    if (bo.pirlo > 0) { circle(ctx, p.x, p.y, BALL_R + 4); ctx.strokeStyle = 'rgba(244,234,213,0.7)'; ctx.lineWidth = 2; ctx.stroke(); }
  }
}
function drawAim(tm) {
  if (G.state !== 'aim' || !balls[0]) return;
  const bp = balls[0].body.position;
  if (!aim) {
    const pulse = 0.5 + 0.5 * Math.sin(tm / 250);
    circle(ctx, bp.x, bp.y, BALL_R + 7 + 4 * pulse); ctx.strokeStyle = `rgba(244,234,213,${0.3 + 0.4 * pulse})`; ctx.lineWidth = 3; ctx.stroke();
    if (!G.hasShot && !G.paused) plateText(ctx, t('table.hint'), CW / 2, KICK.y2 + 32, 12 * TXT_K, PAL.crema, FONT_TXT);
    return;
  }
  const a = aimPower(), ex = bp.x - a.dx * a.len, ey = bp.y - a.dy * a.len;
  // círculo del 20%: soltar dentro cancela el tiro
  ctx.setLineDash([5, 6]); circle(ctx, bp.x, bp.y, MAX_DRAG * AIM_MIN);
  ctx.strokeStyle = a.cancel ? PAL.crema : 'rgba(244,234,213,0.35)'; ctx.lineWidth = a.cancel ? 3 : 2; ctx.stroke(); ctx.setLineDash([]);
  if (a.cancel) {
    ctx.strokeStyle = 'rgba(244,234,213,0.6)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
    plateText(ctx, t('aim.cancel'), bp.x, bp.y + 50, 11 * TXT_K, PAL.crema, FONT_TXT);
    return;
  }
  // goma del tirador: tinta con alma crema
  ctx.lineCap = 'round';
  ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 7 + 7 * a.power; ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = PAL.crema; ctx.lineWidth = 3 + 5 * a.power; ctx.beginPath(); ctx.moveTo(bp.x, bp.y); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.lineCap = 'butt';
  circle(ctx, ex, ey, 6 + 3 * a.power); inkFill(ctx, PAL.crema, 3);
  // anillo de potencia
  ctx.beginPath(); ctx.arc(bp.x, bp.y, BALL_R + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * a.power);
  ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = PAL.crema; ctx.lineWidth = 4; ctx.stroke();
  // guía SOLO hasta el primer rebote (con el imán, hasta el segundo; con La Niebla, nada)
  const iman = !!G.nextShot.iman;
  if (G.boss === 'niebla' && !iman) { plateText(ctx, Math.round(a.power * 100) + '%', bp.x, bp.y + 38, 11 * TXT_K, PAL.crema); return; }
  const hit = raycast(bp.x, bp.y, a.dx, a.dy), dist = Math.hypot(hit.x - bp.x, hit.y - bp.y);
  const off = (tm / 30) % 14;
  const dots = (x0, y0, ux, uy, len, start) => { for (let d = start + off; d < len; d += 14) { circle(ctx, x0 + ux * d, y0 + uy * d, 3.2); inkFill(ctx, PAL.crema, 1.5); } };
  dots(bp.x, bp.y, a.dx, a.dy, dist, BALL_R + 12);
  ctx.setLineDash([4, 4]); circle(ctx, hit.x, hit.y, BALL_R); ctx.strokeStyle = PAL.crema; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
  if (iman && hit.n && !hit.goal) {
    const vn = a.dx * hit.n.x + a.dy * hit.n.y, rx = a.dx - 2 * vn * hit.n.x, ry = a.dy - 2 * vn * hit.n.y;
    const h2 = raycast(hit.x, hit.y, rx, ry), d2 = Math.hypot(h2.x - hit.x, h2.y - hit.y);
    ctx.globalAlpha = 0.7; dots(hit.x, hit.y, rx, ry, d2, 8); ctx.globalAlpha = 1;
    ctx.setLineDash([4, 4]); circle(ctx, h2.x, h2.y, BALL_R); ctx.strokeStyle = PAL.crema; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  if (hit.goal) plateText(ctx, hit.goal === 'rival' ? t('aim.goal') : t('aim.own'), hit.x, hit.goal === 'rival' ? hit.y + 44 : hit.y - 34, 14, hit.goal === 'rival' ? PAL.crema : multColor());
  plateText(ctx, Math.round(a.power * 100) + '%', bp.x, bp.y + 38, 11, PAL.crema);
}
function drawFx(tm, dt) {
  const sec = dt / 1000;
  for (let i = wallFlashes.length - 1; i >= 0; i--) {               // nivel 1: chispa pequeña, sin temblor
    const w = wallFlashes[i], a = (tm - w.t) / 220; if (a > 1) { wallFlashes.splice(i, 1); continue; }
    const px = -w.ny, py = w.nx, L = 20 * (1 - a * 0.5);
    ctx.strokeStyle = `rgba(244,234,213,${0.9 * (1 - a)})`; ctx.lineWidth = 4 * (1 - a);
    ctx.beginPath(); ctx.moveTo(w.x - px * L, w.y - py * L); ctx.lineTo(w.x + px * L, w.y + py * L); ctx.stroke();
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i], a = (tm - r.t) / 450; if (a > 1) { rings.splice(i, 1); continue; }
    ctx.globalAlpha = 1 - a; circle(ctx, r.x, r.y, 20 + 60 * a);
    ctx.strokeStyle = PAL.tinta; ctx.lineWidth = 9 * (1 - a) + 2; ctx.stroke();
    ctx.strokeStyle = multColor(); ctx.lineWidth = 6 * (1 - a); ctx.stroke(); ctx.globalAlpha = 1;
  }
  for (let i = streaks.length - 1; i >= 0; i--) {                    // Kan-Té llega corriendo
    const s = streaks[i], a = (tm - s.t) / 600; if (a > 1) { streaks.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(244,234,213,${1 - a})`; ctx.lineWidth = 10 * (1 - a); ctx.setLineDash([14, 8]);
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); ctx.setLineDash([]);
  }
  for (let i = hands.length - 1; i >= 0; i--) {                      // La Mano aparece y desvía
    const h = hands[i], a = (tm - h.t) / 1100; if (a > 1) { hands.splice(i, 1); continue; }
    const rise = Math.min(1, a * 4), y = h.y + 40 * (1 - rise) - 30 * a;
    ctx.save(); ctx.translate(h.x, y); ctx.rotate(-0.2 + 0.4 * Math.sin(a * 8)); ctx.globalAlpha = a > 0.8 ? (1 - a) / 0.2 : 1;
    hand(ctx, 34); ctx.restore(); ctx.globalAlpha = 1;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], a = (tm - p.t) / p.life; if (a > 1) { particles.splice(i, 1); continue; }
    if (p.drag) { p.vx *= Math.pow(0.12, sec); p.vy *= Math.pow(0.12, sec); }
    p.x += p.vx * sec; p.y += p.vy * sec;
    ctx.globalAlpha = 1 - a; ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // --- textos grandes: de a uno, en cola, y nunca debajo del conteo, de un panel o del tutorial ---
  const blocked = $('tally').classList.contains('show') || !$('panel').classList.contains('hidden') || !!$('tour');
  if (bigCur && blocked && bigCur.prio !== 'now') bigCur.t += dt;             // en pausa mientras algo lo taparía
  if (!bigCur && !blocked && bigQ.length) { bigCur = bigQ.shift(); bigCur.t = tm; if (bigQ.length) bigCur.life *= 0.75; }
  let bigRect = null;
  if (bigCur) {
    const b = bigCur, age = tm - b.t, a = age / b.life;
    if (a > 1) bigCur = null;
    else if (!(blocked && b.prio !== 'now')) {
      const fs = b.small ? 30 : 52, cy = CH * 0.45;
      const s = age < 180 ? 2.1 - 1.1 * (age / 180) : 1 + 0.05 * a;
      ctx.save(); ctx.translate(CW / 2, cy); ctx.scale(s, s); ctx.rotate(-0.06);
      ctx.globalAlpha = a > 0.75 ? (1 - a) / 0.25 : 1;
      ctx.font = `${fs}px ${FONT_NUM}`;
      const fitK = Math.min(1, (CW - 110) / (ctx.measureText(b.text).width + 50)); ctx.scale(fitK, fitK);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = PAL.noche; ctx.fillText(b.text, 5, 7);                    // extrusión verde noche, como el logo
      ctx.lineWidth = fs / 5; ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.tinta; ctx.strokeText(b.text, 0, 0);
      ctx.fillStyle = b.color; ctx.fillText(b.text, 0, 0);
      if (b.sub) plateText(ctx, b.sub, 0, fs * 1.1, 20, PAL.crema);
      ctx.restore();
      bigRect = { x: 40, y: cy - fs * 0.9, w: CW - 80, h: fs * 1.8 + (b.sub ? 50 : 0) };
    }
  }
  // --- textos chicos: si dos se tocan, el más nuevo sube hasta quedar libre (nada encima de nada) ---
  const placed = bigRect ? [bigRect] : [];
  const hitsAny = r => placed.some(q => r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y);
  for (let i = 0; i < popups.length; i++) {
    const p = popups[i], age = tm - p.t, a = age / p.life;
    if (a > 1) { popups.splice(i, 1); i--; continue; }
    const pop = age < 110 ? 0.4 + 0.9 * (age / 110) : 1.3 - 0.3 * Math.min(1, (age - 110) / 150);
    let x = p.x + p.vx * a, y = p.y - 34 * Math.pow(a, 0.6);
    const flying = p.kind === 'pts' && a > 0.45;
    if (flying) {                                                   // nivel 2: el "+N" vuela al contador
      const f = Math.pow((a - 0.45) / 0.55, 2); x = x + (CW / 2 - x) * f; y = y + (-30 - y) * f;
    } else {
      if (p.w === undefined) {
        ctx.font = `${p.size}px ${FONT_NUM}`;
        p.w = ctx.measureText(p.text).width + p.size * (p.kind === 'text' ? 1.2 : 2.2) + (p.tag ? p.size * 2 : 0); p.h = p.size * (p.tag ? 2 : 1.5); p.off = 0;
      }
      let r = { x: x - p.w / 2, y: y - p.off - p.h / 2, w: p.w, h: p.h }, tries = 0;
      while (hitsAny(r) && tries++ < 12) { p.off += p.h * 0.5; r.y = y - p.off - p.h / 2; }
      if (r.y < 4) { p.off = y - p.h / 2 - 4; r.y = 4; }
      y -= p.off; placed.push(r);
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(pop, pop); ctx.globalAlpha = a > 0.8 ? (1 - a) / 0.2 : 1;
    if (p.kind === 'pts') { drawPtsChip(ctx, p.text.replace(/^\+/, ''), 0, 0, p.size); if (p.tag) plateText(ctx, p.tag, p.w / 2 + p.size * 0.2, -p.size * 0.7, p.size * 0.72, PAL.crema); }
    else if (p.kind === 'mult') drawMultStamp(ctx, p.text, 0, 0, p.size);
    else if (p.kind === 'plata') drawPlataChip(ctx, p.text.replace(/^\+/, ''), 0, 0, p.size);
    else plateText(ctx, p.text, 0, 0, p.size, p.color);
    ctx.restore();
  }
}

/* ===================== BUCLE PRINCIPAL ===================== */
let lastT = now(), zoom = 1, tallyMult = 1;
const stageEl = document.getElementById('stage');
function frame(tm) {
  const dt = Math.min(50, tm - lastT); lastT = tm;
  if (!G.paused && (G.state === 'aim' || G.state === 'bossintro' || G.state === 'shop')) moveRivals(dt);
  if (G.state === 'shooting' && !G.paused) {
    if (hitstop > 0) hitstop -= dt;
    else {
      const target = slowmoLeft > 0 ? CFG.juice.slowmoScale : 1;
      timeScale += (target - timeScale) * Math.min(1, dt / 70);
      const warp = G.turbo || 1;                   // solo pruebas automáticas (__game.turbo)
      const N = CFG.physics.substeps * warp, sim = dt * timeScale * warp;
      for (let i = 0; i < N; i++) { physicsStep(sim / N); if (hitstop > 0 || G.state !== 'shooting') break; }
      checkSlowmo();
      if (G.state === 'shooting' && shot.t > 0.05 && balls.every(b => !b.alive || !b.moving)) endShot();
      else if (shot && Math.floor(shot.t * 10) !== shot._tenth) { shot._tenth = Math.floor(shot.t * 10); updateShotbar(); }
    }
    if (slowmoLeft > 0) slowmoLeft -= dt / 1000;
  }
  if (now() > shakeUntil) shakeAmp *= Math.pow(0.0005, dt / 1000);
  let amp = shakeAmp;
  const live = shot && (G.state === 'shooting' || G.state === 'settle' || G.state === 'scoring');
  const combo = live && G.state !== 'scoring' && shot.effects >= CFG.juice.comboEffects;
  // temblor continuo proporcional al Mult: casi nada en ×2, claro en ×10, fuerte en ×30+
  const liveMult = G.state === 'scoring' ? tallyMult : (shot ? shot.mult : 1);
  if (live) amp += CFG.juice.shake * OPT.shake * Math.min(5, Math.max(0, liveMult - 1.5) * 0.16);
  const sx = (Math.random() - 0.5) * 2 * amp, sy = (Math.random() - 0.5) * 2 * amp;
  // se mueve todo el escenario (así también tiembla el panel del conteo, que tapa la mesa)
  const cssK = canvas.clientWidth / CW;
  stageEl.style.translate = amp > 0.05 ? `${(sx * cssK).toFixed(1)}px ${(sy * cssK).toFixed(1)}px` : '';
  // nivel 5: zoom suave hacia el arco durante la cámara lenta
  const zTarget = slowmoLeft > 0 ? 1.08 : 1; zoom += (zTarget - zoom) * Math.min(1, dt / 120);
  const focus = balls.find(b => b.alive && b.slowmo);
  const fx = focus ? focus.body.position.x : CW / 2, fy = focus ? focus.body.position.y : CH / 2;

  if (!canvas.width || !canvas.height) { if (stageEl.clientWidth) fitCanvas(); requestAnimationFrame(frame); return; }   // ventana oculta o de tamaño 0
  ctx.setTransform(VIEW_K, 0, 0, VIEW_K, 0, 0);
  ctx.clearRect(0, 0, CW, CH);
  ctx.save();
  ctx.translate(fx, fy); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy);
  drawTable(tm); drawSlots(tm); drawLlaveLinks(tm);
  drawRivals(tm);
  for (const s of G.slots) if (s.doll) drawDoll(s, tm);
  drawBalls(tm); drawAim(tm);
  if (combo) { ctx.fillStyle = 'rgba(14,20,25,0.16)'; ctx.fillRect(-50, -50, CW + 100, CH + 100); }   // nivel 4: el fondo se oscurece
  drawFx(tm, dt);
  ctx.restore();
  const slow = 1 - timeScale;
  if (slow > 0.05) {
    const vg = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.25, CW / 2, CH / 2, CH * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(14,77,44,${0.6 * slow})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);
  }
  const rf = (tm - redFlash) / 500;
  if (rf < 1) { ctx.fillStyle = `rgba(230,57,70,${0.25 * (1 - rf)})`; ctx.fillRect(0, 0, CW, CH); }
  requestAnimationFrame(frame);
}

/* El tutorial se guarda como "visto" en el navegador. Cuando cambia su contenido se sube
   TUTORIAL_VERSION y a todos les vuelve a salir una vez. */
const TUTORIAL_VERSION = 3;
function startGame() {
  if (PROFILE.tutorialVersion !== TUTORIAL_VERSION) {
    PROFILE.tutorialVersion = TUTORIAL_VERSION; PROFILE.tutorialDone = false; PROFILE.coachSeen = {}; saveProfile();
  }
  $('tPtsLbl').textContent = t('tally.points'); $('tMultLbl').textContent = t('tally.mult');
  $('tFinalLbl').textContent = t('tally.final'); $('tSkip').textContent = t('tally.skip');
  $('rotTitle').textContent = t('rotate.title'); $('rotText').textContent = t('rotate.text');
  applyOptions();
  if (document.fonts) document.fonts.ready.then(() => { tableDirty = true; for (const k in iconCache) delete iconCache[k]; renderSide(); });
  buildDebug();
  resetRun();
  fitCanvas();
  requestAnimationFrame(frame);
}

// Hooks para pruebas desde la consola: __game.shootAt(ángulo°, potencia 0–1)  (-90 = hacia arriba)
window.__game = {
  G, CFG, get shot() { return shot; }, get balls() { return balls; },
  shootAt(deg, power) { const a = deg * Math.PI / 180; if (G.state === 'aim') shoot(Math.cos(a) * CFG.physics.maxShot * power, Math.sin(a) * CFG.physics.maxShot * power, power); },
  place(id, slotIndex) { G.slots[slotIndex].doll = makeDoll(id, dc(id).price); rebuildDolls(); renderSide(); },
  give(id) { const i = G.bench.indexOf(null); if (i < 0) return false; G.bench[i] = makeDoll(id, dc(id).price); renderSide(); return true; },
  win() { if (G.state === 'aim' || G.state === 'bossintro') { G.total = Math.max(G.total, G.quota); G.reachedQuota = true; endMatch(true); } },
  lose() { if (G.state === 'aim' || G.state === 'bossintro') endMatch(false); },
  jump(n) { G.match = n; G.lastWin = false; hidePanel(); startMatch(); },
  skip: () => skipShots(),
  profile: PROFILE, log: LOG,
  unlockAll() { PROFILE.unlocked = GOLIN.ROSTER.map(d => d.id); PROFILE.maxLevel = PR.LEVELS.length; saveProfile(); renderSide(); },
  resetProgress() { Object.assign(PROFILE, PR.newProfile()); saveProfile(); renderSide(); },
  item(id) { if (G.pocket.length < CFG.economy.pocketSize) { G.pocket.push(id); renderSide(); updateShotbar(); } },
  activated: ACTIVATED,
  set turbo(k) { G.turbo = k; }, get state() { return G.state; },
};
