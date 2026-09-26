/* =====================================================================
   GOLÍN — UI (DOM): marcador, barra del tiro, tienda y banca, paneles
   de fin de partido, jefes, legendarios, pantallas finales y debug.
   Todos los textos salen de js/strings.js vía t().
   ===================================================================== */
'use strict';

function dollParams(id, inst) {
  const p = dc(id);
  return Object.assign({}, p, { value: inst ? inst.value : (p.base !== undefined ? p.base : 0),
    pct: Math.round((id === 'garra' ? p.bonus : p.chance || 0) * 100) });
}
function dollText(id, inst) {
  const p = dollParams(id, inst);
  const br = x => x.replace(/\n/g, '<br>');
  return { rule: br(t(`doll.${id}.rule`, p)), joke: br(t(`doll.${id}.joke`, p)) };
}
const iconCache = {};
function dollIcon(id, size = 64) {
  const key = id + ':' + size;
  if (!iconCache[key]) iconCache[key] = renderDollIcon(id, size);
  return iconCache[key];
}

/* ---------------- marcador ---------------- */
function updateBoard() {
  const b = $('board');
  if (!b.querySelector('#bMatch')) {
    b.innerHTML = `
      <div class="cell"><small id="bRound"></small><b id="bMatch"></b></div>
      <div class="cell big"><small>${t('board.quota')}</small><b class="num"><span id="bTotal">0</span> / <span id="bQuota">0</span></b><div class="bar"><i id="bBar"></i></div><small id="bMatchQ" class="sub"></small></div>
      <div class="cell"><small>${t('board.shots')}</small><b id="bShots"></b></div>
      <div class="cell plata"><small>${t('board.plata')}</small><b class="num"><span class="coin">$</span><span id="bPlata"></span></b></div>
      <div class="cell"><small>${t('board.lives')}</small><b id="bLives"></b></div>
      <button class="btn opt" id="bHelp" title="${t('board.help')}">?</button>
      <button class="btn opt" id="bOpt" title="${t('opt.title')}">⚙</button>`;
    $('bOpt').onclick = openOptions;
    $('bHelp').onclick = () => { audio(); replayTour(); };
  }
  const E = CFG.economy;
  $('bRound').textContent = G.endless ? t('board.endless') : t('board.round', { r: EC.roundOf(G.match, CFG), n: E.rounds });
  $('bMatch').innerHTML = G.match + (G.boss ? ` <span class="bossTag">${t('board.boss')}</span>` : G.mod ? ` <span class="bossTag mod">${t('board.mod')}</span>` : '');
  $('bRound').textContent += ' · ' + t('level.' + G.level + '.name');
  $('bQuota').textContent = fmt(G.quota);
  if (G.state !== 'scoring') $('bTotal').textContent = fmt(G.total);
  $('bBar').style.width = clamp((G.total - G.metaBase) / Math.max(1, G.quota - G.metaBase) * 100, 0, 100) + '%';
  $('bMatchQ').textContent = t('board.matchQuota', { q: fmt(G.matchQuota || G.quota) });
  $('bShots').textContent = '●'.repeat(Math.max(0, G.shotsLeft)) + '○'.repeat(Math.max(0, shotsPerMatch() - G.shotsLeft));
  $('bPlata').textContent = G.plata;
  $('bLives').textContent = '❤'.repeat(Math.max(0, G.lives)) + '♡'.repeat(Math.max(0, E.lives - G.lives));
  fitBoardText();
}

/* ---------------- barra del tiro ---------------- */
function updateShotbar() {
  const s = shot, bar = $('shotbar');
  if (G.state === 'shop') { bar.innerHTML = `<span class="chip small">${t('bar.shop')}</span>`; return; }
  if (G.state === 'aim' || !s) { bar.innerHTML = G.state === 'aim' ? aimChips() : ''; bindSkip(); return; }
  if (!bar.querySelector('#sPts')) {
    bar.innerHTML = `<span class="lbl">${t('bar.points')}</span><span class="chip pts num" id="sPts">0</span><span class="sep">×</span>
      <span class="lbl">${t('bar.mult')}</span><span class="chip mult num" id="sMult">1</span><span id="sChips"></span>`;
  }
  $('sPts').textContent = fmt(s.points);
  $('sMult').textContent = fm(s.mult);
  if (bumpNext.pts) { bump($('sPts')); bumpNext.pts = false; }
  if (bumpNext.mult) { bump($('sMult')); bumpNext.mult = false; }
  const combo = s.effects >= CFG.juice.comboEffects;
  bar.classList.toggle('combo', combo);
  $('sChips').innerHTML = shotChips(s);
}
function bindSkip() {
  const b = $('bSkip'); if (b) b.onclick = skipShots;
  document.querySelectorAll('.btn.pocket').forEach(x => x.onclick = () => useItem(+x.dataset.p));
}
/* Chips antes de disparar: La Garra encendida, Mult base de El Diez, El Árbitro, Saltar tiros */
function aimChips() {
  let h = '';
  const g = SC.garraState(G.slots, CFG, G.shotsLeft, G.total, G.quota);
  if (g && g.active) h += `<span class="chip small ok garra-on">✊ ${t('chip.garra', { pct: Math.round(dc('garra').bonus * g.power * 100) })}</span>`;
  const bm = SC.baseMultOf(G.slots);
  if (bm > 1) h += `<span class="chip small">${t('chip.base', { m: fm(bm) })}</span>`;
  if (G.boss === 'arbitro') h += `<span class="chip small ko">🟨 ${t('chip.arbitro')}</span>`;
  h = wallChip() + h;
  h = (G.total < G.quota ? `<span class="chip small left">${t('chip.left', { n: fmt(G.quota - G.total) })}</span>`
    : `<span class="chip small ok">${t('chip.over', { n: fmt(G.total - G.quota) })}</span>`) + h;
  if (!G.caciqueUsed && SC.caciqueShots(G.slots, CFG) > 0) h += `<span class="chip small ok">🪶 ${t('chip.cacique')}</span>`;
  const capt = G.slots.find(x => x.doll && x.doll.captain);
  if (capt) h += `<span class="chip small ok">© ${DOLL[capt.doll.id].name}: ${t('captain.tag')}</span>`;
  if (G.lostPrev && G.slots.some(x => x.doll && x.doll.id === 'revancha' && SC.isActive(x.doll))) h += `<span class="chip small ok">🩹 ${t('chip.revancha', { m: dc('revancha').mult })}</span>`;
  if (SC.veteranoWindow(CFG, G.shotsLeft) && G.slots.some(x => x.doll && x.doll.id === 'veterano' && SC.isActive(x.doll)))
    h += `<span class="chip small ok garra-on">★ ${t('chip.veterano', { m: dc('veterano').xmult })}</span>`;
  if (G.boss === 'niebla') h += `<span class="chip small ko">🌫 ${t('boss.niebla.name')}</span>`;
  if (G.boss === 'tacano') h += `<span class="chip small ko">${t('boss.tacano.name')}</span>`;
  if (G.mod) h += `<span class="chip small">${t('mod.' + G.mod + '.name')}</span>`;
  for (const k of Object.keys(G.nextShot || {})) h += `<span class="chip small ok">${GOLIN.ITEM[k].icon} ${t('item.' + k + '.name')}</span>`;
  if (G.matchFlags && G.matchFlags.gaseosa) h += `<span class="chip small ok">🥤 ${t('item.gaseosa.name')}</span>`;
  h += G.pocket.map((id, i) => `<button class="btn pocket" data-p="${i}" title="${t('item.' + id + '.rule')}">${GOLIN.ITEM[id].icon} ${t('item.' + id + '.name')}</button>`).join('');
  if (G.reachedQuota && G.shotsLeft > 0) h += `<button class="btn skip" id="bSkip">${t('skip', { n: G.shotsLeft * CFG.economy.rewardShot })}</button>`;
  return h;
}
/* "Bandas ×2 · Tapete pesado": la razón exacta de que una banda no pague 15 */
function wallChip() {
  const r = wallRule(); if (r.m === 1) return '';
  const label = r.m === 0 ? t('chip.wallsZero') : t('chip.walls', { m: fm(r.m) });
  return `<span class="chip small ok walls">${label} · ${r.reasons.map(k => t('wallReason.' + k)).join(' + ')}</span>`;
}
function shotChips(s) {
  let h = wallChip();
  const has = id => G.slots.some(x => x.doll && x.doll.id === id && SC.isActive(x.doll));
  const touched = id => [...s.touched.values()].some(x => x.id === id);
  if (has('chilena')) {
    const n = s.distinct.size, need = dc('chilena').needed;
    h += ` <span class="chip small ${touched('chilena') && n >= need ? 'ok' : ''}">✂ ${t('chip.chilena', { n, needed: need })}${touched('chilena') ? '' : ' ' + t('chip.chilenaTouch')}</span>`;
  }
  if (has('fantasma')) {
    const late = s.t > dc('fantasma').time && !s.goal;
    h += ` <span class="chip small ${late ? 'ko' : touched('fantasma') ? 'ok' : ''}">👻 ${t('chip.fantasma', { t: s.t.toFixed(1) })}${touched('fantasma') ? '' : ' ' + t('chip.fantasmaTouch')}</span>`;
  }
  if (s.garra && s.garra.active) h += ` <span class="chip small ok">✊ ${t('chip.garra', { pct: Math.round(dc('garra').bonus * s.garra.power * 100) })}</span>`;
  if (s.plata) h += ` <span class="chip small plata">$ ${t('chip.tendero', { n: s.plata })}</span>`;
  if (s.goal) h += ` <span class="chip small ok">${t('chip.goal')}</span>`;
  return h;
}

/* ---------------- paneles ---------------- */
function panel(html) { const p = $('panel'); p.className = ''; p.innerHTML = html; return p; }
function hidePanel() { $('panel').className = 'hidden'; }

