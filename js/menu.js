/* =====================================================================
   GOLÍN — MENÚ PRINCIPAL, PAUSA, ÁLBUM Y CANCHAS
   El menú es la tienda de Don Chucho por dentro: pared con luz cálida, él detrás
   del mostrador, el rótulo colgado arriba y el botón de jugar en el frente del
   mostrador. El dibujo fino vive en js/menu-art.js.
   Volver al menú recarga la página: el picadito queda guardado en la última
   tienda y así no queda ninguna animación vieja corriendo por detrás.
   ===================================================================== */
'use strict';

let menuRaf = 0, menuT0 = 0, menuScene = null, menuDrawn = 0;
const menuStill = window.matchMedia('(prefers-reduced-motion: reduce)');   // sin movimiento: la escena queda quieta
const menuEl = () => $('menu');

/* ---------- datos que se muestran ---------- */
/* Álbum: un muñeco cuenta cuando ya lo tuviste en tu mesa (comprado o premio de jefe). Nada viene regalado. */
const ALBUM_ALL = /[?&]album=todos\b/.test(location.search);              // solo para mirar el arte: muestra las 35 cartas como tuyas, sin guardar nada
const isFound = id => ALBUM_ALL || !!(PROFILE.found && PROFILE.found[id]);
function albumCount() {
  const all = GOLIN.ROSTER;
  return { n: all.filter(d => isFound(d.id)).length, m: all.length };
}
function levelName(id) { return t('level.' + id + '.name'); }

/* Qué hace Don Chucho en el menú: saluda la primera vez; después, algo distinto cada vez */
function pickMenuScene() {
  const pool = ['monedas', 'tinto', 'periodico', 'radio', 'escoba', 'balon', 'trapo', 'cuaderno', 'mosca'];
  const want = /[?&]escena=(\w+)/.exec(location.search);                      // para ver una escena en concreto (?escena=periodico)
  if (want && want[1] === 'saludo') return { key: 'saludo', line: 'chucho.first' };
  if (want && want[1] === 'dormido') return { key: 'dormido', line: 'chucho.sleep' };
  if (want && pool.includes(want[1])) return { key: want[1], line: 'chucho.' + want[1] };
  const d = new Date(), h = d.getHours();
  if (!PROFILE.runs) return { key: 'saludo', line: 'chucho.first' };
  if (h >= 21 || h < 5) return { key: 'dormido', line: 'chucho.sleep' };
  if (h < 8 && Math.random() < 0.6) return { key: 'tinto', line: 'chucho.madruga' };          // madrugaste: te recibe con el tinto
  if (d.getMonth() === 11 && Math.random() < 0.34) return { key: 'saludo', line: 'chucho.navidad' };
  let key = pool[Math.floor(Math.random() * pool.length)];
  try { const last = sessionStorage.getItem('golinEscena'); if (key === last) key = pool[(pool.indexOf(key) + 1) % pool.length]; sessionStorage.setItem('golinEscena', key); } catch (e) {}   // nunca la misma dos veces seguidas
  return { key, line: 'chucho.' + key };
}
/* Detalles que dependen del día: gorro en diciembre, gafas oscuras desde la segunda temporada (?gorro=navidad y ?gafas para verlos) */
const menuHat = () => (new Date().getMonth() === 11 || /[?&]gorro=navidad/.test(location.search) ? 'navidad' : null);
const menuGlasses = () => (PROFILE.bestSeason || 1) >= 2 || /[?&]gafas\b/.test(location.search);

/* ---------- menú principal: barra de abajo con cinco pestañas (Álbum · Chucho · JUGAR · Estilo · Más) ----------
   Lo mejor de los grandes juegos de celular, con el aspecto de GOLÍN:
   · Clash Royale: la barra siempre visible abajo (al alcance del pulgar), JUGAR al centro y más grande, y se cambia de pestaña tocando o deslizando.
   · Clash of Clans: cada cosa vive donde le toca (los ajustes en "Más") y el botón principal cuenta el estado (CONTINUAR + temporada y partido).
   · Marvel Snap / Clash: colección de cartas con marco por rareza y silueta oscura mientras no la tienes.
   · Brawl Stars: la personalización tiene su pestaña, pero la pantalla principal se queda tranquila.
   · Balatro: botones con sombra dura que se hunden al tocarlos.
   Reglas: máximo cinco pestañas, todas siempre visibles, cada una lleva a una pantalla (nunca a una ventana), toque mínimo de 48 px,
   y los avisos de "nuevo" son un puntito discreto, nunca rojo (el rojo es del Mult). */
const TABS = ['col', 'chu', 'jug', 'per', 'mas'];
let menuTab = 'jug', menuTabAt = 0, menuNew = { col: [], chu: [] }, menuViewed = {}, menuSwipe = false, menuFx = { taps: 0 }, menuBgKey = '';
const ICONS = MA.icons;                                                    // íconos ilustrados: se dibujan en js/menu-art.js
const icon = k => '<svg class="nIc" viewBox="0 0 32 32" aria-hidden="true">' + ICONS[k] + '</svg>';
const rIcon = r => '<svg class="rIc" viewBox="0 0 16 16" aria-hidden="true">' + MA.rarity[r] + '</svg>';

