/* =====================================================================
   GOLÍN — ARTE VECTORIAL "Rótulo de barrio" (todo dibujado por código)
   Manual §Ilustración: contorno negro tinta de grosor fijo, sombreado
   plano (un tono), sombra abajo a la derecha, reflejo blanco duro en
   metales. Muñecos: camiseta crema/roja; cada uno con una silueta de
   cabeza única (se reconocen aunque todo fuera negro). Sin caras.
   Rarezas por MATERIAL del borde: Común sin borde · Raro plateado ·
   Especial arabesco de chiva · Legendario dorado animado.
   ===================================================================== */
'use strict';
const PAL = {
  cancha:'#1F8A4C', noche:'#0E4D2C', madera:'#C9803A', maderaOsc:'#7A4420', crema:'#F4EAD5',
  tinta:'#1A1423', cian:'#2EC4B6', rojo:'#E63946', magenta:'#FF3D8B', amarillo:'#FFC93C', azul:'#2B59C3',
  plata:'#B8C0CC', plataOsc:'#7D8694', oro:'#D4A017', oroOsc:'#8C6A0C',
  piel:'#B9774A', pielOsc:'#8A5230', pelo:'#1A1423',
  // camiseta propia: crema con franjas rojas (el rojo de equipo, no el de Mult)
  camisa:'#F4EAD5', franja:'#B8313C', rivalRaya:'#1E3F8C',
};
const FONT_NUM = '"Bungee", "Impact", system-ui, sans-serif';
const FONT_TXT = '"Rubik", system-ui, sans-serif';
const FONT_HAND = '"Permanent Marker", "Comic Sans MS", cursive';
const multColor = () => (typeof OPT !== 'undefined' && OPT.colorblind ? PAL.magenta : PAL.rojo);

/* ---------------- primitivas ---------------- */
function pathRoundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); }
function inkFill(c, fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke(); }

/* ---------------- borde de rareza (material) ---------------- */
function drawRarityRing(c, rarity, R, tm, rect) {
  if (rarity === 'comun') return;
  const lw = Math.max(3, R * 0.2);
  const shape = rr => { if (rect) pathRoundRect(c, -rect.w / 2 - rr, -rect.h / 2 - rr, rect.w + rr * 2, rect.h + rr * 2, rect.h / 2 + rr); else circle(c, 0, 0, R + rr); };
  if (rarity === 'raro') {
    shape(lw * 0.55); c.lineWidth = lw + 3; c.strokeStyle = PAL.tinta; c.stroke();
    c.lineWidth = lw; c.strokeStyle = PAL.plata; c.stroke();
    if (!rect) { c.beginPath(); c.arc(0, 0, R + lw * 0.55, Math.PI * 0.2, Math.PI * 0.75); c.lineWidth = lw * 0.5; c.strokeStyle = PAL.plataOsc; c.stroke();
      c.beginPath(); c.arc(0, 0, R + lw * 0.55, -Math.PI * 0.85, -Math.PI * 0.6); c.lineWidth = lw * 0.4; c.strokeStyle = '#ffffff'; c.stroke(); }
  } else if (rarity === 'especial') {
    // arabesco de chiva: tramos de colores secundarios + puntitos crema
    shape(lw * 0.55); c.lineWidth = lw + 3; c.strokeStyle = PAL.tinta; c.stroke();
    const cols = [PAL.madera, PAL.crema, PAL.cancha, PAL.maderaOsc, '#E9A15B', PAL.noche];   // solo paleta secundaria
    const segs = 12;
    for (let i = 0; i < segs; i++) {
      c.beginPath();
      if (rect) { shape(lw * 0.55); c.setLineDash([6, 4]); c.lineDashOffset = i * 10; }
      else c.arc(0, 0, R + lw * 0.55, i / segs * Math.PI * 2, (i + 0.8) / segs * Math.PI * 2);
      c.lineWidth = lw; c.strokeStyle = cols[i % cols.length]; c.stroke(); c.setLineDash([]);
      if (rect) break;
    }
    if (!rect) for (let i = 0; i < segs; i++) {
      const a = (i + 0.9) / segs * Math.PI * 2; circle(c, Math.cos(a) * (R + lw * 0.55), Math.sin(a) * (R + lw * 0.55), lw * 0.28);
      c.fillStyle = PAL.crema; c.fill();
    }
  } else if (rarity === 'legendario') {
    shape(lw * 0.55); c.lineWidth = lw + 3; c.strokeStyle = PAL.tinta; c.stroke();
    c.lineWidth = lw; c.strokeStyle = PAL.oro; c.stroke();
    c.beginPath(); c.arc(0, 0, R + lw * 0.55, Math.PI * 0.15, Math.PI * 0.85); c.lineWidth = lw * 0.5; c.strokeStyle = PAL.oroOsc; c.stroke();
    const a = (tm / 700) % (Math.PI * 2);                    // el brillo recorre el borde
    c.beginPath(); c.arc(0, 0, R + lw * 0.55, a, a + 0.6); c.lineWidth = lw * 0.55; c.strokeStyle = '#ffffff'; c.stroke();
  }
}