/* Fin de partido: desglose animado de la plata (suena la caja en cada línea). */
function showMatchEnd(win, rw) {
  const labels = { win: t('end.win.line'), shots: n => t('end.shots.line', { n }), goals: n => t('end.goals.line', { n }), gaseosa: t('item.gaseosa.name') + ' ×' + CFG.economy.gaseosaMult, colector: t('end.colector.line'), alcancia: t('item.alcancia.name') };
  const p = panel(`<h1 class="${win ? 'good' : 'bad'}">${win ? t('end.win') : t('end.lose')}</h1>
    ${win ? '' : `<p class="hint">${G.lives > 0 ? t('end.loseNote') : ''}</p>`}
    <div id="pLines"></div>
    ${rw.lines.length ? '' : `<p class="hint">${t('end.nothing')}</p>`}
    <div class="rw tot"><span>${t('end.total')}</span><b class="plataTxt">+$<span id="pTot">0</span></b></div>
    <button class="btn primary" id="pBtn" disabled>${G.lives <= 0 && !win ? t('final.rematch') : t('end.toShop')}</button>`);
  (async () => {
    let acc = 0;
    for (const l of rw.lines) {
      await wait(260);
      const row = document.createElement('div'); row.className = 'rw slide';
      const lbl = typeof labels[l.key] === 'function' ? labels[l.key](l.n) : labels[l.key];
      row.innerHTML = `<span>${lbl}</span><b class="plataTxt">+$${l.amount}</b>`;
      $('pLines').appendChild(row);
      SFX.caja(Math.min(6, l.amount));
      acc += l.amount; $('pTot').textContent = acc; bump($('pTot'));
    }
    await wait(200);
    const b = $('pBtn'); if (!b) return;
    b.disabled = false;
    b.onclick = async () => {
      audio(); b.disabled = true;
      const before = G.plata; G.plata += rw.total;
      if (rw.total) { SFX.caja(Math.min(8, rw.total)); await countUp($('bPlata'), before, G.plata, 450); }
      updateBoard(); hidePanel(); afterMatch(win);
    };
  })();
}

function favoriteDoll() {
  let best = null, n = 0;
  for (const [id, c] of Object.entries(G.stats.use)) if (c > n) { n = c; best = id; }
  return best;
}
function showFinal(win) {
  G.state = 'final';
  const reached = G.stats.reached || G.match;
  LOG.endRun({ win, reached, won: G.won, best: G.bestShot, goals: G.stats.goals, level: G.level });
  const fresh = progressEvent({ type:'run', win, reached, level: G.level });
  const fav = favoriteDoll();
  const levels = PR.LEVELS.filter(L => L.id <= PROFILE.maxLevel);
  const levelBtns = levels.length > 1 ? `<h3 class="lvlTitle">${t('level.pick')}</h3><div class="lvlRow">${levels.map(L =>
    `<button class="btn lvl ${L.id === (win ? Math.min(G.level + 1, PROFILE.maxLevel) : G.level) ? 'on' : ''}" data-l="${L.id}" title="${t('level.' + L.id + '.rule')}">${L.id}. ${t('level.' + L.id + '.name')}</button>`).join('')}</div>` : '';
  panel(`<h1 class="${win ? 'good' : 'bad'}">${win ? t('final.win') : t('final.lose')}</h1>
    <p class="hint">${win ? t('final.winSub') : t('final.loseSub')}</p>
    <div class="rw"><span>${t('final.score')}</span><b class="ptsTxt">${fmt(G.total)}</b></div>
    <div class="rw"><span>${t('final.won')}</span><b>${G.won}</b></div>
    <div class="rw"><span>${t('final.reached')}</span><b>${G.stats.reached || G.match}</b></div>
    <div class="rw"><span>${t('final.best')}</span><b class="ptsTxt">${fmt(G.bestShot)}</b></div>
    <div class="rw"><span>${t('final.goals')}</span><b>${G.stats.goals}</b></div>
    <div class="rw"><span>${t('final.fav')}</span><b>${fav ? `<img class="mini" src="${dollIcon(fav, 48)}"> ${DOLL[fav].name}` : t('final.none')}</b></div>
    ${win && PROFILE.maxLevel > G.level ? `<p class="hint">${t('level.opened', { n: t('level.' + PROFILE.maxLevel + '.name') })}</p>` : ''}
    ${fresh.length ? `<p class="hint">${t('unlock.title')} ${fresh.map(id => DOLL[id].name).join(', ')}</p>` : ''}
    ${levelBtns}
    ${win ? `<button class="btn primary" id="pCont">${t('final.continue')}</button>` : ''}
    <button class="btn ${win ? '' : 'primary'} wide" id="pRematch">${t('final.rematch')}</button>`);
  let pick = win ? Math.min(G.level + 1, PROFILE.maxLevel) : G.level;
  document.querySelectorAll('.btn.lvl').forEach(b => b.onclick = () => {
    pick = +b.dataset.l; document.querySelectorAll('.btn.lvl').forEach(x => x.classList.toggle('on', x === b));
  });
  if (win) { SFX.victory(); $('pCont').onclick = () => { audio(); continueEndless(); }; }
  $('pRematch').onclick = () => { audio(); resetRun(pick); };
}

function showBossIntro(boss) {
  const final = EC.isFinalBoss(G.match, CFG);
  panel(`<div class="bossCard">
    <small>${final ? t('boss.final') : t('boss.tag')} · ${t('fx.match', { n: G.match })}</small>
    <h1 class="bossName">${t('boss.' + boss + '.name')}</h1>
    <p class="bossRule">${t('boss.' + boss + '.rule')}${boss === 'torcida' ? ' ' + (G.windDir > 0 ? '→' : '←') : ''}</p>
    <div class="rw tot"><span>${t('boss.quota')}</span><b class="ptsTxt">${fmt(G.quota)}</b></div>
    <div class="rw"><span>${t('boss.left')}</span><b>${fmt(Math.max(0, G.quota - G.total))}</b></div>
    <button class="btn primary" id="pGo">${t('boss.go')}</button></div>`);
  SFX.whistle();
  $('pGo').onclick = () => { audio(); beginMatchPlay(); };
}

/* El jefe final ofrece dos legendarios: se escoge uno */
function showLegendaryPick(ids, done) {
  panel(`<h1 class="legend">${t('legend.title')}</h1><p class="hint">${t('legend.pick')}</p>
    <div class="legendPick">${ids.map(id => `<button class="legendCard pick" data-id="${id}"><img src="${dollIcon(id, 96)}">
      <div><b class="dname">${DOLL[id].name}</b><p>${dollText(id).rule}</p>
      ${legendaryIds().includes(id) ? `<p class="hint">${t('legend.dup', { n: CFG.economy.legendaryDupPlata })}</p>` : ''}</div></button>`).join('')}</div>`);
  SFX.victory();
  document.querySelectorAll('.legendCard.pick').forEach(b => b.onclick = () => { hidePanel(); done(b.dataset.id); });
}
/* El Capitán: al empezar el partido eliges quién lleva la cinta (su efecto vale el doble) */
function showCaptainPick(done) {
  const opts = G.slots.filter(s => s.doll && s.doll.id !== 'capitan' && SC.isActive(s.doll));
  G.state = 'captain';
  panel(`<div class="bossCard"><small>${t('fx.match', { n: G.match })}</small>
    <h1 class="bossName captain">${t('captain.title')}</h1><p class="bossRule">${t('captain.pick')}</p>
    <div class="discardList">${opts.map((s, k) => `<button class="btn discard" data-k="${k}"><img class="mini" src="${dollIcon(s.doll.id, 48)}"> ${DOLL[s.doll.id].name} · ${t('rod.' + s.rod)}</button>`).join('')}
    <button class="btn discard" data-k="-1">${t('captain.none')}</button></div></div>`);
  document.querySelectorAll('.discard').forEach(b => b.onclick = () => {
    const k = +b.dataset.k;
    if (k >= 0) { opts[k].doll.captain = true; opts[k].doll.hitT = now(); SFX.whistle(); }
    hidePanel(); done();
  });
}
function showLegendary(id, outcome, inst, done) {
  const tx = dollText(id, inst);
  const head = `<h1 class="legend">${t('legend.title')}</h1>
    <div class="legendCard"><img src="${dollIcon(id, 128)}"><div><b class="dname">${DOLL[id].name}</b><p>${tx.rule}</p><p class="joke">${tx.joke}</p></div></div>`;
  if (outcome === 'capfull') {
    const spots = legendarySpots();
    panel(head + `<p class="hint">${t('legend.capfull', { n: G.legCap })}</p><div class="discardList">
      ${spots.map((sp, k) => `<button class="btn discard" data-k="${k}"><img class="mini" src="${dollIcon(sp.doll.id, 48)}"> ${DOLL[sp.doll.id].name} — ${t('legend.swap')}</button>`).join('')}
      <button class="btn discard" data-k="-1">${t('legend.reject')}</button></div>`);
    document.querySelectorAll('.discard').forEach(b => b.onclick = () => {
      const k = +b.dataset.k;
      if (k >= 0) swapLegendary(spots[k], inst);
      hidePanel(); renderSide(); done();
    });
    return;
  }
  if (outcome !== 'choose') {
    panel(head + `<p class="hint">${outcome === 'dup' ? t('legend.dup', { n: CFG.economy.legendaryDupPlata }) : t('legend.toBench')}</p>
      <button class="btn primary" id="pOk">${t('legend.ok')}</button>`);
    SFX.victory();
    $('pOk').onclick = () => { hidePanel(); done(); };
    return;
  }
  // Banca llena: elegir qué descartar (puede ser el propio legendario)
  const opts = G.bench.map((d, i) => ({ d, i })).concat([{ d: inst, i: -1 }]);
  panel(head + `<p class="hint">${t('legend.full')}</p><div class="discardList">
    ${opts.map(o => `<button class="btn discard" data-i="${o.i}"><img class="mini" src="${dollIcon(o.d.id, 48)}"> ${DOLL[o.d.id].name} — ${t('legend.discard')}</button>`).join('')}</div>`);
  document.querySelectorAll('.discard').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (i >= 0) G.bench[i] = inst;
    hidePanel(); renderSide(); done();
  });
}

/* ---------------- primer picadito guiado ----------------
   Un recorrido corto: oscurece la pantalla, ilumina lo que explica, muestra una
   mini animación y PAUSA el juego mientras está abierto. Se salta con "Saltar" o Esc. */