/* Lo nuevo desde la última visita: muñecos que ya tienes y retos cumplidos que aún no viste */
const newCol = () => (ALBUM_ALL ? [] : GOLIN.ROSTER.filter(d => isFound(d.id) && !PROFILE.seen['f:' + d.id]).map(d => d.id));
const newChu = () => (ALBUM_ALL ? [] : retos().filter(r => r.done && !PROFILE.seen['u:' + r.id]).map(r => r.id));
function retos() {
  const list = PR.UNLOCKS.map(u => ({ id: u.id, text: t('unlock.' + u.id), done: PROFILE.unlocked.includes(u.id) }));
  for (const id of ['mano', 'diez']) list.push({ id, text: t('album.how.' + id), done: isFound(id) });
  return list;
}

function buildMenu() {
  const el = document.createElement('div');
  el.id = 'menu'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'GOLÍN');
  el.innerHTML = '<div class="mTop"></div><div class="mStage"><canvas id="menuBg" aria-hidden="true"></canvas><canvas id="menuCv" aria-hidden="true"></canvas><div class="mTrack" id="mTrack">' +
    TABS.map(k => '<section class="mPage' + (k === 'jug' ? '' : ' solid') + '" id="pg-' + k + '" role="tabpanel" aria-labelledby="nb-' + k + '"></section>').join('') +
    '</div></div><nav class="mNav" role="tablist" aria-label="GOLÍN">' +
    TABS.map(k => '<button class="nBtn' + (k === 'jug' ? ' ctr' : '') + '" id="nb-' + k + '" role="tab" type="button" data-k="' + k + '" aria-controls="pg-' + k + '">' +
      (k === 'jug' ? '<i class="nMed">' + icon(k) + '</i>' : icon(k)) + '<span>' + t('tab.' + k) + '</span><b class="nBadge" hidden></b></button>').join('') + '</nav>';
  document.body.appendChild(el);
  el.querySelectorAll('.nBtn').forEach(b => {
    b.onclick = () => { audio(); setTab(b.dataset.k, true); };
    b.onkeydown = e => {                                                    // flechas: pestaña anterior y siguiente
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); setTab(TABS[(TABS.indexOf(menuTab) + d + TABS.length) % TABS.length], true);
    };
  });
  // deslizar con el dedo cambia de pestaña, y las páginas siguen al dedo mientras se arrastra (sin estorbar el desplazamiento vertical)
  const st = el.querySelector('.mStage'), tr = el.querySelector('#mTrack'); let p0 = null;
  const place = dx => { tr.style.transform = 'translateX(calc(' + (-TABS.indexOf(menuTab) * 20) + '% + ' + Math.round(dx) + 'px))'; };
  const drop = () => { if (p0 && p0.drag) { tr.style.transition = ''; el.classList.remove('dragging'); } p0 = null; };
  st.addEventListener('pointerdown', e => { p0 = e.pointerType === 'mouse' || !e.isPrimary ? null : { x: e.clientX, y: e.clientY, t: performance.now(), drag: false }; });
  st.addEventListener('pointermove', e => {
    if (!p0) return;
    const dx = e.clientX - p0.x, dy = e.clientY - p0.y;
    if (!p0.drag) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { p0 = null; return; }               // va hacia arriba o abajo: es la lista, no un cambio de pestaña
      if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      p0.drag = true; tr.style.transition = 'none'; el.classList.add('dragging');
    }
    const i = TABS.indexOf(menuTab), edge = (i === 0 && dx > 0) || (i === TABS.length - 1 && dx < 0);
    place(edge ? dx * 0.25 : dx);                                                                // en la primera y la última, el borde opone resistencia
  });
  st.addEventListener('pointerup', e => {
    if (!p0) return;
    const dx = e.clientX - p0.x, dy = e.clientY - p0.y, quick = performance.now() - p0.t < 280, was = p0.drag; drop();
    const far = was ? Math.abs(dx) > st.clientWidth * 0.22 || (quick && Math.abs(dx) > 40) : Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6;
    const to = far ? TABS[Math.max(0, Math.min(TABS.length - 1, TABS.indexOf(menuTab) + (dx < 0 ? 1 : -1)))] : menuTab;
    if (to !== menuTab) setTab(to, false); else if (was) place(0);                              // si no alcanzó, vuelve a su sitio
  });
  st.addEventListener('pointercancel', () => { const was = p0 && p0.drag; drop(); if (was) place(0); });
  el.querySelector('#pg-jug').addEventListener('click', menuTap);
  return el;
}
/* Tocar la escena: Don Chucho se asusta y contesta, el tarro suelta una moneda, el rótulo se mece, El Gato maúlla y el letrero se tambalea */
function menuTap(e) {
  if (e.target.closest('button')) return;
  const r = $('menuCv').getBoundingClientRect(), hit = MA.hitAt(e.clientX - r.left, e.clientY - r.top), now = performance.now(), say = k => { menuFx.line = k; menuFx.lineT = now; };
  if (!hit) return;
  audio();
  if (hit === 'chucho') {
    menuFx.taps++; menuFx.chuT = now; SFX.place();
    if (menuFx.taps === 7) { menuFx.glasses = true; say('chucho.tapMany'); } else say('chucho.tap' + (1 + (menuFx.taps - 1) % 4));
  } else if (hit === 'jar') { menuFx.jarT = now; menuFx.jarN = (menuFx.jarN || 0) + 1; SFX.coin(); if (menuFx.jarN % 3 === 0) say('chucho.jar'); }
  else if (hit === 'sign') { menuFx.signT = now; SFX.toc(2, 3); }
  else if (hit === 'cat') { menuFx.catT = now; SFX.tick(); }
  else if (hit === 'fiado') { menuFx.fiadoT = now; SFX.place(); if (!menuFx.fiadoSaid) { menuFx.fiadoSaid = true; say('chucho.fiadoTap'); } }
}
function setTab(k, focus, instant) {
  if (!TABS.includes(k)) return;
  closeFicha();
  const first = k !== menuTab;
  menuTab = k; if (first) menuTabAt = performance.now();
  const tr = $('mTrack');
  if (tr) {
    if (instant) tr.style.transition = 'none';                             // al abrir el menú no se desliza: aparece ya en JUGAR
    tr.style.transform = 'translateX(' + (-TABS.indexOf(k) * 20) + '%)';
    if (instant) { void tr.offsetWidth; tr.style.transition = ''; }
  }
  TABS.forEach(x => {
    const b = $('nb-' + x), pg = $('pg-' + x), on = x === k;
    b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
    pg.setAttribute('aria-hidden', !on); if ('inert' in pg) pg.inert = !on;
  });
  if (!first && $('pg-' + k)) { const sc = $('pg-' + k).querySelector('.aScroll'); if (sc) sc.scrollTop = 0; }   // tocar la pestaña en la que ya estás la devuelve arriba
  // lo nuevo de esta pestaña ya se vio: se anota y el puntito se apaga (las cartas conservan su etiqueta durante esta visita)
  if ((k === 'col' || k === 'chu') && menuNew[k].length) {
    for (const id of menuNew[k]) PROFILE.seen[(k === 'col' ? 'f:' : 'u:') + id] = true;
    saveProfile(); menuViewed[k] = true;
  }
  paintBadges();
  if (k === 'col') drawAlbumArt();
  if (k === 'chu') drawRetoArt();
  if (k === 'mas' && first) masCountUp();
  if (focus) $('nb-' + k).focus({ preventScroll: true });
}
function paintBadges() {
  for (const k of ['col', 'chu']) {
    const b = $('nb-' + k).querySelector('.nBadge'), n = menuViewed[k] ? 0 : menuNew[k].length;
    b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
  }
}
function renderTop() {
  const sv = readSave(), a = albumCount();
  // chapas con el ícono sobresaliendo: la temporada a la izquierda; a la derecha la plata del picadito guardado (o el álbum, si no hay picadito)
  menuEl().querySelector('.mTop').innerHTML = '<span class="tChip">' + icon('tem') + t('top.season', { n: sv ? sv.season : (PROFILE.bestSeason || 1) }) + '</span>' +
    (sv ? '<span class="tChip plata" role="img" aria-label="' + t('top.plataAria', { n: sv.plata }) + '">' + icon('pla') + '<b>' + sv.plata + '</b></span>'
        : '<button class="tChip" id="tAlbum" type="button" aria-label="' + t('tab.col') + '">' + icon('col') + t('top.album', { a: a.n, b: a.m }) + '</button>');
  if (!sv) $('tAlbum').onclick = () => { audio(); setTab('col', true); };
}
function renderJug() {
  const sv = readSave(), cur = PROFILE.lastLevel || 1;
  // los nueve partidos de la temporada, dentro del botón: hechos, el de ahora y los jefes (3, 6 y 9) más grandes
  const track = sv ? '<span class="mTrackDots" role="img" aria-label="' + t('menu.continueSub', { s: sv.season, m: sv.match || 1 }) + '">' +
    Array.from({ length: 9 }, (_, i) => '<i class="' + ((i + 1) % 3 === 0 ? 'boss ' : '') + (i + 1 < (sv.match || 1) ? 'done' : i + 1 === (sv.match || 1) ? 'now' : '') + '"></i>').join('') + '</span>' : '';
  // el rótulo y Don Chucho se dibujan en el lienzo (js/menu-art.js); aquí van el botón y el pie, apoyados en el frente del mostrador
  $('pg-jug').innerHTML = '<div class="pgIn jugIn"><h1 class="srOnly">GOLÍN</h1><div class="jugDock" id="jugDock">' +
    '<div class="menuBtns">' +
      '<button class="playBtn" id="mPlay" type="button"><span class="pbTxt">' + (sv ? t('menu.continue') : t('menu.play')) + '</span>' +
      (sv ? '<small>' + t('menu.continueSub', { s: sv.season, m: sv.match || 1 }) + '</small>' + track : '') + '<i class="pbShine" aria-hidden="true"></i></button>' +
    '</div>' +
    '<div class="menuFoot"><button class="mCanchaChip" id="mCanchaChip" type="button">' + t('menu.cancha', { n: levelName(cur) }) + '</button>' +
    (sv ? '<button class="mLink" id="mNew" type="button">' + t('menu.new') + '</button>' : '') + '<span id="mToast" class="mNote" role="status" aria-live="polite"></span></div></div></div>';
  $('mPlay').onclick = () => { audio(); sv ? startContinue(sv) : startNew(); };
  if (sv) $('mNew').onclick = () => askNew();
  $('mCanchaChip').onclick = () => { audio(); setTab('per', true); };
}
function renderMenuUI() { renderTop(); renderJug(); renderAlbum(); renderChucho(); renderEstilo(); renderMas(); }
function showMenu() {
  let el = menuEl() || buildMenu();
  el.hidden = false; G.state = 'menu'; G.hold = true;
  document.body.classList.add('inMenu');
  menuScene = pickMenuScene(); menuT0 = performance.now();
  menuNew = { col: newCol(), chu: newChu() }; menuViewed = {}; menuFx = { taps: 0 }; menuBgKey = ''; albumFilter = 'all';
  renderMenuUI(); setTab('jug', false, true);
  cancelAnimationFrame(menuRaf); menuRaf = requestAnimationFrame(menuFrame);
  $('mPlay').focus({ preventScroll: true });
  setTimeout(() => { drawAlbumArt(); drawRetoArt(); }, 900);              // los retratos del álbum y de los retos se adelantan mientras miras a Don Chucho
}
function hideMenu() {
  const el = menuEl(); if (el) el.hidden = true;
  document.body.classList.remove('inMenu');
  cancelAnimationFrame(menuRaf);
}
function menuFrame() {
  const el = menuEl(); if (!el || el.hidden) return;
  const cv = $('menuCv'), bg = $('menuBg'), stage = cv.parentElement, W = stage.clientWidth, H = stage.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (W < 120 || H < 120) { menuRaf = requestAnimationFrame(menuFrame); return; }       // ventana sin tamaño: espera
  const now = performance.now();
  if (menuTab === 'chu' && now - menuDrawn >= (menuStill.matches ? 400 : 33)) { menuDrawn = now; drawBust(now); }   // en CHUCHO solo se mueve su retrato
  if (menuTab !== 'jug' && now - menuTabAt > 500) { menuRaf = requestAnimationFrame(menuFrame); return; }   // fuera de JUGAR no se dibuja la escena (ahorra batería)
  const still = menuStill.matches, sized = cv.width === Math.round(W * dpr) && cv.height === Math.round(H * dpr);
  if (sized && now - menuDrawn < (still ? 400 : 30)) { menuRaf = requestAnimationFrame(menuFrame); return; }   // 30 cuadros por segundo bastan: todo se mueve despacio
  menuDrawn = now;
  if (!sized) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'), sr = stage.getBoundingClientRect(), dock = $('jugDock');
  const cy = dock ? clamp(dock.getBoundingClientRect().top - sr.top - 30, H * 0.45, H - 60) : H * 0.72;   // el mostrador empieza justo encima del botón
  const eggs = chuchoEggs(), topH = el.querySelector('.mTop').offsetHeight;
  // el fondo (pared, repisas, pizarra y mostrador) va en su propio lienzo y solo se pinta cuando cambia el tamaño: cada cuadro redibuja lo que se mueve y nada más
  const bgKey = [W, H, Math.round(cy), dpr, topH, eggs.record, eggs.rayitas, eggs.corona, document.fonts && document.fonts.status].join();
  if (bgKey !== menuBgKey) {
    menuBgKey = bgKey; bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
    const b = bg.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0); MA.back(b, W, H, { topH, cy, eggs, dpr });
  }
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  MA.scene(c, W, H, { ms: still ? 9000 : now - menuT0, now, scene: menuScene, eggs, fx: menuFx, hat: menuHat(), glasses: menuGlasses(), topH, cy, dpr, still });
  menuRaf = requestAnimationFrame(menuFrame);
}
window.addEventListener('resize', () => { menuDrawn = 0; });

