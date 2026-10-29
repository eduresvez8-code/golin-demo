/* =====================================================================
   GOLÍN — MENÚ PRINCIPAL, PAUSA, ÁLBUM Y CANCHAS
   El menú es la fachada de la tienda de Don Chucho: la reja abajo, él detrás
   del mostrador y los botones colgados como carteles. Reutiliza el dibujo de
   la reja y de Don Chucho de la tienda (js/ui.js).
   Volver al menú recarga la página: el picadito queda guardado en la última
   tienda y así no queda ninguna animación vieja corriendo por detrás.
   ===================================================================== */
'use strict';

let menuRaf = 0, menuT0 = 0, menuScene = null;
const menuEl = () => $('menu');

/* ---------- datos que se muestran ---------- */
function albumCount() {
  const shop = GOLIN.ROSTER.filter(d => d.shop);
  return { n: Math.min(shop.filter(d => PROFILE.unlocked.includes(d.id)).length, shop.length), m: shop.length };
}
function levelName(id) { return t('level.' + id + '.name'); }

/* Qué hace Don Chucho en el menú: saluda la primera vez; después, algo distinto cada vez */
function pickMenuScene() {
  const h = new Date().getHours();
  if (!PROFILE.runs) return { key: 'saludo', line: 'chucho.first' };
  if (h >= 21 || h < 6) return { key: 'dormido', line: 'chucho.sleep' };
  const pool = ['monedas', 'tinto', 'periodico', 'radio', 'escoba'];
  const key = pool[Math.floor(Math.random() * pool.length)];
  return { key, line: 'chucho.' + key };
}

/* ---------- menú principal ---------- */
function buildMenu() {
  const el = document.createElement('div');
  el.id = 'menu'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'GOLÍN');
  el.innerHTML = '<canvas id="menuCv" aria-hidden="true"></canvas><div class="menuUI"></div>';
  document.body.appendChild(el);
  return el;
}
function renderMenuUI() {
  const ui = menuEl().querySelector('.menuUI'), sv = readSave(), a = albumCount();
  ui.innerHTML =
    '<div class="menuLogo"><h1>GOLÍN</h1><p>' + t('menu.tag') + '</p></div>' +
    '<div class="menuBtns">' +
      '<button class="mBtn main" id="mPlay" type="button">' + (sv ? t('menu.continue') + '<small>' + t('menu.continueSub', { s: sv.season, m: sv.match || 1 }) + '</small>' : t('menu.play')) + '</button>' +
      (sv ? '<button class="mBtn" id="mNew" type="button">' + t('menu.new') + '</button>' : '') +
      '<div class="mRow"><button class="mBtn small" id="mAlbum" type="button">' + t('menu.album') + '</button>' +
      '<button class="mBtn small" id="mCanchas" type="button">' + t('menu.canchas') + '</button>' +
      '<button class="mBtn small" id="mOpt" type="button">' + t('menu.options') + '</button></div>' +
      '<p class="mCancha">' + t('menu.cancha', { n: levelName(PROFILE.lastLevel || 1) }) + '</p>' +
    '</div>' +
    '<div class="menuFoot">' + '<div class="menuStats"><span>' + t('menu.statSeason', { n: PROFILE.bestSeason || 1 }) + '</span><span>' + t('menu.statDolls', { a: a.n, b: a.m }) + '</span>' +
      (PROFILE.bestShotEver > 0 ? '<span>' + t('menu.statShot', { n: fmt(PROFILE.bestShotEver) }) + '</span>' : '') + '</div>' + '<div class="mFootRow"><button class="mLink" id="mFeed" type="button">' + t('menu.feedback') + '</button><span id="mToast" class="mNote" role="status" aria-live="polite"></span><span class="mVer">v3.0</span></div></div>';
  $('mPlay').onclick = () => { audio(); sv ? startContinue(sv) : startNew(); };
  if (sv) $('mNew').onclick = () => askNew();
  $('mAlbum').onclick = () => { audio(); openAlbum(); };
  $('mCanchas').onclick = () => { audio(); openCanchas(); };
  $('mOpt').onclick = () => { audio(); openOptions(); };
  $('mFeed').onclick = () => { audio(); copyLog(); };
  $('mPlay').focus({ preventScroll: true });
}
function showMenu() {
  let el = menuEl() || buildMenu();
  el.hidden = false; G.state = 'menu'; G.hold = true;
  document.body.classList.add('inMenu');
  menuScene = pickMenuScene(); menuScene.xFrac = innerWidth >= 900 ? 0.8 : 0; menuT0 = performance.now();
  renderMenuUI();
  cancelAnimationFrame(menuRaf); menuRaf = requestAnimationFrame(menuFrame);
}
function hideMenu() {
  const el = menuEl(); if (el) el.hidden = true;
  document.body.classList.remove('inMenu');
  cancelAnimationFrame(menuRaf);
}
function menuFrame() {
  const el = menuEl(); if (!el || el.hidden) return;
  const cv = $('menuCv'), W = innerWidth, H = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (W < 120 || H < 120) { menuRaf = requestAnimationFrame(menuFrame); return; }       // ventana sin tamaño: espera
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  const c = cv.getContext('2d'), now = performance.now(), ms = now - menuT0 + 1500;
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const e = chuchoEggs();
  drawShutter(c, W, H, H, now, {}, 600, { noTag: true });
  drawCounterScene(c, W, H, 1, 0, Object.assign({ glasses: false, party: false }, menuScene), { fiado: e.fiado, gato: e.gato }, ms);
  menuRaf = requestAnimationFrame(menuFrame);
}
window.addEventListener('resize', () => { const el = menuEl(); if (el && !el.hidden) menuFrame(); });