const TOUR = {
  aim:    [{ target:'ball', demo:'aim' }, { target:'ball', demo:'cancel' }],
  bounce: [{ target:'board', demo:'bounce' }],
  shop:   [{ target:'side', demo:'shop' }],
  table:  [{ target:'table', demo:'hit' }],
  // pasos que salen la primera vez que aparece algo nuevo
  walls2: [{ target:'shotbar', demo:'walls2' }],
  mod:    [{ target:'shotbar', demo:'mod' }],
  items:  [{ target:'side', demo:'items' }],
  legend: [{ target:'side', demo:'legend' }],
};
/* El botón "?" repite lo esencial cuando quieras */
function replayTour() {
  if (G.state !== 'aim' && G.state !== 'shop') return;
  closeTour(true);
  openTour(G.state === 'shop' ? 'shop' : 'full', G.state === 'shop' ? null : TOUR.aim.concat(TOUR.bounce, TOUR.table));
}
const TOUR_ORDER = ['aim', 'bounce', 'shop', 'table'];
function coach(step) {
  if (!step || !TOUR[step] || PROFILE.tutorialDone) return;
  PROFILE.coachSeen = PROFILE.coachSeen || {};
  if (PROFILE.coachSeen[step]) return;
  PROFILE.coachSeen[step] = true;
  if (TOUR_ORDER.every(k => PROFILE.coachSeen[k])) PROFILE.tutorialDone = true;
  saveProfile();
  openTour(step);
}
function tourTargetRect(target) {
  const cv = canvas.getBoundingClientRect(), k = cv.width / CW;
  if (target === 'shotbar') { const r = $('shotbar').getBoundingClientRect(); return { x: r.left + r.width * 0.15, y: r.top, w: r.width * 0.7, h: Math.max(40, r.height) }; }
  if (target === 'ball' && balls[0]) {
    const p = balls[0].body.position, r = 120 * k;
    return { x: cv.left + p.x * k - r, y: cv.top + p.y * k - r, w: r * 2, h: r * 2, round: true };
  }
  if (target === 'side' && isCompact()) {              // la hoja del celular: su lugar final (puede venir subiendo)
    const sd = $('side'), h = sd.offsetHeight, l = sd.offsetLeft;
    return { x: l, y: innerHeight - h, w: sd.offsetWidth, h };
  }
  const el = target === 'side' ? $('side') : target === 'board' ? $('board') : canvas;
  const r = el.getBoundingClientRect();
  if (target === 'board') { const sb = $('shotbar').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: sb.bottom - r.top }; }
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function openTour(step, customPages) {
  closeTour(true);
  const pages = customPages || TOUR[step];
  const keys = customPages ? ['aim.0', 'aim.1', 'bounce.0', 'table.0'] : pages.map((_, j) => step + '.' + j);
  let i = 0, raf = 0;
  const el = document.createElement('div'); el.id = 'tour';
  el.innerHTML = `<div class="spot"></div>
    <div class="tcard" role="dialog">
      <div class="tsign"><span class="tdots"></span><span class="tbadge">${t('tour.badge')}</span></div>
      <h3 class="ttitle"></h3>
      <canvas class="tdemo" width="520" height="280"></canvas>
      <p class="ttext"></p>
      <div class="tbtns"><button class="tskip">${t('tour.skip')}</button><button class="btn tnext"></button></div>
    </div>`;
  document.body.appendChild(el);
  G.paused = true; hideTooltip();
  const spot = el.querySelector('.spot'), card = el.querySelector('.tcard'), demo = el.querySelector('.tdemo');
  const place = () => {
    const pg = pages[i], r = tourTargetRect(pg.target), pad = 10;
    Object.assign(spot.style, { left: (r.x - pad) + 'px', top: (r.y - pad) + 'px', width: (r.w + pad * 2) + 'px', height: (r.h + pad * 2) + 'px',
      borderRadius: r.round ? '50%' : '18px' });
    const cw = card.offsetWidth, ch = card.offsetHeight, W = innerWidth, H = innerHeight, gap = 22;
    let x, y;
    if (r.x + r.w + gap + cw < W) { x = r.x + r.w + gap; y = r.y + r.h / 2 - ch / 2; }          // a la derecha
    else if (r.x - gap - cw > 0) { x = r.x - gap - cw; y = r.y + r.h / 2 - ch / 2; }             // a la izquierda
    else if (r.y + r.h + gap + ch < H) { x = r.x + r.w / 2 - cw / 2; y = r.y + r.h + gap; }      // debajo
    else { x = W / 2 - cw / 2; y = Math.max(12, r.y - gap - ch); }                                // encima
    card.style.left = clamp(x, 12, W - cw - 12) + 'px'; card.style.top = clamp(y, 12, H - ch - 12) + 'px';
  };
  const show = () => {
    const pg = pages[i], key = 'tour.' + keys[i];
    el.querySelector('.ttitle').textContent = t(key + '.title');
    el.querySelector('.ttext').innerHTML = t(key).replace(/\n/g, '<br>');
    el.querySelector('.tdots').innerHTML = pages.length > 1 ? pages.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('') : '';
    el.querySelector('.tnext').textContent = i < pages.length - 1 ? t('tour.next') : t('tour.go');
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    place();
    clearTimeout(el._pt); el._pt = setTimeout(place, 380);        // la hoja del celular tarda en subir
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const loop = () => { drawTourDemo(demo, pg.demo, performance.now() - t0); raf = requestAnimationFrame(loop); };
    loop();
  };
  const next = () => { if (i < pages.length - 1) { i++; SFX.place(); show(); } else close(); };
  const close = () => { cancelAnimationFrame(raf); closeTour(); };
  el.querySelector('.tnext').onclick = next;
  el.querySelector('.tskip').onclick = () => { PROFILE.tutorialDone = true; saveProfile(); close(); };
  el._keys = e => { if (e.key === 'Escape') el.querySelector('.tskip').click(); else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
  el._resize = () => place();
  window.addEventListener('keydown', el._keys); window.addEventListener('resize', el._resize);
  $('side').addEventListener('transitionend', el._resize);          // la hoja terminó de subir o bajar
  el.addEventListener('pointerdown', e => e.stopPropagation());
  show();
}
function closeTour(silent) {
  const el = $('tour'); if (!el) return;
  clearTimeout(el._pt);
  window.removeEventListener('keydown', el._keys); window.removeEventListener('resize', el._resize); $('side').removeEventListener('transitionend', el._resize);
  el.remove(); G.paused = false;
  if (!silent) SFX.place();
}
/* Mini animaciones del tutorial, dibujadas con el mismo arte del juego */
function drawTourDemo(cv, kind, ms) {
  const c = cv.getContext('2d'), W = 260, H = 140;
  c.setTransform(2, 0, 0, 2, 0, 0); c.clearRect(0, 0, W, H);
  pathRoundRect(c, 2, 2, W - 4, H - 4, 12); c.fillStyle = PAL.cancha; c.fill(); c.lineWidth = 4; c.strokeStyle = PAL.tinta; c.stroke();
  c.save(); pathRoundRect(c, 2, 2, W - 4, H - 4, 12); c.clip();
  c.fillStyle = 'rgba(14,77,44,0.3)'; for (let x = 0; x < W; x += 40) c.fillRect(x, 0, 20, H);
  const ball = (x, y) => { circle(c, x, y, 8); inkFill(c, '#fff', 2.5); circle(c, x, y, 2.6); c.fillStyle = PAL.tinta; c.fill(); };
  const pointer = (x, y) => { c.save(); c.translate(x, y); c.rotate(-0.4); c.scale(0.55, 0.55); hand(c, 30); c.restore(); };
  const band = (x0, y0, x1, y1) => { c.lineCap = 'round'; c.strokeStyle = PAL.tinta; c.lineWidth = 8; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.strokeStyle = PAL.crema; c.lineWidth = 4; c.stroke(); c.lineCap = 'butt'; };
  const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  if (kind === 'aim' || kind === 'cancel') {
    const T = kind === 'aim' ? 2600 : 3200, p = (ms % T) / T, bx = 130, by = 70;
    c.setLineDash([3, 4]); circle(c, bx, by, 18); c.strokeStyle = 'rgba(244,234,213,0.6)'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    if (kind === 'aim') {
      if (p < 0.45) {                                       // jalar hacia atrás
        const k = ease(p / 0.45), hx = bx + 18 * k, hy = by + 55 * k;
        for (let d = 14; d < 70; d += 9) { circle(c, bx - (hx - bx) * d / 58, by - (hy - by) * d / 58, 2); c.fillStyle = PAL.crema; c.fill(); }   // guía: sale al revés de donde jalas
        band(bx, by, hx, hy); ball(bx, by); pointer(hx + 6, hy + 4);
      } else {                                              // soltar: el balón sale
        const k = Math.min(1, (p - 0.45) / 0.4), x = bx - 34 * k, y = by - 110 * k;
        ball(x, Math.max(10, y));
        if (k > 0.55) plateText(c, t('tour.demo.go'), bx, 118, 11, PAL.crema);
      }
    } else {
      let hx, hy, label = '';
      if (p < 0.35) { const k = ease(p / 0.35); hx = bx + 20 * k; hy = by + 58 * k; }
      else if (p < 0.65) { const k = ease((p - 0.35) / 0.3); hx = bx + 20 - 14 * k; hy = by + 58 - 50 * k; }
      else { hx = bx + 6; hy = by + 8; label = t('tour.demo.cancel'); }
      const inside = Math.hypot(hx - bx, hy - by) < 18;
      if (!label) band(bx, by, hx, hy);
      circle(c, bx, by, 18); c.strokeStyle = inside ? PAL.crema : 'rgba(244,234,213,0.4)'; c.lineWidth = inside ? 3 : 1.5; c.setLineDash([3, 4]); c.stroke(); c.setLineDash([]);
      ball(bx, by); pointer(hx + 6, hy + 4);
      if (label) plateText(c, label, bx, 118, 11, PAL.crema);
    }
  } else if (kind === 'bounce') {
    const T = 3000, p = (ms % T) / T, pts = [[40, 120], [230, 60], [60, 20], [200, 10], [130, -10]];
    const seg = Math.min(pts.length - 2, Math.floor(p * 4.2)), f = (p * 4.2) - seg;
    const [x0, y0] = pts[seg], [x1, y1] = pts[seg + 1];
    ball(x0 + (x1 - x0) * Math.min(1, f), y0 + (y1 - y0) * Math.min(1, f));
    for (let j = 1; j <= seg; j++) drawPtsChip(c, '15', pts[j][0], Math.max(16, pts[j][1] + 14), 10);
    c.fillStyle = PAL.tinta; c.fillRect(95, 0, 70, 6);
    if (seg >= 3 && f > 0.5) drawMultStamp(c, '×1.5', 130, 70, 18);
  } else if (kind === 'shop') {
    const T = 2800, p = (ms % T) / T, k = ease(Math.min(1, p / 0.55));
    c.fillStyle = PAL.plata; c.fillRect(0, 88, W, 5); c.fillStyle = '#fff'; c.fillRect(0, 88, W, 1.5);
    c.setLineDash([3, 3]); circle(c, 80, 90, 14); c.strokeStyle = PAL.crema; c.lineWidth = 2; c.stroke(); c.setLineDash([]);
    const x = 215 + (80 - 215) * k, y = 40 + (90 - 40) * k;
    if (p < 0.55) { pathRoundRect(c, 185, 16, 60, 50, 8); inkFill(c, PAL.crema, 3); }
    c.save(); c.translate(x, y); c.scale(0.9, 0.9); drawFigure(c, 'muro', { tm: ms }); c.restore();
    if (p < 0.55) pointer(x + 10, y + 10);
    else plateText(c, t('fx.signed'), 80, 124, 11, PAL.crema);
  } else if (kind === 'walls2' || kind === 'mod') {
    const T = 2200, p = (ms % T) / T;
    c.fillStyle = PAL.maderaOsc; c.fillRect(0, 0, 10, H);                   // banda izquierda
    const bx = p < 0.5 ? 200 - 360 * p : 20 + 300 * (p - 0.5), by = 40 + 60 * Math.abs(Math.sin(p * Math.PI));
    ball(Math.max(20, bx), by);
    if (p > 0.48) { drawPtsChip(c, kind === 'walls2' ? '30' : '15', 60, 60, 13); if (kind === 'walls2') plateText(c, '×2', 104, 48, 10, PAL.crema); }
    if (kind === 'mod') plateText(c, t('tour.demo.mod'), 150, 118, 11, PAL.crema);
  } else if (kind === 'items') {
    const T = 2000, p = (ms % T) / T, s = 1 + 0.08 * Math.sin(p * Math.PI * 2);
    c.save(); c.translate(130, 60); c.scale(s, s); pathRoundRect(c, -70, -24, 140, 48, 12); inkFill(c, PAL.crema, 4);
    c.font = `22px system-ui`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🥟 🧨', -22, 2);
    c.font = `12px ${FONT_NUM}`; c.fillStyle = PAL.tinta; c.fillText(t('shop.pocket'), 36, 2); c.restore();
    if (p > 0.5) plateText(c, t('tour.demo.items'), 130, 118, 11, PAL.crema);
  } else if (kind === 'legend') {
    c.save(); c.translate(130, 62); c.scale(1.6, 1.6); drawFigure(c, 'cacique', { tm: ms }); c.restore();
    plateText(c, '🔒 ' + t('shop.noSellShort').replace('🔒 ', ''), 130, 118, 11, PAL.crema);
  } else if (kind === 'hit') {
    const T = 2400, p = (ms % T) / T, dx = 150, dy = 60;
    const age = p > 0.45 ? (p - 0.45) * T / 1000 : 9, kk = age < 1 ? Math.exp(-age * 9) * Math.cos(age * 42) : 0;
    c.save(); c.translate(dx, dy); c.scale(1 - 0.3 * kk, 1 + 0.2 * kk); drawFigure(c, 'cabezon', { tm: ms, flash: age < 0.4 ? 1 - age / 0.4 : 0 }); c.restore();
    const bp = p < 0.45 ? [30 + 95 * (p / 0.45), 125 - 45 * (p / 0.45)] : [125 - 60 * (p - 0.45), 80 + 50 * (p - 0.45)];
    ball(bp[0], bp[1]);
    if (p > 0.45) drawPtsChip(c, '30', dx + 44, dy - 26, 12);
  }
  c.restore();
}

/* ---------------- entrada a la Tienda de Don Chucho ----------------
   La reja metálica baja (clac), Don Chucho asoma detrás del mostrador y la reja sube
   mientras las cartas aparecen una a una, como si él las mostrara.
   · 1 s normalmente; 0,3 s después de la 5.ª visita (PROFILE.shopVisits) o con OPT.fast.
   · En el primer picadito no se puede saltar; después, un clic la salta. */
const chuchoCache = {};
function chuchoImg(w, h) { const k = w + 'x' + h; return chuchoCache[k] || (chuchoCache[k] = chuchoImage(w, h)); }
/* Qué hace Don Chucho hoy. Primero los momentos especiales (easter eggs); si no hay, una escena al azar. */
function chuchoScene() {
  const v = PROFILE.shopVisits, h = new Date().getHours();
  const bossWin = G.lastWin && EC.isBoss(G.match, CFG);
  const base = { glasses: !!G.endless, party: bossWin };
  if (v === 1) return Object.assign(base, { key:'saludo', line:'chucho.first' });
  if (!G.lastWin) return Object.assign(base, { key:'empanada', line:'chucho.lost' });
  if (bossWin) return Object.assign(base, { key:'fiesta', line:'chucho.boss' });
  if (v % 10 === 0) return Object.assign(base, { key:'globos', line:'chucho.loyal', n: v });
  if (h >= 21 || h < 6) return Object.assign(base, { key:'dormido', line:'chucho.sleep' });
  if (G.endless && !PROFILE.eggsSeen.endless) return Object.assign(base, { key:'radio', egg:'endless', line:'chucho.endless' });
  const pool = ['monedas', 'tinto', 'periodico', 'radio', 'escoba'];
  const key = pool[(v * 7 + G.match) % pool.length];
  const line = G.plata >= 20 ? 'chucho.rich' : G.plata < 4 ? 'chucho.poor' : 'chucho.' + key;
  return Object.assign(base, { key, line });
}
/* Detalles del barrio que van apareciendo con el tiempo */
function chuchoEggs() {
  return {
    fiado: PROFILE.shopVisits >= 3,                                   // letrero "FIADO NO"
    gato: PROFILE.unlocked.includes('gato'),                          // El Gato duerme en el mostrador
    record: PROFILE.bestShotEver > 0 ? PROFILE.bestShotEver : 0,      // grafiti con tu récord
    rayitas: Math.min(20, PROFILE.runs || 0),                         // una rayita por picadito
    corona: (PROFILE.wins || 0) > 0,                                  // corona pintada si ya ganaste uno
  };
}
function playShopIntro(done) {
  PROFILE.shopVisits = (PROFILE.shopVisits || 0) + 1;
  PROFILE.eggsSeen = PROFILE.eggsSeen || {};
  const scene = chuchoScene(), eggs = chuchoEggs();
  // ¿algo que el jugador nunca ha visto? Entonces se ve completo aunque ya sea cliente de la casa
  const eggKeys = ['scene:' + scene.key].concat(Object.keys(eggs).filter(k => eggs[k]).map(k => 'egg:' + k), scene.egg ? ['egg:' + scene.egg] : []);
  const fresh = eggKeys.filter(k => !PROFILE.eggsSeen[k]);
  fresh.forEach(k => { PROFILE.eggsSeen[k] = true; });
  saveProfile();
  const short = (OPT.fast || PROFILE.shopVisits > 5) && !fresh.length;
  const T = short ? 300 : 1200;
  const canSkip = (PROFILE.runs || 0) > 0;
  const el = document.createElement('div'); el.id = 'shutter';
  const cv = document.createElement('canvas'); el.appendChild(cv); document.body.appendChild(el);
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const side = $('side');
  side.style.setProperty('--T', T + 'ms');
  side.querySelectorAll(':scope > *, .card, .item').forEach((x, i) => x.style.setProperty('--i', i));
  side.classList.add('reveal');
  G.paused = true;
  SFX.reja(T * (short ? 0.4 : 0.3) / 1000);
  const dust = [], t0 = performance.now();
  let over = false, landed = false, coinSound = false;
  const ease = x => 1 - Math.pow(1 - x, 3), clamp01 = x => Math.max(0, Math.min(1, x));
  function frame() {
    if (over) return;
    const now = performance.now(), p = (now - t0) / T;
    // posición del borde inferior de la reja (0 = arriba, H = abajo)
    let edge;
    if (short) edge = p < 0.45 ? H * ease(p / 0.45) : p < 0.55 ? H : H * (1 - ease((p - 0.55) / 0.45));
    else edge = p < 0.3 ? H * ease(p / 0.3) : p < 0.8 ? H : H * (1 - ease((p - 0.8) / 0.2));
    if (!landed && edge >= H - 1) {                          // golpe contra el piso: polvo
      landed = true;
      const n = OPT.reduceFlashes ? 8 : 26;
      for (let i = 0; i < n; i++) dust.push({ x: Math.random() * W, y: H - 4, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 90, t: now });
    }
    c.clearRect(0, 0, W, H);
    drawShutter(c, W, H, edge, now, eggs, landed ? (now - t0) : 0);
    if (!short) drawCounterScene(c, W, H, clamp01((p - 0.3) / 0.14), clamp01((p - 0.84) / 0.16), scene, eggs, now - t0);
    for (const d of dust) {
      const a = (now - d.t) / 700; if (a > 1) continue;
      c.globalAlpha = 1 - a; c.fillStyle = '#D9C7A5';
      circle(c, d.x + d.vx * a, d.y + d.vy * a + 60 * a * a, 3 + 5 * a); c.fill(); c.globalAlpha = 1;
    }
    if (!coinSound && !short && scene.key === 'monedas' && p > 0.45) { coinSound = true; SFX.caja(2); }
    if (p < 1) requestAnimationFrame(frame); else finish();
  }
  const finish = () => {
    if (over) return; over = true;
    el.remove(); G.paused = false;
    setTimeout(() => side.classList.remove('reveal'), 900);
    if (done) done();
  };
  requestAnimationFrame(frame);
  setTimeout(finish, T + 400);                              // red de seguridad si la pestaña está en pausa
  if (canSkip) el.addEventListener('pointerdown', finish);
}
/* La reja enrollable: caja arriba con letrero pintado, láminas con remaches y rejillas,
   barra inferior con manija y un candado que se balancea al caer. Encima, el grafiti del barrio. */
function drawShutter(c, W, H, edge, now, eggs, sinceLand) {
  const box = 54;
  if (edge > 0) {
    c.save(); c.beginPath(); c.rect(0, 0, W, edge); c.clip();
    const slat = 26;
    for (let y = edge - slat; y > -slat; y -= slat) {
      c.fillStyle = PAL.plata; c.fillRect(0, y, W, slat);
      c.fillStyle = '#9aa3b2'; c.fillRect(0, y + slat * 0.55, W, slat * 0.3);
      c.fillStyle = '#ffffff'; c.globalAlpha = 0.55; c.fillRect(0, y + 3, W, 2); c.globalAlpha = 1;
      c.fillStyle = PAL.tinta; c.fillRect(0, y + slat - 3, W, 3);
      const row = Math.round((edge - y) / slat);
      if (row % 4 === 2) for (let x = 40; x < W; x += 90) { pathRoundRect(c, x, y + 8, 34, 7, 3); c.fillStyle = PAL.tinta; c.fill(); }   // rejillas
      for (const x of [14, W - 14]) { circle(c, x, y + slat / 2, 3); c.fillStyle = PAL.plataOsc; c.fill(); }                                // remaches
    }
    // grafiti en tiza (easter eggs que van apareciendo)
    c.save(); c.globalAlpha = 0.75; c.fillStyle = PAL.crema; c.strokeStyle = PAL.crema; c.textAlign = 'left';
    c.font = `46px ${FONT_HAND}`; c.save(); c.translate(W * 0.1, edge - H * 0.55); c.rotate(-0.08); c.fillText('GOLÍN', 0, 0); c.restore();
    if (eggs.corona) { c.save(); c.translate(W * 0.1 + 150, edge - H * 0.62); c.rotate(-0.1); c.lineWidth = 4; c.beginPath();
      c.moveTo(0, 0); c.lineTo(8, -22); c.lineTo(20, -6); c.lineTo(32, -26); c.lineTo(44, -6); c.lineTo(56, -22); c.lineTo(64, 0); c.closePath(); c.stroke(); c.restore(); }
    if (eggs.record) {
      const txt = t('chucho.record', { n: fmt(eggs.record) });
      c.font = `${W < 600 ? 24 : 28}px ${FONT_HAND}`;
      const rx = Math.max(12, Math.min(W * 0.55, W - c.measureText(txt).width - 18));      // que no se salga en el celular
      c.save(); c.translate(rx, edge - H * 0.72); c.rotate(0.05); c.fillText(txt, 0, 0); c.restore();
    }
    if (eggs.rayitas) { c.lineWidth = 3; const groups = Math.ceil(eggs.rayitas / 5), x0 = W < 600 ? 70 : Math.min(W * 0.62, W - 50 - (groups - 1) * 56), y0 = edge - H * (W < 600 ? 0.8 : 0.52);   // celular: arriba a la izquierda, libre
      for (let i = 0; i < eggs.rayitas; i++) { const gx = x0 + (i % 5) * 9 + Math.floor(i / 5) * 56, gy = y0;
      c.beginPath(); if (i % 5 === 4) { c.moveTo(gx - 40, gy - 4); c.lineTo(gx + 2, gy - 26); } else { c.moveTo(gx - 32 + (i % 5) * 0, gy); c.lineTo(gx - 32, gy - 30); } c.stroke(); } }
    c.restore();
    // barra inferior con manija
    pathRoundRect(c, 0, edge - 18, W, 18, 2); inkFill(c, PAL.plataOsc, 4);
    pathRoundRect(c, W / 2 - 60, edge - 14, 120, 10, 5); inkFill(c, PAL.tinta, 2);
    c.restore();
    // candado que se balancea desde que tocó el piso
    const swing = sinceLand ? Math.sin(sinceLand / 70) * Math.exp(-sinceLand / 400) * 0.6 : 0.3;
    c.save(); c.translate(W / 2 + 90, edge - 6); c.rotate(swing);
    c.beginPath(); c.arc(0, 8, 9, Math.PI, 0); c.lineWidth = 5; c.strokeStyle = PAL.plataOsc; c.stroke();
    pathRoundRect(c, -13, 8, 26, 22, 5); inkFill(c, PAL.madera, 3); circle(c, 0, 18, 3); c.fillStyle = PAL.tinta; c.fill();
    c.restore();
  }
  // caja del enrollable con letrero pintado (siempre arriba)
  c.fillStyle = PAL.maderaOsc; c.fillRect(0, 0, W, box); c.fillStyle = PAL.madera; c.fillRect(0, 0, W, box - 10);
  c.fillStyle = PAL.tinta; c.fillRect(0, box - 4, W, 4);
  c.save(); c.translate(W / 2, box / 2 - 3); c.rotate(-0.01);
  plateText(c, t('shop.title'), 0, 0, 18, PAL.crema);
  c.restore();
}
/* El mostrador sube, Don Chucho aparece haciendo lo suyo y dice su frase. inP/outP: 0..1 de entrada/salida */
function drawCounterScene(c, W, H, inP, outP, scene, eggs, ms) {
  if (inP <= 0) return;
  const counterH = Math.min(150, H * 0.2), rise = (1 - (1 - inP) * (1 - inP)) * (1 - outP);
  const cy = H - counterH * rise;
  // Don Chucho detrás del mostrador
  const narrow = W < 600;                                             // celular vertical
  const cw = Math.min(300, W * (narrow ? 0.44 : 0.26)), ch = cw * 280 / 240, cx = W * (narrow ? 0.55 : 0.72) - cw / 2;
  const pop = Math.min(1, inP * 1.4), over = pop < 1 ? 0 : Math.sin(Math.min(1, (ms - 500) / 250) * Math.PI) * 6;
  const chY = cy - ch * 0.84 * pop + over + (1 - rise) * ch;          // hombros justo sobre el mostrador
  // globos detrás (cada 10 visitas)
  if (scene.key === 'globos') for (let i = 0; i < 3; i++) {
    const bx = cx + cw * (0.1 + i * 0.4), by = chY - 30 - i * 18 + Math.sin(ms / 300 + i) * 6;
    c.beginPath(); c.moveTo(bx, by + 34); c.lineTo(bx + 6, by + 120); c.lineWidth = 2; c.strokeStyle = PAL.tinta; c.stroke();
    c.beginPath(); c.ellipse(bx, by, 26, 32, 0, 0, Math.PI * 2); inkFill(c, [PAL.crema, PAL.madera, PAL.cancha][i], 4);
  }
  const pose = { eyes: 'wink', party: scene.party, glasses: scene.glasses, bob: Math.sin(ms / 160) * 2 };
  const tt = ms;
  switch (scene.key) {
    case 'saludo': pose.arm = { a: -2.4 + Math.sin(ms / 110) * 0.35, prop: 'wave' }; pose.eyes = 'open'; break;
    case 'monedas': pose.arm = { a: -1.75, prop: 'coin', t: tt }; break;
    case 'tinto': pose.arm = { a: 2.25 + Math.sin(ms / 400) * 0.08, prop: 'cup', t: tt }; pose.eyes = ms < 700 ? 'closed' : 'wink'; break;
    case 'periodico': pose.paper = Math.min(1, ms / 900); pose.headline = scene.headline || headline(); break;
    case 'radio': pose.arm = { a: 0.2 }; pose.bob = Math.sin(ms / 110) * 5; pose.eyes = 'closed'; break;
    case 'escoba': pose.arm = { a: -2.0 + Math.sin(ms / 140) * 0.22, prop: 'broom' }; break;
    case 'dormido': pose.eyes = ms < 750 ? 'closed' : 'wide'; pose.bob = ms < 750 ? Math.sin(ms / 400) * 3 : -10; pose.arm = { a: 0.2 }; break;
    case 'empanada': pose.arm = { a: -1.85, prop: 'empanada' }; pose.eyes = 'open'; break;
    case 'fiesta': pose.arm = { a: -2.5 + Math.sin(ms / 90) * 0.3, prop: 'wave' }; pose.eyes = 'open'; break;
    case 'globos': pose.arm = { a: -2.3, prop: 'wave' }; break;
    default: pose.arm = { a: 0.25 };
  }
  c.save(); c.translate(cx, chY); drawChucho(c, cw, ch, pose); c.restore();
  // "Zzz" o notas musicales flotando
  if (scene.key === 'dormido' && ms < 750) { c.fillStyle = PAL.crema; c.font = `28px ${FONT_NUM}`; for (let i = 0; i < 3; i++) c.fillText('z', cx + cw * 0.8 + i * 18, chY + 30 - i * 22 - (ms / 40) % 20); }
  if (scene.key === 'radio') { c.fillStyle = PAL.crema; c.font = `30px system-ui`; for (let i = 0; i < 3; i++) { const k = ((ms / 900) + i / 3) % 1; c.globalAlpha = 1 - k; c.fillText('♪', cx - 30 + i * 28, cy - 40 - k * 90); } c.globalAlpha = 1; }
  if (scene.key === 'fiesta') for (let i = 0; i < 24; i++) {
    const k = ((ms / 1400) + i / 24) % 1; c.fillStyle = [PAL.crema, PAL.madera, '#E9A15B', PAL.cancha][i % 4];
    c.fillRect(cx - 80 + (i * 53) % (cw + 160), chY - 40 + k * (H - chY), 7, 11);
  }
  // mostrador de madera
  c.fillStyle = PAL.maderaOsc; c.fillRect(0, cy, W, H - cy);
  c.fillStyle = PAL.madera; c.fillRect(0, cy + 12, W, H - cy);
  c.fillStyle = 'rgba(122,68,32,0.5)'; for (let y = cy + 30; y < H; y += 24) c.fillRect(0, y, W, 2);
  c.fillStyle = PAL.tinta; c.fillRect(0, cy, W, 6);
  // objetos sobre el mostrador: tarro de la plata, radio, letrero FIADO NO, El Gato
  const jarX = narrow ? 16 : W * 0.52, radioX = narrow ? 12 : W * 0.42;
  if (!(narrow && scene.key === 'radio')) {           // en el celular la radio ocupa el puesto del tarro
    pathRoundRect(c, jarX, cy - 46, 44, 46, 6); inkFill(c, PAL.plata, 4);
    c.fillStyle = PAL.tinta; c.font = `16px ${FONT_NUM}`; c.textAlign = 'center'; c.fillText('$', jarX + 22, cy - 18);
  }
  if (scene.key === 'radio') { pathRoundRect(c, radioX, cy - 52, 80, 52, 8); inkFill(c, PAL.maderaOsc, 4); circle(c, radioX + 24, cy - 26, 14); inkFill(c, PAL.crema, 3); for (let i = 0; i < 3; i++) { c.fillStyle = PAL.tinta; c.fillRect(radioX + 46, cy - 40 + i * 9, 26, 4); } }
  if (eggs.fiado) {
    c.save(); c.translate(Math.max(62, W * 0.12), cy - (narrow ? 80 : 64)); c.rotate(-0.06 + Math.sin(ms / 500) * 0.03);   // a la izquierda: no tapa sus manos
    c.beginPath(); c.moveTo(-30, -26); c.lineTo(0, -48); c.lineTo(30, -26); c.lineWidth = 2; c.strokeStyle = PAL.tinta; c.stroke();
    pathRoundRect(c, -52, -26, 104, 44, 5); inkFill(c, PAL.crema, 4);
    c.fillStyle = PAL.tinta; c.font = `18px ${FONT_HAND}`; c.textAlign = 'center'; c.fillText(t('chucho.fiado'), 0, 4); c.restore();
  }
  if (eggs.gato) {
    const gx = narrow ? 100 : W * 0.58, gy = cy;
    c.save(); c.translate(gx, gy);
    c.beginPath(); c.ellipse(0, -18, 30, 20, 0, 0, Math.PI * 2); inkFill(c, PAL.tinta, 3);             // cuerpo dormido
    circle(c, 24, -28, 14); inkFill(c, PAL.tinta, 3);                                                // cabeza
    for (const ex of [16, 32]) { c.beginPath(); c.moveTo(ex - 6, -38); c.lineTo(ex, -50); c.lineTo(ex + 5, -38); c.closePath(); inkFill(c, PAL.tinta, 2); }
    c.beginPath(); c.moveTo(-28, -12); c.quadraticCurveTo(-50, -6 + Math.sin(ms / 250) * 6, -40, -30); c.lineWidth = 6; c.strokeStyle = PAL.tinta; c.stroke();
    c.restore();
  }
  // globo de diálogo
  if (inP >= 1 && outP <= 0 && scene.line && narrow) {          // celular: globo encima de Don Chucho, en varias líneas
    const text = t(scene.line, { n: scene.n || PROFILE.shopVisits });
    c.font = `600 16px ${FONT_TXT}`;
    const maxW = W - 24 - 28, lines = [];
    for (const word of text.split(' ')) {
      const cur = lines.length ? lines[lines.length - 1] : null;
      if (cur !== null && c.measureText(cur + ' ' + word).width <= maxW) lines[lines.length - 1] = cur + ' ' + word; else lines.push(word);
    }
    const lw = Math.max(...lines.map(l => c.measureText(l).width)), tw = Math.min(W - 24, lw + 28), bh = lines.length * 20 + 20;
    const tipX = cx + cw * 0.45, bx = clamp(tipX - tw / 2, 12, W - 12 - tw), by = Math.max(64, chY - bh - 24);
    pathRoundRect(c, bx, by, tw, bh, 14); inkFill(c, PAL.crema, 4);
    c.beginPath(); c.moveTo(tipX - 12, by + bh - 4); c.lineTo(tipX, by + bh + 16); c.lineTo(tipX + 12, by + bh - 4); c.closePath(); c.fillStyle = PAL.crema; c.fill();
    c.beginPath(); c.moveTo(tipX - 12, by + bh - 1); c.lineTo(tipX, by + bh + 16); c.lineTo(tipX + 12, by + bh - 1); c.lineWidth = 4; c.strokeStyle = PAL.tinta; c.stroke();
    c.fillStyle = PAL.tinta; c.textAlign = 'center'; c.textBaseline = 'middle';
    lines.forEach((l, i) => c.fillText(l, bx + tw / 2, by + 20 + i * 20));
  } else if (inP >= 1 && outP <= 0 && scene.line) {
    const text = t(scene.line, { n: scene.n || PROFILE.shopVisits });
    c.font = `600 17px ${FONT_TXT}`;
    const tw = Math.min(360, c.measureText(text).width + 32), bx = Math.max(12, cx - tw - 10), by = chY + 20;
    pathRoundRect(c, bx, by, tw, 50, 14); inkFill(c, PAL.crema, 4);
    c.beginPath(); c.moveTo(bx + tw - 6, by + 18); c.lineTo(bx + tw + 22, by + 30); c.lineTo(bx + tw - 6, by + 36); c.closePath(); c.fillStyle = PAL.crema; c.fill();
    c.beginPath(); c.moveTo(bx + tw - 2, by + 18); c.lineTo(bx + tw + 22, by + 30); c.lineTo(bx + tw - 2, by + 36); c.lineWidth = 4; c.strokeStyle = PAL.tinta; c.stroke();
    c.fillStyle = PAL.tinta; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(text, bx + 16, by + 26, tw - 28);
  }
}
/* Titular del periódico del barrio: habla de lo que te está pasando */
function headline() {
  if (G.bestShot >= 5000) return t('chucho.news.big');
  if (G.won >= 3) return t('chucho.news.streak', { n: G.won });
  return t('chucho.news.default');
}

/* ---------------- tienda de Don Chucho + banca ---------------- */
function shopToast(msg) {
  const el = $('shopToast');
  if (el) { el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  if (isCompact() && !document.body.classList.contains('sheet-open')) floatToast(msg);   // la hoja está cerrada: aviso flotante
}
function floatToast(msg) {
  let el = $('mToast');
  if (!el) { el = document.createElement('div'); el.id = 'mToast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function rarityClass(id) { return 'r-' + DOLL[id].rarity; }
function benchHTML() {
  return `<h3>${t('shop.bench')}</h3><div class="bench">${G.bench.map((d, i) => d ? `
    <div class="bslot full ${rarityClass(d.id)}" data-b="${i}" title="${DOLL[d.id].name}">
      <img src="${dollIcon(d.id, 72)}" data-b="${i}" draggable="false"><span class="bname">${DOLL[d.id].name}</span>
      ${G.state === 'shop' && EC.canSell(d) ? `<span class="bacts"><button class="mini-btn sell" data-b="${i}">${t('shop.sellFor', { n: EC.sellValue(d) })}</button><button class="mini-btn disc" data-b="${i}">${t('shop.discard')}</button></span>` : G.state === 'shop' ? `<span class="bacts locked">${t('shop.noSellShort')}</span>` : ''}
    </div>` : `<div class="bslot" data-b="${i}"><span class="bname">${t('shop.benchEmpty')}</span></div>`).join('')}</div>`;
}
function bindBench() {
  document.querySelectorAll('.bslot').forEach(el => {
    const i = +el.dataset.b, inSheet = !!el.closest('#side');
    el.addEventListener('pointerdown', e => {
      if (G.state !== 'shop' || e.target.closest('.mini-btn')) return;
      if (inSheet && isCompact()) return;                   // en la hoja del celular se toca (y se desliza para ver más)
      if (G.bench[i]) { e.preventDefault(); startDrag({ kind:'bench', bench:i }, e); }
      else if (G.selectedOffer !== null) buy(G.selectedOffer, { bench:i });
      else if (G.pick) placePick({ bench:i });
    });
    if (inSheet) el.addEventListener('click', e => {
      if (!isCompact() || G.state !== 'shop' || e.target.closest('.mini-btn')) return;
      if (G.bench[i]) tapShop({ kind:'bench', bench:i });
      else if (G.selectedOffer !== null) buy(G.selectedOffer, { bench:i });
      else if (G.pick) placePick({ bench:i });
    });
  });
  document.querySelectorAll('.mini-btn.sell').forEach(b => b.onclick = () => sellBench(+b.dataset.b));
  document.querySelectorAll('.mini-btn.disc').forEach(b => b.onclick = () => discardBench(+b.dataset.b));
}
function cardHTML(o, i) {
  if (!o) return `<div class="card sold">${t('shop.sold')}</div>`;
  const d = DOLL[o], tx = dollText(o), price = EC.priceOf(o, CFG, LM), isNew = PROFILE.seen && !PROFILE.seen[o];
  return `<div class="card ${rarityClass(o)} ${G.plata < price ? 'cant' : ''} ${G.selectedOffer === i ? 'sel' : ''}" data-i="${i}">
    <img class="portrait" src="${dollIcon(o, 96)}" draggable="false">
    <div class="cbody"><div class="fm">${t('rarity.' + d.rarity)} · ${t('family.' + d.family)}</div>
      <div class="nm">${d.name}</div><div class="ds">${tx.rule}</div><div class="joke">${tx.joke}</div>
      <button class="mini-btn tobench" data-i="${i}">${t('shop.toBench')}</button></div>
    <div class="price">$${price}</div>${isNew && !PR.STARTERS.includes(o) ? `<span class="newTag">${t('shop.new')}</span>` : ''}</div>`;
}
function itemsHTML() {
  if (!G.shopItems.length) return '';
  return `<h3>${t('shop.counter')}</h3><div class="counter">${G.shopItems.map((id, i) => id ? `
    <button class="item ${G.plata < EC.itemPrice(id, CFG, LM) ? 'cant' : ''} w-${GOLIN.ITEM[id].when}" data-it="${i}">
      <span class="iicon">${GOLIN.ITEM[id].icon}</span><span class="iname">${t('item.' + id + '.name')}</span>
      <span class="iwhen">${t('item.when.' + GOLIN.ITEM[id].when)}</span>
      <span class="irule">${t('item.' + id + '.rule')}</span><span class="iprice">$${EC.itemPrice(id, CFG, LM)}</span></button>` :
    `<div class="item sold">${t('shop.sold')}</div>`).join('')}</div>
    <div class="pocketRow">${t('shop.pocket')}: ${G.pocket.length ? G.pocket.map(id => GOLIN.ITEM[id].icon + ' ' + t('item.' + id + '.name')).join(' · ') : t('shop.benchEmpty')} (${G.pocket.length}/${CFG.economy.pocketSize})</div>`;
}
/* Lo que pide el próximo partido con el marcador acumulado */
function nextMatchInfo() {
  const m = nextMatchNumber();
  const meta = (G.lastWin ? G.quota : G.metaBase) + EC.quotaFor(m, CFG, LM);
  const start = G.lastWin ? G.total : G.matchStart;
  return t('shop.nextInfo', { m, q: fmt(meta), f: fmt(Math.max(0, meta - start)), s: shotsPerMatch() });
}
/* ---------------- celular: hoja que sube desde abajo y barra de abajo ---------------- */
function openSheet() { if (!isCompact()) return; document.body.classList.add('sheet-open'); hideTooltip(); }
function closeSheet() { document.body.classList.remove('sheet-open'); }
function toggleSheet() { if (document.body.classList.contains('sheet-open')) closeSheet(); else openSheet(); }
$('sheetBack').addEventListener('click', closeSheet);
/* Qué muñeco está escogido para "tocar y colocar" */
function pickedId() {
  if (G.state !== 'shop') return null;
  if (G.selectedOffer !== null) return G.offers[G.selectedOffer] || null;
  if (!G.pick) return null;
  const d = G.pick.kind === 'bench' ? G.bench[G.pick.bench] : G.pick.from.doll;
  return d ? d.id : null;
}
function renderDock() {
  const el = $('dock'); if (!el) return;
  if (G.state === 'shop') {
    const sel = pickedId();
    const bench = `<div class="dockBench"><span class="lbl">${t('dock.bench')}</span>${G.bench.map((d, i) => d
      ? `<div class="bslot full dockB ${rarityClass(d.id)} ${G.pick && G.pick.kind === 'bench' && G.pick.bench === i ? 'picked' : ''}" data-b="${i}"><img src="${dollIcon(d.id, 72)}" data-b="${i}" draggable="false" alt="${DOLL[d.id].name}"></div>`
      : `<div class="bslot dockB" data-b="${i}"></div>`).join('')}</div>`;
    el.innerHTML = sel
      ? `<div class="dockMsg"><img src="${dollIcon(sel, 72)}" alt=""><span>${t('dock.place', { n: DOLL[sel].name })}</span></div>${bench}<button class="btn" id="dkCancel" aria-label="${t('dock.cancel')}">✕</button>`
      : `${bench}<button class="btn grow" id="dkSheet">${t('dock.shop')}</button><button class="btn go" id="dkGo">${t('dock.go')}</button>`;
    if ($('dkCancel')) $('dkCancel').onclick = clearPick;
    if ($('dkGo')) $('dkGo').onclick = () => { closeSheet(); startNextMatch(); };
  } else el.innerHTML = `<button class="btn grow" id="dkSheet">${t('dock.team')}</button>`;
  if ($('dkSheet')) $('dkSheet').onclick = () => { audio(); toggleSheet(); };
}
/* Textos que dependen de si la pantalla es táctil */
function refreshTexts() { $('tSkip').textContent = t('tally.skip'); renderSide(); if (G.state !== 'scoring') updateShotbar(); }
function renderSide() {
  const side = $('side');
  // lo escogido para "tocar y colocar" debe seguir existiendo
  if (G.state !== 'shop') { G.pick = null; }
  else if (G.pick && !(G.pick.kind === 'bench' ? G.bench[G.pick.bench] : G.pick.from.doll)) G.pick = null;
  const grip = `<button class="sheetGrip" id="sheetGrip">${G.state === 'shop' ? t('dock.table') : t('dock.close')}</button>`;
  if (G.state === 'shop') {
    side.className = 'shop';
    side.innerHTML = grip + `<div class="signRow"><img class="chuchoMini" src="${chuchoImg(120, 140)}" alt="Don Chucho"><div class="sign"><span>${t('shop.title')}</span></div></div>
      <p class="tendero">${t('shop.welcome')}</p>
      <div class="plataBig"><span class="coin">$</span> <span class="num">${G.plata}</span></div>
      <p class="hint">${t('shop.legCap', { n: legendaryIds().length, m: G.legCap })}</p>
      <div id="shopToast" class="toast"></div>
      <div class="vitrina">${G.offers.map(cardHTML).join('')}</div>
      <div class="btns">
        <button class="btn" id="bReroll">${t('shop.reroll', { n: '$' + EC.rerollCost(G.rerollN, CFG) })}</button>
        <button class="btn ${G.sellMode ? 'on' : ''}" id="bSell">${G.sellMode ? t('shop.selling') : t('shop.sell')}</button>
      </div>
      ${itemsHTML()}
      ${benchHTML()}
      <button class="btn primary" id="bNext">${t('shop.next')}</button>
      <p class="hint">${nextMatchInfo()}</p>
      <p class="hint">${t('shop.hint').replace(/\n/g, '<br>')}</p>`;
    side.querySelectorAll('.card[data-i]').forEach(c => {
      c.addEventListener('pointerdown', e => {
        if (e.target.closest('.tobench') || isCompact()) return;          // celular: se toca la carta (la hoja se puede deslizar)
        e.preventDefault(); startDrag({ kind:'buy', idx:+c.dataset.i }, e);
      });
      c.addEventListener('click', e => { if (isCompact() && !e.target.closest('.tobench')) tapShop({ kind:'buy', idx:+c.dataset.i }); });
    });
    side.querySelectorAll('.tobench').forEach(b => b.onclick = e => { e.stopPropagation(); buyToBench(+b.dataset.i); });
    side.querySelectorAll('.item[data-it]').forEach(b => b.onclick = () => buyItem(+b.dataset.it));
    for (const o of G.offers) if (o) PROFILE.seen[o] = true;
    saveProfile();
    renderDock(); bindBench();
    $('bReroll').onclick = () => { audio(); rerollShop(); };
    $('bSell').onclick = () => { G.sellMode = !G.sellMode; renderSide(); };
    $('bNext').onclick = startNextMatch;
  } else {
    side.className = '';
    side.innerHTML = grip + `<h2>${t('help.title')}</h2><ul class="help">
      <li>${t('help.1')}</li><li>${t('help.2', { goal:CFG.scoring.goalBonus, nogoal:CFG.scoring.noGoalFactor })}</li>
      <li>${t('help.3', { s:shotsPerMatch(), wall:CFG.scoring.wallPts })}</li><li>${t('help.5')}</li><li>${t('help.4')}</li></ul>
      ${benchHTML()}
      <h3>${t('shop.table')}</h3>${tableListHTML()}
      ${albumHTML()}`;
    renderDock(); bindBench();
  }
  $('sheetGrip').onclick = closeSheet;
}
/* Álbum: todos los muñecos; los bloqueados muestran su reto */
function albumHTML() {
  const n = PROFILE.unlocked.length, shopN = GOLIN.ROSTER.filter(d => d.shop).length;
  return `<details class="album"><summary><h3>${t('album.title', { n: Math.min(n, shopN), m: shopN })}</h3></summary>
    ${GOLIN.ROSTER.filter(d => d.shop).map(d => {
      const open = PROFILE.unlocked.includes(d.id);
      return `<div class="cat ${open ? '' : 'locked'}"><img class="mini" src="${dollIcon(d.id, 48)}"><div><b>${d.name}</b> · ${t('rarity.' + d.rarity)}<br>
        ${open ? dollText(d.id).rule : '🔒 ' + t('unlock.' + d.id)}</div></div>`;
    }).join('')}
    <p class="hint">${t('album.legend')}</p></details>`;
}
function tableListHTML() {
  const ds = G.slots.filter(s => s.doll);
  if (!ds.length) return `<p class="hint">${t('shop.tableEmpty')}</p>`;
  return ds.map(s => {
    const d = s.doll, tx = dollText(d.id, d), pw = powerOf(s);
    return `<div class="cat ${d.expelled ? 'off' : ''}"><img class="mini" src="${dollIcon(d.id, 48)}"><div><b>${DOLL[d.id].name}</b> · ${t('rod.' + s.rod)}
      ${pw > 1 ? `<span class="key">🔑×${pw}</span>` : ''}${d.expelled ? ` <span class="red">🟥 ${t('fx.expelled')}</span>` : ''}<br>${tx.rule}</div></div>`;
  }).join('');
}

function showTooltip(slot, cx, cy, centered) {
  const d = slot.doll, tt = $('tooltip'), tx = dollText(d.id, d), pw = powerOf(slot);
  tt.innerHTML = `<b class="dname">${DOLL[d.id].name}</b> <span class="tmeta">${t('rarity.' + DOLL[d.id].rarity)} · ${t('rod.' + slot.rod)}</span>
    <div>${tx.rule}</div><div class="joke">${tx.joke}</div>
    ${pw > 1 ? `<div class="key">🔑 ×${pw}</div>` : ''}
    ${d.expelled ? `<div class="red">🟥 ${t('fx.expelled')}</div>` : ''}
    ${G.state === 'shop' ? `<div class="plataTxt">${EC.canSell(d) ? t('shop.sellFor', { n: EC.sellValue(d) }) : t('shop.noSellShort')}</div>` : ''}`;
  tt.classList.remove('hidden');
  const w = tt.offsetWidth, h = tt.offsetHeight, W = innerWidth, H = innerHeight;
  let x = centered ? cx - w / 2 : cx + 16, y = centered ? cy - h - 14 : cy + 12;
  if (!centered && y + h > H - 8) y = cy - h - 12;
  if (centered && y < 8) y = cy + 40;
  tt.style.left = clamp(x, 8, Math.max(8, W - w - 8)) + 'px'; tt.style.top = clamp(y, 8, Math.max(8, H - h - 8)) + 'px';
}
/* Tooltip de un muñeco de la mesa sin ratón (al tocarlo): encima del muñeco y se va solo */
let tipTimer = 0;
function showTooltipAt(slot, ms) {
  if (!slot || !slot.doll) return;
  const r = canvas.getBoundingClientRect(), k = r.width / CW;
  showTooltip(slot, r.left + slot.x * k, r.top + (slot.y - 24) * k, true);
  clearTimeout(tipTimer); if (ms) tipTimer = setTimeout(hideTooltip, ms);
}
function hideTooltip() { clearTimeout(tipTimer); $('tooltip').classList.add('hidden'); }
window.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') hideTooltip(); }, true);

/* ---------------- opciones (fase 7) ---------------- */
function applyOptions() {
  document.body.classList.toggle('cb', !!OPT.colorblind);
  document.documentElement.style.setProperty('--ts', OPT.textScale);
  tableDirty = true;
  if (typeof setVolumes === 'function') setVolumes();
}
/* Menú de opciones del jugador (manual §Accesibilidad) */
function openOptions() {
  audio();
  if ($('options')) return;
  const el = document.createElement('div'); el.id = 'options';
  const range = (k, label, min, max, step) => `<label>${t(label)} <input type="range" min="${min}" max="${max}" step="${step}" value="${Number(OPT[k]) || 0}" data-k="${k}"><span class="num" id="ov_${k}">${Math.round(OPT[k] * 100)}%</span></label>`;
  const check = (k, label) => `<label>${t(label)} <input type="checkbox" ${OPT[k] ? 'checked' : ''} data-k="${k}"></label>`;
  el.innerHTML = `<div class="box"><h2>${t('opt.title')}</h2>
    ${range('shake', 'opt.shake', 0, 1, 0.05)}
    ${check('reduceFlashes', 'opt.flashes')}
    ${check('fast', 'opt.fast')}
    ${check('colorblind', 'opt.colorblind')}
    ${range('master', 'opt.master', 0, 1, 0.05)}
    ${range('music', 'opt.music', 0, 1, 0.05)}
    ${range('sfx', 'opt.sfx', 0, 1, 0.05)}
    ${range('textScale', 'opt.text', 0.85, 1.35, 0.05)}
    <button class="btn wide" id="optTut">${t('opt.tutorial')}</button>
    ${canFullscreen() ? `<button class="btn wide" id="optFs">${t('opt.fullscreen')}</button>` : ''}
    <button class="btn wide" id="optDbg">${t('opt.debug')}</button>
    <button class="btn primary" id="optClose">${t('opt.close')}</button></div>`;
  document.body.appendChild(el);
  el.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    const k = inp.dataset.k;
    OPT[k] = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value);
    const v = $('ov_' + k); if (v) v.textContent = Math.round(OPT[k] * 100) + '%';
    saveOptions(); applyOptions(); fitCanvas();
  }));
  const close = () => { el.remove(); for (const k in iconCache) delete iconCache[k]; renderSide(); };
  $('optClose').onclick = close;
  if ($('optFs')) $('optFs').onclick = () => { toggleFullscreen(); close(); };
  $('optDbg').onclick = () => { close(); toggleDebug(); };
  $('optTut').onclick = () => { PROFILE.tutorialDone = false; PROFILE.coachSeen = {}; saveProfile(); close(); coach(G.state === 'shop' ? 'shop' : 'aim'); };
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
}