/* ---------------- cuerpo y cabezas ---------------- */
function drawShirt(c, R, rect, rival) {
  const lw = Math.max(2, R * 0.16);
  const shape = () => { if (rect) pathRoundRect(c, -rect.w / 2, -rect.h / 2, rect.w, rect.h, rect.h / 2 - 1); else circle(c, 0, 0, R); };
  shape(); c.fillStyle = rival ? PAL.azul : PAL.camisa; c.fill();
  c.save(); shape(); c.clip();
  if (rival) {                                            // rivales: rayas horizontales
    c.fillStyle = PAL.rivalRaya;
    for (let y = -R * 1.2; y < R * 1.2; y += R * 0.5) c.fillRect(-R * 3, y, R * 6, R * 0.22);
  } else {                                                // propios: franjas rojas verticales
    c.fillStyle = PAL.franja;
    const w = rect ? rect.w : R * 2;
    for (let x = -w / 2 + w * 0.18; x < w / 2; x += w * 0.34) c.fillRect(x, -R * 2, w * 0.13, R * 4);
  }
  // sombreado plano abajo-derecha
  c.fillStyle = 'rgba(26,20,35,0.18)';
  if (rect) c.fillRect(-rect.w / 2, rect.h * 0.12, rect.w, rect.h); else { circle(c, R * 0.25, R * 0.3, R); c.fill(); }
  c.restore();
  shape(); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke();
}
/* Cabeza vista desde arriba (arriba = hacia el arco rival). hr = radio de la cabeza. */
const HEADS = {
  palo(c, hr) { skull(c, hr * 0.9, true); },
  rapado(c, hr) { pathRoundRect(c, -hr, -hr * 0.9, hr * 2, hr * 1.8, hr * 0.3); inkFill(c, PAL.piel, hr * 0.22);
    pathRoundRect(c, -hr * 0.9, -hr * 0.85, hr * 1.8, hr * 0.7, hr * 0.2); c.fillStyle = PAL.pelo; c.fill(); },
  resorte(c, hr) { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; circle(c, Math.cos(a) * hr * 0.85, Math.sin(a) * hr * 0.85, hr * 0.38); inkFill(c, PAL.pelo, hr * 0.12); } skull(c, hr * 0.8); },
  gorra(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr * 1.02, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); inkFill(c, PAL.maderaOsc, hr * 0.2);
    pathRoundRect(c, -hr * 0.7, -hr * 1.55, hr * 1.4, hr * 0.7, hr * 0.3); inkFill(c, PAL.maderaOsc, hr * 0.2); },
  colitas(c, hr) { for (const s of [-1, 1]) { circle(c, s * hr * 1.25, -hr * 0.1, hr * 0.5); inkFill(c, PAL.pelo, hr * 0.15);
      circle(c, s * hr * 0.95, -hr * 0.1, hr * 0.18); inkFill(c, PAL.magenta, hr * 0.1); }
    skull(c, hr); c.beginPath(); c.arc(0, 0, hr, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAL.pelo; c.fill(); },
  cabezota(c, hr) { skull(c, hr * 1.45, true); },
  bandana(c, hr) { skull(c, hr); c.fillStyle = PAL.pelo; c.beginPath(); c.arc(0, 0, hr, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); c.fill();
    pathRoundRect(c, -hr * 1.05, -hr * 0.25, hr * 2.1, hr * 0.45, hr * 0.15); inkFill(c, PAL.maderaOsc, hr * 0.16);
    c.beginPath(); c.moveTo(hr * 0.9, 0); c.lineTo(hr * 1.7, hr * 0.5); c.lineTo(hr * 1.5, -hr * 0.2); c.closePath(); inkFill(c, PAL.maderaOsc, hr * 0.14); },
  melena(c, hr) { c.beginPath(); c.ellipse(0, hr * 0.35, hr * 1.2, hr * 1.5, 0, 0, Math.PI * 2); inkFill(c, PAL.maderaOsc, hr * 0.18);
    skull(c, hr * 0.85); c.beginPath(); c.moveTo(-hr * 0.85, 0); c.quadraticCurveTo(0, -hr * 1.3, hr * 0.85, 0); c.quadraticCurveTo(0, -hr * 0.4, -hr * 0.85, 0); c.fillStyle = PAL.maderaOsc; c.fill(); },
  calvo(c, hr) { for (const s of [-1, 1]) { circle(c, s * hr * 0.98, 0, hr * 0.28); inkFill(c, PAL.piel, hr * 0.12); } skull(c, hr, true); },
  cresta(c, hr) { skull(c, hr); c.beginPath(); c.moveTo(-hr * 0.28, hr * 0.9); c.lineTo(-hr * 0.25, -hr * 1.1); c.lineTo(0, -hr * 1.6); c.lineTo(hr * 0.25, -hr * 1.1); c.lineTo(hr * 0.28, hr * 0.9); c.closePath(); inkFill(c, PAL.pelo, hr * 0.14); },
  gorro(c, hr) { circle(c, 0, 0, hr * 1.05); inkFill(c, PAL.madera, hr * 0.2); c.fillStyle = PAL.maderaOsc;
    for (let i = -2; i <= 2; i++) c.fillRect(i * hr * 0.35 - hr * 0.08, -hr, hr * 0.16, hr * 2);
    circle(c, 0, 0, hr * 1.05); c.lineWidth = hr * 0.2; c.strokeStyle = PAL.tinta; c.stroke();
    circle(c, 0, 0, hr * 0.42); inkFill(c, PAL.crema, hr * 0.14); },
  boina(c, hr) { skull(c, hr); c.beginPath(); c.ellipse(hr * 0.15, -hr * 0.1, hr * 1.25, hr * 1.1, -0.3, 0, Math.PI * 2); inkFill(c, PAL.noche, hr * 0.18);
    circle(c, hr * 0.2, -hr * 0.2, hr * 0.2); inkFill(c, PAL.noche, hr * 0.12);
    for (const s of [-1, 1]) { circle(c, s * hr * 0.95, hr * 0.4, hr * 0.25); c.fillStyle = PAL.plata; c.fill(); } },
  copete(c, hr) { skull(c, hr); c.beginPath(); c.moveTo(-hr * 0.8, hr * 0.2); c.lineTo(-hr * 0.35, -hr * 1.8); c.lineTo(hr * 0.1, -hr * 0.9); c.lineTo(hr * 0.5, -hr * 1.7); c.lineTo(hr * 0.8, hr * 0.2); c.closePath(); inkFill(c, PAL.pelo, hr * 0.14); },
  capucha(c, hr) { c.beginPath(); c.moveTo(0, -hr * 1.9); c.quadraticCurveTo(hr * 1.4, -hr * 0.4, hr * 1.05, hr * 0.9); c.lineTo(-hr * 1.05, hr * 0.9); c.quadraticCurveTo(-hr * 1.4, -hr * 0.4, 0, -hr * 1.9); c.closePath(); inkFill(c, '#DDE3F2', hr * 0.18);
    c.beginPath(); c.ellipse(0, 0, hr * 0.6, hr * 0.7, 0, 0, Math.PI * 2); c.fillStyle = PAL.tinta; c.fill(); },
  flequillo(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr * 1.02, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(hr * 0.6, -hr * 0.15);
    for (let i = 0; i < 5; i++) c.lineTo(hr * (0.45 - i * 0.28), -hr * (i % 2 ? 0.1 : 0.4)); c.closePath(); inkFill(c, PAL.maderaOsc, hr * 0.14); },
  tupe(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr * 1.02, Math.PI * 1.0, Math.PI * 2.0); c.closePath(); c.fillStyle = PAL.pelo; c.fill();
    c.beginPath(); c.moveTo(-hr * 0.8, -hr * 0.5); c.quadraticCurveTo(-hr * 0.2, -hr * 2.2, hr * 0.9, -hr * 1.1); c.quadraticCurveTo(hr * 0.3, -hr * 0.7, -hr * 0.8, -hr * 0.5); inkFill(c, PAL.pelo, hr * 0.14);
    c.beginPath(); c.moveTo(-hr * 0.3, -hr * 1.2); c.quadraticCurveTo(0, -hr * 1.6, hr * 0.4, -hr * 1.2); c.lineWidth = hr * 0.14; c.strokeStyle = '#ffffff'; c.stroke(); },
  dos(c, hr) { for (const s of [-1, 1]) { c.save(); c.translate(s * hr * 0.75, 0); skull(c, hr * 0.7); c.beginPath(); c.arc(0, 0, hr * 0.72, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAL.pelo; c.fill(); c.restore(); } },
  vincha(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fillStyle = PAL.madera; c.fill();
    c.beginPath(); c.arc(0, 0, hr * 0.78, Math.PI * 0.95, Math.PI * 2.05); c.lineWidth = hr * 0.32; c.strokeStyle = PAL.crema; c.stroke();
    circle(c, 0, 0, hr); c.lineWidth = hr * 0.16; c.strokeStyle = PAL.tinta; c.stroke(); },
  mono(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr * 1.02, 0, Math.PI * 2); c.fillStyle = PAL.pelo; c.fill();
    circle(c, 0, hr * 0.55, hr * 0.5); inkFill(c, PAL.pelo, hr * 0.14); pathRoundRect(c, -hr * 0.5, hr * 0.18, hr, hr * 0.22, hr * 0.1); c.fillStyle = PAL.crema; c.fill(); },
  guante(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAL.pelo; c.fill();
    c.save(); c.translate(hr * 1.2, -hr * 0.6); c.rotate(0.5); hand(c, hr * 0.85); c.restore(); },
  penacho(c, hr) {                       // El Cacique: vincha con plumas
    for (const s of [-1, 0, 1]) {
      c.save(); c.translate(s * hr * 0.55, -hr * 0.5); c.rotate(s * 0.45);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(hr * 0.35, -hr * 0.9, 0, -hr * 1.7);
      c.quadraticCurveTo(-hr * 0.35, -hr * 0.9, 0, 0); c.closePath();
      inkFill(c, s === 0 ? PAL.crema : PAL.madera, hr * 0.16); c.restore();
    }
    skull(c, hr);
    pathRoundRect(c, -hr * 1.05, -hr * 0.5, hr * 2.1, hr * 0.5, hr * 0.15); inkFill(c, PAL.maderaOsc, hr * 0.16);
    circle(c, 0, -hr * 0.25, hr * 0.2); inkFill(c, PAL.crema, hr * 0.1);
  },
  rizos(c, hr) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; circle(c, Math.cos(a) * hr * 0.95, Math.sin(a) * hr * 0.95, hr * 0.42); inkFill(c, PAL.pelo, hr * 0.1); }
    circle(c, 0, 0, hr * 0.95); c.fillStyle = PAL.pelo; c.fill();
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; circle(c, Math.cos(a) * hr * 0.45, Math.sin(a) * hr * 0.45, hr * 0.22); c.lineWidth = hr * 0.1; c.strokeStyle = '#4a3a55'; c.stroke(); } },
};
function skull(c, hr, shine) {
  circle(c, 0, 0, hr); inkFill(c, PAL.piel, Math.max(1.5, hr * 0.2));
  c.save(); circle(c, 0, 0, hr); c.clip(); circle(c, hr * 0.35, hr * 0.4, hr); c.fillStyle = 'rgba(26,20,35,0.18)'; c.fill(); c.restore();
  if (shine) { c.beginPath(); c.arc(-hr * 0.3, -hr * 0.35, hr * 0.3, Math.PI, Math.PI * 1.6); c.lineWidth = hr * 0.18; c.strokeStyle = '#ffffff'; c.stroke(); }
}
function hand(c, s) {
  c.beginPath();
  c.moveTo(-s * 0.5, s * 0.6); c.lineTo(-s * 0.55, -s * 0.2);
  for (let i = 0; i < 4; i++) { const x = -s * 0.5 + i * s * 0.33; c.lineTo(x, -s * 0.9 + (i === 0 || i === 3 ? s * 0.2 : 0)); c.lineTo(x + s * 0.2, -s * 0.9 + (i === 0 || i === 3 ? s * 0.2 : 0)); c.lineTo(x + s * 0.2, -s * 0.2); }
  c.lineTo(s * 0.9, -s * 0.1); c.lineTo(s * 0.55, s * 0.6); c.closePath();
  inkFill(c, PAL.crema, Math.max(1.5, s * 0.14));
}

