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

/* ---------------- peana (base) según la rareza ----------------
   La rareza se lee por el MATERIAL de la peana donde está parado el muñeco:
   Común madera · Raro metal con remaches · Especial pintada tipo chiva · Legendario dorada con brillo.
   Los rivales van sobre una peana azul oscura, sin rareza. */
function drawBase(c, rarity, R, rect, tm, rival) {
  const rx = rect ? rect.w / 2 + R * 0.45 : R * 1.22, ry = R * 0.62, cy = R * 0.46, lw = Math.max(2, R * 0.14);
  const disc = (dy = 0, sx = 1) => { c.beginPath(); c.ellipse(0, cy + dy, rx * sx, ry * sx, 0, 0, Math.PI * 2); };
  // canto de la peana (da volumen) y sombra plana abajo a la derecha
  c.fillStyle = 'rgba(26,20,35,0.35)'; c.beginPath(); c.ellipse(R * 0.18, cy + R * 0.3, rx, ry, 0, 0, Math.PI * 2); c.fill();
  const top = rival ? '#27437F' : rarity === 'raro' ? PAL.plata : rarity === 'especial' ? PAL.crema : rarity === 'legendario' ? PAL.oro : PAL.madera;
  const edge = rival ? '#16275A' : rarity === 'raro' ? PAL.plataOsc : rarity === 'especial' ? '#D9C7A5' : rarity === 'legendario' ? PAL.oroOsc : PAL.maderaOsc;
  disc(R * 0.16); c.fillStyle = edge; c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke();
  disc(0); c.fillStyle = top; c.fill(); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke();
  c.save(); disc(0); c.clip();
  if (rival) { c.fillStyle = PAL.rivalRaya; for (let y = cy - ry; y < cy + ry; y += ry * 0.5) c.fillRect(-rx, y, rx * 2, ry * 0.18); }
  else if (rarity === 'comun') {                         // vetas de madera
    c.strokeStyle = 'rgba(122,68,32,0.55)'; c.lineWidth = Math.max(1, R * 0.07);
    for (let k = 0.35; k < 1; k += 0.3) { c.beginPath(); c.ellipse(0, cy, rx * k, ry * k, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  } else if (rarity === 'raro') {                        // remaches + reflejo duro
    for (const a of [0.15, 0.85, 1.15, 1.85]) { circle(c, Math.cos(a * Math.PI) * rx * 0.8, cy + Math.sin(a * Math.PI) * ry * 0.72, R * 0.09); c.fillStyle = PAL.plataOsc; c.fill(); }
    c.beginPath(); c.ellipse(0, cy, rx * 0.86, ry * 0.8, 0, Math.PI * 1.15, Math.PI * 1.45); c.lineWidth = R * 0.12; c.strokeStyle = '#ffffff'; c.stroke();
  } else if (rarity === 'especial') {                    // arabesco de chiva: pétalos y puntos de la paleta secundaria
    const cols = [PAL.madera, PAL.cancha, PAL.maderaOsc, '#E9A15B', PAL.noche];
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, x = Math.cos(a) * rx * 0.78, y = cy + Math.sin(a) * ry * 0.72;
      c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, R * 0.22, R * 0.1, 0, 0, Math.PI * 2);
      c.fillStyle = cols[i % cols.length]; c.fill(); c.restore();
      circle(c, Math.cos(a + 0.31) * rx * 0.6, cy + Math.sin(a + 0.31) * ry * 0.52, R * 0.05); c.fillStyle = cols[(i + 2) % cols.length]; c.fill();
    }
  } else if (rarity === 'legendario') {                  // oro con brillo que recorre y destellos
    const a = (tm / 650) % (Math.PI * 2);
    c.beginPath(); c.ellipse(0, cy, rx * 0.8, ry * 0.74, 0, a, a + 0.9); c.lineWidth = R * 0.16; c.strokeStyle = '#ffffff'; c.stroke();
    c.beginPath(); c.ellipse(0, cy, rx * 0.8, ry * 0.74, 0, Math.PI * 0.1, Math.PI * 0.9); c.lineWidth = R * 0.1; c.strokeStyle = PAL.oroOsc; c.stroke();
  }
  c.restore();
  if (rarity === 'legendario' && !rival) {               // destellos de 4 puntas que titilan
    for (const [k, px, py] of [[0, -rx * 0.95, cy - ry * 0.5], [1.7, rx * 0.95, cy + ry * 0.2]]) {
      const tw = 0.5 + 0.5 * Math.sin(tm / 260 + k * 3);
      if (tw < 0.25) continue;
      const sz = R * 0.28 * tw;
      c.beginPath(); c.moveTo(px, py - sz); c.lineTo(px + sz * 0.25, py); c.lineTo(px, py + sz); c.lineTo(px - sz * 0.25, py); c.closePath();
      c.moveTo(px - sz, py); c.lineTo(px, py + sz * 0.25); c.lineTo(px + sz, py); c.lineTo(px, py - sz * 0.25); c.closePath();
      c.fillStyle = '#ffffff'; c.fill();
    }
  }
}
/* compatibilidad: el nombre viejo */
function drawRarityRing(c, rarity, R, tm, rect) { drawBase(c, rarity, R, rect, tm, false); }