function startNew() { clearSave(); hideMenu(); resetRun(); }
function startContinue(sv) { hideMenu(); loadRun(sv); }
/* Ya hay un picadito guardado: pedir confirmación dentro del mismo menú (nada de ventanas del navegador) */
function askNew() {
  setTab('jug', false);
  const b = menuEl().querySelector('.menuBtns');
  b.innerHTML = '<p class="mAsk">' + t('menu.confirmNew').replace(/\n/g, '<br>') + '</p><button class="mBtn main" id="mYes" type="button">' + t('menu.confirmYes') + '</button><button class="mBtn" id="mNo" type="button">' + t('menu.cancel') + '</button>';
  $('mYes').onclick = () => { audio(); startNew(); };
  $('mNo').onclick = () => { audio(); renderJug(); $('mPlay').focus({ preventScroll: true }); };
  $('mNo').focus({ preventScroll: true });
}

/* Copiar el registro de las últimas partidas, para pegarlo en un mensaje (no hay servidor) */
function copyLog(onNote) {
  const text = LOG.summary() + '\n\n' + JSON.stringify(LOG.all().slice(-5));
  const note = msg => { if (onNote) return onNote(msg); const n = $('mToast'); if (n) { n.textContent = msg; setTimeout(() => { if (n.textContent === msg) n.textContent = ''; }, 4000); } };
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = text; ta.className = 'mCopy'; ta.setAttribute('readonly', '');
    document.body.appendChild(ta); ta.focus(); ta.select();
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
/* Pestaña ÁLBUM (v3.12): cartas verticales con marco del material de su rareza y el muñeco de frente; el que aún no tienes es su silueta.
   Arriba, el avance, las cuatro rarezas y un filtro de tres posiciones. Tocar una carta sube su ficha desde abajo (nunca pantalla completa). */
let albumFilter = 'all', albumDrawn = false;
function renderAlbum() {
  const a = albumCount();
  const rar = GOLIN.RARITIES.map(r => {
    const all = GOLIN.ROSTER.filter(d => d.rarity === r), got = all.filter(d => isFound(d.id)).length;
    return '<span class="aRarChip' + (got === all.length ? ' full' : '') + '" role="img" aria-label="' + t('rarity.' + r) + ': ' + got + '/' + all.length + '">' + rIcon(r) + '<b>' + got + '</b>/' + all.length + '</span>';
  }).join('');
  const seg = (k, label, n) => '<button type="button" class="aSegBtn" data-f="' + k + '" aria-pressed="false">' + label + '<small>' + n + '</small></button>';
  const cards = GOLIN.ROSTER.map(d => {
    const open = isFound(d.id), fresh = open && menuNew.col.includes(d.id);
    return '<button type="button" class="ac ac-' + d.rarity + (open ? '' : ' locked') + '" data-id="' + d.id + '" aria-label="' + (open ? d.name : t('album.lockedAria')) + ', ' + t('rarity.' + d.rarity) + '">' +
      '<canvas class="acArt" aria-hidden="true"></canvas>' + (d.shop ? '<i class="acCoin">$' + d.price + '</i>' : '') + (open ? '<i class="fdot acFam f-' + d.family + '"></i>' : '') +
      '<span class="acName">' + (open ? d.name : icon('lock') + '???') + '</span>' + (fresh ? '<em class="newTag">' + t('new.tag') + '</em>' : '') + '</button>';
  }).join('');
  $('pg-col').innerHTML = '<div class="aHead"><div class="aTitle"><h2 class="pgTitle">' + t('tab.col') + '</h2><b class="aCount">' + a.n + '<small>/' + a.m + '</small></b></div>' +
    '<div class="aProg" role="progressbar" aria-valuemin="0" aria-valuemax="' + a.m + '" aria-valuenow="' + a.n + '"><i id="aProgFill"></i></div>' +
    '<div class="aRarRow">' + rar + '</div><div class="aSeg" role="group" aria-label="' + t('tab.col') + '"><i class="aSegThumb" id="aSegThumb"></i>' +
    seg('all', t('album.all'), a.m) + seg('found', t('album.found'), a.n) + seg('missing', t('album.missing'), a.m - a.n) + '</div></div>' +
    '<div class="aScroll" id="aScroll"><div class="aGrid" id="aGrid">' + cards + '</div><p class="mHint aEmpty" id="aEmpty" hidden>' + t('album.empty') + '</p></div>';
  $('aProgFill').style.width = (a.m ? Math.round(a.n / a.m * 100) : 0) + '%';
  $('pg-col').querySelectorAll('.aSegBtn').forEach(b => b.onclick = () => { audio(); SFX.place(); albumFilterTo(b.dataset.f); });
  $('aGrid').onclick = e => { const c = e.target.closest('.ac'); if (c) { audio(); SFX.place(); openFicha(c.dataset.id, c); } };
  albumDrawn = false; albumFilterTo(albumFilter, true);
}
/* El filtro no vuelve a armar nada: solo esconde cartas y desliza la ficha clara del selector */
function albumFilterTo(f, quiet) {
  albumFilter = f; let n = 0;
  $('aGrid').querySelectorAll('.ac').forEach(c => { const show = f === 'all' || (f === 'found') === !c.classList.contains('locked'); c.hidden = !show; if (show) n++; });
  $('aEmpty').hidden = n > 0;
  const btns = [...$('pg-col').querySelectorAll('.aSegBtn')];
  btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.f === f));
  $('aSegThumb').style.transform = 'translateX(' + btns.findIndex(b => b.dataset.f === f) * 100 + '%)';
  if (!quiet) { $('aScroll').scrollTop = 0; drawAlbumArt(true); }
}
/* Los retratos se dibujan cuando hacen falta (al abrir la pestaña, o un rato después de mostrar el menú) y de a pocos por turno, para no trabar la entrada */
function drawAlbumArt(again) {
  if ((albumDrawn && !again) || !$('aGrid')) return;
  albumDrawn = true;
  drawPortraits([...$('aGrid').querySelectorAll('.ac')]);
}
function drawRetoArt() { if ($('chuScroll')) drawPortraits([...$('chuScroll').querySelectorAll('.reto')]); }
function drawPortraits(items) {
  const list = items.filter(b => !b.dataset.art), dpr = Math.min(2, window.devicePixelRatio || 1); let i = 0;
  const step = () => {
    const el = menuEl(); if (!el || el.hidden) return;
    for (let k = 0; k < 4 && i < list.length; i++) {
      const b = list[i], cv = b.querySelector('canvas'), s = cv.clientWidth; if (!s) continue;                 // escondida por el filtro: se dibuja cuando se vea
      cv.width = cv.height = Math.round(s * dpr); const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!b.isConnected) continue;
      MA.portrait(c, b.dataset.id, s, s, { locked: b.classList.contains('locked') || (b.classList.contains('reto') && !b.classList.contains('done')) }); b.dataset.art = '1'; k++;
    }
    if (i < list.length) setTimeout(step, 0);
  };
  step();
}
/* Ficha del muñeco: una hoja de papel que sube desde abajo */
function openFicha(id, from) {
  menuEl().querySelectorAll('.aSheetWrap').forEach(x => x.remove());
  const d = GOLIN.DOLL[id], open = isFound(id), tx = open ? dollText(id) : null;
  const how = !d.shop ? t('album.how.' + id) : PROFILE.unlocked.includes(id) ? t('album.inShop') : t('unlock.' + id);
  const el = document.createElement('div'); el.id = 'aSheet'; el.className = 'aSheetWrap';
  el.innerHTML = '<div class="aSheetBack"></div><section class="aSheet as-' + d.rarity + '" role="dialog" aria-modal="true" aria-label="' + (open ? d.name : t('album.lockedAria')) + '">' +
    '<div class="asBand"><i class="asGrip"></i>' + rIcon(d.rarity) + '<b>' + t('rarity.' + d.rarity) + '</b></div>' +
    '<div class="asBody"><div class="asTop"><canvas class="asArt" aria-hidden="true"></canvas><div class="asInfo"><h3>' + (open ? d.name : '???') + '</h3><p class="asChips">' +
    (open ? '<span class="asChip"><i class="fdot f-' + d.family + '"></i>' + t('family.' + d.family) + '</span>' : '') + (d.shop ? '<span class="asChip plata">' + icon('pla') + d.price + '</span>' : '') + '</p></div></div>' +
    (open ? '<p class="asRule">' + tx.rule + '</p><p class="asJoke">' + tx.joke + '</p>' : '<p class="asHow">' + icon('lock') + '<span>' + how + '</span></p>') +
    '<button type="button" class="mBtn asClose">' + t('menu.back') + '</button></div></section>';
  el._from = from; menuEl().appendChild(el);
  const cv = el.querySelector('.asArt'), btn = el.querySelector('.asClose'), dpr = Math.min(2, window.devicePixelRatio || 1), s = 128; cv.width = cv.height = s * dpr;   // dentro de esta hoja: la anterior puede seguir yéndose
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); MA.portrait(c, id, s, s, { locked: !open });
  el.querySelector('.aSheetBack').onclick = closeFicha; btn.onclick = () => { audio(); closeFicha(); };
  const sh = el.querySelector('.aSheet'); let y0 = null;                                             // deslizar la hoja hacia abajo también la cierra
  sh.addEventListener('pointerdown', e => { y0 = e.clientY; });
  sh.addEventListener('pointerup', e => { if (y0 !== null && e.clientY - y0 > 70) closeFicha(); y0 = null; });
  sh.addEventListener('pointercancel', () => { y0 = null; });
  void sh.offsetWidth; el.classList.add('on');
  btn.focus({ preventScroll: true });
}
function closeFicha() {
  const el = $('aSheet'); if (!el) return;
  const from = el._from; el.id = ''; el.classList.remove('on');
  setTimeout(() => el.remove(), 260);
  if (from && from.isConnected) from.focus({ preventScroll: true });
}
/* Pestaña CHUCHO (v3.12): Don Chucho con su frase del día y los retos que abren muñecos en su tienda, como fichas de papel.
   Primero lo que falta por cumplir. Tocar un reto abre la ficha de ese muñeco; tocar a Don Chucho le cambia la frase. */