/* ---------------- muñeco completo ----------------
   opts: {rarity, tm, rival, flash (0..1), dim (bool), alpha} */
function drawFigure(c, id, opts = {}) {
  const def = id ? GOLIN.DOLL[id] : null;
  const shape = opts.shape || (def ? def.shape : { kind:'circle', r: opts.r || 14 });
  const rect = shape.kind === 'rect' ? shape : null;
  const R = rect ? rect.h / 2 : shape.r;
  const hr = rect ? rect.h * 0.42 : Math.max(3, R * 0.52);
  c.save();
  if (opts.alpha !== undefined) c.globalAlpha *= opts.alpha;
  // sombra plana abajo-derecha
  c.fillStyle = 'rgba(26,20,35,0.35)';
  if (rect) { pathRoundRect(c, -rect.w / 2 + 3, -rect.h / 2 + 4, rect.w, rect.h, rect.h / 2); c.fill(); }
  else { circle(c, R * 0.22 + 1.5, R * 0.28 + 2, R); c.fill(); }
  if (def && !opts.rival) drawRarityRing(c, def.rarity, R, opts.tm || 0, rect);
  drawShirt(c, R, rect, opts.rival);
  if (opts.rival) skull(c, hr, true);
  else if (def) (HEADS[def.head] || skull)(c, hr);
  if (opts.flash > 0.02) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(255,255,255,${0.8 * opts.flash})`; c.fillRect(-R * 3, -R * 3, R * 6, R * 6);
    c.globalCompositeOperation = 'source-over';
  }
  if (opts.dim) { c.fillStyle = 'rgba(26,20,35,0.55)'; if (rect) pathRoundRect(c, -rect.w / 2, -rect.h / 2, rect.w, rect.h, rect.h / 2); else circle(c, 0, 0, R + 1); c.fill(); }
  c.restore();
}
/* Retrato para tarjetas y banca: el muñeco sobre un disco de papel crema */
function renderDollIcon(id, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'), def = GOLIN.DOLL[id];
  circle(c, size / 2, size / 2, size * 0.46); c.fillStyle = PAL.noche; c.fill();
  const R = def.shape.kind === 'rect' ? def.shape.w / 2 : def.shape.r;
  const k = (size * 0.3) / Math.max(R, 9);
  c.translate(size / 2, size / 2); c.scale(k, k);
  drawFigure(c, id, { tm: 0 });
  return cv.toDataURL();
}

/* ---------------- placas de números (nunca sobre el tapete desnudo) ----------------
   Puntos = "+" en ficha redonda cian · Mult = "×" en sello angular rojo ·
   Plata = "$" en círculo dentado amarillo · texto = placa negro tinta */
function plateText(c, text, x, y, size, color, font = FONT_NUM) {
  c.font = `${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(text).width, padX = size * 0.45, h = size * 1.35;
  pathRoundRect(c, x - w / 2 - padX, y - h / 2, w + padX * 2, h, size * 0.3);
  c.fillStyle = PAL.tinta; c.fill(); c.lineWidth = Math.max(2, size * 0.12); c.strokeStyle = PAL.crema; c.stroke();
  c.fillStyle = color; c.fillText(text, x, y + size * 0.06);
  return w + padX * 2;
}
function drawPtsChip(c, text, x, y, size) {
  c.font = `${size}px ${FONT_NUM}`;
  const w = c.measureText(text).width, r = size * 0.62, h = size * 1.3;
  const total = r * 2 + w + size * 0.6, x0 = x - total / 2;
  pathRoundRect(c, x0 + r, y - h / 2, total - r, h, h / 2); c.fillStyle = PAL.tinta; c.fill(); c.lineWidth = Math.max(2, size * 0.1); c.strokeStyle = PAL.crema; c.stroke();
  circle(c, x0 + r, y, r); c.fillStyle = PAL.cian; c.fill(); c.strokeStyle = PAL.tinta; c.lineWidth = Math.max(2, size * 0.12); c.stroke();
  c.fillStyle = PAL.tinta; c.font = `${size * 0.95}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+', x0 + r, y + size * 0.05);
  c.fillStyle = PAL.cian; c.font = `${size}px ${FONT_NUM}`; c.textAlign = 'left'; c.fillText(text, x0 + r * 2 + size * 0.25, y + size * 0.06);
}
function drawMultStamp(c, text, x, y, size, tilt = -0.12) {
  const col = multColor();
  c.save(); c.translate(x, y); c.rotate(tilt);
  c.font = `${size}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(text).width + size * 0.9, h = size * 1.45, k = size * 0.35;
  c.beginPath();                                        // sello angular (octágono)
  c.moveTo(-w / 2 + k, -h / 2); c.lineTo(w / 2 - k, -h / 2); c.lineTo(w / 2, -h / 2 + k); c.lineTo(w / 2, h / 2 - k);
  c.lineTo(w / 2 - k, h / 2); c.lineTo(-w / 2 + k, h / 2); c.lineTo(-w / 2, h / 2 - k); c.lineTo(-w / 2, -h / 2 + k); c.closePath();
  c.fillStyle = PAL.tinta; c.fill(); c.lineWidth = Math.max(3, size * 0.16); c.strokeStyle = col; c.stroke();
  c.fillStyle = col; c.fillText(text, 0, size * 0.06);
  c.restore();
}
function drawCoin(c, x, y, r, spin = 0) {
  c.beginPath();                                        // círculo dentado
  const teeth = 12;
  for (let i = 0; i <= teeth * 2; i++) { const a = spin + i / (teeth * 2) * Math.PI * 2, rr = i % 2 ? r : r * 0.84; c.lineTo(Math.cos(a) * rr + x, Math.sin(a) * rr + y); }
  c.closePath(); c.fillStyle = PAL.amarillo; c.fill(); c.lineWidth = Math.max(1.5, r * 0.16); c.strokeStyle = PAL.tinta; c.stroke();
  c.fillStyle = PAL.tinta; c.font = `${r * 1.2}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', x, y + r * 0.08);
}
function drawPlataChip(c, text, x, y, size) {
  c.font = `${size}px ${FONT_NUM}`;
  const w = c.measureText(text).width, r = size * 0.62, h = size * 1.25, total = r * 2 + w + size * 0.55, x0 = x - total / 2;
  pathRoundRect(c, x0 + r, y - h / 2, total - r, h, h / 2); c.fillStyle = PAL.tinta; c.fill(); c.lineWidth = 2; c.strokeStyle = PAL.crema; c.stroke();
  drawCoin(c, x0 + r, y, r);
  c.fillStyle = PAL.amarillo; c.font = `${size}px ${FONT_NUM}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(text, x0 + r * 2 + size * 0.2, y + size * 0.06);
}
/* Tarjeta roja / amarilla y pito, para El Árbitro y la roja de Rambos */
function drawCard(c, x, y, s, color, rot = 0.2) {
  c.save(); c.translate(x, y); c.rotate(rot); pathRoundRect(c, -s * 0.35, -s * 0.5, s * 0.7, s, s * 0.1);
  inkFill(c, color, Math.max(1.5, s * 0.1)); c.restore();
}
function drawWhistle(c, x, y, s) {
  c.save(); c.translate(x, y);
  circle(c, 0, 0, s * 0.45); inkFill(c, PAL.plata, s * 0.12);
  pathRoundRect(c, 0, -s * 0.45, s * 0.9, s * 0.4, s * 0.1); inkFill(c, PAL.plata, s * 0.12);
  c.beginPath(); c.arc(-s * 0.12, -s * 0.12, s * 0.18, Math.PI, Math.PI * 1.6); c.lineWidth = s * 0.1; c.strokeStyle = '#fff'; c.stroke();
  c.restore();
}
