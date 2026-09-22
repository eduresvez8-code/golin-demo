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
      <button class="btn opt" id="bOpt" title="${t('opt.title')}">⚙</button>`;
    $('bOpt').onclick = openOptions;
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
  h = (G.total < G.quota ? `<span class="chip small left">${t('chip.left', { n: fmt(G.quota - G.total) })}</span>`
    : `<span class="chip small ok">${t('chip.over', { n: fmt(G.total - G.quota) })}</span>`) + h;
  if (G.boss === 'niebla') h += `<span class="chip small ko">🌫 ${t('boss.niebla.name')}</span>`;
  if (G.boss === 'tacano') h += `<span class="chip small ko">${t('boss.tacano.name')}</span>`;
  if (G.mod) h += `<span class="chip small">${t('mod.' + G.mod + '.name')}</span>`;
  for (const k of Object.keys(G.nextShot || {})) h += `<span class="chip small ok">${GOLIN.ITEM[k].icon} ${t('item.' + k + '.name')}</span>`;
  if (G.matchFlags && G.matchFlags.gaseosa) h += `<span class="chip small ok">🥤 ${t('item.gaseosa.name')}</span>`;
  h += G.pocket.map((id, i) => `<button class="btn pocket" data-p="${i}" title="${t('item.' + id + '.rule')}">${GOLIN.ITEM[id].icon} ${t('item.' + id + '.name')}</button>`).join('');
  if (G.reachedQuota && G.shotsLeft > 0) h += `<button class="btn skip" id="bSkip">${t('skip', { n: G.shotsLeft * CFG.economy.rewardShot })}</button>`;
  return h;
}
function shotChips(s) {
  let h = '';
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
  const labels = { win: t('end.win.line'), shots: n => t('end.shots.line', { n }), goals: n => t('end.goals.line', { n }), gaseosa: t('item.gaseosa.name') + ' ×' + CFG.economy.gaseosaMult };
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

function showLegendary(id, outcome, inst, done) {
  const tx = dollText(id, inst);
  const head = `<h1 class="legend">${t('legend.title')}</h1>
    <div class="legendCard"><img src="${dollIcon(id, 128)}"><div><b class="dname">${DOLL[id].name}</b><p>${tx.rule}</p><p class="joke">${tx.joke}</p></div></div>`;
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
};
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
  if (target === 'ball' && balls[0]) {
    const p = balls[0].body.position, r = 120 * k;
    return { x: cv.left + p.x * k - r, y: cv.top + p.y * k - r, w: r * 2, h: r * 2, round: true };
  }
  const el = target === 'side' ? $('side') : target === 'board' ? $('board') : canvas;
  const r = el.getBoundingClientRect();
  if (target === 'board') { const sb = $('shotbar').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: sb.bottom - r.top }; }
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}
function openTour(step) {
  closeTour(true);
  const pages = TOUR[step];
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
    const pg = pages[i], key = `tour.${step}.${i}`;
    el.querySelector('.ttitle').textContent = t(key + '.title');
    el.querySelector('.ttext').innerHTML = t(key).replace(/\n/g, '<br>');
    el.querySelector('.tdots').innerHTML = pages.length > 1 ? pages.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('') : '';
    el.querySelector('.tnext').textContent = i < pages.length - 1 ? t('tour.next') : t('tour.go');
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    place();
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
  el.addEventListener('pointerdown', e => e.stopPropagation());
  show();
}
function closeTour(silent) {
  const el = $('tour'); if (!el) return;
  window.removeEventListener('keydown', el._keys); window.removeEventListener('resize', el._resize);
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
  } else if (kind === 'hit') {
    const T = 2400, p = (ms % T) / T, dx = 150, dy = 60;
    const age = p > 0.45 ? (p - 0.45) * T / 1000 : 9, kk = age < 1 ? Math.exp(-age * 9) * Math.cos(age * 42) : 0;
    c.save(); c.translate(dx, dy); c.scale(1 - 0.3 * kk, 1 + 0.2 * kk); drawFigure(c, 'cabezon', { tm: ms, flash: age < 0.4 ? 1 - age / 0.4 : 0 }); c.restore();
    const bp = p < 0.45 ? [30 + 95 * (p / 0.45), 125 - 45 * (p / 0.45)] : [125 - 60 * (p - 0.45), 80 + 50 * (p - 0.45)];
    ball(bp[0], bp[1]);
    if (p > 0.45) drawMultStamp(c, '+2', dx + 42, dy - 26, 14);
  }
  c.restore();
}

/* ---------------- tienda de Don Chucho + banca ---------------- */
function shopToast(msg) {
  const el = $('shopToast'); if (!el) return;
  el.textContent = msg; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function rarityClass(id) { return 'r-' + DOLL[id].rarity; }
function benchHTML() {
  return `<h3>${t('shop.bench')}</h3><div class="bench">${G.bench.map((d, i) => d ? `
    <div class="bslot full ${rarityClass(d.id)}" data-b="${i}" title="${DOLL[d.id].name}">
      <img src="${dollIcon(d.id, 72)}" data-b="${i}" draggable="false"><span class="bname">${DOLL[d.id].name}</span>
      ${G.state === 'shop' ? `<span class="bacts"><button class="mini-btn sell" data-b="${i}">${t('shop.sellFor', { n: EC.sellValue(d) })}</button><button class="mini-btn disc" data-b="${i}">${t('shop.discard')}</button></span>` : ''}
    </div>` : `<div class="bslot" data-b="${i}"><span class="bname">${t('shop.benchEmpty')}</span></div>`).join('')}</div>`;
}
function bindBench() {
  document.querySelectorAll('.bslot.full img').forEach(img => img.addEventListener('pointerdown', e => {
    if (G.state !== 'shop') return; e.preventDefault(); startDrag({ kind:'bench', bench:+img.dataset.b }, e);
  }));
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
    <button class="item ${G.plata < EC.itemPrice(id, CFG, LM) ? 'cant' : ''}" data-it="${i}">
      <span class="iicon">${GOLIN.ITEM[id].icon}</span><span class="iname">${t('item.' + id + '.name')}</span>
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
function renderSide() {
  const side = $('side');
  if (G.state === 'shop') {
    side.className = 'shop';
    side.innerHTML = `<div class="sign"><span>${t('shop.title')}</span></div>
      <p class="tendero">${t('shop.welcome')}</p>
      <div class="plataBig"><span class="coin">$</span> <span class="num">${G.plata}</span></div>
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
    side.querySelectorAll('.card[data-i]').forEach(c => c.addEventListener('pointerdown', e => {
      if (e.target.closest('.tobench')) return;
      e.preventDefault(); startDrag({ kind:'buy', idx:+c.dataset.i }, e);
    }));
    side.querySelectorAll('.tobench').forEach(b => b.onclick = e => { e.stopPropagation(); buyToBench(+b.dataset.i); });
    side.querySelectorAll('.item[data-it]').forEach(b => b.onclick = () => buyItem(+b.dataset.it));
    for (const o of G.offers) if (o) PROFILE.seen[o] = true;
    saveProfile();
    bindBench();
    $('bReroll').onclick = () => { audio(); rerollShop(); };
    $('bSell').onclick = () => { G.sellMode = !G.sellMode; renderSide(); };
    $('bNext').onclick = startNextMatch;
  } else {
    side.className = '';
    side.innerHTML = `<h2>${t('help.title')}</h2><ul class="help">
      <li>${t('help.1')}</li><li>${t('help.2', { goal:CFG.scoring.goalBonus, nogoal:CFG.scoring.noGoalFactor })}</li>
      <li>${t('help.3', { s:shotsPerMatch(), wall:CFG.scoring.wallPts })}</li><li>${t('help.5')}</li><li>${t('help.4')}</li></ul>
      ${benchHTML()}
      <h3>${t('shop.table')}</h3>${tableListHTML()}
      ${albumHTML()}`;
    bindBench();
  }
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