function startNew() { clearSave(); hideMenu(); resetRun(); }
function startContinue(sv) { hideMenu(); loadRun(sv); }
/* Ya hay un picadito guardado: pedir confirmación dentro del mismo menú (nada de ventanas del navegador) */
function askNew() {
  const b = menuEl().querySelector('.menuBtns');
  b.innerHTML = '<p class="mAsk">' + t('menu.confirmNew').replace(/\n/g, '<br>') + '</p><button class="mBtn main" id="mYes" type="button">' + t('menu.confirmYes') + '</button><button class="mBtn" id="mNo" type="button">' + t('menu.cancel') + '</button>';
  $('mYes').onclick = () => { audio(); startNew(); };
  $('mNo').onclick = () => { audio(); renderMenuUI(); };
  $('mNo').focus({ preventScroll: true });
}

/* Copiar el registro de las últimas partidas, para pegarlo en un mensaje (no hay servidor) */
function copyLog() {
  const text = LOG.summary() + '\n\n' + JSON.stringify(LOG.all().slice(-5));
  const note = msg => { const n = $('mToast'); if (n) { n.textContent = msg; setTimeout(() => { if (n.textContent === msg) n.textContent = ''; }, 4000); } };
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = text; ta.className = 'mCopy'; ta.setAttribute('readonly', '');
    menuEl().appendChild(ta); ta.focus(); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); note(ok ? t('menu.copied') : t('menu.copyFail'));
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => note(t('menu.copied')), fallback); else fallback();
}

/* ---------- ventanas del menú: álbum y canchas ---------- */
function closeOverlay(id) { const o = $(id); if (o) o.remove(); const m = menuEl(); if (m && !m.hidden) { const b = m.querySelector('#mPlay'); if (b) b.focus({ preventScroll: true }); } }
function overlay(id, title, bodyHTML) {
  closeOverlay(id);
  const o = document.createElement('div'); o.id = id; o.className = 'mOverlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', title);
  o.innerHTML = '<div class="mBox"><div class="mHead"><h2>' + title + '</h2><button class="btn" id="' + id + 'X" type="button">' + t('menu.back') + '</button></div><div class="mBody">' + bodyHTML + '</div></div>';
  document.body.appendChild(o);
  $(id + 'X').onclick = () => { audio(); closeOverlay(id); };
  o.addEventListener('pointerdown', e => { if (e.target === o) closeOverlay(id); });
  $(id + 'X').focus({ preventScroll: true });
  return o;
}
function openAlbum() {
  const a = albumCount();
  const cards = GOLIN.ROSTER.map(d => {
    const open = PROFILE.unlocked.includes(d.id) || d.id === 'mano' || d.id === 'diez';
    const how = d.shop ? (open ? '' : '🔒 ' + t('unlock.' + d.id)) : (open ? t('album.bossPrize') : '🔒 ' + t('unlock.' + d.id));
    const tx = open ? dollText(d.id) : null;
    return '<article class="aCard ' + (open ? '' : 'locked') + ' r-' + d.rarity + '"><img src="' + dollIcon(d.id, 96) + '" alt="" width="72" height="72">' +
      '<div class="aTxt"><b class="dname">' + (open ? d.name : '???') + '</b><span class="aRar">' + t('rarity.' + d.rarity) + (d.shop ? ' · $' + d.price : '') + '</span>' +
      (open ? '<p>' + tx.rule + '</p><p class="joke">' + tx.joke + '</p>' : '') + (how ? '<p class="aHow">' + how + '</p>' : '') + '</div></article>';
  }).join('');
  overlay('album', t('album.title2', { n: a.n, m: a.m }), '<div class="aGrid">' + cards + '</div>');
}
function openCanchas() {
  const cur = PROFILE.lastLevel || 1;
  const posters = PR.LEVELS.map(L => {
    const locked = L.id > PROFILE.maxLevel, on = L.id === cur;
    return '<button type="button" class="poster ' + (locked ? 'locked' : '') + (on ? ' on' : '') + '" data-l="' + L.id + '" ' + (locked ? 'aria-disabled="true"' : '') + '>' +
      '<span class="pNo">' + L.id + '</span><b>' + t('level.' + L.id + '.name') + '</b><span>' + t('level.' + L.id + '.rule') + '</span>' +
      '<em>' + (locked ? '🔒 ' + t('canchas.locked', { n: t('level.' + (L.id - 1) + '.name') }) : on ? t('canchas.current') : t('canchas.pick')) + '</em></button>';
  }).join('');
  const o = overlay('canchas', t('canchas.title'), '<p class="mHint">' + t('canchas.hint').replace(/\n/g, '<br>') + '</p><div class="pGrid">' + posters + '</div>');
  o.querySelectorAll('.poster').forEach(b => b.onclick = () => {
    const id = +b.dataset.l; if (id > PROFILE.maxLevel) { SFX.error(); return; }
    PROFILE.lastLevel = id; saveProfile(); audio(); SFX.place(); openCanchas(); renderMenuUI();
  });
}