/* ---------------- cuerpo: hombros con camiseta, brazos, pantaloneta y guayo ----------------
   Vista desde arriba, mirando hacia el arco rival. Contorno negro tinta y un solo tono de sombra. */
function drawBody(c, R, rect, rival) {
  const lw = Math.max(2, R * 0.15);
  const W = rect ? rect.w / 2 : R * 0.95, top = rect ? -rect.h * 0.62 : -R * 0.55, bot = rect ? rect.h * 0.55 : R * 0.5;
  const jersey = rival ? PAL.azul : PAL.camisa, stripe = rival ? PAL.rivalRaya : PAL.franja, shade = rival ? '#22489E' : '#E2D3B5';
  // pantaloneta y guayos (debajo del torso)
  const legs = rect ? [-W * 0.45, W * 0.45] : [0];
  for (const lx of legs) {
    pathRoundRect(c, lx - R * 0.36, bot - R * 0.2, R * 0.72, R * 0.5, R * 0.18); inkFill(c, rival ? '#16275A' : PAL.tinta, lw * 0.8);
    c.beginPath(); c.ellipse(lx + R * 0.08, bot + R * 0.44, R * 0.26, R * 0.2, 0, 0, Math.PI * 2); inkFill(c, PAL.tinta, lw * 0.7);
    c.beginPath(); c.moveTo(lx - R * 0.14, bot + R * 0.5); c.lineTo(lx + R * 0.3, bot + R * 0.5); c.lineWidth = R * 0.07; c.strokeStyle = PAL.crema; c.stroke();
  }
  // brazos pegados al cuerpo (manga + mano)
  for (const sx of [-1, 1]) {
    const ax = sx * (W + R * 0.02);
    pathRoundRect(c, ax - R * 0.17, top + R * 0.2, R * 0.34, R * 0.92, R * 0.17); inkFill(c, PAL.piel, lw * 0.8);
    pathRoundRect(c, ax - R * 0.17, top + R * 0.2, R * 0.34, R * 0.38, R * 0.15); inkFill(c, jersey, lw * 0.8);
  }
  // torso (hombros)
  const torso = () => pathRoundRect(c, -W, top, W * 2, bot - top, R * 0.42);
  torso(); c.fillStyle = jersey; c.fill();
  c.save(); torso(); c.clip();
  c.fillStyle = stripe;
  if (rival) for (let y = top + R * 0.14; y < bot; y += R * 0.36) c.fillRect(-W, y, W * 2, R * 0.14);   // rayas horizontales
  else for (const x of rect ? [-W * 0.6, -W * 0.15, W * 0.3] : [-R * 0.5, R * 0.16]) c.fillRect(x, top, rect ? W * 0.2 : R * 0.3, bot - top);   // franjas
  c.fillStyle = 'rgba(26,20,35,0.16)'; c.fillRect(0, (top + bot) / 2, W * 2, bot);                         // sombra plana
  c.fillStyle = shade; c.globalAlpha = 0.5; c.fillRect(W * 0.35, top, W, bot - top); c.globalAlpha = 1;
  c.restore();
  torso(); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke();
  // cuello en V
  c.beginPath(); c.moveTo(-R * 0.26, top + R * 0.02); c.lineTo(0, top + R * 0.32); c.lineTo(R * 0.26, top + R * 0.02);
  c.lineWidth = lw * 0.8; c.strokeStyle = rival ? PAL.crema : PAL.franja; c.stroke();
  // topes metálicos donde la barra atraviesa el muñeco
  for (const sx of [-1, 1]) {
    const x = sx * (W + R * 0.3);
    pathRoundRect(c, x - R * 0.13, R * 0.02, R * 0.26, R * 0.3, R * 0.06); inkFill(c, PAL.plata, lw * 0.6);
    c.beginPath(); c.moveTo(x - R * 0.06, R * 0.06); c.lineTo(x - R * 0.06, R * 0.26); c.lineWidth = R * 0.05; c.strokeStyle = '#ffffff'; c.stroke();
  }
}
/* compatibilidad: el nombre viejo */
function drawShirt(c, R, rect, rival) { drawBody(c, R, rect, rival); }
/* Cabeza vista desde arriba (arriba = hacia el arco rival). hr = radio de la cabeza. */
const HEADS = {
  palo(c, hr) { skull(c, hr * 0.9, true); },
  rapado(c, hr) { pathRoundRect(c, -hr, -hr * 0.9, hr * 2, hr * 1.8, hr * 0.3); inkFill(c, PAL.piel, hr * 0.22);
    pathRoundRect(c, -hr * 0.9, -hr * 0.85, hr * 1.8, hr * 0.7, hr * 0.2); c.fillStyle = PAL.pelo; c.fill(); },
  resorte(c, hr) { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; circle(c, Math.cos(a) * hr * 0.85, Math.sin(a) * hr * 0.85, hr * 0.38); inkFill(c, PAL.pelo, hr * 0.12); } skull(c, hr * 0.8, false, true); },
  gorra(c, hr) { skull(c, hr); c.beginPath(); c.arc(0, 0, hr * 1.02, Math.PI * 0.95, Math.PI * 2.05); c.closePath(); inkFill(c, PAL.maderaOsc, hr * 0.2);
    pathRoundRect(c, -hr * 0.7, -hr * 1.55, hr * 1.4, hr * 0.7, hr * 0.3); inkFill(c, PAL.maderaOsc, hr * 0.2); },
  colitas(c, hr) { for (const s of [-1, 1]) { circle(c, s * hr * 1.25, -hr * 0.1, hr * 0.5); inkFill(c, PAL.pelo, hr * 0.15);
      circle(c, s * hr * 0.95, -hr * 0.1, hr * 0.18); inkFill(c, PAL.magenta, hr * 0.1); }
    skull(c, hr, false, true); c.beginPath(); c.arc(0, 0, hr, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAL.pelo; c.fill(); },
  cabezota(c, hr) { skull(c, hr * 1.45, true); },
  bandana(c, hr) { skull(c, hr); c.fillStyle = PAL.pelo; c.beginPath(); c.arc(0, 0, hr, Math.PI * 1.1, Math.PI * 1.9); c.closePath(); c.fill();
    pathRoundRect(c, -hr * 1.05, -hr * 0.25, hr * 2.1, hr * 0.45, hr * 0.15); inkFill(c, PAL.maderaOsc, hr * 0.16);
    c.beginPath(); c.moveTo(hr * 0.9, 0); c.lineTo(hr * 1.7, hr * 0.5); c.lineTo(hr * 1.5, -hr * 0.2); c.closePath(); inkFill(c, PAL.maderaOsc, hr * 0.14); },
  melena(c, hr) { c.beginPath(); c.ellipse(0, hr * 0.35, hr * 1.2, hr * 1.5, 0, 0, Math.PI * 2); inkFill(c, PAL.maderaOsc, hr * 0.18);
    skull(c, hr * 0.85, false, true); c.beginPath(); c.moveTo(-hr * 0.85, 0); c.quadraticCurveTo(0, -hr * 1.3, hr * 0.85, 0); c.quadraticCurveTo(0, -hr * 0.4, -hr * 0.85, 0); c.fillStyle = PAL.maderaOsc; c.fill(); },
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
  // ---- entrega de 12 muñecos nuevos ----
  visera(c, hr) {                        // El Cambista: visera verde de cajero
    skull(c, hr); c.beginPath(); c.arc(0, 0, hr, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAL.pelo; c.fill();
    c.beginPath(); c.moveTo(-hr * 1.1, -hr * 0.2); c.quadraticCurveTo(0, -hr * 2.1, hr * 1.1, -hr * 0.2); c.closePath();
    c.fillStyle = 'rgba(31,138,76,0.85)'; c.fill(); c.lineWidth = hr * 0.16; c.strokeStyle = PAL.tinta; c.stroke();
  },
  antena(c, hr) {                        // La Antena: varilla con bolita
    skull(c, hr, true);
    c.beginPath(); c.moveTo(0, -hr * 0.6); c.lineTo(hr * 0.9, -hr * 2); c.lineWidth = hr * 0.22; c.strokeStyle = PAL.tinta; c.stroke();
    c.lineWidth = hr * 0.1; c.strokeStyle = PAL.plata; c.stroke();
    circle(c, hr * 0.9, -hr * 2, hr * 0.32); inkFill(c, PAL.madera, hr * 0.12);
  },
  gorrodormir(c, hr) {                   // El Madrugador: gorro de dormir con pompón
    skull(c, hr);
    c.beginPath(); c.moveTo(-hr * 1.02, 0); c.quadraticCurveTo(-hr * 0.2, -hr * 1.4, hr * 1.4, -hr * 1.6); c.lineTo(hr * 1.02, 0); c.closePath(); inkFill(c, PAL.noche, hr * 0.16);   // no azul: es del rival
    c.fillStyle = PAL.crema; c.fillRect(-hr * 1.02, -hr * 0.2, hr * 2.04, hr * 0.3);
    circle(c, hr * 1.45, -hr * 1.6, hr * 0.32); inkFill(c, PAL.crema, hr * 0.12);
  },
  despeinado(c, hr) {                    // El Tardón: pelo parado para todos lados
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + i / 8 * Math.PI, r0 = hr * 0.8, r1 = hr * (1.35 + (i % 2) * 0.35);
      c.beginPath(); c.moveTo(Math.cos(a - 0.18) * r0, Math.sin(a - 0.18) * r0); c.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      c.lineTo(Math.cos(a + 0.18) * r0, Math.sin(a + 0.18) * r0); c.closePath(); inkFill(c, PAL.maderaOsc, hr * 0.1);
    }
    skull(c, hr * 0.9, false, true);
  },
  orejas(c, hr) {                        // El Gato: gorro con orejas de gato
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * hr * 0.25, -hr * 0.8); c.lineTo(s * hr * 1.05, -hr * 1.55); c.lineTo(s * hr * 0.95, -hr * 0.3); c.closePath(); inkFill(c, PAL.tinta, hr * 0.12); }
    circle(c, 0, 0, hr * 1.02); inkFill(c, PAL.tinta, hr * 0.16);
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * hr * 0.4, -hr * 0.85); c.lineTo(s * hr * 0.9, -hr * 1.3); c.lineTo(s * hr * 0.85, -hr * 0.6); c.closePath(); c.fillStyle = PAL.magenta; c.fill(); }
  },
  agujas(c, hr) {                        // La Costurera: moño con dos agujas cruzadas
    skull(c, hr); c.beginPath(); c.arc(0, 0, hr * 1.02, 0, Math.PI * 2); c.fillStyle = PAL.maderaOsc; c.fill();
    circle(c, 0, hr * 0.2, hr * 0.55); inkFill(c, PAL.maderaOsc, hr * 0.14);
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-hr * 0.9 * s, -hr * 0.6); c.lineTo(hr * 0.9 * s, hr * 1.0); c.lineWidth = hr * 0.14; c.strokeStyle = PAL.plata; c.stroke(); }
    circle(c, 0, 0, hr * 1.02); c.lineWidth = hr * 0.16; c.strokeStyle = PAL.tinta; c.stroke();
  },
  llamas(c, hr) {                        // El Cabeza Caliente: pelo en llamas
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * hr * 0.42, h = hr * (1.5 + (i % 2 ? 0.2 : 0.55));
      c.beginPath(); c.moveTo(x - hr * 0.3, -hr * 0.4); c.quadraticCurveTo(x - hr * 0.2, -h * 0.7, x, -h); c.quadraticCurveTo(x + hr * 0.25, -h * 0.6, x + hr * 0.3, -hr * 0.4); c.closePath();
      inkFill(c, i % 2 ? PAL.madera : '#E9A15B', hr * 0.12);
    }
    skull(c, hr);
  },
  casco(c, hr) {                         // El Arquitecto: casco de obra con ala
    skull(c, hr);
    c.beginPath(); c.ellipse(0, -hr * 0.1, hr * 1.35, hr * 1.2, 0, Math.PI, Math.PI * 2); c.closePath(); inkFill(c, PAL.crema, hr * 0.16);
    c.beginPath(); c.moveTo(0, -hr * 1.28); c.lineTo(0, -hr * 0.1); c.lineWidth = hr * 0.2; c.strokeStyle = PAL.tinta; c.stroke();
  },
  sombrero(c, hr) {                      // El Colector: sombrero de ala ancha
    c.beginPath(); c.ellipse(0, 0, hr * 1.7, hr * 1.5, 0, 0, Math.PI * 2); inkFill(c, PAL.maderaOsc, hr * 0.16);
    circle(c, 0, 0, hr * 0.95); inkFill(c, PAL.madera, hr * 0.14);
    c.beginPath(); c.arc(0, 0, hr * 0.95, 0.2, Math.PI - 0.2); c.lineWidth = hr * 0.22; c.strokeStyle = PAL.tinta; c.stroke();
  },
  vendaje(c, hr) {                       // La Revancha: cabeza vendada con curita
    skull(c, hr);
    c.save(); circle(c, 0, 0, hr); c.clip(); c.fillStyle = PAL.crema;
    c.fillRect(-hr, -hr * 0.55, hr * 2, hr * 0.35); c.fillRect(-hr, -hr * 0.05, hr * 2, hr * 0.28); c.restore();
    circle(c, 0, 0, hr); c.lineWidth = hr * 0.16; c.strokeStyle = PAL.tinta; c.stroke();
    c.save(); c.translate(hr * 0.45, hr * 0.45); c.rotate(0.7); pathRoundRect(c, -hr * 0.35, -hr * 0.12, hr * 0.7, hr * 0.24, hr * 0.1); inkFill(c, '#E9A15B', hr * 0.08); c.restore();
  },
  sheriff(c, hr) {                       // El Justiciero: sombrero de sheriff con estrella
    c.beginPath(); c.ellipse(0, 0, hr * 1.6, hr * 1.25, 0, 0, Math.PI * 2); inkFill(c, PAL.madera, hr * 0.16);
    circle(c, 0, 0, hr * 0.9); inkFill(c, PAL.maderaOsc, hr * 0.14);
    c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? hr * 0.22 : hr * 0.5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r - hr * 0.05); }
    c.closePath(); inkFill(c, PAL.plata, hr * 0.08);
  },
  laurel(c, hr) {                        // El Capitán: corona de laurel
    skull(c, hr); c.beginPath(); c.arc(0, 0, hr, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = PAL.pelo; c.fill();
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 0.95 + i / 11 * Math.PI * 1.1, x = Math.cos(a) * hr * 1.05, y = Math.sin(a) * hr * 1.05;
      c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2); c.beginPath(); c.ellipse(0, 0, hr * 0.16, hr * 0.34, 0, 0, Math.PI * 2);
      inkFill(c, PAL.oro, hr * 0.07); c.restore();
    }
  },
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
function skull(c, hr, shine, noEars) {
  const lw = Math.max(1.5, hr * 0.2);
  if (!noEars) for (const sx of [-1, 1]) {                // orejas
    circle(c, sx * hr * 0.97, hr * 0.14, hr * 0.27); inkFill(c, PAL.piel, lw * 0.7);
    circle(c, sx * hr * 0.97, hr * 0.14, hr * 0.11); c.fillStyle = PAL.pielOsc; c.fill();
  }
  circle(c, 0, 0, hr); c.fillStyle = PAL.piel; c.fill();
  c.save(); circle(c, 0, 0, hr); c.clip();                // un solo tono de sombra, abajo a la derecha
  circle(c, hr * 0.42, hr * 0.48, hr * 1.02); c.fillStyle = PAL.pielOsc; c.globalAlpha = 0.5; c.fill(); c.restore();
  circle(c, 0, 0, hr); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke();
  if (shine) { c.beginPath(); c.arc(-hr * 0.3, -hr * 0.35, hr * 0.32, Math.PI, Math.PI * 1.6); c.lineWidth = hr * 0.18; c.strokeStyle = '#ffffff'; c.stroke(); }
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
/* ---------------- muñeco completo ----------------
   opts: {tm, rival, flash (0..1), dim, alpha, turn (rad, mira hacia el balón), shape (forzar forma)} */
function drawFigure(c, id, opts = {}) {
  const def = id ? GOLIN.DOLL[id] : null;
  const shape = opts.shape || (def ? def.shape : { kind:'circle', r: opts.r || 14 });
  const rect = shape.kind === 'rect' ? shape : null;
  const R = rect ? rect.h / 2 + 2 : shape.r;
  const hr = rect ? rect.h * 0.5 : Math.max(3.2, R * 0.58);
  const tm = opts.tm || 0;
  c.save();
  if (opts.alpha !== undefined) c.globalAlpha *= opts.alpha;
  drawBase(c, def ? def.rarity : 'comun', R, rect, tm, !!opts.rival);
  c.save();
  if (opts.turn) c.rotate(opts.turn);                     // mira hacia el balón / patea
  drawBody(c, R, rect, !!opts.rival);
  // sombra del cuello y cabeza, un poco adelante (hacia el arco rival)
  c.save(); c.translate(0, rect ? -rect.h * 0.28 : -R * 0.3);
  c.fillStyle = 'rgba(26,20,35,0.25)'; c.beginPath(); c.ellipse(hr * 0.12, hr * 0.28, hr * 0.95, hr * 0.7, 0, 0, Math.PI * 2); c.fill();
  if (opts.rival) (opts.head && HEADS[opts.head] ? HEADS[opts.head] : (x, h) => skull(x, h, true))(c, hr);
  else if (def) (HEADS[def.head] || skull)(c, hr);
  c.restore();
  c.restore();
  if (opts.flash > 0.02) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = `rgba(255,255,255,${0.8 * opts.flash})`; c.fillRect(-R * 3, -R * 3, R * 6, R * 6);
    c.globalCompositeOperation = 'source-over';
  }
  if (opts.dim) { c.fillStyle = 'rgba(26,20,35,0.55)'; c.beginPath(); c.ellipse(0, R * 0.2, (rect ? rect.w / 2 : R) * 1.3, R * 1.3, 0, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
/* Retrato para tarjetas y banca: el muñeco sobre un disco de papel crema */
function renderDollIcon(id, size) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d'), def = GOLIN.DOLL[id];
  circle(c, size / 2, size / 2, size * 0.47); c.fillStyle = PAL.noche; c.fill();
  c.save(); circle(c, size / 2, size / 2, size * 0.47); c.clip();          // foco de luz plano detrás del muñeco
  circle(c, size / 2, size * 0.42, size * 0.33); c.fillStyle = PAL.cancha; c.fill(); c.restore();
  circle(c, size / 2, size / 2, size * 0.47); c.lineWidth = Math.max(2, size * 0.04); c.strokeStyle = PAL.tinta; c.stroke();
  const R = def.shape.kind === 'rect' ? def.shape.w / 2 + 4 : def.shape.r;
  const k = (size * 0.29) / Math.max(R, 10);
  c.translate(size / 2, size * 0.46); c.scale(k, k);
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

/* ---------------- DON CHUCHO (el tendero) ----------------
   Retrato de frente, plano y con contorno grueso: calvo con patillas, bigotazo,
   una ceja arriba y un guiño (el tendero pícaro de la voz de marca), delantal crema
   sobre camisa verde y el lápiz de anotar el fiado… que no fía. */
function drawChucho(c, w, h, o = {}) {
  /* o: {eyes:'wink'|'open'|'closed'|'wide', party, glasses, arm:{a, prop}, paper (0..1), bob} */
  const k = Math.min(w / 240, h / 280);
  c.save(); c.scale(k, k); c.translate(0, o.bob || 0);
  const L = 6;                                            // contorno fijo de personaje
  // brazo izquierdo (el nuestro a la derecha de la pantalla es su izquierdo): quieto sobre el mostrador
  chuchoArm(c, 46, 214, 0.35, null, o.paper ? 'paperL' : null);
  // cuerpo: camisa y delantal
  pathRoundRect(c, 28, 196, 184, 110, 40); inkFill(c, PAL.noche, L);
  c.beginPath(); c.moveTo(70, 206); c.lineTo(170, 206); c.lineTo(182, 300); c.lineTo(58, 300); c.closePath(); inkFill(c, PAL.crema, L);
  c.beginPath(); c.moveTo(78, 206); c.lineTo(96, 170); c.moveTo(162, 206); c.lineTo(144, 170); c.lineWidth = 7; c.strokeStyle = PAL.crema; c.stroke();
  pathRoundRect(c, 96, 236, 48, 34, 6); inkFill(c, PAL.crema, 4);            // bolsillo
  c.save(); c.translate(128, 232); c.rotate(0.25); pathRoundRect(c, -3, -16, 7, 30, 2); inkFill(c, PAL.madera, 2.5); c.restore();
  // cuello y orejas
  pathRoundRect(c, 100, 168, 40, 36, 10); inkFill(c, PAL.pielOsc, L);
  for (const x of [58, 182]) { circle(c, x, 124, 14); inkFill(c, PAL.piel, L); }
  // cabeza
  c.beginPath(); c.ellipse(120, 118, 62, 70, 0, 0, Math.PI * 2); inkFill(c, PAL.piel, L);
  c.save(); c.beginPath(); c.ellipse(120, 118, 62, 70, 0, 0, Math.PI * 2); c.clip();
  c.fillStyle = 'rgba(26,20,35,0.14)'; c.beginPath(); c.ellipse(142, 136, 62, 70, 0, 0, Math.PI * 2); c.fill(); c.restore();
  // brillo de la calva y patillas
  c.beginPath(); c.arc(102, 70, 16, Math.PI * 1.05, Math.PI * 1.55); c.lineWidth = 6; c.strokeStyle = '#fff'; c.stroke();
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(120 + s * 56, 104, 11, 24, 0, 0, Math.PI * 2); inkFill(c, PAL.maderaOsc, 4); }
  // cejas: una arriba (pícaro); asustado, las dos arriba
  const eyes = o.eyes || 'wink';
  c.lineCap = 'round'; c.strokeStyle = PAL.tinta; c.lineWidth = 7;
  c.beginPath(); if (eyes === 'wide') { c.moveTo(84, 88); c.quadraticCurveTo(96, 80, 108, 88); } else { c.moveTo(84, 100); c.lineTo(108, 98); } c.stroke();
  c.beginPath(); c.moveTo(132, eyes === 'wide' ? 88 : 92); c.quadraticCurveTo(146, eyes === 'wide' ? 78 : 80, 160, 90); c.stroke();
  // ojos
  const closed = (x) => { c.beginPath(); c.moveTo(x - 10, 114); c.quadraticCurveTo(x, 106, x + 10, 114); c.lineWidth = 5; c.stroke(); };
  const open = (x, r) => { circle(c, x, 114, r); c.fillStyle = PAL.tinta; c.fill(); if (r > 6) { circle(c, x - 2, 111, 2.2); c.fillStyle = '#fff'; c.fill(); } };
  if (eyes === 'closed') { closed(96); closed(146); }
  else if (eyes === 'open') { open(96, 6); open(146, 6); }
  else if (eyes === 'wide') { open(96, 9); open(146, 9); }
  else { open(96, 6); closed(146); }
  // gafas de sol (modo sin fin)
  if (o.glasses) {
    c.lineWidth = 5; c.strokeStyle = PAL.tinta;
    for (const x of [96, 146]) { pathRoundRect(c, x - 19, 102, 38, 24, 8); c.fillStyle = PAL.tinta; c.fill(); c.beginPath(); c.moveTo(x - 10, 108); c.lineTo(x - 2, 108); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke(); }
    c.beginPath(); c.moveTo(115, 110); c.lineTo(127, 110); c.lineWidth = 5; c.strokeStyle = PAL.tinta; c.stroke();
  }
  // nariz
  c.beginPath(); c.ellipse(122, 134, 13, 11, 0, 0, Math.PI * 2); inkFill(c, PAL.pielOsc, 4);
  // bigotazo
  c.beginPath(); c.moveTo(122, 148);
  c.bezierCurveTo(104, 138, 80, 146, 70, 162); c.bezierCurveTo(86, 158, 100, 162, 122, 158);
  c.bezierCurveTo(144, 162, 158, 158, 174, 162); c.bezierCurveTo(164, 146, 140, 138, 122, 148); c.closePath();
  c.fillStyle = PAL.tinta; c.fill();
  // boca: sonrisa de lado, o una "o" si se asusta
  if (eyes === 'wide') { c.beginPath(); c.ellipse(128, 174, 7, 9, 0, 0, Math.PI * 2); c.fillStyle = PAL.tinta; c.fill(); }
  else { c.beginPath(); c.moveTo(118, 170); c.quadraticCurveTo(134, 180, 148, 166); c.lineWidth = 5; c.strokeStyle = PAL.tinta; c.stroke(); }
  c.lineCap = 'butt';
  // gorro de fiesta (le ganaste a un jefe)
  if (o.party) {
    c.save(); c.translate(132, 52); c.rotate(0.25);
    c.beginPath(); c.moveTo(-30, 10); c.lineTo(0, -62); c.lineTo(30, 10); c.closePath(); inkFill(c, PAL.madera, 5);
    c.save(); c.beginPath(); c.moveTo(-30, 10); c.lineTo(0, -62); c.lineTo(30, 10); c.closePath(); c.clip();
    c.fillStyle = PAL.crema; for (let y = -50; y < 10; y += 18) c.fillRect(-40, y, 80, 7); c.restore();
    c.beginPath(); c.moveTo(-30, 10); c.lineTo(0, -62); c.lineTo(30, 10); c.closePath(); c.lineWidth = 5; c.strokeStyle = PAL.tinta; c.stroke();
    circle(c, 0, -64, 9); inkFill(c, PAL.crema, 4); c.restore();
  }
  // periódico delante de la cara (lo va bajando)
  if (o.paper) {
    const y = 60 + (1 - o.paper) * 0 + o.paper * 70;
    c.save(); c.translate(0, y - 60);
    pathRoundRect(c, 30, 70, 180, 118, 6); inkFill(c, PAL.crema, 5);
    c.fillStyle = PAL.tinta; c.font = `16px ${FONT_NUM}`; c.textAlign = 'center'; c.fillText(o.headline || 'EL CLARÍN', 120, 96);
    c.fillRect(46, 106, 148, 4);
    for (let r = 0; r < 4; r++) { c.fillRect(46, 118 + r * 14, 64, 5); c.fillRect(126, 118 + r * 14, 68, 5); }
    c.restore();
  }
  // brazo derecho con lo que esté haciendo
  if (o.arm) chuchoArm(c, 194, 214, o.arm.a, o.arm.prop, null, o.arm.t || 0);
  c.restore();
}
/* Brazo de Don Chucho desde el hombro (x, y), girado `a` radianes (0 = hacia abajo), con un objeto en la mano */
function chuchoArm(c, x, y, a, prop, special, t = 0) {
  if (special === 'paperL') return;                       // con el periódico, las manos quedan detrás del papel
  c.save(); c.translate(x, y); c.rotate(a);
  pathRoundRect(c, -15, -6, 30, 70, 14); inkFill(c, PAL.noche, 5);                // manga
  pathRoundRect(c, -12, 52, 24, 34, 11); inkFill(c, PAL.piel, 5);                 // antebrazo
  c.translate(0, 92);
  circle(c, 0, 0, 14); inkFill(c, PAL.piel, 5);                                   // mano
  if (prop === 'wave') { for (let i = -1; i <= 1; i++) { pathRoundRect(c, i * 8 - 3, -24, 7, 18, 3); inkFill(c, PAL.piel, 3); } }
  else if (prop === 'cup') {                               // pocillo de tinto (siempre derecho)
    c.rotate(-a);
    pathRoundRect(c, -16, -30, 32, 30, 6); inkFill(c, PAL.crema, 4);
    c.beginPath(); c.arc(18, -16, 8, -Math.PI / 2, Math.PI / 2); c.lineWidth = 4; c.strokeStyle = PAL.tinta; c.stroke();
    c.fillStyle = PAL.maderaOsc; c.fillRect(-12, -27, 24, 5);
    for (let i = 0; i < 3; i++) {                        // vapor
      c.beginPath(); const sx = -8 + i * 8, ph = t / 180 + i;
      c.moveTo(sx, -36); c.bezierCurveTo(sx + 6 * Math.sin(ph), -46, sx - 6 * Math.sin(ph), -56, sx + 3 * Math.sin(ph), -68);
      c.lineWidth = 3; c.strokeStyle = 'rgba(244,234,213,0.8)'; c.stroke();
    }
  } else if (prop === 'coin') {                             // moneda que gira entre los dedos
    c.rotate(-a);
    const sx = Math.abs(Math.cos(t / 120));
    c.beginPath(); c.ellipse(0, -22, 13 * Math.max(0.15, sx), 13, 0, 0, Math.PI * 2); inkFill(c, PAL.amarillo, 3);
    if (sx > 0.5) { c.fillStyle = PAL.tinta; c.font = `13px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, -21); }
  } else if (prop === 'broom') {                            // escoba: las cerdas hacia el mostrador
    c.save(); c.rotate(-a + 0.35);
    pathRoundRect(c, -4, -60, 8, 140, 3); inkFill(c, PAL.madera, 3);
    c.beginPath(); c.moveTo(-20, 80); c.lineTo(20, 80); c.lineTo(28, 118); c.lineTo(-28, 118); c.closePath(); inkFill(c, '#E9A15B', 4);
    c.restore();
  } else if (prop === 'empanada') {                         // le ofrece una empanada
    c.rotate(-a);
    c.beginPath(); c.arc(0, -22, 22, Math.PI, 0); c.closePath(); inkFill(c, PAL.madera, 4);
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 9, -22, 3, 0, Math.PI); c.lineWidth = 2; c.strokeStyle = PAL.maderaOsc; c.stroke(); }
  }
  c.restore();
}
function chuchoImage(w, h) {
  const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
  const c = cv.getContext('2d'); c.scale(2, 2); drawChucho(c, w, h, { arm: { a: 0.25 } });
  return cv.toDataURL();
}