const retoProgress = id => (PR.unlockProgress ? PR.unlockProgress(id, PROFILE) : null);   // {a, b}: cuánto llevas. Hoy el juego no lo calcula; cuando lo haga, la barra ya tiene su lugar
let chuSayN = 0;
function renderChucho() {
  const list = retos(), pend = list.filter(r => !r.done), ok = list.filter(r => r.done), all = !pend.length;
  chuSayN = Math.floor(Math.random() * 5);
  const row = r => {
    const d = GOLIN.DOLL[r.id], fresh = r.done && menuNew.chu.includes(r.id), pr = r.done ? null : retoProgress(r.id);
    return '<li><button type="button" class="reto ac-' + d.rarity + (r.done ? ' done' : '') + '" data-id="' + r.id + '" aria-label="' + (r.done ? d.name : t('album.lockedAria')) + '. ' + r.text + (r.done ? ' ' + t('chu.done') : '') + '">' +
      (fresh ? '<em class="newTag">' + t('new.tag') + '</em>' : '') + '<canvas class="rtArt" aria-hidden="true"></canvas>' +
      '<span class="rtTxt"><b>' + rIcon(d.rarity) + (r.done ? d.name : '???') + '</b><span>' + r.text + '</span>' +
      (pr ? '<span class="rtBar"><i data-w="' + Math.max(0, Math.min(100, Math.round(100 * pr.a / pr.b))) + '"></i></span><small class="rtNum">' + pr.a + ' / ' + pr.b + '</small>' : '') +
      '</span><i class="rtState">' + icon(r.done ? 'ok' : 'lock') + '</i></button></li>';
  };
  const sec = (k, arr) => (arr.length ? '<h3 class="rtSec">' + t(k) + ' · ' + arr.length + '</h3><ul class="retos">' + arr.map(row).join('') + '</ul>' : '');
  $('pg-chu').innerHTML = '<div class="chuHead"><button type="button" class="chuBust" id="chuBust" aria-label="Don Chucho"><canvas id="chuCv" aria-hidden="true"></canvas></button>' +
    '<p class="chuSay" id="chuSay" role="status">' + (all ? t('chu.allDone') : t('chu.say' + (1 + chuSayN))) + '</p></div>' +
    '<div class="aHead"><div class="aTitle"><h2 class="pgTitle">' + t('chu.title2') + '</h2><b class="aCount">' + ok.length + '<small>/' + list.length + '</small></b></div>' +
    '<div class="aProg" role="progressbar" aria-valuemin="0" aria-valuemax="' + list.length + '" aria-valuenow="' + ok.length + '"><i id="chuProgFill"></i></div><p class="chuHint">' + t('chu.hint') + '</p></div>' +
    '<div class="aScroll" id="chuScroll">' + sec('chu.pending', pend) + sec('chu.doneH', ok) + '</div>';
  $('chuProgFill').style.width = (list.length ? Math.round(ok.length / list.length * 100) : 0) + '%';
  $('pg-chu').querySelectorAll('.rtBar i').forEach(b => { b.style.width = b.dataset.w + '%'; });
  $('chuBust').onclick = () => {                                            // cada toque, otra frase (y un susto)
    audio(); SFX.place(); menuFx.bustT = performance.now();
    const n = (menuFx.bustN = (menuFx.bustN || 0) + 1), say = $('chuSay');
    say.textContent = n % 4 === 0 ? t('chu.tapSay') : t('chu.say' + (1 + (chuSayN + n) % 5));
    say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop');
  };
  $('chuScroll').onclick = e => { const b = e.target.closest('.reto'); if (b) { audio(); SFX.place(); openFicha(b.dataset.id, b); } };
  drawBust(performance.now());
}
function drawBust(now) {
  const cv = $('chuCv'); if (!cv) return;
  const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d'), still = menuStill.matches; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  MA.bust(c, w, h, { ms: still ? 9000 : now - menuT0, tapMs: menuFx.bustT ? now - menuFx.bustT : undefined, still, glasses: menuGlasses(), hat: menuHat() });
}
/* Pestaña ESTILO (v3.12): cada cancha es una ficha con su mesa en miniatura. Se elige tocándola; las que faltan dicen cómo abrirlas.
   Balón y camiseta ya tienen su lugar, marcados como "pronto". */