/* ---------- pausa ---------- */
function openPause() {
  if (G.state === 'menu' || $('pause')) return;
  G.hold = true; hideTooltip();
  const o = document.createElement('div'); o.id = 'pause'; o.className = 'mOverlay'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', t('pause.title'));
  const season = G.season > 1 ? t('board.season', { n: G.season }) + ' · ' : '';
  o.innerHTML = '<div class="mBox narrow"><div class="mHead"><h2>' + t('pause.title') + '</h2></div><div class="mBody">' +
    '<p class="pStat">' + season + (G.match ? t('fx.match', { n: G.match }) : t('pause.opening')) + ' · $' + G.plata + ' · ' + '❤'.repeat(Math.max(0, G.lives)) + '</p>' +
    '<div class="pBtns"><button class="mBtn main" id="pzGo" type="button">' + t('pause.resume') + '</button>' +
    '<button class="mBtn" id="pzOpt" type="button">' + t('menu.options') + '</button>' +
    '<button class="mBtn" id="pzHelp" type="button">' + t('board.help') + '</button>' +
    '<button class="mBtn" id="pzMenu" type="button">' + t('pause.menu') + '</button>' +
    '<button class="mBtn danger" id="pzQuit" type="button">' + t('pause.abandon') + '</button></div>' +
    '<p class="mHint" id="pzNote">' + t('pause.menuNote') + '</p></div></div>';
  document.body.appendChild(o);
  $('pzGo').onclick = () => { audio(); closePause(); };
  $('pzOpt').onclick = () => { audio(); openOptions(); };
  $('pzHelp').onclick = () => { audio(); closePause(); replayTour(); };
  $('pzMenu').onclick = () => { audio(); goMenu(); };
  $('pzQuit').onclick = () => {
    const b = $('pzQuit');
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = t('pause.abandonYes'); $('pzNote').textContent = t('pause.abandonSure'); setTimeout(() => { if ($('pzQuit')) { b.dataset.sure = ''; b.textContent = t('pause.abandon'); $('pzNote').textContent = t('pause.menuNote'); } }, 5000); return; }
    abandonRun();
  };
  $('pzGo').focus({ preventScroll: true });
}
function closePause() { const o = $('pause'); if (o) o.remove(); G.hold = false; }
function abandonRun() {
  LOG.endRun({ win: false, abandoned: true, reached: G.stats.reached || 0, season: G.season, won: G.won, best: G.bestShot, goals: G.stats.goals, level: G.level });
  clearSave(); goMenu();
}
/* Volver al menú = recargar: el picadito queda guardado en la última tienda y no sobra nada corriendo por detrás */
function goMenu() { location.href = location.href.split('#')[0].split('?')[0]; }

window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if ($('options') || $('tour')) return;                                  // esas ventanas manejan su propia tecla
  if ($('album')) return closeOverlay('album');
  if ($('canchas')) return closeOverlay('canchas');
  if ($('pause')) return closePause();
  if (G.state !== 'menu' && !$('shutter')) openPause();
});
// con la pestaña oculta o la app en segundo plano: pausa sola (que no se pierda un tiro en el celular)
document.addEventListener('visibilitychange', () => {
  if (/[?&]directo\b/.test(location.search)) return;                        // pruebas automáticas: sin pausa sola
  if (document.hidden && G.state !== 'menu' && G.state !== 'final' && !$('pause')) openPause();
});
