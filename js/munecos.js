/* =====================================================================
   GOLÍN — MUÑECOS: el aspecto propio de cada uno (solo dibujo).
   Reglas del rediseño (ver CHANGELOG v3.6):
     · Silueta primero: cada muñeco rompe el círculo en una dirección distinta
       y se reconoce relleno de negro a unos 32 px.
     · Un solo detalle gracioso por muñeco (puede leerse solo en la tarjeta).
     · Chueco a propósito: nada espejado.
     · Materiales (madera, crema, verdes, plata, tinta). Los colores de señal
       solo cuando significan algo (rojo Mult, cian puntos, amarillo plata…).
     · Ningún muñeco lleva balón. Sin caras.
   Cada entrada de LOOKS puede traer:
     kit      colores/estampado de la camiseta y brazos (arms: false, o -1/1 si el otro brazo lo dibuja el muñeco)
     noBody   true = no se dibuja el cuerpo normal (El Poste, Chilena)
     back     (c, R, tm)  detrás del cuerpo
     over     (c, R, tm)  encima del cuerpo, debajo de la cabeza
     head     (c, hr, tm) la cabeza (origen = centro de la cabeza)
     headY    dónde va la cabeza, en radios (por defecto −0.3)
     front    (c, R, tm)  encima de todo (lo que lleva en las manos)
     box      [x0, y0, x1, y1] en radios: lo que ocupa el dibujo, para encuadrar el retrato
   Arriba de la pantalla (−y) es hacia el arco rival. El choque NO cambia: sigue
   siendo la forma de js/roster.js.
   ===================================================================== */
'use strict';
const COL = {
  ladrillo:'#B5573B', ladrilloOsc:'#8E3F2A', canas:'#D9D6DE', mono:'#E9A15B', violeta:'#A56BFF', lima:'#B6E83A',
  oscuro:'#3B2F47', oscuroSombra:'#2A2233', blanco:'#FBF6EA', brillo:'#5A4868', monoOsc:'#B66F2E', monoLuz:'#F6C98F',
};
const KIT_MALDITO = { jersey: COL.oscuro, stripe: PAL.franja, shade: COL.oscuroSombra };   // los malditos juegan de oscuro
const TAU = Math.PI * 2;

