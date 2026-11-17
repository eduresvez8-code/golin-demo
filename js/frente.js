/* Vista DE FRENTE de cada muñeco, parado en su peana y atravesado por la barra.
   La usan el álbum del menú (retratos de las cartas y de la ficha) y la hoja de modelos; la mesa se ve desde arriba.
   Usa las ayudas de js/art.js y js/munecos.js.
   Medidas en una cuadrícula de 150: el centro es x = 0; cabeza en (0, 36) con radio 17; hombros en y = 59;
   manos en (±28, 88); pies en y = 126; peana en y = 130. Sin caras. */
'use strict';
const FRONT = {};
const FL = 2.6;                                            // contorno de tinta, fijo
const fInk = (c, fill, lw = FL) => inkFill(c, fill, lw);

function fBase(c, rar) {
  const cy = 130, rx = 40, ry = 9;
  if (rar === 'legendario') return fGem(c, cy, rx, ry);
  const top = rar === 'raro' ? PAL.plata : rar === 'especial' ? PAL.oroLuz : PAL.madera;
  const edge = rar === 'raro' ? PAL.plataOsc : rar === 'especial' ? PAL.oro : PAL.maderaOsc;
  ell(c, 5, cy + 10, rx, ry); c.fillStyle = 'rgba(26,20,35,0.28)'; c.fill();
  ell(c, 0, cy + 6, rx, ry); fInk(c, edge);
  c.fillStyle = edge; c.fillRect(-rx, cy, rx * 2, 6);
  seg(c, -rx, cy, -rx, cy + 6, FL, PAL.tinta); seg(c, rx, cy, rx, cy + 6, FL, PAL.tinta);
  ell(c, 0, cy, rx, ry); c.fillStyle = top; c.fill();
  c.save(); ell(c, 0, cy, rx, ry); c.clip();
  if (rar === 'comun') { c.strokeStyle = 'rgba(122,68,32,0.55)'; c.lineWidth = 1.6; for (const k of [0.4, 0.7]) { c.beginPath(); c.ellipse(0, cy, rx * k, ry * k, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
  else if (rar === 'raro') { for (const x of [-31, 31]) { circle(c, x, cy, 2); c.fillStyle = PAL.plataOsc; c.fill(); } c.beginPath(); c.ellipse(0, cy, rx * 0.82, ry * 0.7, 0, Math.PI * 1.1, Math.PI * 1.4); c.lineWidth = 2.4; c.strokeStyle = '#ffffff'; c.stroke(); }
  else { c.beginPath(); c.ellipse(0, cy, rx * 0.8, ry * 0.7, 0, Math.PI * 0.15, Math.PI * 0.85); c.lineWidth = 2.2; c.strokeStyle = PAL.oro; c.stroke(); c.beginPath(); c.ellipse(0, cy, rx * 0.82, ry * 0.7, 0, Math.PI * 1.1, Math.PI * 1.4); c.lineWidth = 2.6; c.strokeStyle = '#ffffff'; c.stroke(); }
  c.restore();
  ell(c, 0, cy, rx, ry); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
}
/* esmeralda de frente: la mesa octogonal arriba y el canto con facetas verticales; contorno grueso y brillos */
function fGem(c, cy, rx, ry) {
  const L = FL * 1.5, h = 8, out = gemPath(c, cy, rx, ry), inn = gemPath(c, cy - 0.4, rx, ry, 0.58);
  c.fillStyle = 'rgba(26,20,35,0.28)'; pathPts(c, out.map(p => [p[0] + 5, p[1] + h + 3])); c.fill();
  const lower = [out[2], out[3], out[4], out[5], out[6], out[7]];                                  // el canto: la mitad de abajo, bajada h
  for (let i = 0; i < lower.length - 1; i++) {
    const a = lower[i], b = lower[i + 1];
    pathPts(c, [a, b, [b[0], b[1] + h], [a[0], a[1] + h]]); c.fillStyle = i % 2 ? PAL.esmeralda : PAL.esmeraldaOsc; c.fill();
  }
  pathPts(c, lower.concat(lower.slice().reverse().map(p => [p[0], p[1] + h])));                // contorno del canto
  c.lineWidth = L; c.strokeStyle = PAL.tinta; c.stroke();
  for (const p of [out[3], out[4], out[5], out[6]]) seg(c, p[0], p[1], p[0], p[1] + h, 1.2, 'rgba(26,20,35,0.5)');
  const tone = [PAL.esmeraldaLuz, PAL.esmeralda, PAL.esmeralda, PAL.esmeraldaOsc, PAL.esmeraldaOsc, PAL.esmeralda, PAL.esmeraldaLuz, PAL.esmeraldaLuz];
  for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; pathPts(c, [out[i], out[j], inn[j], inn[i]]); c.fillStyle = tone[i]; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(26,20,35,0.45)'; c.stroke(); }
  pathPts(c, inn); c.fillStyle = PAL.esmeralda; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(26,20,35,0.45)'; c.stroke();
  seg(c, out[7][0] + 5, out[7][1], out[0][0] + 2, out[0][1] + 2.5, 2, '#ffffff');
  pathPts(c, out); c.lineWidth = L; c.strokeStyle = PAL.tinta; c.stroke();
  twinkle(c, -rx - 2, cy - 6, 7); twinkle(c, rx - 4, cy + 7, 5);
}
function fBar(c) { c.fillStyle = PAL.tinta; c.fillRect(-130, 62, 260, 9.6); c.fillStyle = PAL.plata; c.fillRect(-130, 64.2, 260, 5.2); c.fillStyle = '#ffffff'; c.fillRect(-130, 64.8, 260, 1.4); }
function fTopes(c, W) { for (const s of [-1, 1]) { pathRoundRect(c, s * (W + 14) - 4, 59, 8, 15.6, 2); fInk(c, PAL.plata, 2); } }
function fLegs(c, dx = 0, spread = 8) {
  for (const s of [-1, 1]) {
    const x = dx + s * spread;
    pathRoundRect(c, x - 6, 98, 12, 22, 3); fInk(c, PAL.piel);                                    // pierna
    pathRoundRect(c, x - 6, 108, 12, 12, 2); fInk(c, PAL.crema);                                  // media
    pathRoundRect(c, x - 8 + s, 117.5, 16, 9.5, 4); fInk(c, PAL.tinta);                            // guayo
    seg(c, x - 4, 123, x + 5, 123, 1.6, PAL.crema);
  }
  pathRoundRect(c, dx - spread - 9, 89, spread * 2 + 18, 16, 5); fInk(c, PAL.tinta);              // pantaloneta
}
/* brazo: hombro → (codo) → mano. o: {hand, elbow, sleeve, long, W} */
function fArm(c, s, o = {}) {
  const W = o.W || 22, sh = [s * W, 59], hand = o.hand || [s * (W + 6), 88], pts = o.elbow ? [sh, o.elbow, hand] : [sh, hand];
  const path = p => { c.beginPath(); p.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); };
  const t = o.long ? (o.elbow ? 1 : 0.82) : 0.55, a = pts[0], b = pts[1], m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  c.lineCap = 'round'; c.lineJoin = 'round';
  path(pts); c.lineWidth = 9 + FL * 2; c.strokeStyle = PAL.tinta; c.stroke(); path(pts); c.lineWidth = 9; c.strokeStyle = PAL.piel; c.stroke();
  path([a, m]); c.lineWidth = 10 + FL * 2; c.strokeStyle = PAL.tinta; c.stroke(); path([a, m]); c.lineWidth = 10; c.strokeStyle = o.sleeve || PAL.camisa; c.stroke();
  c.lineCap = 'butt'; c.lineJoin = 'miter';
  fHand(c, hand[0], hand[1]);
}
function fHand(c, x, y) { circle(c, x, y, 5.2); fInk(c, PAL.piel, FL * 0.9); }
function fTorso(c, kit = {}, W = 22) {
  const t = () => pathRoundRect(c, -W, 52, W * 2, 44, 9);
  t(); c.fillStyle = kit.jersey || PAL.camisa; c.fill();
  c.save(); t(); c.clip();
  c.fillStyle = kit.stripe || PAL.franja;
  if (kit.pattern) kit.pattern(c, W); else for (const x of [-0.55, 0.2]) c.fillRect(W * x, 50, W * 0.34, 50);
  c.fillStyle = 'rgba(26,20,35,0.13)'; c.fillRect(W * 0.45, 50, W, 50);
  c.restore();
  t(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
  c.beginPath(); c.moveTo(-6, 52.6); c.lineTo(0, 60); c.lineTo(6, 52.6); c.lineWidth = FL; c.strokeStyle = kit.stripe || PAL.franja; c.stroke();   // cuello en V
}
function fHead(c, r = 17, y = 36, noEars) {
  if (!noEars) for (const s of [-1, 1]) { circle(c, s * (r - 0.5), y + 2, r * 0.3); fInk(c, PAL.piel, FL * 0.9); }
  circle(c, 0, y, r); c.fillStyle = PAL.piel; c.fill();
  c.save(); circle(c, 0, y, r); c.clip(); circle(c, r * 0.42, y + r * 0.48, r); c.fillStyle = PAL.pielOsc; c.globalAlpha = 0.45; c.fill(); c.restore();
  circle(c, 0, y, r); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
}
/* pelo de frente: cubre la cabeza por arriba. d < 0 baja por los lados (patillas); lift sube la línea de la frente */
function fHair(c, col, r = 17, y = 36, d = -0.05, lift = 0.25) {
  const a0 = Math.PI * (1 + d), R = r + 0.6, x0 = Math.cos(a0) * R, y0 = y + Math.sin(a0) * R;
  c.beginPath(); c.arc(0, y, R, a0, Math.PI * (2 - d)); c.quadraticCurveTo(0, y - r * lift * 1.6, x0, y0); c.closePath(); fInk(c, col);
}
function fText(c, txt, x, y, size, col) { c.fillStyle = col; c.font = `${size}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x, y); }

/* Dibuja el muñeco de frente en un lienzo de w × h. Devuelve false si ese muñeco no tiene vista de frente. */
function drawFront(c, id, w, h) {
  const def = GOLIN.DOLL[id], F = FRONT[id];
  if (!def || !F) return false;
  c.save(); c.translate(w / 2, h * 0.125); c.scale(w / 150 * 0.855, w / 150 * 0.855);
  fBase(c, def.rarity);
  if (F.scale) { if (!F.flip && !F.draw) fBar(c); c.translate(0, 126); c.scale(F.scale, F.scale); c.translate(0, -126); }   // la barra no se achica con el muñeco
  if (F.draw) { F.draw(c); c.restore(); return true; }
  const W = F.W || 22, kit = F.kit || {}, hr = F.headR || 17, hy = F.headY || 36;
  if (F.flip) { fBar(c); c.translate(0, 132); c.scale(1, -1); }                                    // de cabeza, girando sobre la barra
  if (F.behind) F.behind(c);
  if (!F.flip && !F.scale) fBar(c);
  fTopes(c, W);
  for (const dx of F.legX || [0]) fLegs(c, dx, F.spread || 8);
  pathRoundRect(c, -5.5, hy + hr - 7, 11, 14, 3); fInk(c, PAL.pielOsc);                            // cuello
  const arms = F.arms || [{}, {}];
  [-1, 1].forEach((s, i) => fArm(c, s, Object.assign({ W, sleeve: kit.jersey, long: kit.longSleeve }, arms[i])));
  fTorso(c, kit, W);
  if (F.over) F.over(c);
  if (F.head) F.head(c); else fHead(c, hr, hy);
  if (F.hair) F.hair(c);
  if (F.prop) F.prop(c);
  c.restore();
  return true;
}

/* ============================== COMUNES ============================== */
FRONT.poste = { draw(c) {
  fBar(c); fTopes(c, 0);                                                                       // va en la barra, como todos
  const net = [[9, 24], [42, 36], [35, 88], [11, 72]];
  poly(c, net); c.fillStyle = 'rgba(244,234,213,0.6)'; c.fill();
  c.save(); poly(c, net); c.clip(); for (let i = -6; i < 10; i++) { seg(c, i * 7, 10, i * 7 + 52, 96, 1.4, COL.blanco); seg(c, i * 7 + 52, 10, i * 7, 96, 1.4, COL.blanco); } c.restore();
  poly(c, net); c.lineWidth = 2; c.strokeStyle = PAL.tinta; c.stroke();
  const tube = () => pathRoundRect(c, -11, 22, 22, 107, 4);
  tube(); c.fillStyle = COL.blanco; c.fill();
  c.save(); tube(); c.clip(); c.fillStyle = PAL.tinta; c.fillRect(-12, 50, 24, 13); c.fillRect(-12, 92, 24, 13); c.fillStyle = 'rgba(26,20,35,0.14)'; c.fillRect(4, 20, 10, 112); c.restore();
  tube(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
  ell(c, 0, 22, 11, 4.6); fInk(c, COL.blanco); ell(c, 0, 22, 6, 2.2); c.fillStyle = PAL.tinta; c.fill();
  ell(c, -6, 80, 2.6, 5, 0.2); c.fillStyle = 'rgba(26,20,35,0.3)'; c.fill();                       // el balonazo: una abolladura de lado
  circle(c, 11, 27, 3.6); fInk(c, COL.blanco, 2);
} };
FRONT.muro = { W: 38, spread: 18,   // ancho de pared, pero con dos piernas (antes dibujaba cuatro)
  kit: { jersey: COL.ladrillo, pattern(c, W) { for (let r = 0; r < 4; r++) { const y = 52 + r * 11; if (r) seg(c, -W, y, W, y, 1.8, PAL.crema); for (let x = -W + (r % 2 ? 11 : 3); x < W; x += 19) seg(c, x, y, x, y + 11, 1.8, PAL.crema); } } },
  head(c) {
    for (const s of [-1, 1]) { circle(c, s * 16.5, 38, 5); fInk(c, PAL.piel, 2.3); }
    const box = () => pathRoundRect(c, -16.5, 19, 33, 33, 6);
    box(); c.fillStyle = PAL.piel; c.fill();
    c.save(); box(); c.clip(); c.fillStyle = PAL.pelo; c.fillRect(-17, 18, 34, 11); c.fillStyle = 'rgba(138,82,48,0.45)'; c.fillRect(6, 29, 12, 24); c.restore();
    box(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
  } };
FRONT.antena = { hair(c) {
  shine(c, -5, 31, 8, 1.05, 1.5, 2.8);
  rod(c, 0, 18, -19, -3, 2.4, PAL.plata, 1.6); rod(c, 0, 18, 24, -9, 2.4, PAL.plata, 1.6);
  pathRoundRect(c, -8, 14, 16, 8, 3); fInk(c, PAL.maderaOsc);
  poly(c, [[19, -14], [27, -16], [32, -11], [30, -4], [23, -3], [18, -8]]); fInk(c, PAL.plata, 2.2);
  seg(c, 22, -11, 27, -9, 1.8, '#ffffff');
  for (const r of [10, 15]) shine(c, 25, -9, r, -0.28, 0.2, 2.2, PAL.magenta);
} };
FRONT.lechero = { arms: [{}, { hand: [31, 51] }],
  hair(c) {
    c.beginPath(); c.arc(0, 36, 17.8, Math.PI * 1.0, Math.PI * 2.0); c.closePath(); fInk(c, COL.blanco);
    ell(c, 2, 36, 15, 3.8); fInk(c, PAL.madera);                                                   // visera
    circle(c, 0, 18.6, 2.3); fInk(c, PAL.madera, 1.6);
  },
  prop(c) {
    for (const x of [19.5, 44.5]) shine(c, x, 34, 4.4, x < 30 ? 0.5 : 1.5, x < 30 ? 1.5 : 2.5, 2.4, PAL.tinta);   // asas
    pathRoundRect(c, 20, 22, 24, 36, 6); fInk(c, PAL.plata);
    pathRoundRect(c, 25, 11, 14, 13, 3); fInk(c, PAL.plata);
    pathRoundRect(c, 23, 6.5, 18, 6.5, 3); fInk(c, PAL.plataOsc);
    seg(c, 24.5, 28, 24.5, 52, 2.2, '#ffffff');
    circle(c, 47, 15, 2.8); fInk(c, COL.blanco, 1.8);
    fHand(c, 31, 52);
  } };
FRONT.hincha = { arms: [{ hand: [-31, 13] }, { hand: [31, 15] }],
  hair(c) { fHair(c, PAL.maderaOsc); },
  prop(c) {
    const sc = () => { c.beginPath(); c.moveTo(-41, 4); c.quadraticCurveTo(0, 12, 41, 6); c.lineTo(41, 18); c.quadraticCurveTo(0, 24, -41, 16); c.closePath(); };
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) seg(c, s * 41, 8 + j * 3.6, s * 47, 10 + j * 4.2, 2, PAL.tinta);
    sc(); c.fillStyle = PAL.crema; c.fill();
    c.save(); sc(); c.clip(); c.fillStyle = PAL.franja; for (let i = 0; i < 5; i++) c.fillRect(-39 + i * 17.5, 0, 8.6, 30); c.restore();
    sc(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
    fHand(c, -31, 12); fHand(c, 31, 14);
  } };
FRONT.corneta = { arms: [{}, { hand: [17, 41], elbow: [35, 68] }],
  hair(c) {
    const cap = () => { c.beginPath(); c.arc(0, 36, 17.8, Math.PI * 0.98, Math.PI * 2.02); c.closePath(); };
    cap(); c.fillStyle = PAL.franja; c.fill();
    c.save(); cap(); c.clip(); for (let x = -14; x <= 14; x += 7) seg(c, x, 14, x, 40, 2, PAL.crema); c.restore();
    cap(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
    pathRoundRect(c, -19, 30.5, 38, 7.5, 3); fInk(c, PAL.crema);
    circle(c, 1, 15, 6.2); fInk(c, PAL.crema);
  },
  prop(c) {
    c.save(); c.translate(6, 47); c.rotate(-0.74);
    poly(c, [[0, -2], [44, -8], [44, 8], [0, 2]]); fInk(c, PAL.madera); seg(c, 24, -5.4, 24, 5.4, 2.8, PAL.crema);
    ell(c, 44, 0, 4.2, 11); fInk(c, PAL.maderaOsc);
    c.restore();
    fHand(c, 17, 40);
  } };
FRONT.abuela = { arms: [{ hand: [-27, 84], sleeve: PAL.maderaOsc, long: true }, { sleeve: PAL.maderaOsc, long: true }],
  over(c) {
    c.lineJoin = 'round'; poly(c, [[-31, 54], [31, 54], [27, 70], [0, 91], [-27, 70]]); fInk(c, PAL.maderaOsc); c.lineJoin = 'miter';
    c.setLineDash([3.6, 3]); c.beginPath(); c.moveTo(-24, 69); c.lineTo(0, 87); c.lineTo(24, 69); c.lineWidth = 2.6; c.strokeStyle = PAL.crema; c.stroke(); c.setLineDash([]);
  },
  hair(c) { circle(c, 1, 14, 8.6); fInk(c, COL.canas); fHair(c, COL.canas, 17, 36, -0.12, 0.3); },
  prop(c) {
    moneda(c, -31, 72, 4.8);
    c.beginPath(); c.arc(-27, 80, 8, 0, Math.PI); c.closePath(); fInk(c, PAL.madera);
    for (const s of [-1, 1]) { circle(c, -27 + s * 2, 79.4, 1.9); fInk(c, PAL.plata, 1.2); }
  } };
FRONT.madrugador = { arms: [{ hand: [-28, 82] }, {}],
  hair(c) {
    const cone = () => { c.beginPath(); c.moveTo(-18, 31); c.quadraticCurveTo(-13, 6, 6, 8); c.quadraticCurveTo(29, 10, 34, 39); c.quadraticCurveTo(23, 22, 18, 31); c.closePath(); };
    cone(); c.fillStyle = PAL.noche; c.fill();
    c.save(); cone(); c.clip(); c.fillStyle = PAL.crema; for (let y = 4; y < 44; y += 9) c.fillRect(-22, y, 62, 3.6); c.restore();
    cone(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
    pathRoundRect(c, -19, 27, 38, 7.5, 3); fInk(c, PAL.crema);
    circle(c, 34, 43, 5.6); fInk(c, PAL.crema);
  },
  prop(c) {
    shine(c, -36, 74.5, 3.6, 0.5, 1.5, 2.2, PAL.tinta);
    pathRoundRect(c, -35.5, 68.5, 15, 12, 3); fInk(c, PAL.crema);
    c.fillStyle = PAL.maderaOsc; c.fillRect(-33.6, 70.4, 11.2, 2.8);
    for (const x of [-31, -25]) { c.beginPath(); c.moveTo(x, 65); c.quadraticCurveTo(x + 4, 61, x, 57); c.quadraticCurveTo(x - 4, 53, x, 49); c.lineWidth = 1.8; c.strokeStyle = 'rgba(26,20,35,0.45)'; c.stroke(); }
    fHand(c, -28, 83);
  } };
FRONT.canterano = {
  over(c) {
    c.lineJoin = 'round'; poly(c, [[-25, 54], [-9, 52], [0, 59], [9, 52], [25, 54], [28, 100], [4, 106], [-29, 101]]); fInk(c, COL.violeta); c.lineJoin = 'miter';
    c.beginPath(); c.moveTo(-27, 95); c.lineTo(4, 100); c.lineTo(26, 94); c.lineWidth = 2.4; c.strokeStyle = PAL.crema; c.stroke();
  },
  hair(c) {
    ell(c, -16, 25, 9, 3.4, -0.6); fInk(c, PAL.franja);                                            // la visera, atrás
    c.beginPath(); c.arc(0, 36, 17.8, Math.PI * 1.0, Math.PI * 2.0); c.closePath(); fInk(c, PAL.franja);
    for (const x of [-8, 8]) { c.beginPath(); c.moveTo(0, 18.4); c.quadraticCurveTo(x, 22, x * 1.3, 35.6); c.lineWidth = 1.5; c.strokeStyle = 'rgba(26,20,35,0.4)'; c.stroke(); }
    circle(c, 0, 18.6, 2.3); fInk(c, PAL.crema, 1.6);
  } };

/* ============================== RAROS ============================== */
FRONT.cambista = { arms: [{ hand: [-30, 77] }, {}],
  over(c) {
    for (const s of [-1, 1]) { poly(c, [[s * 5, 54], [s * 22, 54], [s * 22, 95], [s * 9, 95]]); fInk(c, COL.oscuro); }
    seg(c, -22, 90, 22, 90, 2.4, PAL.tinta);
    pathRoundRect(c, 3, 85.5, 17, 10, 3.4); fInk(c, PAL.madera, 2.2);
  },
  hair(c) {
    c.save(); c.translate(0, 23); c.rotate(-0.12);
    pathRoundRect(c, -13, -15, 26, 19, 5); fInk(c, COL.oscuro);
    c.fillStyle = PAL.madera; c.fillRect(-12, -2, 24, 4.6);
    ell(c, 0, 4, 26, 5.2); fInk(c, PAL.maderaOsc);
    c.restore();
  },
  prop(c) {
    c.save(); c.translate(-30, 77);
    for (let i = 0; i < 4; i++) { c.save(); c.rotate(-0.95 + i * 0.42); pathRoundRect(c, -4.4, -28, 8.8, 28, 1.5); fInk(c, PAL.crema, 2); c.fillStyle = PAL.amarillo; c.fillRect(-3.3, -22, 6.6, 6.4); c.restore(); }
    c.restore();
    fHand(c, -30, 78);
  } };
FRONT.rebotador = { arms: [{ hand: [-37, 80] }, { hand: [37, 80] }],
  over(c) {
    pathRoundRect(c, -42, 79, 84, 19, 9.5); fInk(c, COL.oscuroSombra);                             // la llanta
    for (let x = -34; x <= 34; x += 8.5) seg(c, x, 83.5, x - 2.2, 94, 2, COL.brillo);
    seg(c, -32, 82.6, -9, 82.6, 2, '#ffffff');
  },
  hair(c) {
    pathRoundRect(c, -9, 17.4, 18, 5, 2); fInk(c, PAL.plata, 2);
    const z = () => { c.beginPath(); c.moveTo(-7, 18); for (let i = 0; i < 6; i++) c.lineTo(i % 2 ? -8 : 8, 14 - i * 4.4); };
    c.lineJoin = 'round'; c.lineCap = 'round'; z(); c.lineWidth = 6.6; c.strokeStyle = PAL.tinta; c.stroke(); z(); c.lineWidth = 2.8; c.strokeStyle = PAL.plata; c.stroke(); c.lineJoin = 'miter'; c.lineCap = 'butt';
  },
  prop(c) { fHand(c, -37, 79); fHand(c, 37, 79); } };
FRONT.ninamal = { arms: [{}, { hand: [29, 85] }],
  hair(c) {
    for (const s of [-1, 1]) {
      const x1 = s * 39, y1 = s < 0 ? 22 : 28;
      const braid = (w, col) => { c.beginPath(); c.moveTo(s * 14, 35); c.quadraticCurveTo(s * 27, 41, x1, y1); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
      c.lineCap = 'round'; braid(10, PAL.tinta); braid(5.2, PAL.madera); c.lineCap = 'butt';
      for (const t of [0.42, 0.66]) seg(c, s * (14 + t * 22), 39 - t * 6, s * (16 + t * 22), 33 - t * 7, 1.6, PAL.tinta);
      circle(c, x1, y1, 4.8); fInk(c, COL.violeta, 2);
    }
    fHair(c, PAL.madera, 17, 36, -0.1, 0.3); seg(c, 0, 19, 0, 28, 1.8, PAL.tinta);
  },
  prop(c) {
    rod(c, 29, 84, 29, 74, 2.6, PAL.maderaOsc, 1.5); rod(c, 29, 74, 23, 64, 2.4, PAL.maderaOsc, 1.5); rod(c, 29, 74, 35, 64, 2.4, PAL.maderaOsc, 1.5);
    c.beginPath(); c.moveTo(23, 64); c.quadraticCurveTo(29, 70, 35, 64); c.lineWidth = 1.6; c.strokeStyle = PAL.tinta; c.stroke();
    fHand(c, 29, 86);
  } };
FRONT.cabezon = { W: 19, headR: 27, headY: 28,
  head(c) {
    for (const s of [-1, 1]) { circle(c, s * 26.5, 33, 6); fInk(c, PAL.piel, 2.3); }
    circle(c, 19, 7, 8.2); fInk(c, PAL.rojo);                                                      // el chichón
    fHead(c, 27, 28, true); shine(c, -9, 20, 13, 1.05, 1.5, 3.6);
    c.save(); c.translate(17, 9); c.rotate(0.6); for (let i = 0; i < 2; i++) { pathRoundRect(c, -7.4, -2.3, 14.8, 4.6, 2); fInk(c, PAL.crema, 1.8); c.rotate(Math.PI / 2); } c.restore();
    for (const [x, a] of [[-6, -5], [-1, 1], [4, 6]]) { c.beginPath(); c.moveTo(x, 4); c.quadraticCurveTo(x + a * 0.3, -3, x + a, -5); c.lineWidth = 1.8; c.strokeStyle = PAL.tinta; c.stroke(); }
  } };
FRONT.garra = {
  over(c) { c.lineCap = 'round'; for (let i = 0; i < 3; i++) seg(c, -14 + i * 5.4, 66, -10 + i * 5.4, 81, 2.3, PAL.tinta); c.lineCap = 'butt'; },
  hair(c) {
    poly(c, [[15, 27], [37, 22], [34, 35]]); fInk(c, PAL.franja, 2.2); poly(c, [[15, 31], [35, 43], [26, 47]]); fInk(c, PAL.franja, 2.2);
    fHair(c, PAL.pelo, 17, 36, 0.04, 0.2);
    pathRoundRect(c, -19, 24, 38, 8.6, 3); fInk(c, PAL.franja); circle(c, 17.5, 29, 4.2); fInk(c, PAL.franja, 2.2);
  } };
FRONT.pirlito = { hair(c) {
  c.lineJoin = 'round'; poly(c, [[-11, 43], [11, 43], [10, 54], [0, 67], [-10, 54]]); fInk(c, PAL.maderaOsc); c.lineJoin = 'miter';   // barba
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(0, 18.4); c.quadraticCurveTo(s * 25, 15, s * 21.5, 40); c.quadraticCurveTo(s * 23, 57, s * (s < 0 ? 15 : 17), s < 0 ? 66 : 62);
    c.quadraticCurveTo(s * 13, 46, s * 11.5, 35); c.quadraticCurveTo(s * 9, 25, 0, 25); c.closePath(); fInk(c, PAL.maderaOsc);
    c.beginPath(); c.moveTo(s * 8, 22); c.quadraticCurveTo(s * 18, 28, s * 17, 52); c.lineWidth = 1.8; c.strokeStyle = PAL.madera; c.stroke();
  }
} };
FRONT.kante = {
  head(c) { for (const s of [-1, 1]) { circle(c, s * 20.5, 36, 8.8); fInk(c, PAL.piel); circle(c, s * 21.5, 36, 3.8); c.fillStyle = PAL.pielOsc; c.fill(); } fHead(c, 17, 36, true); },
  hair(c) {
    fHair(c, PAL.pelo, 17, 36, 0.2, 0.52);
    for (const [x, y, r] of [[28, 16, 3.4], [35, 26, 2.6], [23, 7, 2.4]]) { c.beginPath(); c.moveTo(x, y - r * 1.7); c.quadraticCurveTo(x + r * 1.4, y + r * 0.4, x, y + r); c.quadraticCurveTo(x - r * 1.4, y + r * 0.4, x, y - r * 1.7); c.closePath(); fInk(c, COL.blanco, 1.8); }
  } };
FRONT.rambos = { kit: KIT_MALDITO, arms: [{ elbow: [-41, 74], hand: [-25, 90] }, { elbow: [41, 74], hand: [25, 90] }],
  hair(c) { c.lineJoin = 'round'; poly(c, [[-6, 25], [-8, 12], [-3, 14], [0, 1], [3.4, 14], [8, 11], [6, 25]]); fInk(c, PAL.pelo, 2.2); c.lineJoin = 'miter'; seg(c, 0, 8, 0, 22, 1.6, COL.brillo); },
  prop(c) { drawCard(c, 14, 110, 11.5, PAL.rojo, 0.3); } };
FRONT.tardon = {
  hair(c) {
    for (const [a, len] of [[-1.8, 26], [-1.38, 34], [-0.96, 26], [-0.54, 32], [-0.12, 25]]) { poly(c, [[Math.cos(a - 0.22) * 14, 36 + Math.sin(a - 0.22) * 14], [Math.cos(a + 0.06) * len, 36 + Math.sin(a + 0.06) * len], [Math.cos(a + 0.22) * 14, 36 + Math.sin(a + 0.22) * 14]]); fInk(c, PAL.maderaOsc, 2.1); }
    fHair(c, PAL.maderaOsc, 17, 36, -0.04, 0.2);
  },
  prop(c) { c.save(); c.translate(15, 53); c.rotate(0.35); pathRoundRect(c, -3.6, -10, 7.2, 10, 1); fInk(c, COL.blanco, 1.8); seg(c, -1.8, -6.4, 1.8, -6.4, 1.1, PAL.tinta); seg(c, -1.8, -3.8, 1, -3.8, 1.1, PAL.tinta); c.restore(); } };
FRONT.gato = {
  behind(c) { const t = (w, col) => { c.beginPath(); c.moveTo(14, 97); c.bezierCurveTo(46, 106, 53, 80, 42, 62); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }; c.lineCap = 'round'; t(10, PAL.tinta); t(4.8, COL.oscuro); c.lineCap = 'butt'; },
  hair(c) {
    c.lineJoin = 'round';
    for (const s of [-1, 1]) { poly(c, [[s * 5, 23], [s * (s < 0 ? 17.5 : 15.5), s < 0 ? 4 : 2], [s * 17.5, 29]]); fInk(c, COL.oscuro, 2.4); }
    c.beginPath(); c.arc(0, 36, 17.8, Math.PI * 0.96, Math.PI * 2.04); c.closePath(); fInk(c, COL.oscuro);
    for (const s of [-1, 1]) { poly(c, [[s * 8.5, 20.5], [s * 14.5, 9.5], [s * 15.5, 22.5]]); c.fillStyle = PAL.magenta; c.fill(); }
    c.lineJoin = 'miter';
  },
  prop(c) { for (const s of [-1, 1]) { pathRoundRect(c, s * 28 - 7.6, 80, 15.2, 16.4, 5); fInk(c, PAL.crema); seg(c, s * 28, 88, s * 28, 95, 1.6, PAL.tinta); } } };
FRONT.costurera = {
  over(c) { for (const [x0, x1] of [[-8, -11], [8, 12]]) { rod(c, x0, 55, x1, 88, 4.4, PAL.crema, 1.6); for (let y = 61; y < 88; y += 6) { const x = x0 + (x1 - x0) * (y - 55) / 33; seg(c, x - 2.2, y, x + 0.6, y, 1.2, PAL.tinta); } } },
  hair(c) {
    circle(c, 0, 13, 9.6); fInk(c, PAL.maderaOsc); fHair(c, PAL.maderaOsc, 17, 36, -0.1, 0.3);
    rod(c, -20, 1, 15, 22, 2.2, PAL.plata, 1.5); rod(c, 19, -2, -13, 22, 2.2, PAL.plata, 1.5);
    for (const [x, y] of [[-20, 1], [19, -2]]) { circle(c, x, y, 3); fInk(c, PAL.crema, 1.6); }
    c.beginPath(); c.moveTo(15, 22); c.bezierCurveTo(30, 28, 22, 6, 36, 10); c.lineWidth = 2.2; c.strokeStyle = COL.lima; c.stroke();
  } };
FRONT.narrador = { arms: [{ hand: [-30, 78] }, {}],
  hair(c) {
    fHair(c, PAL.pelo, 17, 36, 0.05, 0.25);
    shine(c, 0, 36, 20.5, 1.04, 1.96, 6.6, PAL.tinta); shine(c, 0, 36, 20.5, 1.05, 1.95, 2.6, PAL.plata);
    for (const s of [-1, 1]) { pathRoundRect(c, s * 20.5 - 5.6, 27, 11.2, 18.4, 4); fInk(c, PAL.crema); }
    c.beginPath(); c.moveTo(22.5, 43); c.quadraticCurveTo(22.5, 55, 10.5, 50.5); c.lineWidth = 2.6; c.strokeStyle = PAL.tinta; c.stroke();
    circle(c, 9.5, 49.5, 4.8); fInk(c, PAL.cian, 2.2);
  },
  prop(c) {
    c.save(); c.translate(-32, 68); c.rotate(-0.2); pathRoundRect(c, -8.4, -11.6, 16.8, 23.2, 1.5); fInk(c, COL.blanco, 2);
    for (let i = 0; i < 4; i++) seg(c, -5, -7.4 + i * 4.6, i % 2 ? 2 : 5, -7.4 + i * 4.6, 1.4, PAL.tinta);
    c.restore(); fHand(c, -30, 79);
  } };
FRONT.caliente = { kit: KIT_MALDITO, hair(c) {
  for (const s of [-1, 1]) { circle(c, s * 24.5, 33, 4.2); fInk(c, COL.blanco, 1.8); circle(c, s * 31, 26.5, 2.9); fInk(c, COL.blanco, 1.6); }
  const pts = [[-18, 31], [-19, 18], [-14, 7], [-10, 18], [-5, -6], [1, 13], [7, 3], [11, 14], [16, -2], [19, 18], [18, 31]];
  const fl = k => { c.save(); c.translate(0, 31); c.scale(k, k); c.translate(0, -31); poly(c, pts); c.restore(); };
  c.lineJoin = 'round'; fl(1); fInk(c, PAL.rojo); fl(0.62); c.fillStyle = COL.mono; c.fill(); fl(0.3); c.fillStyle = PAL.crema; c.fill(); c.lineJoin = 'miter';
} };

/* ============================== ESPECIALES ============================== */
FRONT.tendero = {
  over(c) {
    for (const s of [-1, 1]) rod(c, s * 11, 64, s * 8, 54, 2.8, PAL.noche, 1.4);
    pathRoundRect(c, -15.5, 62, 31, 43, 4); fInk(c, PAL.noche);
    pathRoundRect(c, -9.5, 84, 19, 11.5, 2.5); fInk(c, PAL.crema, 2); moneda(c, 3.4, 84, 4.6);
  },
  hair(c) {
    rod(c, 17.5, 36, 25, 15, 2.8, PAL.madera, 1.5); circle(c, 25.4, 13.6, 1.7); c.fillStyle = PAL.tinta; c.fill();   // lápiz
    c.lineJoin = 'round'; poly(c, [[-19.5, 27], [0, -1], [19.5, 27]]); fInk(c, COL.blanco); c.lineJoin = 'miter';
    seg(c, 0, 1, 0, 27, 1.5, 'rgba(26,20,35,0.4)');
    for (const [x0, x1, y] of [[-10, -4, 12], [-13, -5, 17.5], [4, 9, 12], [5, 13, 17.5]]) seg(c, x0, y, x1, y, 1.2, 'rgba(26,20,35,0.6)');
    pathRoundRect(c, -20.5, 22.6, 41, 7, 2); fInk(c, COL.blanco);
  } };
FRONT.llave = { arms: [{ hand: [-34, 45], elbow: [-37, 63] }, { hand: [33, 46], elbow: [37, 63] }],
  over(c) {
    c.save(); c.translate(0, 47); c.rotate(-0.06);
    for (const [x, len] of [[-51, 11.5], [-43, 8]]) { pathRoundRect(c, x, 0, 6.4, len, 1); fInk(c, PAL.plata, 2.2); }
    pathRoundRect(c, -53, -4.2, 83, 8.4, 3); fInk(c, PAL.plata);
    circle(c, 40, 0, 12.4); fInk(c, PAL.plata); circle(c, 40, 0, 5); fInk(c, PAL.plataOsc);
    seg(c, -48, -1.6, 24, -1.6, 1.6, '#ffffff');
    c.restore();
  },
  hair(c) { fHair(c, PAL.pelo, 17, 36, -0.05, 0.25); c.save(); c.translate(9, 23.5); c.rotate(0.5); pathRoundRect(c, -5, -2.1, 10, 4.2, 2); fInk(c, COL.lima, 1.8); c.restore(); },
  prop(c) { fHand(c, -34, 45); fHand(c, 33, 46); } };
FRONT.veterano = { kit: { longSleeve: true, pattern(c, W) { c.fillRect(-W, 66, W * 2, 12.5); } },
  hair(c) {
    for (const s of [-1, 1]) { pathRoundRect(c, s * 15.5 - 3, 29, 6, 13, 2.5); fInk(c, COL.canas, 2); }   // patillas
    c.beginPath(); c.moveTo(-19, 30.5); c.quadraticCurveTo(-20, 13.5, 0, 14); c.quadraticCurveTo(20, 13.5, 19, 30.5); c.closePath(); fInk(c, PAL.maderaOsc);
    ell(c, -7, 31, 16, 3.8, -0.05); fInk(c, PAL.maderaOsc);                                        // visera, ladeada
    const m = (w, col) => { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, 45.5); c.quadraticCurveTo(s * 9, 51, s * 15.5, 42); c.lineWidth = w; c.strokeStyle = col; c.stroke(); } };
    c.lineCap = 'round'; m(7.8, PAL.tinta); m(3.8, COL.canas); c.lineCap = 'butt';                 // el bigotón
  } };
FRONT.chilena = { flip: true, arms: [{ hand: [-41, 73] }, { hand: [41, 70] }],
  hair(c) {
    for (const [x, tip] of [[-11, 13], [-4, 8], [4, 11], [11, 7]]) { poly(c, [[x - 5.4, 25], [x + 0.6, tip], [x + 5.4, 25]]); fInk(c, PAL.pelo, 2.1); }   // el pelo cuelga
    fHair(c, PAL.pelo, 17, 36, -0.05, 0.2);
    pathRoundRect(c, -18.6, 26.6, 37.2, 6.2, 2); fInk(c, PAL.crema, 2); star(c, 0, 29.7, 2.7); c.fillStyle = PAL.tinta; c.fill();
  } };
FRONT.pesi = { scale: 0.88, arms: [{}, { hand: [29, 81] }],
  hair(c) { fHair(c, PAL.maderaOsc, 17, 36, -0.08, 0.12); c.lineJoin = 'round'; poly(c, [[-17.5, 30], [-8, 23], [3, 26], [-9, 41]]); fInk(c, PAL.maderaOsc, 2.2); c.lineJoin = 'miter'; },
  prop(c) {
    circle(c, 29, 71, 8.2); fInk(c, PAL.maderaOsc); pathRoundRect(c, 21.6, 62, 14.8, 4.4, 2); fInk(c, PAL.plata, 1.8);
    rod(c, 31, 63, 37.5, 46, 2.1, PAL.plata, 1.4); fHand(c, 29, 81);
  } };
FRONT.cp7 = { spread: 13, arms: [{ hand: [-43, 90], elbow: [-37, 72] }, { hand: [43, 90], elbow: [37, 72] }],
  hair(c) {
    fHair(c, PAL.pelo, 17, 36, 0.0, 0.2);
    c.beginPath(); c.moveTo(-15.5, 26.5); c.quadraticCurveTo(-13, -1, 6, 3.5); c.quadraticCurveTo(20, 8, 15.5, 27.5); c.quadraticCurveTo(0, 18, -15.5, 26.5); c.closePath(); fInk(c, PAL.pelo);
    c.lineCap = 'round'; c.beginPath(); c.moveTo(-7, 14); c.quadraticCurveTo(0, 6.5, 9.5, 11); c.lineWidth = 2.6; c.strokeStyle = '#ffffff'; c.stroke(); c.lineCap = 'butt';
    star(c, -19.5, 43.5, 5.8, 4, 0, 0.26); fInk(c, '#ffffff', 1.6);
  } };
FRONT.gemelo = { W: 25, head(c) {
  for (const s of [-1, 1]) {
    c.save(); c.translate(s * 14.5, s < 0 ? 0 : 1.5);
    fHead(c, 13.5, 35); fHair(c, PAL.pelo, 13.5, 35, 0.0, 0.25);
    if (s > 0) { pathRoundRect(c, -14.6, 23.2, 29.2, 5, 2); fInk(c, PAL.magenta, 2); }           // cinta en la frente (más abajo parecía gafas)
    c.restore();
  }
} };
FRONT.bekam = {
  over(c) {
    c.beginPath(); c.moveTo(9, 24); c.quadraticCurveTo(35, 12, 40, 42); c.quadraticCurveTo(29, 27, 12, 33); c.closePath(); fInk(c, COL.mono);   // coleta
    for (const s of [-1, 1]) { seg(c, s * 26 - 2.8, 75, s * 26 + 2.8, 77, 1.7, PAL.tinta); seg(c, s * 27 - 2.8, 81, s * 27 + 2.8, 80, 1.7, PAL.tinta); }
  },
  hair(c) { fHair(c, COL.mono, 17, 36, -0.08, 0.3); pathRoundRect(c, -18.6, 25.2, 37.2, 5.4, 2); fInk(c, PAL.crema, 2); } };
FRONT.colector = { arms: [{}, { hand: [27, 85], elbow: [35, 72] }],
  hair(c) {
    c.lineJoin = 'round'; poly(c, [[-15, 25], [-12, 5], [12, 5], [15, 25]]); fInk(c, PAL.crema); c.lineJoin = 'miter';
    seg(c, -12.6, 9, 12.6, 9, 1.5, PAL.tinta); seg(c, -14, 16.5, 14, 16.5, 5.4, PAL.tinta);
    [PAL.madera, PAL.plata, PAL.oroLuz, PAL.esmeralda].forEach((m, i) => { circle(c, -9.6 + i * 6.4, 16.5, 2.9); fInk(c, m, 1.3); });   // una chapa por rareza
    ell(c, 0, 26, 35, 7); c.fillStyle = PAL.crema; c.fill();
    c.save(); ell(c, 0, 26, 35, 7); c.clip(); c.fillStyle = PAL.tinta; for (let x = -30; x <= 30; x += 7.5) { poly(c, [[x - 3, 31], [x, 25], [x + 3, 31]]); c.fill(); } c.restore();
    ell(c, 0, 26, 35, 7); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
  },
  prop(c) {
    c.save(); c.translate(32, 74); c.rotate(0.12); pathRoundRect(c, -8.4, -12.4, 16.8, 24.8, 1.5); fInk(c, PAL.maderaOsc);
    seg(c, -4.8, -12.4, -4.8, 12.4, 1.6, PAL.tinta); pathRoundRect(c, -2, -7.4, 8.4, 6.4, 1); fInk(c, PAL.crema, 1.4);
    c.restore(); fHand(c, 27, 86);
  } };
FRONT.justiciero = {
  behind(c) {
    const cape = () => { c.beginPath(); c.moveTo(-20, 54); c.lineTo(20, 54); c.quadraticCurveTo(36, 80, 41, 112); c.quadraticCurveTo(31, 107, 23, 116); c.quadraticCurveTo(8, 109, -5, 117); c.quadraticCurveTo(-22, 108, -41, 113); c.quadraticCurveTo(-36, 80, -20, 54); c.closePath(); };
    cape(); c.fillStyle = PAL.crema; c.fill();
    c.save(); cape(); c.clip(); c.fillStyle = 'rgba(184,49,60,0.62)'; for (let x = -42; x < 44; x += 11) c.fillRect(x, 50, 5.5, 70); for (let y = 54; y < 120; y += 11) c.fillRect(-44, y, 88, 5.5); c.restore();
    cape(); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
  },
  over(c) { pathRoundRect(c, -10, 51.5, 20, 6.4, 3.2); fInk(c, PAL.crema, 2); },
  hair(c) {
    c.lineJoin = 'round'; poly(c, [[-13.5, 27], [-11, 6], [0, 9.5], [11, 6], [13.5, 27]]); fInk(c, PAL.maderaOsc); c.lineJoin = 'miter';
    c.save(); c.rotate(0.04); ell(c, 0, 27, 31, 6.2); fInk(c, PAL.madera); c.restore();
    star(c, 1, 16, 6.4, 5, 0.32); fInk(c, PAL.plata, 1.8);                                         // la estrella va en el sombrero, como desde arriba
  } };

/* ============================== LEGENDARIOS ============================== */
FRONT.mano = { arms: [{ hand: [-33, 35], elbow: [-39, 61] }, {}],
  hair(c) { fHair(c, PAL.pelo, 17, 36, -0.02, 0.25); },
  prop(c) {
    c.save(); c.translate(-36, 17); c.rotate(-0.22);
    bigHand(c, 40, PAL.crema);
    const halo = (w, col) => { ell(c, 0, -31, 19, 5); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    halo(7.6, PAL.tinta); halo(3.4, PAL.esmeralda);
    c.restore();
  } };
FRONT.diez = {
  over(c) { fText(c, '10', 0, 79, 21, PAL.tinta); },
  head(c) {
    const n = 12, r = 22, cy = 29;
    for (let i = 0; i < n; i++) { const a = i / n * TAU + 0.2, dark = Math.cos(a - 0.85) > 0.35; circle(c, Math.cos(a) * r, cy + Math.sin(a) * r, 9.6 + (i % 3)); fInk(c, dark ? COL.monoOsc : COL.mono); }
    circle(c, 0, cy, r + 3); c.fillStyle = COL.monoOsc; c.fill(); circle(c, -4, cy - 5, r); c.fillStyle = COL.mono; c.fill();
    circle(c, 0, 40, 13); c.fillStyle = PAL.piel; c.fill();                                        // la cara, sin rasgos
    c.save(); circle(c, 0, 40, 13); c.clip(); circle(c, 6, 46, 13); c.fillStyle = PAL.pielOsc; c.globalAlpha = 0.45; c.fill(); c.restore();
    circle(c, 0, 40, 13); c.lineWidth = FL; c.strokeStyle = PAL.tinta; c.stroke();
    for (const x of [-9, 0, 9]) { circle(c, x, 27 - Math.abs(x) * 0.1, 7.4); fInk(c, COL.mono); }   // el copete
    circle(c, 0, 18, 13.5); c.fillStyle = COL.mono; c.fill();
    for (const [x, y, rr, a0] of [[-14, 12, 7, 1.05], [2, 6, 7, 1.2], [-4, 20, 6.5, 1.0], [14, 16, 6.5, 1.25], [-21, 30, 6, 0.95], [20, 34, 6, 1.3]]) shine(c, x, y, rr, a0, a0 + 0.6, 2.6, COL.monoLuz);
  } };
FRONT.capitan = { arms: [{ hand: [-30, 62], elbow: [-36, 76] }, { hand: [40, 23] }],
  hair(c) {
    fHair(c, PAL.pelo, 17, 36, 0.0, 0.25);
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) {   // hojas acostadas sobre la cabeza: laurel, no plumas
      const a = -Math.PI / 2 + s * (0.36 + i * 0.37), x = Math.cos(a) * 18.6, y = 36 + Math.sin(a) * 18.6;
      c.save(); c.translate(x, y); c.rotate(a + s * 0.45); ell(c, 0, 0, 3.1, 6.8); fInk(c, i % 2 ? PAL.esmeraldaLuz : PAL.esmeralda, 1.5); c.restore();
    }
  },
  prop(c) {
    c.save(); c.translate(29.5, 44); c.rotate(Math.atan2(23 - 59, 40 - 22) + Math.PI / 2); pathRoundRect(c, -6.8, -4.8, 13.6, 9.6, 2); fInk(c, PAL.crema, 2); fText(c, 'C', 0, 0.6, 7.6, PAL.tinta); c.restore();   // brazalete
    rod(c, 40, 23, 44.5, 12, 3.2, PAL.piel, 1.5); fHand(c, 40, 23);                                // señala
    rod(c, -41, 60, -22, 58, 2.6, PAL.madera, 1.4);                                                // banderín
    const p = [[-40, 62.5], [-24, 60.5], [-32.5, 85]];
    poly(c, p); c.fillStyle = PAL.franja; c.fill(); c.save(); poly(c, p); c.clip(); c.fillStyle = PAL.crema; c.fillRect(-34, 58, 3.6, 30); c.restore();
    poly(c, p); c.lineWidth = 2.2; c.strokeStyle = PAL.tinta; c.stroke();
    circle(c, -32.5, 86, 2.5); fInk(c, PAL.esmeralda, 1.4); fHand(c, -30, 61);
  } };