/* Pantalla completa (Android y tabletas; el iPhone no la permite en páginas web) */
function canFullscreen() { return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled); }
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const req = el.requestFullscreen || el.webkitRequestFullscreen; const r = req && req.call(el, { navigationUI:'hide' }); if (r && r.catch) r.catch(() => {}); }
  } catch (e) {}
}

/* ---------------- debug (tecla D) ----------------
   Todos los parámetros de GOLIN.CFG, generados desde el propio objeto, más acciones de prueba. */
function buildDebug() {
  const el = $('debug');
  const input = (v, p) => typeof v === 'boolean'
    ? `<input type="checkbox" ${v ? 'checked' : ''} data-p="${p}">`
    : `<input type="number" step="any" value="${v}" data-p="${p}">`;
  const rows = (obj, path) => Object.keys(obj).map(k => {
    const v = obj[k], p = path + '.' + k;
    if (v && typeof v === 'object') return `<h4>${k}</h4>` + rows(v, p);
    return `<div class="row"><span>${k}</span>${input(v, p)}</div>`;
  }).join('');
  let html = `<div class="dbgHead"><b>⚙ DEBUG</b><span class="dKey">D para ocultar</span><button class="dbtn" id="dClose">✕ Cerrar</button></div>
    <h4>ACCIONES</h4>
    <div class="row"><select id="dDoll">${GOLIN.ROSTER.map(d => `<option value="${d.id}">${d.name} (${t('rarity.' + d.rarity)})</option>`).join('')}</select>
      <button class="dbtn" id="dGive">A la banca</button></div>
    <div class="row"><span>Ir al partido</span><span><input type="number" id="dJump" value="${G.match}" min="1" class="dJump"> <button class="dbtn" id="dGo">Ir</button></span></div>
    <div class="row"><span>Forzar jefe</span><select id="dBoss"><option value="">(según partido)</option>${EC.BOSSES.map(b => `<option value="${b}" ${G.forceBoss === b ? 'selected' : ''}>${t('boss.' + b + '.name')}</option>`).join('')}</select></div>
    <button class="dbtn" id="dPlata">+10 plata</button><button class="dbtn" id="dWin">Ganar partido</button><button class="dbtn" id="dLose">Perder partido</button>
    <button class="dbtn" id="dRun">Reiniciar picadito</button><button class="dbtn" id="dReset">Valores por defecto</button>
    <button class="dbtn" id="dExport">Exportar JSON</button><button class="dbtn" id="dImport">Importar JSON</button>
    <textarea id="dJson" placeholder="Pega aquí un JSON de configuración y pulsa Importar"></textarea>
    <h4>PROGRESO</h4>
    <div class="row"><span>Cancha del próximo picadito</span><select id="dLevel">${PR.LEVELS.map(L => `<option value="${L.id}" ${L.id === PROFILE.lastLevel ? 'selected' : ''}>${L.id}. ${t('level.' + L.id + '.name')}</option>`).join('')}</select></div>
    <button class="dbtn" id="dUnlock">Desbloquear todo</button><button class="dbtn" id="dProg">Reiniciar progreso</button>
    <div class="row"><select id="dItem">${GOLIN.ITEMS.map(i => `<option value="${i.id}">${i.icon} ${t('item.' + i.id + '.name')}</option>`).join('')}</select><button class="dbtn" id="dGiveItem">Al bolsillo</button></div>
    <h4>REGISTRO DE PARTIDAS</h4>
    <pre id="dLog"></pre>
    <button class="dbtn" id="dLogDl">Descargar registro (.json)</button><button class="dbtn" id="dLogClr">Borrar registro</button>`;
  for (const sec of Object.keys(CFG)) {
    if (sec === 'dolls') {
      html += `<details><summary><b>MUÑECOS</b></summary>` + GOLIN.ROSTER.map(d =>
        `<details class="sub"><summary>${d.name}</summary>${rows(CFG.dolls[d.id], 'dolls.' + d.id)}</details>`).join('') + `</details>`;
    } else html += `<details ${sec === 'physics' || sec === 'juice' ? 'open' : ''}><summary><b>${sec.toUpperCase()}</b></summary>${rows(CFG[sec], sec)}</details>`;
  }
  el.innerHTML = html;
  el.querySelectorAll('input[data-p]').forEach(inp => inp.addEventListener('input', () => {
    const v = inp.type === 'checkbox' ? inp.checked : parseFloat(inp.value);
    if (typeof v === 'number' && isNaN(v)) return;
    GOLIN.config.setPath(inp.dataset.p, v);
    onConfigChanged(inp.dataset.p);
  }));
  $('dClose').onclick = toggleDebug;
  $('dLog').textContent = LOG.summary();                    // texto plano: el registro viene de localStorage
  $('dGive').onclick = () => { if (!__game.give($('dDoll').value)) shopToast(t('shop.benchFull')); };
  $('dGo').onclick = () => __game.jump(Math.max(1, parseInt($('dJump').value, 10) || 1));
  $('dBoss').onchange = () => { G.forceBoss = $('dBoss').value || null; };
  $('dPlata').onclick = () => { G.plata += 10; updateBoard(); if (G.state === 'shop') renderSide(); };
  $('dWin').onclick = () => __game.win();
  $('dLose').onclick = () => __game.lose();
  $('dRun').onclick = () => resetRun();
  $('dReset').onclick = () => { GOLIN.config.reset(); buildDebug(); onConfigChanged(''); };
  $('dLevel').onchange = () => { PROFILE.lastLevel = Math.min(+$('dLevel').value, Math.max(PROFILE.maxLevel, +$('dLevel').value)); PROFILE.maxLevel = Math.max(PROFILE.maxLevel, PROFILE.lastLevel); saveProfile(); };
  $('dUnlock').onclick = () => { __game.unlockAll(); buildDebug(); };
  $('dProg').onclick = () => { __game.resetProgress(); buildDebug(); };
  $('dGiveItem').onclick = () => __game.item($('dItem').value);
  $('dLogDl').onclick = () => LOG.download();
  $('dLogClr').onclick = () => { LOG.clear(); $('dLog').textContent = LOG.summary(); };
  $('dExport').onclick = () => { $('dJson').value = GOLIN.config.exportJSON(); $('dJson').select(); };
  $('dImport').onclick = () => {
    try { GOLIN.config.importJSON($('dJson').value); buildDebug(); onConfigChanged(''); }
    catch (e) { $('dJson').value = 'JSON inválido: ' + e.message; }
  };
}
/* Algunos cambios necesitan reconstruir cosas en vivo */
function onConfigChanged(path) {
  if (!path || path.startsWith('rivals') || path.startsWith('bosses')) buildRivals();
  if (!path || path.startsWith('dolls')) { rebuildDolls(); for (const k in iconCache) delete iconCache[k]; }
  updateBoard(); renderSide(); updateShotbar();
}
function toggleDebug() { $('debug').classList.toggle('hidden'); fitCanvas(); }
$('dbgToggle').onclick = toggleDebug;
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'd' || e.key === 'D') toggleDebug();
  if (e.key === 'Escape' && $('options')) $('optClose').click();
});