function showTooltip(slot, cx, cy) {
  const d = slot.doll, tt = $('tooltip'), tx = dollText(d.id, d), pw = powerOf(slot);
  tt.innerHTML = `<b class="dname">${DOLL[d.id].name}</b> <span class="tmeta">${t('rarity.' + DOLL[d.id].rarity)} · ${t('rod.' + slot.rod)}</span>
    <div>${tx.rule}</div><div class="joke">${tx.joke}</div>
    ${pw > 1 ? `<div class="key">🔑 ×${pw}</div>` : ''}
    ${d.expelled ? `<div class="red">🟥 ${t('fx.expelled')}</div>` : ''}
    ${G.state === 'shop' ? `<div class="plataTxt">${t('shop.sellFor', { n: EC.sellValue(d) })}</div>` : ''}`;
  tt.classList.remove('hidden');
  tt.style.left = (cx + 16) + 'px'; tt.style.top = (cy + 12) + 'px';
}
function hideTooltip() { $('tooltip').classList.add('hidden'); }

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
  const range = (k, label, min, max, step) => `<label>${t(label)} <input type="range" min="${min}" max="${max}" step="${step}" value="${OPT[k]}" data-k="${k}"><span class="num" id="ov_${k}">${Math.round(OPT[k] * 100)}%</span></label>`;
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
  $('optTut').onclick = () => { PROFILE.tutorialDone = false; PROFILE.coachSeen = {}; saveProfile(); close(); coach(G.state === 'shop' ? 'shop' : 'aim'); };
  el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
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
  let html = `<div style="display:flex;justify-content:space-between"><b>⚙ DEBUG</b><span>D para ocultar</span></div>
    <h4>ACCIONES</h4>
    <div class="row"><select id="dDoll">${GOLIN.ROSTER.map(d => `<option value="${d.id}">${d.name} (${t('rarity.' + d.rarity)})</option>`).join('')}</select>
      <button class="dbtn" id="dGive">A la banca</button></div>
    <div class="row"><span>Ir al partido</span><span><input type="number" id="dJump" value="${G.match}" min="1" style="width:50px"> <button class="dbtn" id="dGo">Ir</button></span></div>
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
    <pre id="dLog" style="white-space:pre-wrap;font-size:10px;margin:2px 0">${LOG.summary()}</pre>
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