function renderEstilo(picked) {
  const cur = PROFILE.lastLevel || 1;
  const rows = PR.LEVELS.map(L => {
    const locked = L.id > PROFILE.maxLevel, on = L.id === cur;
    return '<li><button type="button" class="cancha' + (on ? ' on' : '') + (locked ? ' locked' : '') + (picked === L.id ? ' pop' : '') + '" data-l="' + L.id + '" aria-pressed="' + on + '"' + (locked ? ' aria-disabled="true"' : '') + '>' +
      '<canvas class="cnArt" aria-hidden="true"></canvas><span class="cnTxt"><b><i class="cnNo">' + L.id + '</i>' + t('level.' + L.id + '.name') + '</b><span>' + t('level.' + L.id + '.rule') + '</span>' +
      (locked ? '<small class="cnLock">' + icon('lock') + t('canchas.locked', { n: t('level.' + (L.id - 1) + '.name') }) + '</small>' : '') + '</span>' +
      (locked ? '' : '<i class="cnState">' + (on ? icon('ok') + '<em>' + t('canchas.current') + '</em>' : '<em class="cnPick">' + t('canchas.pick') + '</em>') + '</i>') + '</button></li>';
  }).join('');
  const soon = (ic, k) => '<div class="soon">' + icon(ic) + '<b>' + t(k) + '</b><em>' + t('style.soonTag') + '</em></div>';
  $('pg-per').innerHTML = '<div class="aHead"><div class="aTitle"><h2 class="pgTitle">' + t('style.title') + '</h2></div><p class="chuHint">' + t('canchas.hint').replace(/\n/g, ' ') + '</p></div>' +
    '<div class="aScroll" id="perScroll"><h3 class="rtSec">' + t('canchas.title') + '</h3><ul class="canchas">' + rows + '</ul>' +
    '<h3 class="rtSec">' + t('style.soonH') + '</h3><div class="soonGrid">' + soon('jug', 'style.ball') + soon('per', 'style.shirt') + '</div></div>';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  $('pg-per').querySelectorAll('.cancha').forEach(b => {
    const cv = b.querySelector('canvas'), w = 58, h = 88; cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); MA.miniTable(c, w, h, +b.dataset.l);
    b.onclick = () => {
      const id = +b.dataset.l; audio();
      if (id > PROFILE.maxLevel) { SFX.error(); b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; }
      if (id === (PROFILE.lastLevel || 1)) return;
      const top = $('perScroll').scrollTop;
      PROFILE.lastLevel = id; saveProfile(); SFX.place(); renderEstilo(id); renderJug(); $('perScroll').scrollTop = top;
      const nb = $('pg-per').querySelector('.cancha.on'); if (nb) nb.focus({ preventScroll: true });
    };
  });
}
/* Pestaña MÁS (v3.12): opciones, registro y picadito nuevo como fichas; tus números con el récord en una pizarra como la de la tienda */
let masCounted = false;
function renderMas() {
  const sv = readSave(), a = albumCount();
  const row = (id, ic, label, sub) => '<button class="masRow" id="' + id + '" type="button"><i class="masIc">' + icon(ic) + '</i><span><b>' + label + '</b><small>' + sub + '</small></span><i class="masGo" aria-hidden="true"></i></button>';
  const stat = (k, n, txt) => '<li class="stat"><b' + (txt ? '' : ' data-n="' + n + '"') + '>' + (txt || fmt(n)) + '</b><span>' + t(k) + '</span></li>';
  $('pg-mas').innerHTML = '<div class="aHead"><div class="aTitle"><h2 class="pgTitle">' + t('tab.mas') + '</h2></div></div><div class="aScroll" id="masScroll">' +
    '<div class="masBtns">' + row('mOpt', 'mas', t('menu.options'), t('more.optSub')) + row('mLog', 'reg', t('menu.feedback'), t('more.logSub')) + (sv ? row('mNew2', 'jug', t('menu.new'), t('more.newSub')) : '') + '</div>' +
    '<p class="mNote" id="mMasNote" role="status" aria-live="polite"></p>' +
    '<h3 class="rtSec">' + t('more.stats') + '</h3><ul class="stats"><li class="stat hero"><div class="heroIn"><span>' + t('more.bestShot') + '</span><b data-n="' + (PROFILE.bestShotEver || 0) + '">' + fmt(PROFILE.bestShotEver || 0) + '</b></div></li>' +
    stat('more.runs', PROFILE.runs || 0) + stat('more.wins', PROFILE.wins || 0) + stat('more.bestSeason', PROFILE.bestSeason || 1) + stat('more.found', 0, a.n + ' / ' + a.m) + '</ul>' +
    '<p class="masFoot mVer">GOLÍN v3.12</p></div>';
  masCounted = false;
  $('mOpt').onclick = () => { audio(); openOptions(); };
  $('mLog').onclick = () => { audio(); copyLog(msg => { const n = $('mMasNote'); if (n) { n.textContent = msg; setTimeout(() => { if (n.textContent === msg) n.textContent = ''; }, 4000); } }); };
  if (sv) $('mNew2').onclick = () => { audio(); askNew(); };
}
/* Los números suben contando la primera vez que abres la pestaña (si no pediste menos movimiento) */
function masCountUp() {
  if (masCounted || menuStill.matches) return; masCounted = true;
  const els = [...$('pg-mas').querySelectorAll('b[data-n]')].filter(b => +b.dataset.n > 0), t0 = performance.now(), dur = 650;
  const step = () => {
    const p = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    for (const b of els) if (b.isConnected) b.textContent = fmt(Math.round(+b.dataset.n * e));
    if (p < 1) setTimeout(step, 32);
  };
  if (els.length) step();
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
  if ($('aSheet')) return closeFicha();
  if ($('pause')) return closePause();
  if (G.state !== 'menu' && !$('shutter')) openPause();
});
// con la pestaña oculta o la app en segundo plano: pausa sola (que no se pierda un tiro en el celular)
document.addEventListener('visibilitychange', () => {
  if (/[?&]directo\b/.test(location.search)) return;                        // pruebas automáticas: sin pausa sola
  if (document.hidden && G.state !== 'menu' && G.state !== 'final' && !$('pause')) openPause();
});