/* ---------------- ayudas de dibujo ---------------- */
function poly(c, pts, k = 1) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0] * k, p[1] * k) : c.moveTo(p[0] * k, p[1] * k)); c.closePath(); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function seg(c, x0, y0, x1, y1, w, col) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
/* varilla con contorno de tinta (antenas, agujas, lápices, brazos) */
function rod(c, x0, y0, x1, y1, w, col, edge) {
  c.lineCap = 'round'; seg(c, x0, y0, x1, y1, w + edge * 2, PAL.tinta); seg(c, x0, y0, x1, y1, w, col); c.lineCap = 'butt';
}
/* brazo desde el hombro hasta la mano: piel y manga (full = manga larga) */
function arm(c, R, x0, y0, x1, y1, sleeve = PAL.camisa, full) {
  const w = R * 0.28, e = Math.max(1.1, R * 0.09), t = full ? 0.8 : 0.5;
  rod(c, x0, y0, x1, y1, w, PAL.piel, e);
  rod(c, x0, y0, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w, sleeve, e);
}
/* pelo que cubre la cabeza desde la frente; a0..a1 en medias vueltas */
function hairCap(c, h, col = PAL.pelo, a0 = 0.96, a1 = 2.04) {
  c.beginPath(); c.arc(0, 0, h * 1.01, Math.PI * a0, Math.PI * a1); c.closePath(); inkFill(c, col, h * 0.16);
}
function shine(c, x, y, r, a0, a1, w, col = '#ffffff') { c.beginPath(); c.arc(x, y, r, Math.PI * a0, Math.PI * a1); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
function star(c, x, y, r, n = 5, rot = 0, inner = 0.45) {
  c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot - Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * inner : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath();
}
/* gorra o gorro visto desde arriba: copa con gajos y botón (sin gajos, un círculo con punto parece un ojo) */
function capTop(c, h, col, btn, r = 0.95, gajos = 3) {
  circle(c, 0, -h * 0.05, h * r); c.fillStyle = col; c.fill();
  c.save(); circle(c, 0, -h * 0.05, h * r); c.clip();
  c.fillStyle = 'rgba(26,20,35,0.16)'; circle(c, h * 0.5, h * 0.45, h * r); c.fill();           // sombra dura abajo a la derecha
  for (let i = 0; i < gajos; i++) { const a = 0.35 + i * Math.PI / gajos; seg(c, -Math.cos(a) * h * r, -h * 0.05 - Math.sin(a) * h * r, Math.cos(a) * h * r, -h * 0.05 + Math.sin(a) * h * r, h * 0.09, 'rgba(26,20,35,0.45)'); }
  c.restore();
  circle(c, 0, -h * 0.05, h * r); c.lineWidth = h * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
  circle(c, 0, -h * 0.05, h * 0.17); inkFill(c, btn, h * 0.1);
}
/* moneda chica y lisa (la dentada del juego se empasta a este tamaño): amarillo = plata */
function moneda(c, x, y, r) {
  circle(c, x, y, r); inkFill(c, PAL.amarillo, Math.max(1, r * 0.3));
  c.fillStyle = PAL.tinta; c.font = `${r * 1.5}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', x, y + r * 0.1);
}
/* topes metálicos de la barra, para los que no usan el cuerpo normal */
function topes(c, R, W = R * 0.95) {
  const lw = Math.max(2, R * 0.15);
  for (const sx of [-1, 1]) {
    const x = sx * (W + R * 0.3);
    pathRoundRect(c, x - R * 0.13, R * 0.02, R * 0.26, R * 0.3, R * 0.06); inkFill(c, PAL.plata, lw * 0.6);
    seg(c, x - R * 0.06, R * 0.06, x - R * 0.06, R * 0.26, R * 0.05, '#ffffff');
  }
}

const LOOKS = {};

/* =====================================================================
   COMUNES — peana de madera
   ===================================================================== */

/* El Poste: no es persona. Un palo de arco clavado en la peana, con un trozo de red amarrado y un balonazo marcado. */
LOOKS.poste = { noBody: true, box: [-1.5, -1.45, 1.9, 1.6],
  back(c, R) {
    const L = Math.max(1.4, R * 0.17), net = [[0.3, -0.3], [1.7, 0.15], [1.35, 1.25], [0.15, 0.75]];
    topes(c, R, R * 0.62);                                                                        // va en la barra, como todos
    poly(c, net, R); c.fillStyle = 'rgba(251,246,234,0.6)'; c.fill();
    c.save(); poly(c, net, R); c.clip();
    for (let i = -5; i < 8; i++) { seg(c, i * R * 0.34, -R * 0.5, i * R * 0.34 + R * 1.3, R * 1.5, R * 0.08, COL.blanco); seg(c, i * R * 0.34 + R * 1.3, -R * 0.5, i * R * 0.34, R * 1.5, R * 0.08, COL.blanco); }
    c.restore();
    poly(c, net, R); c.lineWidth = L * 0.7; c.strokeStyle = PAL.tinta; c.stroke();
    const tube = () => pathRoundRect(c, -R * 0.72, -R * 0.5, R * 1.44, R * 1.4, R * 0.45);
    tube(); c.fillStyle = COL.blanco; c.fill();
    c.save(); tube(); c.clip();
    c.fillStyle = PAL.tinta; c.fillRect(-R, R * 0.02, R * 2, R * 0.26); c.fillRect(-R, R * 0.52, R * 2, R * 0.26);   // dos franjas pintadas, como de frente
    c.fillStyle = 'rgba(26,20,35,0.14)'; c.fillRect(R * 0.26, -R, R, R * 3);                    // sombra dura
    c.restore();
    tube(); c.lineWidth = L; c.strokeStyle = PAL.tinta; c.stroke();
    ell(c, 0, -R * 0.52, R * 0.72, R * 0.5); inkFill(c, COL.blanco, L);                          // la boca del tubo
    ell(c, 0, -R * 0.52, R * 0.4, R * 0.26); c.fillStyle = PAL.tinta; c.fill();
    shine(c, -R * 0.05, -R * 0.5, R * 0.55, 1.05, 1.4, R * 0.12);
    ell(c, -R * 0.42, R * 0.4, R * 0.12, R * 0.2, 0.3); c.fillStyle = 'rgba(26,20,35,0.3)'; c.fill();   // el balonazo: una abolladura de lado
    circle(c, R * 0.42, -R * 0.2, R * 0.15); inkFill(c, COL.blanco, L * 0.6);                    // el nudo de la red
  },
  head() {},
};

/* El Muro: ancho como una pared. Camiseta de ladrillos, cabeza cuadrada y cuello de toro. */
LOOKS.muro = {
  kit: { jersey: COL.ladrillo, shade: COL.ladrilloOsc,
    pattern(c, R, W, top, bot) {
      const rows = 3, hh = (bot - top) / rows, w = Math.max(1, R * 0.12);
      for (let r = 1; r < rows; r++) seg(c, -W, top + r * hh, W, top + r * hh, w, PAL.crema);
      for (let r = 0; r < rows; r++) for (let x = -W + (r % 2 ? W * 0.3 : W * 0.06); x < W; x += W * 0.48) seg(c, x, top + r * hh, x, top + (r + 1) * hh, w, PAL.crema);
    } },
  head(c, h) {
    for (const s of [-1, 1]) { circle(c, s * h * 1.0, h * 0.12, h * 0.27); inkFill(c, PAL.piel, h * 0.16); }
    const box = () => pathRoundRect(c, -h, -h * 0.92, h * 2, h * 1.84, h * 0.34);
    box(); c.fillStyle = PAL.piel; c.fill();
    c.save(); box(); c.clip();
    c.fillStyle = PAL.pelo; c.fillRect(-h, -h, h * 2, h * 0.92);                                // rapado, cortado a regla
    c.fillStyle = 'rgba(138,82,48,0.5)'; c.fillRect(h * 0.35, -h * 0.1, h, h * 1.2);
    c.restore();
    box(); c.lineWidth = h * 0.2; c.strokeStyle = PAL.tinta; c.stroke();
  },
};

/* La Antena: antena de conejo de televisor viejo, con su bola de papel aluminio para "coger señal". */
LOOKS.antena = { box: [-1.45, -2.25, 1.95, 1.3],
  head(c, h) {
    skull(c, h, true);
    const e = h * 0.13;
    rod(c, 0, -h * 0.15, -h * 1.45, -h * 1.9, h * 0.13, PAL.plata, e);                          // varilla corta
    rod(c, 0, -h * 0.15, h * 1.85, -h * 2.55, h * 0.13, PAL.plata, e);                          // varilla larga
    pathRoundRect(c, -h * 0.46, -h * 0.5, h * 0.92, h * 0.66, h * 0.18); inkFill(c, PAL.maderaOsc, h * 0.17);
    circle(c, 0, -h * 0.17, h * 0.13); c.fillStyle = PAL.plata; c.fill();
    poly(c, [[1.5, -2.9], [2.05, -3.05], [2.42, -2.7], [2.3, -2.2], [1.78, -2.1], [1.45, -2.45]], h); inkFill(c, PAL.plata, h * 0.17);   // papel aluminio arrugado
    c.lineCap = 'round'; seg(c, h * 1.75, -h * 2.75, h * 2.1, -h * 2.55, h * 0.13, '#ffffff'); c.lineCap = 'butt';
    for (const r of [0.75, 1.15]) shine(c, h * 1.95, -h * 2.55, h * r, -0.28, 0.2, h * 0.15, PAL.magenta);   // la señal: atrae
  },
};

/* El Lechero: gorra blanca de repartidor y la cantina de leche al hombro. */
LOOKS.lechero = { box: [-1.35, -1.3, 1.85, 1.3],
  head(c, h) {
    skull(c, h);
    c.beginPath(); c.ellipse(0, -h * 0.7, h * 0.86, h * 0.78, 0, Math.PI, TAU); c.closePath(); inkFill(c, PAL.madera, h * 0.17);   // visera
    capTop(c, h, COL.blanco, PAL.madera, 0.97);
  },
  front(c, R) {
    const x = R * 1.05, y = -R * 0.22, r = R * 0.56, L = Math.max(1.3, R * 0.12);
    for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * r * 0.98, y + r * 0.1, r * 0.27, 0, TAU); c.lineWidth = L * 2.4; c.strokeStyle = PAL.tinta; c.stroke(); c.lineWidth = L * 0.9; c.strokeStyle = PAL.plata; c.stroke(); }   // asas
    circle(c, x, y, r); inkFill(c, PAL.plata, L);
    circle(c, x, y, r * 0.66); inkFill(c, '#DCE2EA', L * 0.8);                                  // la tapa
    circle(c, x, y, r * 0.2); inkFill(c, PAL.plataOsc, L * 0.6);
    shine(c, x, y, r * 0.84, 1.1, 1.45, r * 0.14);
    circle(c, x - r * 0.78, y - r * 0.82, r * 0.2); inkFill(c, COL.blanco, L * 0.6);             // gota de leche
  },
};

/* El Hincha: brazos arriba con la bufanda estirada. */
LOOKS.hincha = { kit: { arms: false }, box: [-1.9, -1.85, 1.9, 1.3],
  head(c, h) { skull(c, h); hairCap(c, h, PAL.maderaOsc, 0.9, 2.1); shine(c, 0, 0, h * 0.6, 1.2, 1.6, h * 0.12, 'rgba(244,234,213,0.4)'); },
  front(c, R) {
    const y = -R * 1.42, L = Math.max(1.3, R * 0.12), x = R * 1.5;
    for (const s of [-1, 1]) arm(c, R, s * R * 0.88, -R * 0.22, s * R * 1.28, y + R * 0.2);
    const scarf = () => { c.beginPath(); c.moveTo(-x, y - R * 0.3); c.quadraticCurveTo(0, y - R * 0.02, x, y - R * 0.22); c.lineTo(x, y + R * 0.2); c.quadraticCurveTo(0, y + R * 0.42, -x, y + R * 0.14); c.closePath(); };
    for (const s of [-1, 1]) for (let j = 0; j < 3; j++) seg(c, s * x, y - R * 0.16 + j * R * 0.14, s * (x + R * 0.26), y - R * 0.1 + j * R * 0.17, L, PAL.tinta);   // flecos
    scarf(); c.fillStyle = PAL.crema; c.fill();
    c.save(); scarf(); c.clip(); c.fillStyle = PAL.franja; for (let i = 0; i < 5; i++) c.fillRect(-x + R * 0.1 + i * R * 0.66, y - R * 0.6, R * 0.34, R * 1.3); c.restore();
    scarf(); c.lineWidth = L; c.strokeStyle = PAL.tinta; c.stroke();
    for (const s of [-1, 1]) { circle(c, s * R * 1.28, y + R * (s < 0 ? 0.0 : 0.04), R * 0.19); inkFill(c, PAL.piel, L * 0.8); }
  },
};

/* El Corneta: gorro de lana con pompón y una corneta larga que apunta en diagonal. */
LOOKS.corneta = { kit: { arms: -1 }, box: [-1.35, -2.3, 1.95, 1.3],
  head(c, h) {
    skull(c, h);
    circle(c, 0, -h * 0.05, h * 1.0); c.fillStyle = PAL.franja; c.fill();
    for (let i = 0; i < 5; i++) { const a = 0.2 + i * Math.PI / 5; seg(c, -Math.cos(a) * h, -h * 0.05 - Math.sin(a) * h, Math.cos(a) * h, -h * 0.05 + Math.sin(a) * h, h * 0.13, PAL.crema); }   // tejido
    circle(c, 0, -h * 0.05, h * 1.0); c.lineWidth = h * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
    circle(c, h * 0.06, -h * 0.1, h * 0.42); inkFill(c, PAL.crema, h * 0.15);                     // pompón
  },
  front(c, R) {
    const x0 = R * 0.22, y0 = -R * 0.78, x1 = R * 1.3, y1 = -R * 1.95, len = Math.hypot(x1 - x0, y1 - y0), L = Math.max(1.3, R * 0.12);
    arm(c, R, R * 0.88, -R * 0.22, R * 0.82, -R * 1.2);
    c.save(); c.translate(x0, y0); c.rotate(Math.atan2(y1 - y0, x1 - x0));
    poly(c, [[0, -R * 0.08], [len, -R * 0.3], [len, R * 0.3], [0, R * 0.08]]); inkFill(c, PAL.madera, L);
    seg(c, len * 0.52, -R * 0.2, len * 0.52, R * 0.2, R * 0.13, PAL.crema);
    ell(c, len, 0, R * 0.17, R * 0.44); inkFill(c, PAL.maderaOsc, L);                            // la boca de la corneta
    ell(c, len + R * 0.02, 0, R * 0.07, R * 0.24); c.fillStyle = PAL.tinta; c.fill();
    c.restore();
    circle(c, R * 0.8, -R * 1.22, R * 0.19); inkFill(c, PAL.piel, L * 0.8);
  },
};

/* La Abuela: moño canoso, chal de punta y el monedero con una moneda asomada. */
LOOKS.abuela = { kit: { arms: 1, longSleeve: true, sleeve: PAL.maderaOsc }, box: [-1.55, -1.5, 1.45, 1.4],
  over(c, R) {
    const L = Math.max(1.3, R * 0.13);
    c.beginPath(); c.moveTo(-R * 1.3, -R * 0.42); c.quadraticCurveTo(0, -R * 0.8, R * 1.3, -R * 0.5); c.lineTo(R * 0.16, R * 1.12); c.lineTo(-R * 0.1, R * 1.12); c.closePath(); inkFill(c, PAL.maderaOsc, L);
    c.setLineDash([R * 0.15, R * 0.13]); c.beginPath(); c.moveTo(-R * 1.05, -R * 0.3); c.lineTo(-R * 0.02, R * 0.92); c.moveTo(R * 1.06, -R * 0.36); c.lineTo(R * 0.1, R * 0.92);
    c.lineWidth = R * 0.13; c.strokeStyle = PAL.crema; c.stroke(); c.setLineDash([]);              // el fleco
  },
  head(c, h) {
    circle(c, h * 0.1, h * 1.12, h * 0.6); inkFill(c, COL.canas, h * 0.17);                      // el moño
    skull(c, h);
    circle(c, 0, 0, h * 0.99); inkFill(c, COL.canas, h * 0.18);
    c.beginPath(); c.moveTo(0, -h * 0.95); c.quadraticCurveTo(h * 0.14, 0, 0, h * 0.6); c.lineWidth = h * 0.09; c.strokeStyle = 'rgba(26,20,35,0.4)'; c.stroke();   // raya del peinado
  },
  front(c, R) {
    const L = Math.max(1.2, R * 0.11), x = -R * 0.98, y = -R * 0.95;
    arm(c, R, -R * 0.86, -R * 0.2, x + R * 0.05, y + R * 0.2, PAL.maderaOsc, true);
    moneda(c, x - R * 0.14, y - R * 0.3, R * 0.27);
    c.beginPath(); c.arc(x, y, R * 0.38, 0, Math.PI); c.closePath(); inkFill(c, PAL.madera, L);
    for (const s of [-1, 1]) { circle(c, x + s * R * 0.09, y - R * 0.04, R * 0.08); inkFill(c, PAL.plata, L * 0.5); }   // el broche
  },
};

/* El Madrugador: gorro de dormir a rayas, caído a un lado, y el primer tinto del día. */
LOOKS.madrugador = { kit: { arms: 1 }, box: [-1.75, -1.6, 1.7, 1.3],
  head(c, h) {
    skull(c, h);
    const tail = () => { c.beginPath(); c.moveTo(h * 0.2, -h * 1.0); c.quadraticCurveTo(h * 2.1, -h * 1.05, h * 2.05, h * 0.75); c.quadraticCurveTo(h * 1.45, -h * 0.05, h * 0.95, h * 0.4); c.closePath(); };
    const cap = () => circle(c, 0, -h * 0.05, h * 1.02);
    for (const shape of [tail, cap]) {
      shape(); c.fillStyle = PAL.noche; c.fill();
      c.save(); shape(); c.clip(); c.fillStyle = PAL.crema; for (let y = -1.3; y < 1.2; y += 0.52) c.fillRect(-h * 1.2, h * y, h * 3.6, h * 0.2); c.restore();
      shape(); c.lineWidth = h * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
    }
    circle(c, h * 2.05, h * 0.92, h * 0.36); inkFill(c, PAL.crema, h * 0.15);                     // pompón
  },
  front(c, R) {
    const L = Math.max(1.2, R * 0.11), x = -R * 1.08, y = -R * 1.0;
    arm(c, R, -R * 0.88, -R * 0.22, x + R * 0.1, y + R * 0.3);
    c.beginPath(); c.arc(x - R * 0.3, y, R * 0.16, 0, TAU); c.lineWidth = L * 2.2; c.strokeStyle = PAL.tinta; c.stroke(); c.lineWidth = L * 0.8; c.strokeStyle = PAL.crema; c.stroke();   // oreja del pocillo
    circle(c, x, y, R * 0.32); inkFill(c, PAL.crema, L);
    circle(c, x, y, R * 0.2); c.fillStyle = PAL.maderaOsc; c.fill();                              // el tinto
    for (const dx of [-0.12, 0.12]) { c.beginPath(); c.moveTo(x + R * dx, y - R * 0.42); c.quadraticCurveTo(x + R * (dx + 0.16), y - R * 0.58, x + R * dx, y - R * 0.74); c.lineWidth = R * 0.08; c.strokeStyle = 'rgba(244,234,213,0.85)'; c.stroke(); }   // humo
  },
};

/* El Canterano: gorra al revés y el peto de entreno, que todavía le queda grande. */
LOOKS.canterano = { box: [-1.35, -1.25, 1.35, 1.35],
  over(c, R) {
    const L = Math.max(1.3, R * 0.13);
    c.lineJoin = 'round';
    poly(c, [[-0.8, -0.6], [0.8, -0.6], [0.92, 0.48], [0.2, 0.78], [-0.9, 0.56]], R); inkFill(c, COL.violeta, L);
    c.beginPath(); c.moveTo(-R * 0.84, R * 0.4); c.lineTo(R * 0.2, R * 0.6); c.lineTo(R * 0.88, R * 0.32); c.lineWidth = R * 0.09; c.strokeStyle = PAL.crema; c.stroke();   // el ribete
    c.lineJoin = 'miter';
  },
  head(c, h) {
    c.save(); c.rotate(0.22);                                                                     // la gorra va torcida
    pathRoundRect(c, -h * 0.72, h * 0.42, h * 1.44, h * 0.82, h * 0.3); inkFill(c, PAL.franja, h * 0.17);   // la visera, hacia atrás
    c.restore();
    skull(c, h);
    capTop(c, h, PAL.franja, PAL.crema, 0.93);
  },
};

/* =====================================================================
   RAROS — peana de plata con remaches
   ===================================================================== */

/* El Cambista: sombrero de paño ladeado, chaleco, riñonera y el abanico de billetes en la mano. */
LOOKS.cambista = { kit: { arms: 1 }, box: [-1.9, -1.75, 1.4, 1.3],
  over(c, R) {
    const lw = Math.max(1.3, R * 0.12);
    for (const s of [-1, 1]) { poly(c, [[s * 0.2, -0.46], [s * 0.9, -0.46], [s * 0.9, 0.44], [s * 0.34, 0.44]], R); inkFill(c, COL.oscuro, lw); }   // chaleco
    pathRoundRect(c, R * 0.26, R * 0.2, R * 0.66, R * 0.36, R * 0.12); inkFill(c, PAL.madera, lw * 0.8);                                     // riñonera
    seg(c, R * 0.34, R * 0.3, R * 0.84, R * 0.3, R * 0.07, PAL.tinta);
  },
  head(c, h) {
    skull(c, h * 0.9);
    c.save(); c.rotate(-0.22);
    ell(c, 0, -h * 0.05, h * 1.3, h * 1.05); inkFill(c, PAL.maderaOsc, h * 0.17);                 // ala
    ell(c, 0, -h * 0.1, h * 0.8, h * 0.64); inkFill(c, COL.oscuro, h * 0.14);                     // copa
    ell(c, 0, -h * 0.1, h * 0.8, h * 0.64); c.lineWidth = h * 0.2; c.strokeStyle = PAL.madera; c.stroke();   // cinta
    seg(c, -h * 0.34, -h * 0.1, h * 0.34, -h * 0.1, h * 0.1, COL.brillo);                         // el pliegue de la copa
    c.restore();
  },
  front(c, R) {
    const L = Math.max(1.1, R * 0.1), x = -R * 1.02, y = -R * 0.72;
    arm(c, R, -R * 0.88, -R * 0.22, x, y);
    c.save(); c.translate(x, y);
    for (let i = 0; i < 4; i++) {                          // cuatro billetes, abiertos como naipes
      c.save(); c.rotate(-1.2 + i * 0.52);
      pathRoundRect(c, -R * 0.16, -R * 0.98, R * 0.32, R * 0.98, R * 0.05); inkFill(c, PAL.crema, L);
      c.fillStyle = PAL.amarillo; c.fillRect(-R * 0.16 + L * 0.5, -R * 0.78, R * 0.32 - L, R * 0.22);
      c.restore();
    }
    c.restore();
    circle(c, x, y, R * 0.2); inkFill(c, PAL.piel, L);
  },
};

/* El Rebotador: metido en una llanta, con un resorte en espiral en la cabeza. El más redondo. */
LOOKS.rebotador = { kit: { arms: false }, box: [-1.4, -1.45, 1.4, 1.4],
  back(c, R) {
    const L = Math.max(1.4, R * 0.13), cy = -R * 0.14, n = 16;
    c.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, rr = R * (i % 2 ? 1.2 : 1.1); c.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.94); } c.closePath(); inkFill(c, COL.oscuroSombra, L);   // el labrado
    ell(c, 0, cy, R * 0.92, R * 0.86); c.lineWidth = R * 0.09; c.strokeStyle = COL.brillo; c.stroke();
    c.beginPath(); c.ellipse(0, cy, R * 1.0, R * 0.94, 0, Math.PI * 1.08, Math.PI * 1.36); c.lineWidth = R * 0.1; c.strokeStyle = '#ffffff'; c.stroke();
  },
  over(c, R) {
    const L = Math.max(1.1, R * 0.1);
    for (const s of [-1, 1]) { arm(c, R, s * R * 0.9, -R * 0.2, s * R * 1.12, R * 0.22); circle(c, s * R * 1.12, R * 0.24, R * 0.19); inkFill(c, PAL.piel, L); }   // agarrado de la llanta
  },
  head(c, h) {
    skull(c, h);
    const sp = (w, col) => { c.beginPath(); for (let t = 0; t <= 1.001; t += 0.02) { const a = t * TAU * 2.3 - 1.0, r = h * (0.1 + t * 0.78); c.lineTo(Math.cos(a) * r, Math.sin(a) * r - h * 0.03); } c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    c.lineCap = 'round'; sp(h * 0.36, PAL.tinta); sp(h * 0.16, PAL.plata); c.lineCap = 'butt';
  },
};

/* La Niña Mal: dos trenzas tiesas hacia los lados, de niña traviesa, y la cauchera en el bolsillo. */
LOOKS.ninamal = { box: [-1.75, -1.3, 1.75, 1.35],
  head(c, h) {
    for (const s of [-1, 1]) {                              // trenzas tiesas, con la punta levantada
      const x1 = s * h * (s < 0 ? 2.3 : 2.15), y1 = -h * (s < 0 ? 0.55 : 0.2);
      const braid = (w, col) => { c.beginPath(); c.moveTo(s * h * 0.8, h * 0.1); c.quadraticCurveTo(s * h * 1.7, h * 0.45, x1, y1); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
      c.lineCap = 'round'; braid(h * 0.62, PAL.tinta); braid(h * 0.36, PAL.madera); c.lineCap = 'butt';
      for (const t of [0.4, 0.62]) seg(c, s * h * (0.8 + t * 1.3), h * (0.36 - t * 0.2), s * h * (0.92 + t * 1.3), h * (0.0 - t * 0.2), h * 0.1, PAL.tinta);   // los nudos de la trenza
      circle(c, x1, y1, h * 0.3); inkFill(c, COL.violeta, h * 0.14);                              // moño
    }
    skull(c, h);
    circle(c, 0, 0, h * 1.0); inkFill(c, PAL.madera, h * 0.17);
    c.beginPath(); c.moveTo(h * 0.05, -h * 0.95); c.quadraticCurveTo(-h * 0.1, 0, h * 0.04, h * 0.7); c.lineWidth = h * 0.11; c.strokeStyle = PAL.tinta; c.stroke();   // raya al medio
    shine(c, 0, 0, h * 0.62, 1.15, 1.45, h * 0.12, COL.mono);
  },
  front(c, R) {
    const e = Math.max(0.9, R * 0.08);
    c.save(); c.translate(R * 0.56, R * 0.52); c.rotate(0.4);
    rod(c, 0, R * 0.3, 0, -R * 0.02, R * 0.12, PAL.maderaOsc, e); rod(c, 0, -R * 0.02, -R * 0.22, -R * 0.36, R * 0.11, PAL.maderaOsc, e); rod(c, 0, -R * 0.02, R * 0.22, -R * 0.36, R * 0.11, PAL.maderaOsc, e);
    c.beginPath(); c.moveTo(-R * 0.22, -R * 0.36); c.quadraticCurveTo(0, -R * 0.14, R * 0.22, -R * 0.36); c.lineWidth = R * 0.07; c.strokeStyle = PAL.tinta; c.stroke();   // el caucho
    c.restore();
  },
};

/* Cabezón: pura cabeza. Lisa, brillante, con tres pelos y un chichón con curita. */
LOOKS.cabezon = { box: [-1.4, -1.6, 1.45, 1.3],
  head(c, h) {
    const r = h * 1.52;
    for (const s of [-1, 1]) { circle(c, s * r * 0.98, r * 0.12, h * 0.3); inkFill(c, PAL.piel, h * 0.17); }
    circle(c, r * 0.68, -r * 0.76, h * 0.52); inkFill(c, PAL.rojo, h * 0.18);                     // el chichón: de ahí sale el Mult
    skull(c, r, true, true);
    c.save(); c.translate(r * 0.6, -r * 0.68); c.rotate(0.65);
    for (let i = 0; i < 2; i++) { pathRoundRect(c, -h * 0.46, -h * 0.14, h * 0.92, h * 0.28, h * 0.1); inkFill(c, PAL.crema, h * 0.1); c.rotate(Math.PI / 2); }   // curita en cruz
    c.restore();
    for (const [x, a] of [[-0.3, -0.5], [-0.05, 0.1], [0.2, 0.6]]) { c.beginPath(); c.moveTo(h * x, -h * 0.05); c.quadraticCurveTo(h * (x + a * 0.3), -h * 0.5, h * (x + a * 0.8), -h * 0.6); c.lineWidth = h * 0.1; c.strokeStyle = PAL.tinta; c.stroke(); }
  },
};

/* La Garra: bandana en la frente amarrada atrás, con las puntas al viento, y tres rasguños en la camiseta. */
LOOKS.garra = { box: [-1.35, -1.25, 1.5, 1.5],
  over(c, R) {
    c.lineCap = 'round';
    for (let i = 0; i < 3; i++) seg(c, R * (-0.82 + i * 0.19), R * 0.08, R * (-0.66 + i * 0.19), R * 0.42, R * 0.09, PAL.tinta);
    c.lineCap = 'butt';
  },
  head(c, h) {
    poly(c, [[0.5, 0.55], [1.95, 0.95], [1.5, 1.7]], h); inkFill(c, PAL.franja, h * 0.16);        // las puntas de la bandana
    poly(c, [[0.35, 0.7], [1.15, 2.2], [0.3, 1.8]], h); inkFill(c, PAL.franja, h * 0.16);
    skull(c, h);
    circle(c, 0, 0, h * 0.99); c.fillStyle = PAL.pelo; c.fill();
    for (const [a, w, col] of [[0, h * 0.56, PAL.tinta], [0, h * 0.36, PAL.franja]]) { c.beginPath(); c.arc(0, 0, h * 0.8, Math.PI * 0.82, Math.PI * 2.3); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }   // la bandana rodea la frente
    circle(c, 0, 0, h * 1.0); c.lineWidth = h * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
    shine(c, 0, 0, h * 0.8, 1.2, 1.45, h * 0.1, COL.mono);
    circle(c, h * 0.5, h * 0.72, h * 0.3); inkFill(c, PAL.franja, h * 0.15);                      // el nudo
  },
};

/* Pirlito: melena larga en mechones hacia atrás y la barba en punta hacia adelante. */
LOOKS.pirlito = { box: [-1.45, -1.5, 1.45, 1.65],
  head(c, h) {
    poly(c, [[-0.52, -0.7], [0.06, -1.7], [0.52, -0.7]], h); inkFill(c, PAL.maderaOsc, h * 0.17);  // barba
    for (const [a, len, bend] of [[0.72, 2.0, 0.5], [1.22, 2.6, -0.4], [1.78, 2.25, 0.45], [2.32, 2.5, -0.45]]) {   // mechones ondulados
      const p = (ang, r) => [Math.cos(ang) * r * h, Math.sin(ang) * r * h];
      const b0 = p(a - 0.34, 0.7), b1 = p(a + 0.34, 0.7), tip = p(a + bend * 0.25, len), m0 = p(a - 0.3 + bend * 0.5, len * 0.62), m1 = p(a + 0.3 + bend * 0.5, len * 0.62);
      c.beginPath(); c.moveTo(b0[0], b0[1]); c.quadraticCurveTo(m0[0], m0[1], tip[0], tip[1]); c.quadraticCurveTo(m1[0], m1[1], b1[0], b1[1]); c.closePath(); inkFill(c, PAL.maderaOsc, h * 0.16);
    }
    skull(c, h);
    circle(c, 0, 0, h * 0.99); inkFill(c, PAL.maderaOsc, h * 0.17);
    c.beginPath(); c.moveTo(-h * 0.04, -h * 0.92); c.quadraticCurveTo(h * 0.16, -h * 0.1, -h * 0.02, h * 0.55); c.lineWidth = h * 0.11; c.strokeStyle = PAL.tinta; c.stroke();   // raya al medio
    for (const s of [-1, 1]) shine(c, s * h * 0.12, 0, h * 0.6, s < 0 ? 0.95 : 1.75, s < 0 ? 1.25 : 2.05, h * 0.11, PAL.madera);
  },
};

/* Kan-Té: cabeza chica, las orejas más grandes de la mesa y sudando: nunca para. */
LOOKS.kante = { box: [-1.55, -1.5, 1.75, 1.3],
  head(c, h) {
    for (const s of [-1, 1]) { circle(c, s * h * 1.14, h * 0.1, h * 0.52); inkFill(c, PAL.piel, h * 0.17); circle(c, s * h * 1.18, h * 0.1, h * 0.23); c.fillStyle = PAL.pielOsc; c.fill(); }
    skull(c, h, false, true);
    const a0 = Math.PI * 1.05;
    c.beginPath(); c.arc(0, 0, h * 0.99, a0, Math.PI * 1.95); c.quadraticCurveTo(0, -h * 0.6, Math.cos(a0) * h * 0.99, Math.sin(a0) * h * 0.99); c.closePath(); c.fillStyle = PAL.pelo; c.fill();   // pelo cortísimo
    circle(c, 0, 0, h); c.lineWidth = h * 0.2; c.strokeStyle = PAL.tinta; c.stroke();
    shine(c, -h * 0.3, h * 0.05, h * 0.3, 0.85, 1.45, h * 0.13, 'rgba(255,255,255,0.65)');
    for (const [x, y, r] of [[1.5, -1.15, 0.22], [2.0, -0.7, 0.16], [1.15, -1.6, 0.15]]) {       // gotas de sudor
      c.beginPath(); c.moveTo(h * (x - r * 0.9), h * (y + r * 1.5)); c.quadraticCurveTo(h * (x - r * 1.2), h * (y - r * 0.4), h * x, h * (y - r)); c.quadraticCurveTo(h * (x + r * 1.3), h * (y + r * 0.3), h * (x - r * 0.9), h * (y + r * 1.5)); c.closePath(); inkFill(c, COL.blanco, h * 0.11);
    }
  },
};

/* Rambos (maldito): de oscuro, cresta, codos afuera y la tarjeta roja asomada en la media. */
LOOKS.rambos = { kit: Object.assign({ arms: false }, KIT_MALDITO), box: [-1.75, -1.75, 1.75, 1.4],
  back(c, R) {
    const e = Math.max(1.1, R * 0.09);
    for (const s of [-1, 1]) {
      rod(c, s * R * 1.52, R * 0.0, s * R * 0.9, R * 0.44, R * 0.28, PAL.piel, e);                // antebrazo, la mano en la cintura
      seg(c, s * R * 1.34, R * 0.1, s * R * 1.16, R * 0.3, R * 0.08, PAL.tinta);                   // tatuaje
      arm(c, R, s * R * 0.86, -R * 0.26, s * R * 1.52, R * 0.0, COL.oscuro);                       // hombro al codo
    }
  },
  head(c, h) {
    skull(c, h);
    poly(c, [[-0.3, 0.95], [-0.34, -0.55], [-0.52, -1.15], [-0.13, -0.98], [0.02, -1.8], [0.15, -0.98], [0.5, -1.22], [0.34, -0.55], [0.3, 0.95]], h); inkFill(c, PAL.pelo, h * 0.16);
    seg(c, -h * 0.03, -h * 0.8, -h * 0.03, h * 0.6, h * 0.11, COL.brillo);
  },
  front(c, R) { drawCard(c, R * 0.66, R * 0.86, R * 0.56, PAL.rojo, 0.32); },
};

/* El Tardón: recién levantado. El pelo aplastado de un lado, parado del otro, y la etiqueta de la camiseta por fuera. */
LOOKS.tardon = { box: [-1.35, -1.6, 1.75, 1.3],
  over(c, R) {
    c.save(); c.translate(R * 0.14, R * 0.34); c.rotate(0.22);
    pathRoundRect(c, -R * 0.17, -R * 0.06, R * 0.34, R * 0.4, R * 0.04); inkFill(c, COL.blanco, Math.max(1, R * 0.09));
    seg(c, -R * 0.08, R * 0.12, R * 0.08, R * 0.12, R * 0.05, PAL.tinta); seg(c, -R * 0.08, R * 0.22, R * 0.03, R * 0.22, R * 0.05, PAL.tinta);
    c.restore();
  },
  head(c, h) {
    for (const [t, len] of [[-1.8, 1.45], [-1.32, 2.05], [-0.88, 1.5], [-0.42, 1.95], [0.02, 1.4], [0.48, 1.75]]) {   // mechones, solo de un lado
      poly(c, [[Math.cos(t - 0.26) * 0.8, Math.sin(t - 0.26) * 0.8], [Math.cos(t + 0.1) * len, Math.sin(t + 0.1) * len], [Math.cos(t + 0.26) * 0.8, Math.sin(t + 0.26) * 0.8]], h); inkFill(c, PAL.maderaOsc, h * 0.15);
    }
    skull(c, h);
    hairCap(c, h, PAL.maderaOsc, 0.86, 2.12);
    shine(c, -h * 0.25, -h * 0.1, h * 0.5, 0.95, 1.4, h * 0.11, PAL.madera);                       // el lado de la almohada
  },
};

/* El Gato: gorro con orejas, cola curva y guantes de arquero. */
LOOKS.gato = { box: [-1.4, -1.5, 1.75, 1.45],
  back(c, R) {
    const tail = (w, col) => { c.beginPath(); c.moveTo(R * 0.25, R * 0.5); c.bezierCurveTo(R * 0.9, R * 1.4, R * 1.8, R * 0.95, R * 1.5, R * 0.12); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    c.lineCap = 'round'; tail(R * 0.44, PAL.tinta); tail(R * 0.22, COL.oscuro); c.lineCap = 'butt';
  },
  over(c, R) {
    for (const s of [-1, 1]) {                             // guantes
      pathRoundRect(c, s * R * 0.97 - R * 0.28, R * 0.16, R * 0.56, R * 0.58, R * 0.2); inkFill(c, PAL.crema, Math.max(1.2, R * 0.11));
      seg(c, s * R * 0.97, R * 0.46, s * R * 0.97, R * 0.72, R * 0.06, PAL.tinta);
    }
  },
  head(c, h) {
    for (const s of [-1, 1]) { poly(c, [[s * 0.22, -0.8], [s * (s < 0 ? 1.12 : 1.0), s < 0 ? -1.6 : -1.72], [s * 0.98, -0.25]], h); inkFill(c, COL.oscuro, h * 0.16); }
    circle(c, 0, 0, h * 1.02); inkFill(c, COL.oscuro, h * 0.18);
    for (const s of [-1, 1]) { poly(c, [[s * 0.45, -0.86], [s * 0.92, -1.3], [s * 0.86, -0.62]], h); c.fillStyle = PAL.magenta; c.fill(); }
    shine(c, 0, 0, h * 0.62, 1.15, 1.5, h * 0.12, COL.brillo);
  },
};

/* La Costurera: moño atravesado por dos agujas en X, hilo lima y la cinta métrica al cuello. */
LOOKS.costurera = { box: [-1.6, -1.6, 1.6, 1.3],
  over(c, R) {
    const e = Math.max(1, R * 0.08);
    for (const [x0, x1] of [[-0.36, -0.56], [0.34, 0.62]]) {
      rod(c, R * x0, -R * 0.5, R * x1, R * 0.42, R * 0.17, PAL.crema, e);
      for (let t = 0.3; t < 1; t += 0.2) seg(c, R * (x0 + (x1 - x0) * t) - R * 0.08, -R * 0.5 + R * 0.92 * t, R * (x0 + (x1 - x0) * t) + R * 0.03, -R * 0.5 + R * 0.92 * t, R * 0.05, PAL.tinta);
    }
  },
  head(c, h) {
    skull(c, h);
    circle(c, 0, 0, h * 1.0); inkFill(c, PAL.maderaOsc, h * 0.17);
    circle(c, h * 0.05, h * 0.2, h * 0.62); inkFill(c, PAL.maderaOsc, h * 0.15);                  // el moño
    shine(c, h * 0.05, h * 0.2, h * 0.36, 1.1, 1.6, h * 0.1, PAL.madera);
    const e = h * 0.12;
    rod(c, -h * 1.95, -h * 1.15, h * 1.25, h * 1.2, h * 0.13, PAL.plata, e);
    rod(c, h * 1.65, -h * 1.5, -h * 1.05, h * 1.3, h * 0.13, PAL.plata, e);
    for (const [x, y] of [[-1.95, -1.15], [1.65, -1.5]]) { circle(c, h * x, h * y, h * 0.23); inkFill(c, PAL.crema, h * 0.11); }
    c.beginPath(); c.moveTo(h * 1.25, h * 1.2); c.bezierCurveTo(h * 2.1, h * 1.7, h * 1.5, h * 0.4, h * 2.3, h * 0.45); c.lineWidth = h * 0.14; c.strokeStyle = COL.lima; c.stroke();   // el hilo
  },
};

/* El Narrador: auriculares cuadrados, micrófono de brazo y la hoja de alineaciones. */
LOOKS.narrador = { kit: { arms: 1 }, box: [-1.75, -1.55, 1.45, 1.3],
  head(c, h) {
    skull(c, h, false, true); hairCap(c, h, PAL.pelo, 0.9, 2.1);
    c.lineCap = 'round'; seg(c, -h * 1.0, -h * 0.05, h * 1.0, -h * 0.05, h * 0.42, PAL.tinta); seg(c, -h * 1.0, -h * 0.05, h * 1.0, -h * 0.05, h * 0.17, PAL.plata); c.lineCap = 'butt';   // diadema
    c.beginPath(); c.moveTo(h * 1.15, -h * 0.3); c.quadraticCurveTo(h * 1.25, -h * 1.4, h * 0.4, -h * 1.32); c.lineWidth = h * 0.17; c.strokeStyle = PAL.tinta; c.stroke();        // brazo del micrófono
    for (const s of [-1, 1]) { pathRoundRect(c, s * h * 1.14 - h * 0.34, -h * 0.6, h * 0.68, h * 1.12, h * 0.2); inkFill(c, PAL.crema, h * 0.16); seg(c, s * h * 1.14, -h * 0.3, s * h * 1.14, h * 0.22, h * 0.13, PAL.plataOsc); }
    circle(c, h * 0.32, -h * 1.32, h * 0.32); inkFill(c, PAL.cian, h * 0.14);                     // la espuma: cian = puntos
  },
  front(c, R) {
    const L = Math.max(1.1, R * 0.1), x = -R * 1.12, y = -R * 0.98;
    arm(c, R, -R * 0.88, -R * 0.22, x + R * 0.12, y + R * 0.4);
    c.save(); c.translate(x, y); c.rotate(-0.25);
    pathRoundRect(c, -R * 0.33, -R * 0.43, R * 0.66, R * 0.86, R * 0.05); inkFill(c, COL.blanco, L);
    for (let i = 0; i < 4; i++) seg(c, -R * 0.2, -R * 0.26 + i * R * 0.17, R * (i % 2 ? 0.08 : 0.2), -R * 0.26 + i * R * 0.17, R * 0.06, PAL.tinta);
    c.restore();
    circle(c, x + R * 0.14, y + R * 0.42, R * 0.18); inkFill(c, PAL.piel, L * 0.8);
  },
};

/* El Cabeza Caliente (maldito): de oscuro, con una llama por pelo y vapor por las orejas. */
LOOKS.caliente = { kit: KIT_MALDITO, box: [-1.5, -1.75, 1.6, 1.4],
  head(c, h) {
    for (const s of [-1, 1]) { circle(c, s * h * 1.5, h * 0.08, h * 0.27); inkFill(c, COL.blanco, h * 0.11); circle(c, s * h * 1.86, -h * 0.24, h * 0.18); inkFill(c, COL.blanco, h * 0.1); }   // vapor
    skull(c, h);
    const T = [[-2.8, 1.25], [-2.2, 1.75], [-1.6, 1.4], [-1.0, 2.15], [-0.4, 1.5], [0.2, 1.95], [0.8, 1.35]], d = 0.3;   // lenguas: [ángulo, largo]
    const flame = k => {
      const p = (a, r) => [Math.cos(a) * r * h * k, Math.sin(a) * r * h * k];
      c.beginPath();
      T.forEach(([a, len], i) => {
        const v0 = p(a - d, 0.82), tip = p(a + 0.14, len), v1 = p(a + d, 0.82), c0 = p(a - d * 0.2, len * 0.72), c1 = p(a + d * 1.0, len * 0.78);
        if (i) c.lineTo(v0[0], v0[1]); else c.moveTo(v0[0], v0[1]);
        c.quadraticCurveTo(c0[0], c0[1], tip[0], tip[1]); c.quadraticCurveTo(c1[0], c1[1], v1[0], v1[1]);
      });
      c.arc(0, 0, 0.82 * h * k, T[T.length - 1][0] + d, T[0][0] - d + TAU); c.closePath();
    };
    flame(1); inkFill(c, PAL.rojo, h * 0.17);                                                     // rojo = Mult: el ×3
    flame(0.68); c.fillStyle = COL.mono; c.fill();
    circle(c, h * 0.04, -h * 0.1, h * 0.3); c.fillStyle = PAL.crema; c.fill();
  },
};

/* =====================================================================
   ESPECIALES — peana de toldo verde y crema
   ===================================================================== */

/* El Tendero: gorro de periódico en barquito, lápiz tras la oreja y el delantal con la moneda en el bolsillo. */
LOOKS.tendero = { box: [-1.35, -1.55, 1.55, 1.3],
  over(c, R) {
    const lw = Math.max(1.3, R * 0.12), top = -R * 0.55, bot = R * 0.5;
    pathRoundRect(c, -R * 0.52, top + R * 0.1, R * 1.04, bot - top - R * 0.1, R * 0.16); inkFill(c, PAL.noche, lw);
    for (const s of [-1, 1]) seg(c, s * R * 0.44, top + R * 0.14, s * R * 0.84, top + R * 0.02, R * 0.12, PAL.tinta);   // tirantes
    pathRoundRect(c, -R * 0.34, bot - R * 0.5, R * 0.68, R * 0.36, R * 0.08); inkFill(c, PAL.crema, lw * 0.7);          // bolsillo
    moneda(c, R * 0.1, bot - R * 0.5, R * 0.18);
  },
  head(c, h) {
    skull(c, h);
    rod(c, h * 0.98, h * 0.32, h * 1.62, -h * 0.9, h * 0.15, PAL.madera, h * 0.11);                // lápiz
    circle(c, h * 1.66, -h * 0.98, h * 0.1); c.fillStyle = PAL.tinta; c.fill();
    const boat = () => { c.beginPath(); c.moveTo(-h * 0.12, -h * 1.62); c.quadraticCurveTo(h * 1.3, -h * 0.25, h * 0.12, h * 1.22); c.quadraticCurveTo(-h * 1.3, -h * 0.1, -h * 0.12, -h * 1.62); c.closePath(); };
    boat(); c.fillStyle = COL.blanco; c.fill();
    c.save(); boat(); c.clip(); c.fillStyle = 'rgba(26,20,35,0.17)'; poly(c, [[-0.12, -1.62], [1.5, -1.62], [1.5, 1.3], [0.12, 1.22]], h); c.fill(); c.restore();   // una cara en sombra
    boat(); c.lineWidth = h * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
    seg(c, -h * 0.12, -h * 1.55, h * 0.12, h * 1.15, h * 0.11, PAL.tinta);                         // el doblez
    for (const [x, y, w] of [[-0.62, -0.5, 0.34], [-0.7, -0.2, 0.42], [-0.6, 0.1, 0.34], [0.3, -0.62, 0.3], [0.32, -0.3, 0.4], [0.3, 0.0, 0.32]]) seg(c, h * x, h * y, h * (x + w), h * (y + 0.04), h * 0.08, 'rgba(26,20,35,0.6)');   // es de periódico
  },
};

/* La Llave: carga una llave antigua cruzada sobre los hombros, a lo largo de la barra: por ahí manda. */
LOOKS.llave = { box: [-1.9, -1.3, 2.0, 1.3],
  over(c, R) {
    const L = Math.max(1.3, R * 0.12);
    c.save(); c.translate(0, -R * 0.4); c.rotate(-0.09);
    for (const [x, len] of [[-1.74, 0.46], [-1.36, 0.32]]) { pathRoundRect(c, R * x, 0, R * 0.24, R * len, R * 0.04); inkFill(c, PAL.plata, L); }   // dientes
    pathRoundRect(c, -R * 1.8, -R * 0.15, R * 2.95, R * 0.3, R * 0.1); inkFill(c, PAL.plata, L);  // caño
    circle(c, R * 1.44, 0, R * 0.5); inkFill(c, PAL.plata, L);                                    // ojo
    circle(c, R * 1.44, 0, R * 0.2); inkFill(c, PAL.plataOsc, L * 0.8);
    seg(c, -R * 1.62, -R * 0.05, R * 0.86, -R * 0.05, R * 0.07, '#ffffff');
    shine(c, R * 1.44, 0, R * 0.36, 1.05, 1.5, R * 0.08);
    c.restore();
  },
  head(c, h) {
    skull(c, h); hairCap(c, h, PAL.pelo, 0.9, 2.1);
    shine(c, 0, 0, h * 0.62, 1.2, 1.5, h * 0.11, COL.brillo);
    c.save(); c.translate(h * 0.5, -h * 0.62); c.rotate(0.5); pathRoundRect(c, -h * 0.34, -h * 0.14, h * 0.68, h * 0.28, h * 0.12); inkFill(c, COL.lima, h * 0.11); c.restore();   // gancho de pelo
  },
};

/* El Veterano: gorra plana de paño, ladeada, canas y camiseta retro de manga larga con banda al pecho.
   (El bigotón se ve de frente; desde arriba parecían cuernos.) */
LOOKS.veterano = { box: [-1.4, -1.7, 1.4, 1.3],
  kit: { longSleeve: true, pattern(c, R, W, top, bot) { c.fillRect(-W, top + (bot - top) * 0.36, W * 2, (bot - top) * 0.3); } },
  head(c, h) {
    skull(c, h);
    circle(c, 0, h * 0.06, h * 1.04); inkFill(c, COL.canas, h * 0.17);                            // canas
    c.save(); c.rotate(-0.3);
    const cap = () => { c.beginPath(); c.moveTo(0, -h * 1.72); c.quadraticCurveTo(h * 1.35, -h * 1.3, h * 1.12, -h * 0.05); c.quadraticCurveTo(h * 0.95, h * 0.72, 0, h * 0.7); c.quadraticCurveTo(-h * 0.95, h * 0.72, -h * 1.12, -h * 0.05); c.quadraticCurveTo(-h * 1.35, -h * 1.3, 0, -h * 1.72); c.closePath(); };
    c.translate(0, -h * 0.12); c.scale(0.9, 0.9);
    cap(); c.fillStyle = PAL.maderaOsc; c.fill();
    c.save(); cap(); c.clip(); c.fillStyle = 'rgba(26,20,35,0.28)'; c.fillRect(h * 0.3, -h * 2, h * 2, h * 4); c.restore();
    cap(); c.lineWidth = h * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
    c.beginPath(); c.moveTo(-h * 1.0, -h * 0.72); c.quadraticCurveTo(0, -h * 1.22, h * 1.0, -h * 0.72); c.lineWidth = h * 0.12; c.strokeStyle = PAL.tinta; c.stroke();   // donde empieza la visera
    circle(c, 0, -h * 0.1, h * 0.17); inkFill(c, PAL.madera, h * 0.1);                            // botón
    c.restore();
  },
};

/* Chilena: de cabeza en el aire. Adelante la suela del guayo con sus taches; atrás, el pelo largo colgando. */
LOOKS.chilena = { noBody: true, headY: 0.72, box: [-1.75, -1.5, 1.75, 1.95],
  back(c, R) {
    const lw = Math.max(2, R * 0.15), L = Math.max(1.1, R * 0.1);
    topes(c, R);
    for (const s of [-1, 1]) { const y = R * (s < 0 ? 0.78 : 0.6); arm(c, R, s * R * 0.7, R * 0.22, s * R * 1.5, y); circle(c, s * R * 1.52, y + R * 0.02, R * 0.19); inkFill(c, PAL.piel, L); }
    const torso = () => pathRoundRect(c, -R * 0.86, -R * 0.28, R * 1.72, R * 0.98, R * 0.4);
    torso(); c.fillStyle = PAL.camisa; c.fill();
    c.save(); torso(); c.clip(); c.fillStyle = PAL.franja; for (const x of [-0.5, 0.16]) c.fillRect(R * x, -R * 0.3, R * 0.3, R * 1.1);
    c.fillStyle = 'rgba(226,211,181,0.5)'; c.fillRect(R * 0.3, -R * 0.3, R, R * 1.1); c.restore();
    torso(); c.lineWidth = lw; c.strokeStyle = PAL.tinta; c.stroke();
    pathRoundRect(c, -R * 0.42, -R * 0.66, R * 0.84, R * 0.52, R * 0.18); inkFill(c, PAL.tinta, lw * 0.8);   // pantaloneta
  },
  head(c, h) {
    const k = h * 0.9;
    for (const [x, len] of [[-0.68, 1.75], [-0.24, 2.2], [0.22, 1.9], [0.68, 2.3]]) { poly(c, [[x - 0.32, 0.3], [x + 0.06, len], [x + 0.34, 0.3]], k); inkFill(c, PAL.pelo, k * 0.15); }   // el pelo cuelga
    skull(c, k);
    circle(c, 0, 0, k * 0.99); c.fillStyle = PAL.pelo; c.fill();
    shine(c, 0, 0, k * 0.62, 1.2, 1.5, k * 0.12, COL.brillo);
    pathRoundRect(c, -k * 0.99, -k * 0.2, k * 1.98, k * 0.36, k * 0.1); inkFill(c, PAL.crema, k * 0.12);   // vincha
    star(c, 0, -k * 0.02, k * 0.16); c.fillStyle = PAL.tinta; c.fill();
    circle(c, 0, 0, k); c.lineWidth = k * 0.18; c.strokeStyle = PAL.tinta; c.stroke();
  },
  front(c, R) {
    const L = Math.max(1.3, R * 0.12);
    for (const [x, y, rot] of [[-0.3, -0.78, -0.1], [0.36, -0.7, 0.22]]) {                          // las dos suelas, una más arriba (chueco)
      c.save(); c.translate(R * x, R * y); c.rotate(rot);
      pathRoundRect(c, -R * 0.3, -R * 0.62, R * 0.6, R * 1.24, R * 0.28); inkFill(c, COL.oscuro, L);
      pathRoundRect(c, -R * 0.19, -R * 0.5, R * 0.38, R * 1.0, R * 0.18); c.lineWidth = R * 0.06; c.strokeStyle = PAL.crema; c.stroke();
      for (const [tx, ty] of [[-0.09, -0.3], [0.09, -0.3], [-0.09, 0.05], [0.09, 0.05], [0, 0.36]]) { circle(c, R * tx, R * ty, R * 0.07); inkFill(c, PAL.plata, L * 0.45); }   // taches
      c.restore();
    }
  },
};

/* Pesi: el más bajito. Flequillo en pico y el mate con su bombilla. */
LOOKS.pesi = { kit: { arms: -1 }, box: [-1.35, -1.6, 1.75, 1.3],
  head(c, h) {
    skull(c, h);
    hairCap(c, h, PAL.maderaOsc, 0.92, 2.08);
    c.beginPath(); c.moveTo(-h * 0.98, -h * 0.3); c.quadraticCurveTo(-h * 1.0, -h * 1.25, -h * 0.5, -h * 1.7); c.quadraticCurveTo(-h * 0.2, -h * 1.0, h * 0.4, -h * 0.86); c.quadraticCurveTo(-h * 0.3, -h * 0.45, -h * 0.98, -h * 0.3); c.closePath(); inkFill(c, PAL.maderaOsc, h * 0.16);   // flequillo
    shine(c, h * 0.1, 0, h * 0.6, 1.55, 1.9, h * 0.11, PAL.madera);
  },
  front(c, R) {
    const L = Math.max(1.1, R * 0.1), x = R * 1.1, y = -R * 0.9;
    arm(c, R, R * 0.88, -R * 0.22, x - R * 0.1, y + R * 0.36);
    circle(c, x - R * 0.12, y + R * 0.38, R * 0.18); inkFill(c, PAL.piel, L * 0.8);
    circle(c, x, y, R * 0.36); inkFill(c, PAL.maderaOsc, L);                                      // el mate
    circle(c, x, y, R * 0.3); c.lineWidth = R * 0.07; c.strokeStyle = PAL.plata; c.stroke();
    circle(c, x, y, R * 0.2); c.fillStyle = PAL.cancha; c.fill();                                  // la yerba
    rod(c, x + R * 0.04, y - R * 0.02, x + R * 0.46, y - R * 0.66, R * 0.09, PAL.plata, L * 0.8); // bombilla
  },
};

/* CP7: tupé engominado, brazos abiertos hacia atrás (la pose) y un arete que brilla. */
LOOKS.cp7 = { kit: { arms: false }, box: [-1.9, -1.75, 1.9, 1.3],
  back(c, R) {
    const L = Math.max(1.1, R * 0.1);
    for (const s of [-1, 1]) { arm(c, R, s * R * 0.86, -R * 0.24, s * R * 1.6, R * 0.5); circle(c, s * R * 1.63, R * 0.53, R * 0.19); inkFill(c, PAL.piel, L); }
  },
  head(c, h) {
    skull(c, h);
    hairCap(c, h, PAL.pelo, 0.98, 2.02);
    c.beginPath(); c.moveTo(-h * 0.88, -h * 0.42); c.quadraticCurveTo(-h * 0.55, -h * 2.05, h * 0.35, -h * 1.8); c.quadraticCurveTo(h * 1.1, -h * 1.5, h * 0.88, -h * 0.48); c.quadraticCurveTo(0, -h * 0.9, -h * 0.88, -h * 0.42); c.closePath(); inkFill(c, PAL.pelo, h * 0.16);   // tupé
    c.lineCap = 'round'; c.beginPath(); c.moveTo(-h * 0.42, -h * 1.15); c.quadraticCurveTo(0, -h * 1.62, h * 0.52, -h * 1.28); c.lineWidth = h * 0.16; c.strokeStyle = '#ffffff'; c.stroke(); c.lineCap = 'butt';   // brillo de gel
    star(c, -h * 1.3, h * 0.36, h * 0.46, 4, 0, 0.26); inkFill(c, '#ffffff', h * 0.1);            // arete
  },
};

/* El Gemelo: dos cabezas, un cuerpo. Iguales; la cinta dice cuál es cuál. */
LOOKS.gemelo = { box: [-1.5, -1.25, 1.5, 1.3],
  head(c, h) {
    for (const s of [-1, 1]) {
      c.save(); c.translate(s * h * 0.82, s * h * 0.08); c.rotate(s * 0.16);                      // cada uno mira un poco hacia afuera
      skull(c, h * 0.74);
      hairCap(c, h * 0.74, PAL.pelo, 0.92, 2.08);
      shine(c, 0, 0, h * 0.44, 1.2, 1.5, h * 0.09, COL.brillo);
      if (s > 0) for (const [w, col] of [[h * 0.3, PAL.tinta], [h * 0.15, PAL.magenta]]) seg(c, -h * 0.7, -h * 0.02, h * 0.7, -h * 0.02, w, col);   // la cinta
      c.restore();
    }
  },
};

/* Bekam: pelo mono con vincha, coleta curva como su comba y los brazos tatuados. */
LOOKS.bekam = { box: [-1.35, -1.25, 1.75, 1.6],
  over(c, R) {
    for (const s of [-1, 1]) { const x = s * R * 0.97; seg(c, x - R * 0.11, R * 0.1, x + R * 0.11, R * 0.2, R * 0.07, PAL.tinta); seg(c, x - R * 0.11, R * 0.32, x + R * 0.11, R * 0.25, R * 0.07, PAL.tinta); circle(c, x, R * 0.44, R * 0.055); c.fillStyle = PAL.tinta; c.fill(); }
  },
  head(c, h) {
    c.beginPath(); c.moveTo(-h * 0.32, h * 0.72); c.quadraticCurveTo(h * 0.45, h * 2.75, h * 2.2, h * 1.2); c.quadraticCurveTo(h * 0.95, h * 1.65, h * 0.38, h * 0.68); c.closePath(); inkFill(c, COL.mono, h * 0.17);   // coleta
    skull(c, h);
    circle(c, 0, 0, h * 0.99); inkFill(c, COL.mono, h * 0.17);
    for (const [w, col] of [[h * 0.36, PAL.tinta], [h * 0.17, PAL.crema]]) { c.beginPath(); c.arc(0, h * 0.3, h * 0.95, Math.PI * 1.18, Math.PI * 1.82); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }   // vincha
    circle(c, h * 0.04, h * 0.76, h * 0.2); inkFill(c, PAL.crema, h * 0.11);                      // el caucho de la coleta
    shine(c, 0, 0, h * 0.62, 1.55, 1.85, h * 0.11, '#F6C98F');
  },
};

/* El Colector: sombrero vueltiao con cuatro chapas, una por rareza, y el álbum bajo el brazo. */
LOOKS.colector = { box: [-1.35, -1.45, 1.8, 1.3],
  over(c, R) {
    const L = Math.max(1.2, R * 0.11);
    c.save(); c.translate(R * 1.24, R * 0.14); c.rotate(0.22);
    pathRoundRect(c, -R * 0.38, -R * 0.54, R * 0.76, R * 1.08, R * 0.06); inkFill(c, PAL.maderaOsc, L);
    seg(c, -R * 0.22, -R * 0.54, -R * 0.22, R * 0.54, R * 0.07, PAL.tinta);                        // el lomo
    pathRoundRect(c, -R * 0.1, -R * 0.34, R * 0.38, R * 0.3, R * 0.03); inkFill(c, PAL.crema, L * 0.6);
    c.restore();
  },
  head(c, h) {
    const r = h * 1.6;
    circle(c, 0, 0, r); inkFill(c, PAL.crema, h * 0.18);
    circle(c, 0, 0, r * 0.88); c.lineWidth = h * 0.13; c.strokeStyle = PAL.tinta; c.stroke();
    c.fillStyle = PAL.tinta;
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + 0.1; poly(c, [[Math.cos(a - 0.14) * 0.6, Math.sin(a - 0.14) * 0.6], [Math.cos(a) * 0.8, Math.sin(a) * 0.8], [Math.cos(a + 0.14) * 0.6, Math.sin(a + 0.14) * 0.6]], r); c.fill(); }   // las pintas
    circle(c, 0, 0, h * 0.9); inkFill(c, PAL.crema, h * 0.16);                                     // la copa
    circle(c, 0, 0, h * 0.42); c.lineWidth = h * 0.12; c.strokeStyle = PAL.tinta; c.stroke();
    [PAL.madera, PAL.plata, PAL.oroLuz, PAL.esmeralda].forEach((m, i) => { const a = -2.5 + i * 1.1; circle(c, Math.cos(a) * h * 0.9, Math.sin(a) * h * 0.9, h * 0.22); inkFill(c, m, h * 0.1); });   // chapas: una por rareza
  },
};

/* El Justiciero: sombrero de ala, estrella de lata torcida y una capa hecha con el mantel de la tienda. */
LOOKS.justiciero = { box: [-1.45, -1.35, 1.45, 1.6],
  over(c, R) {
    const L = Math.max(1.4, R * 0.13);
    const cape = () => { c.beginPath(); c.moveTo(-R * 0.6, -R * 0.44); c.lineTo(R * 0.6, -R * 0.44); c.quadraticCurveTo(R * 0.95, R * 0.4, R * 1.02, R * 1.2);
      c.quadraticCurveTo(R * 0.6, R * 1.1, R * 0.32, R * 1.45); c.quadraticCurveTo(-R * 0.1, R * 1.15, -R * 0.45, R * 1.42); c.quadraticCurveTo(-R * 0.75, R * 1.15, -R * 1.05, R * 1.25); c.quadraticCurveTo(-R * 0.95, R * 0.4, -R * 0.6, -R * 0.44); c.closePath(); };
    cape(); c.fillStyle = PAL.crema; c.fill();
    c.save(); cape(); c.clip(); c.fillStyle = 'rgba(184,49,60,0.62)';
    for (let x = -1.25; x < 1.3; x += 0.5) c.fillRect(R * x, -R, R * 0.25, R * 3);
    for (let y = -0.4; y < 1.6; y += 0.5) c.fillRect(-R * 1.5, R * y, R * 3, R * 0.25);
    c.restore();
    cape(); c.lineWidth = L; c.strokeStyle = PAL.tinta; c.stroke();
  },
  head(c, h) {
    c.save(); c.rotate(0.12);
    ell(c, 0, 0, h * 1.55, h * 1.22); inkFill(c, PAL.madera, h * 0.17);
    ell(c, 0, -h * 0.02, h * 0.92, h * 0.8); inkFill(c, PAL.maderaOsc, h * 0.15);
    c.restore();
    star(c, h * 0.06, -h * 0.04, h * 0.56, 5, 0.32); inkFill(c, PAL.plata, h * 0.11);
    seg(c, -h * 0.08, -h * 0.16, h * 0.12, -h * 0.06, h * 0.08, '#ffffff');
  },
};

/* =====================================================================
   LEGENDARIOS — peana de esmeralda tallada
   ===================================================================== */

/* mano abierta, grande, con contorno de tinta (s = alto de la mano) */
function bigHand(c, s, fill) {
  const L = Math.max(1.4, s * 0.085);
  for (const [x, len, rot] of [[-0.36, 0.5, -0.16], [-0.12, 0.62, -0.04], [0.12, 0.6, 0.06], [0.35, 0.46, 0.2]]) {   // cuatro dedos
    c.save(); c.translate(s * x, -s * 0.1); c.rotate(rot); pathRoundRect(c, -s * 0.105, -s * len, s * 0.21, s * len + s * 0.1, s * 0.1); inkFill(c, fill, L); c.restore();
  }
  c.save(); c.translate(-s * 0.42, s * 0.2); c.rotate(-1.0); pathRoundRect(c, -s * 0.11, -s * 0.44, s * 0.22, s * 0.5, s * 0.1); inkFill(c, fill, L); c.restore();   // pulgar
  pathRoundRect(c, -s * 0.48, -s * 0.16, s * 0.96, s * 0.66, s * 0.22); inkFill(c, fill, L);       // palma
  c.save(); pathRoundRect(c, -s * 0.48, -s * 0.16, s * 0.96, s * 0.66, s * 0.22); c.clip(); c.fillStyle = 'rgba(26,20,35,0.14)'; c.fillRect(s * 0.1, -s * 0.2, s, s); c.restore();
  for (const x of [-0.24, 0.0, 0.24]) seg(c, s * x, -s * 0.14, s * x, -s * 0.02, L * 0.8, PAL.tinta);   // nudillos
}

/* La Mano: una mano abierta gigante, más grande que la cabeza, con su aureola. */
LOOKS.mano = { kit: { arms: 1 }, box: [-2.05, -2.15, 1.35, 1.3],
  head(c, h) { skull(c, h); hairCap(c, h, PAL.pelo, 0.94, 2.06); shine(c, 0, 0, h * 0.62, 1.2, 1.5, h * 0.11, COL.brillo); },
  front(c, R, tm) {
    const x = -R * 1.12, y = -R * 1.12, e = Math.max(1.2, R * 0.1);
    arm(c, R, -R * 0.88, -R * 0.22, x + R * 0.2, y + R * 0.55);
    c.save(); c.translate(x, y); c.rotate(-0.3);
    bigHand(c, R * 1.3, PAL.crema);
    const halo = (w, col) => { ell(c, 0, -R * 0.95, R * 0.62, R * 0.2); c.lineWidth = w; c.strokeStyle = col; c.stroke(); };
    halo(R * 0.16 + e * 2, PAL.tinta); halo(R * 0.16, PAL.esmeralda);                             // la aureola: esmeralda = legendario
    c.beginPath(); c.ellipse(0, -R * 0.95, R * 0.62, R * 0.2, 0, Math.PI * 1.1, Math.PI * 1.5); c.lineWidth = R * 0.07; c.strokeStyle = '#ffffff'; c.stroke();
    c.restore();
  },
};

/* El Diez: el afro mono más grande de la mesa, con brillo (antes era de oro; el oro ahora es de los Especiales). */
LOOKS.diez = { box: [-1.45, -1.75, 1.45, 1.3],
  head(c, h) {
    const n = 11, r = h * 1.22;
    for (let i = 0; i < n; i++) {                           // rizos del borde; los de abajo a la derecha, en sombra
      const a = i / n * TAU + 0.2, rr = h * (0.56 + (i % 3) * 0.05), dark = Math.cos(a - 0.85) > 0.35;
      circle(c, Math.cos(a) * r, Math.sin(a) * r - h * 0.05, rr); inkFill(c, dark ? COL.monoOsc : COL.mono, h * 0.17);
    }
    circle(c, 0, -h * 0.05, r * 1.1); c.fillStyle = COL.monoOsc; c.fill();
    circle(c, -h * 0.26, -h * 0.34, r * 1.0); c.fillStyle = COL.mono; c.fill();                    // la luz viene de arriba a la izquierda
    for (const [x, y, rr, a0] of [[-0.8, -0.8, 0.42, 1.05], [0.1, -1.05, 0.4, 1.2], [-0.25, -0.2, 0.42, 1.0], [0.65, -0.4, 0.38, 1.25], [-0.95, 0.1, 0.36, 0.95], [0.25, 0.4, 0.36, 1.1], [-0.4, 0.75, 0.34, 1.0]]) shine(c, h * x, h * y, h * rr, a0, a0 + 0.6, h * 0.16, COL.monoLuz);   // rizos
    shine(c, -h * 0.5, -h * 0.75, h * 0.62, 1.1, 1.35, h * 0.12);
  },
};

/* El Capitán: laurel esmeralda, el brazo señalando, el brazalete con la C y el banderín del saludo. */
LOOKS.capitan = { kit: { arms: false }, box: [-2.0, -1.85, 1.85, 1.3],
  back(c, R) {
    const L = Math.max(1.2, R * 0.11), e = Math.max(1, R * 0.08);
    // banderín: palito y triángulo con fleco
    arm(c, R, -R * 0.86, -R * 0.24, -R * 1.02, -R * 0.98);
    poly(c, [[-1.8, -1.0], [-1.0, -1.1], [-1.5, -0.1]], R); c.fillStyle = PAL.franja; c.fill();
    c.save(); poly(c, [[-1.8, -1.0], [-1.0, -1.1], [-1.5, -0.1]], R); c.clip(); c.fillStyle = PAL.crema; c.fillRect(-R * 1.52, -R * 1.2, R * 0.2, R * 1.3); c.restore();
    poly(c, [[-1.8, -1.0], [-1.0, -1.1], [-1.5, -0.1]], R); c.lineWidth = L; c.strokeStyle = PAL.tinta; c.stroke();
    circle(c, -R * 1.5, -R * 0.06, R * 0.11); inkFill(c, PAL.esmeralda, L * 0.6);
    rod(c, -R * 1.9, -R * 1.0, -R * 0.9, -R * 1.12, R * 0.1, PAL.madera, e);
    circle(c, -R * 1.02, -R * 1.02, R * 0.19); inkFill(c, PAL.piel, L * 0.8);
    // brazo que señala
    arm(c, R, R * 0.86, -R * 0.24, R * 1.5, -R * 1.2);
    rod(c, R * 1.5, -R * 1.2, R * 1.68, -R * 1.52, R * 0.12, PAL.piel, e);                        // el índice
    circle(c, R * 1.5, -R * 1.2, R * 0.2); inkFill(c, PAL.piel, L * 0.8);
    c.save(); c.translate(R * 1.06, -R * 0.56); c.rotate(Math.atan2(-0.96, 0.64) + Math.PI / 2);   // brazalete
    pathRoundRect(c, -R * 0.24, -R * 0.17, R * 0.48, R * 0.34, R * 0.06); inkFill(c, PAL.crema, L * 0.8);
    seg(c, -R * 0.2, -R * 0.1, R * 0.2, -R * 0.1, R * 0.06, PAL.esmeralda);
    c.fillStyle = PAL.tinta; c.font = `${R * 0.3}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C', 0, R * 0.05);
    c.restore();
  },
  head(c, h) {
    skull(c, h); hairCap(c, h, PAL.pelo, 0.94, 2.06);
    for (let i = 0; i < 11; i++) {                         // laurel: hojas esmeralda alrededor
      const a = -Math.PI / 2 + 0.55 + i / 10 * (TAU - 1.1), x = Math.cos(a) * h * 1.04, y = Math.sin(a) * h * 1.04;   // abierto en la frente
      c.save(); c.translate(x, y); c.rotate(a + (i < 5 ? 0.45 : -0.45)); ell(c, 0, 0, h * 0.17, h * 0.4); inkFill(c, i % 2 ? PAL.esmeraldaLuz : PAL.esmeralda, h * 0.09); c.restore();
    }
  },
};
