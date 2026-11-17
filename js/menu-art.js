/* =====================================================================
   GOLÍN — ARTE DEL MENÚ (v3.12)
   El menú se dibuja con más cuidado que la mesa: contorno fino de un tono
   oscuro del MISMO color de cada cosa (nunca tinta gruesa), degradados
   suaves con la luz arriba y materiales creíbles (madera con veta, papel,
   metal). Aquí vive la tienda por dentro: pared con luz cálida detrás de
   Don Chucho, repisas, mostrador, el rótulo colgado y él mismo.
   Todo sale de PAL (js/art.js); los tonos intermedios se mezclan con mix().
   Solo dibujo: no toca el juego ni el Don Chucho de la mesa (js/art.js).
   ===================================================================== */
'use strict';
const MA = (() => {
  const P = PAL;
  const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const K = {
    skinL: mix(P.piel, P.crema, 0.42), skin: P.piel, skinD: P.pielOsc, skinX: mix(P.pielOsc, P.tinta, 0.45),
    hair: mix(P.tinta, P.maderaOsc, 0.28), hairL: mix(P.tinta, P.maderaOsc, 0.85), hairX: mix(P.tinta, P.maderaOsc, 0.1),
    shirtL: P.canchaOsc, shirt: P.noche, shirtX: mix(P.noche, P.tinta, 0.55),
    paperX: mix(P.papelOsc, P.maderaOsc, 0.55),
    coinL: mix(P.amarillo, '#ffffff', 0.55), coinX: mix(P.amarillo, P.maderaOsc, 0.62),
    metalL: mix(P.plata, '#ffffff', 0.55), metalX: mix(P.plataOsc, P.tinta, 0.35),
  };
  const stopsOf = (g, stops) => { stops.forEach((s, i) => g.addColorStop(Array.isArray(s) ? s[0] : i / (stops.length - 1), Array.isArray(s) ? s[1] : s)); return g; };
  const lin = (c, x0, y0, x1, y1, stops) => stopsOf(c.createLinearGradient(x0, y0, x1, y1), stops);
  const rad = (c, x, y, r0, r1, stops) => stopsOf(c.createRadialGradient(x, y, r0, x, y, r1), stops);
  const fine = (c, fill, line, lw = 2.4) => { c.fillStyle = fill; c.fill(); c.lineWidth = lw; c.lineJoin = 'round'; c.strokeStyle = line; c.stroke(); };
  const rr = pathRoundRect, TAU = Math.PI * 2;
  const el = (c, x, y, rx, ry, rot = 0, a0 = 0, a1 = TAU) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, a0, a1); };
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;      // azar repetible: el mismo dibujo en cada visita

  /* capas que no cambian (pared, mostrador, rótulo): se pintan una vez y se reutilizan */
  const layers = {};
  function layer(name, key, w, h, dpr, paint) {
    let L = layers[name];
    if (!L || L.key !== key) {
      const cv = L ? L.cv : document.createElement('canvas');
      cv.width = Math.max(1, Math.ceil(w * dpr)); cv.height = Math.max(1, Math.ceil(h * dpr));
      const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h); paint(x);
      L = layers[name] = { key, cv, w, h };
    }
    return L;
  }

  /* ---------------- la tienda por dentro ---------------- */
  /* Pared: revoque cálido con la luz detrás de Don Chucho (hx, hy). Sin rayas: solo luz, sombra en las esquinas y dos repisas desenfocadas. */
  /* Pared clara, color papel (la eligió el dueño entre tres: madera, verde y clara): la luz blanca queda detrás de Don Chucho y las esquinas
     se van a un marrón suave. Sobre ella resaltan él, el rótulo verde y la madera. Sin rayas. */
  function paintWall(c, W, cy, hx, hy) {
    c.fillStyle = lin(c, 0, 0, 0, cy, [mix(P.crema, P.papelOsc, 0.7), [0.45, P.crema], mix(P.crema, P.papelOsc, 0.35)]); c.fillRect(0, 0, W, cy);
    const R = Math.max(W * 0.95, cy * 0.8);
    c.fillStyle = rad(c, hx, hy, 8, R, [[0, hexA('#ffffff', 0.95)], [0.2, hexA(P.papel, 0.8)], [0.48, hexA(P.papel, 0.4)], [1, hexA(P.papel, 0)]]); c.fillRect(0, 0, W, cy);
    c.fillStyle = rad(c, hx, hy, R * 0.5, R * 1.2, [[0, hexA(P.maderaOsc, 0)], [1, hexA(P.maderaOsc, 0.42)]]); c.fillRect(0, 0, W, cy);
    c.fillStyle = lin(c, 0, 0, 0, cy * 0.26, [hexA(P.maderaOsc, 0.3), hexA(P.maderaOsc, 0)]); c.fillRect(0, 0, W, cy * 0.26);
    const r = rnd(7);                                                    // grano del revoque
    for (let i = 0; i < W * cy / 900; i++) { c.fillStyle = i % 2 ? hexA('#ffffff', 0.09) : hexA(P.maderaOsc, 0.05); c.fillRect(r() * W, r() * cy, 1.2, 1.2); }
  }
  /* Repisa con frascos, botellas y cajas: tonos de la misma madera, sin contorno, para que queden atrás */
  function paintShelf(c, x0, x1, y, seed, fade) {
    const r = rnd(seed), items = [];
    let x = x0 + 6;
    while (x < x1 - 20) { const kind = ['bot', 'jar', 'can', 'box', 'jar', 'bot'][Math.floor(r() * 6)], w = kind === 'bot' ? 13 + r() * 4 : kind === 'box' ? 24 + r() * 10 : 17 + r() * 8; items.push({ kind, x, w, h: kind === 'bot' ? 40 + r() * 12 : kind === 'box' ? 22 + r() * 8 : 24 + r() * 12, tone: Math.floor(r() * 3) }); x += w + 5 + r() * 5; }
    const tones = [mix(P.madera, P.maderaOsc, 0.55), mix(P.maderaLuz, P.madera, 0.4), mix(P.canchaOsc, P.maderaOsc, 0.55)];
    c.save(); c.globalAlpha = fade;
    for (const it of items) {
      if (it.x + it.w > x1 - 4) continue;
      const col = tones[it.tone], top = y - it.h;
      c.fillStyle = lin(c, it.x, 0, it.x + it.w, 0, [mix(col, P.papel, 0.28), [0.35, col], mix(col, P.maderaHond, 0.4)]);
      if (it.kind === 'bot') { rr(c, it.x, top + it.h * 0.34, it.w, it.h * 0.66, it.w * 0.3); c.fill(); rr(c, it.x + it.w * 0.32, top, it.w * 0.36, it.h * 0.42, 2); c.fill(); }
      else if (it.kind === 'jar') { rr(c, it.x, top + 4, it.w, it.h - 4, it.w * 0.22); c.fill(); c.fillStyle = mix(col, P.maderaHond, 0.45); rr(c, it.x + 1, top, it.w - 2, 6, 2); c.fill(); }
      else if (it.kind === 'can') { rr(c, it.x, top, it.w, it.h, 3); c.fill(); c.fillStyle = hexA(P.papel, 0.28); c.fillRect(it.x, top + it.h * 0.3, it.w, it.h * 0.36); }
      else { rr(c, it.x, top, it.w, it.h, 2); c.fill(); c.fillStyle = hexA(P.maderaHond, 0.25); c.fillRect(it.x, top + 5, it.w, 1.5); }
    }
    c.globalAlpha = 1;
    c.fillStyle = lin(c, 0, y, 0, y + 9, [mix(P.maderaLuz, P.madera, 0.5), mix(P.madera, P.maderaOsc, 0.7)]); c.globalAlpha = Math.min(1, fade + 0.15); c.fillRect(x0, y, x1 - x0, 9);
    c.fillStyle = hexA(P.papel, 0.4); c.fillRect(x0, y, x1 - x0, 1.2);
    c.fillStyle = lin(c, 0, y + 9, 0, y + 26, [hexA(P.maderaHond, 0.3), hexA(P.maderaHond, 0)]); c.fillRect(x0, y + 9, x1 - x0, 17);
    c.restore();
  }
  /* Mostrador: tabla de arriba con brillo, canto en sombra y frente de madera con veta, nudos y uniones */
  function paintCounter(c, W, h) {
    const th = 14, r = rnd(23);
    c.fillStyle = lin(c, 0, th, 0, h, [mix(P.madera, P.maderaLuz, 0.25), [0.5, P.madera], mix(P.madera, P.maderaOsc, 0.6)]); c.fillRect(0, th, W, h - th);
    c.lineCap = 'round';
    for (let i = 0; i < Math.max(5, (h - th) / 17); i++) {               // veta: líneas largas que ondulan, una oscura y otra clara al lado
      const y = th + 14 + i * 17 + r() * 6, a = 3 + r() * 5, ph = r() * 6;
      for (const [dy, col, lw] of [[0, hexA(P.maderaOsc, 0.2), 1.3], [2.2, hexA(P.maderaLuz, 0.16), 1]]) {
        c.beginPath(); c.moveTo(-4, y + dy);
        for (let x = 0; x <= W + 40; x += 40) c.quadraticCurveTo(x + 20, y + dy + Math.sin(ph + x / 70) * a, x + 40, y + dy + Math.sin(ph + (x + 40) / 90) * a * 0.5);
        c.lineWidth = lw; c.strokeStyle = col; c.stroke();
      }
    }
    for (let i = 0; i < 3; i++) { const kx = r() * W, ky = th + 26 + r() * Math.max(10, h - th - 50); el(c, kx, ky, 9 + r() * 5, 4 + r() * 2, r() - 0.5); c.lineWidth = 1.2; c.strokeStyle = hexA(P.maderaOsc, 0.28); c.stroke(); el(c, kx, ky, 3, 1.4); c.fillStyle = hexA(P.maderaOsc, 0.3); c.fill(); }
    for (let x = W / 2 - 150 * Math.ceil(W / 300); x < W; x += 150) { c.fillStyle = hexA(P.maderaHond, 0.3); c.fillRect(x, th, 1.6, h); c.fillStyle = hexA(P.maderaLuz, 0.22); c.fillRect(x + 1.6, th, 1, h); }
    c.fillStyle = lin(c, 0, th, 0, th + 18, [hexA(P.maderaHond, 0.5), hexA(P.maderaHond, 0)]); c.fillRect(0, th, W, 18);                 // sombra del canto
    c.fillStyle = lin(c, 0, 0, 0, th, [mix(P.maderaLuz, P.papel, 0.3), P.maderaLuz]); c.fillRect(0, 0, W, th);                             // tabla de arriba
    c.fillStyle = hexA(P.papel, 0.55); c.fillRect(0, 1.4, W, 1.2);
    c.fillStyle = P.maderaHond; c.fillRect(0, 0, W, 1.5); c.fillRect(0, th - 0.8, W, 1.6);
    c.fillStyle = lin(c, 0, h - 46, 0, h, [hexA(P.maderaHond, 0), hexA(P.maderaHond, 0.42)]); c.fillRect(0, h - 46, W, 46);
  }
  /* El rótulo: tabla de madera pintada de verde con GOLÍN en crema, y la etiqueta de papel colgando */
  function paintSign(c, bw, bh, pad, tag) {
    const x = pad, y = pad;
    c.save(); c.shadowColor = hexA(P.maderaHond, 0.45); c.shadowBlur = 14; c.shadowOffsetY = 6;
    rr(c, x, y, bw, bh, 11); c.fillStyle = P.madera; c.fill(); c.restore();
    rr(c, x, y, bw, bh, 11); fine(c, lin(c, 0, y, 0, y + bh, [P.maderaLuz, [0.35, P.madera], mix(P.madera, P.maderaOsc, 0.55)]), P.maderaHond, 2);
    c.save(); rr(c, x, y, bw, bh, 11); c.clip();
    const r = rnd(5); c.lineWidth = 1;
    for (let i = 0; i < 7; i++) { const yy = y + 3 + i * bh / 7 + r() * 3; c.beginPath(); c.moveTo(x, yy); c.bezierCurveTo(x + bw * 0.3, yy + 3 * (r() - 0.5), x + bw * 0.6, yy + 4 * (r() - 0.5), x + bw, yy + 2); c.strokeStyle = hexA(P.maderaOsc, 0.25); c.stroke(); }
    c.fillStyle = hexA(P.papel, 0.5); c.fillRect(x, y + 1.6, bw, 1.4); c.restore();
    const m = Math.max(6, bh * 0.085), ix = x + m, iy = y + m, iw = bw - m * 2, ih = bh - m * 2;
    rr(c, ix, iy, iw, ih, 7); fine(c, lin(c, 0, iy, 0, iy + ih, [P.canchaLuz, [0.45, P.cancha], P.canchaOsc]), mix(P.noche, P.tinta, 0.35), 1.6);
    c.save(); rr(c, ix, iy, iw, ih, 7); c.clip();
    c.fillStyle = lin(c, 0, iy, 0, iy + 9, [hexA(P.tinta, 0.3), hexA(P.tinta, 0)]); c.fillRect(ix, iy, iw, 9);                              // el panel va hundido en el marco
    c.fillStyle = hexA('#ffffff', 0.07); el(c, ix + iw * 0.3, iy + ih * 0.1, iw * 0.5, ih * 0.5, -0.2); c.fill(); c.restore();
    const fs = ih * 0.76, tx = x + bw / 2, ty = iy + ih / 2 + fs * 0.04;
    c.font = `${fs}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.fillStyle = hexA(P.tinta, 0.4); c.fillText('GOLÍN', tx, ty + fs * 0.085);
    c.lineWidth = fs * 0.1; c.strokeStyle = mix(P.noche, P.tinta, 0.35); c.strokeText('GOLÍN', tx, ty);
    c.fillStyle = lin(c, 0, ty - fs * 0.45, 0, ty + fs * 0.42, ['#ffffff', [0.4, P.papel], P.papelOsc]); c.fillText('GOLÍN', tx, ty);
    for (const [nx, ny] of [[x + m * 0.5, y + m * 0.5], [x + bw - m * 0.5, y + m * 0.5], [x + m * 0.5, y + bh - m * 0.5], [x + bw - m * 0.5, y + bh - m * 0.5]]) {      // clavos
      c.beginPath(); c.arc(nx, ny, 1.9, 0, TAU); c.fillStyle = P.plata; c.fill(); c.lineWidth = 0.8; c.strokeStyle = K.metalX; c.stroke();
      c.beginPath(); c.arc(nx - 0.5, ny - 0.5, 0.7, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
    }
    // etiqueta de papel, colgada de dos hilos
    const tw = bw * 0.66, thh = Math.max(15, bh * 0.2), tgx = x + (bw - tw) / 2, tgy = y + bh + 7;
    c.strokeStyle = hexA(P.maderaHond, 0.7); c.lineWidth = 1; for (const hx of [tgx + 12, tgx + tw - 12]) { c.beginPath(); c.moveTo(hx, y + bh); c.lineTo(hx, tgy + 2); c.stroke(); }
    c.save(); c.shadowColor = hexA(P.maderaHond, 0.35); c.shadowBlur = 6; c.shadowOffsetY = 2; rr(c, tgx, tgy, tw, thh, 4); c.fillStyle = P.papel; c.fill(); c.restore();
    rr(c, tgx, tgy, tw, thh, 4); fine(c, lin(c, 0, tgy, 0, tgy + thh, [P.papel, P.crema]), K.paperX, 1.2);
    c.font = `${thh * 0.5}px ${FONT_NUM}`; if ('letterSpacing' in c) c.letterSpacing = '1.4px';
    c.fillStyle = P.tinta; c.fillText(tag, x + bw / 2 + 0.7, tgy + thh / 2 + 0.6, tw - 12); if ('letterSpacing' in c) c.letterSpacing = '0px';
  }

  /* ---------------- Don Chucho, dibujado fino ----------------
     El mismo señor de siempre (calvo, patillas, bigotazo, una ceja arriba, delantal crema y el lápiz del fiado), con volumen:
     piel con luz arriba a la izquierda, contorno marrón, ojos con brillo. Caja de 240×280, hombros en y≈214.
     o: {eyes:'wink'|'open'|'closed'|'wide', blink, breath (−1..1), bob, tilt, arm:{a, prop, t}, paper (0..1), headline} */
  function arm(c, x, y, a, prop, t) {
    c.save(); c.translate(x, y); c.rotate(a);
    rr(c, -11, 52, 22, 36, 10); fine(c, lin(c, -11, 0, 11, 0, [mix(K.skin, K.skinL, 0.45), [0.5, K.skin], K.skinD]), K.skinX, 2.2);       // antebrazo
    rr(c, -15, -6, 30, 68, 14); fine(c, lin(c, -15, 0, 15, 0, [mix(P.cancha, P.noche, 0.5), [0.45, K.shirtL], K.shirt]), K.shirtX, 2.4); // manga
    rr(c, -15.5, 51, 31, 10, 4.5); fine(c, mix(P.cancha, P.noche, 0.4), K.shirtX, 1.8);                                                  // puño
    c.translate(0, 92);
    const palm = () => { c.beginPath(); c.arc(0, 0, prop === 'wave' ? 15 : 13.5, 0, TAU); fine(c, rad(c, -4, -4, 1, 16, [mix(K.skin, K.skinL, 0.55), [0.6, K.skin], K.skinD]), K.skinX, 2.2); };
    if (prop === 'wave') {                                                  // mano abierta: cuatro dedos en abanico y el pulgar aparte
      for (let i = 0; i < 4; i++) { c.save(); c.rotate((i - 1.5) * 0.25); rr(c, -4.3, 6, 8.6, 25 - Math.abs(i - 1.3) * 2.6, 4.3); fine(c, lin(c, 0, 6, 0, 30, [K.skin, mix(K.skin, K.skinL, 0.4)]), K.skinX, 1.8); c.restore(); }
      c.save(); c.rotate(-1.3); rr(c, -4.4, 5, 8.8, 17, 4.4); fine(c, K.skin, K.skinX, 1.8); c.restore();
      palm();
    } else if (prop === 'cup') {                                            // pocillo de tinto, siempre derecho, con su vapor
      palm(); c.rotate(-a);
      for (let i = 0; i < 3; i++) { const sx = -8 + i * 8, ph = t / 420 + i * 1.7; c.beginPath(); c.moveTo(sx, -38); c.bezierCurveTo(sx + 6 * Math.sin(ph), -48, sx - 6 * Math.sin(ph), -58, sx + 3 * Math.sin(ph), -70); c.lineWidth = 2.6; c.lineCap = 'round'; c.strokeStyle = hexA(P.maderaOsc, 0.26 + 0.1 * Math.sin(ph)); c.stroke(); }
      c.beginPath(); c.arc(16, -17, 8, -Math.PI / 2, Math.PI / 2); c.lineWidth = 5.4; c.strokeStyle = K.paperX; c.stroke(); c.lineWidth = 2.6; c.strokeStyle = P.papel; c.stroke();
      rr(c, -15, -33, 30, 31, 7); fine(c, lin(c, -15, 0, 15, 0, ['#ffffff', [0.35, P.papel], P.papelOsc]), K.paperX, 2);
      el(c, 0, -31.5, 12, 3); c.fillStyle = P.maderaHond; c.fill();
      c.fillStyle = hexA(P.cancha, 0.85); c.fillRect(-14, -17, 28, 3.4);
    } else if (prop === 'coin') {                                           // moneda de plata que gira entre los dedos
      palm(); c.rotate(-a);
      const sx = Math.abs(Math.cos(t / 260)), w = 13.5 * Math.max(0.14, sx);
      el(c, 0, -25, w, 13.5); fine(c, rad(c, -w * 0.3, -29, 1, 17, [K.coinL, [0.7, P.amarillo], mix(P.amarillo, K.coinX, 0.35)]), K.coinX, 2);
      if (sx > 0.45) { el(c, 0, -25, w * 0.72, 9.6); c.lineWidth = 1.1; c.strokeStyle = hexA(K.coinX, 0.55); c.stroke(); c.fillStyle = K.coinX; c.font = `12px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.translate(0, -24.4); c.scale(sx, 1); c.fillText('$', 0, 0); c.restore(); }
      if (sx > 0.92) { c.fillStyle = '#ffffff'; c.beginPath(); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr2 = i % 2 ? 1.6 : 6; c.lineTo(9 + Math.cos(an) * rr2, -35 + Math.sin(an) * rr2); } c.closePath(); c.fill(); }
    } else if (prop === 'broom') {                                          // escoba: las cerdas hacia el mostrador
      c.save(); c.rotate(-a + 0.35);
      rr(c, -4, -62, 8, 142, 3.5); fine(c, lin(c, -4, 0, 4, 0, [P.maderaLuz, P.madera, mix(P.madera, P.maderaOsc, 0.5)]), P.maderaHond, 1.8);
      c.beginPath(); c.moveTo(-19, 78); c.lineTo(19, 78); c.lineTo(28, 120); c.lineTo(-28, 120); c.closePath(); fine(c, lin(c, 0, 78, 0, 120, [mix(P.maderaLuz, P.papel, 0.35), P.maderaLuz]), mix(P.maderaOsc, P.madera, 0.3), 2);
      c.lineWidth = 1.1; c.strokeStyle = hexA(P.maderaOsc, 0.45); for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 5, 88); c.lineTo(i * 7.4, 118); c.stroke(); }
      rr(c, -20, 76, 40, 8, 3); fine(c, mix(P.cancha, P.noche, 0.3), K.shirtX, 1.6);
      c.restore(); palm();
    } else if (prop === 'ball') {                                         // balón girando en la punta del dedo
      rr(c, -3.8, 4, 7.6, 22, 3.8); fine(c, K.skin, K.skinX, 1.8); palm(); c.rotate(-a);
      const by = -45 + Math.sin(t / 190) * 1.2, R = 19;
      c.beginPath(); c.arc(0, by, R, 0, TAU); c.fillStyle = rad(c, -6, by - 7, 2, R * 1.25, ['#ffffff', [0.65, P.papel], P.papelOsc]); c.fill();
      c.save(); c.beginPath(); c.arc(0, by, R - 0.6, 0, TAU); c.clip(); c.fillStyle = mix(P.tinta, P.maderaOsc, 0.15);
      for (let i = 0; i < 6; i++) { const ph = t / 170 + i * TAU / 6, x = Math.sin(ph) * R * 0.86, z = Math.cos(ph); if (z > -0.15) { el(c, x, by + (i % 2 ? -7 : 7), 6.4 * Math.max(0.15, z), 6.2); c.fill(); } }
      c.restore(); c.beginPath(); c.arc(0, by, R, 0, TAU); c.lineWidth = 1.8; c.strokeStyle = mix(P.tinta, P.maderaOsc, 0.4); c.stroke();
      c.fillStyle = hexA('#ffffff', 0.7); el(c, -7, by - 9, 5, 2.6, -0.6); c.fill();
    } else if (prop === 'rag') {                                          // trapo de limpiar el mostrador
      c.save(); c.rotate(-a); rr(c, -27, -4, 54, 21, 9); fine(c, lin(c, 0, -4, 0, 17, [P.papel, P.crema, P.papelOsc]), K.paperX, 1.8);
      c.fillStyle = hexA(P.cancha, 0.75); c.fillRect(-23, 2, 46, 3); c.fillRect(-23, 9, 46, 3); c.restore(); palm();
    } else if (prop === 'pencil') {                                       // escribe con el lápiz del fiado
      c.save(); c.rotate(-a + 0.5); rr(c, -3, -8, 6, 34, 2); fine(c, lin(c, -3, 0, 3, 0, [P.maderaLuz, P.madera]), P.maderaHond, 1.4);
      c.beginPath(); c.moveTo(-3, 26); c.lineTo(0, 33); c.lineTo(3, 26); c.closePath(); fine(c, P.papel, P.maderaHond, 1.2); c.fillStyle = P.plata; c.fillRect(-3, -6, 6, 3); c.restore(); palm();
    } else palm();
    c.restore();
  }
  function chucho(c, w, h, o = {}) {
    const k = Math.min(w / 240, h / 280), b = o.breath || 0;
    c.save(); c.scale(k, k); c.translate(0, o.bob || 0); c.lineJoin = 'round'; c.lineCap = 'round';
    const torso = fn => { c.save(); c.translate(120, 310); c.scale(1 + 0.007 * b, 1 + 0.017 * b); c.translate(-120, -310); fn(); c.restore(); };   // respira: el pecho sube y se ensancha apenas
    torso(() => {
      if (!o.paper) arm(c, 46, 214, 0.32 - 0.03 * b, null, 0);
      rr(c, 28, 196, 184, 124, 42); fine(c, lin(c, 0, 196, 0, 300, [K.shirtL, K.shirt]), K.shirtX, 2.6);
      c.save(); rr(c, 28, 196, 184, 124, 42); c.clip(); c.fillStyle = hexA('#ffffff', 0.09); el(c, 120, 197, 88, 15); c.fill(); c.restore();
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(120 + s * 41, 209); c.lineTo(120 + s * 23, 171); c.lineWidth = 10.6; c.strokeStyle = K.paperX; c.stroke(); c.lineWidth = 6.4; c.strokeStyle = P.papel; c.stroke(); }   // tiras del delantal
      c.beginPath(); c.moveTo(75, 206); c.lineTo(165, 206); c.quadraticCurveTo(172, 206, 173, 213); c.lineTo(185, 320); c.lineTo(55, 320); c.lineTo(67, 213); c.quadraticCurveTo(68, 206, 75, 206); c.closePath();
      fine(c, lin(c, 0, 206, 0, 310, [P.papel, [0.5, P.crema], mix(P.crema, P.papelOsc, 0.7)]), K.paperX, 2.4);
      rr(c, 96, 238, 48, 36, 7); fine(c, mix(P.crema, P.papelOsc, 0.35), K.paperX, 1.8);                                                   // bolsillo con costura
      c.save(); c.setLineDash([3.2, 3.2]); c.beginPath(); c.moveTo(101, 244.5); c.lineTo(139, 244.5); c.lineWidth = 1.2; c.strokeStyle = hexA(K.paperX, 0.7); c.stroke(); c.restore();
      c.save(); c.translate(128, 236); c.rotate(0.25);                                                                                    // el lápiz del fiado
      rr(c, -3.4, -19, 6.8, 28, 2); fine(c, lin(c, -3.4, 0, 3.4, 0, [P.maderaLuz, P.madera]), P.maderaHond, 1.5);
      c.fillStyle = P.plata; c.fillRect(-3.4, -17, 6.8, 3.2); c.restore();
    });
    // cuello (en sombra bajo el mentón)
    rr(c, 100, 166, 40, 42, 10); fine(c, lin(c, 0, 166, 0, 208, [mix(K.skinD, K.skinX, 0.45), K.skinD]), K.skinX, 2.4);
    // cabeza: sube y baja un pelo con la respiración
    c.save(); c.translate(120, 190); c.rotate(o.tilt || 0); c.translate(-120, -190 - 2.2 * b);
    for (const x of [58, 182]) { c.beginPath(); c.arc(x, 124, 14, 0, TAU); fine(c, rad(c, x - 3, 120, 1, 16, [mix(K.skin, K.skinL, 0.4), K.skin]), K.skinX, 2.4); el(c, x, 125, 6, 8.5); c.fillStyle = hexA(K.skinX, 0.32); c.fill(); }
    el(c, 120, 118, 62, 70); fine(c, rad(c, 98, 82, 8, 108, [K.skinL, [0.5, K.skin], [1, mix(K.skin, K.skinD, 0.8)]]), K.skinX, 2.6);
    c.save(); el(c, 120, 118, 62, 70); c.clip();
    c.fillStyle = hexA('#ffffff', 0.2); el(c, 97, 70, 25, 11, -0.45); c.fill(); c.fillStyle = hexA('#ffffff', 0.6); el(c, 91, 65, 9, 3.2, -0.45); c.fill();   // brillo de la calva
    c.restore();
    for (const s of [-1, 1]) {                                                                                                          // patillas
      const edge = y => 62 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 118) / 70, 2)));          // borde de la cabeza a esa altura
      c.beginPath();
      for (let y = 88; y <= 130; y += 3) c.lineTo(120 + s * (edge(y) + 2), y);
      for (let y = 130; y >= 88; y -= 3) c.lineTo(120 + s * (edge(y) - 1.5 - 8.5 * Math.pow(Math.sin((y - 88) / 42 * Math.PI), 0.6)), y);
      c.closePath(); fine(c, lin(c, 0, 88, 0, 130, [K.hairL, mix(K.hairL, K.hair, 0.7)]), K.hairX, 1.5);
      c.lineWidth = 1; c.strokeStyle = hexA(P.crema, 0.2); for (const d of [2.5, 5.5]) { c.beginPath(); c.moveTo(120 + s * (edge(98) - d), 98); c.lineTo(120 + s * (edge(122) - d * 0.8), 122); c.stroke(); }
    }
    const eyes = o.blink && o.eyes !== 'wide' ? 'closed' : (o.eyes || 'wink'), wide = eyes === 'wide';
    // cejas: una arriba (pícaro); asustado, las dos arriba
    const brow = draw => { c.beginPath(); draw(0); c.lineWidth = 7.4; c.strokeStyle = K.hair; c.stroke(); c.beginPath(); draw(-1.8); c.lineWidth = 1.8; c.strokeStyle = hexA(K.hairL, 0.9); c.stroke(); };
    brow(d => { if (wide) { c.moveTo(84, 88 + d); c.quadraticCurveTo(96, 80 + d, 108, 88 + d); } else { c.moveTo(84, 100 + d); c.lineTo(108, 98 + d); } });
    brow(d => { c.moveTo(132, (wide ? 88 : 92) + d); c.quadraticCurveTo(146, (wide ? 78 : 80) + d, 160, 90 + d); });
    const lk = o.look || [0, 0];
    const open = (x, s) => {                                               // ojo de punto, como siempre: una pupila oscura con su brillo
      const px = x + lk[0], py = 114.5 + lk[1];
      el(c, px, py, 6.1 * s, 6.9 * s); c.fillStyle = P.tinta; c.fill();
      c.beginPath(); c.arc(px - 2 * s, py - 2.5 * s, 2.1 * s, 0, TAU); c.fillStyle = '#ffffff'; c.fill();
      c.beginPath(); c.arc(px + 2.3 * s, py + 2.7 * s, 0.9 * s, 0, TAU); c.fillStyle = hexA('#ffffff', 0.5); c.fill();
    };
    const shut = x => { c.beginPath(); c.moveTo(x - 10, 115.5); c.quadraticCurveTo(x, 107, x + 10, 115.5); c.lineWidth = 3.6; c.strokeStyle = K.hair; c.stroke(); };
    if (eyes === 'closed') { shut(96); shut(146); } else if (eyes === 'open') { open(96, 1); open(146, 1); } else if (wide) { open(96, 1.32); open(146, 1.32); } else { open(96, 1); shut(146); }
    if (o.glasses) {                                                       // gafas oscuras (se las pone si lo molestan mucho, o desde la temporada 2)
      for (const x of [96, 146]) { rr(c, x - 19, 102, 38, 25, 9); fine(c, lin(c, 0, 102, 0, 127, [mix(P.tinta, P.maderaOsc, 0.25), P.tinta]), K.hairX, 1.6); c.fillStyle = hexA('#ffffff', 0.5); rr(c, x - 13, 106, 12, 3.4, 1.7); c.fill(); }
      c.beginPath(); c.moveTo(115, 110); c.quadraticCurveTo(121, 106, 127, 110); c.lineWidth = 3; c.strokeStyle = K.hairX; c.stroke();
    }
    // nariz
    el(c, 122, 135, 13, 11); c.fillStyle = rad(c, 118, 130, 1, 16, [mix(K.skin, K.skinL, 0.7), [0.6, K.skin], K.skinD]); c.fill();
    el(c, 122, 135, 13, 11, 0, Math.PI * 0.06, Math.PI * 0.94); c.lineWidth = 2.2; c.strokeStyle = K.skinX; c.stroke();
    c.fillStyle = hexA('#ffffff', 0.38); el(c, 117, 130, 4.2, 2.4, -0.5); c.fill();
    // boca (debajo del bigote) y bigotazo
    if (wide) { el(c, 128, 174, 7, 9); c.fillStyle = mix(K.skinX, P.tinta, 0.5); c.fill(); }
    else { c.beginPath(); c.moveTo(117, 169); c.quadraticCurveTo(134, 181, 149, 165); c.lineWidth = 3.6; c.strokeStyle = mix(K.skinX, P.tinta, 0.35); c.stroke(); }
    c.beginPath(); c.moveTo(122, 148); c.bezierCurveTo(104, 138, 80, 146, 70, 162); c.bezierCurveTo(86, 158, 100, 162, 122, 158);
    c.bezierCurveTo(144, 162, 158, 158, 174, 162); c.bezierCurveTo(164, 146, 140, 138, 122, 148); c.closePath();
    fine(c, lin(c, 0, 140, 0, 163, [K.hairL, [0.55, K.hair], K.hairX]), K.hairX, 1.6);
    c.lineWidth = 1.3; c.strokeStyle = hexA(P.crema, 0.2);
    for (const s of [-1, 1]) for (const [x1, y1, x2, y2] of [[10, 149, 40, 156], [8, 153, 30, 158]]) { c.beginPath(); c.moveTo(122 + s * x1, y1); c.quadraticCurveTo(122 + s * (x1 + x2) / 2, y1 - 3, 122 + s * x2, y2); c.stroke(); }
    if (o.hat === 'navidad') {                                             // diciembre: gorro rojo con borde y pompón de papel
      c.save(); c.translate(128, 58); c.rotate(0.2);
      c.beginPath(); c.moveTo(-46, 6); c.quadraticCurveTo(-10, -66, 44, -50); c.quadraticCurveTo(64, -30, 60, -4); c.quadraticCurveTo(40, -22, 44, 8); c.closePath();
      fine(c, lin(c, 0, -60, 0, 8, [mix(P.franja, P.papel, 0.25), P.franja, mix(P.franja, P.tinta, 0.25)]), mix(P.franja, P.tinta, 0.5), 2);
      rr(c, -52, -2, 100, 17, 8.5); fine(c, lin(c, 0, -2, 0, 15, ['#ffffff', P.papel, P.papelOsc]), K.paperX, 1.8);
      c.beginPath(); c.arc(60, -2, 9, 0, TAU); fine(c, rad(c, 57, -5, 1, 10, ['#ffffff', P.papel, P.papelOsc]), K.paperX, 1.6);
      c.restore();
    }
    c.restore();
    // periódico delante de la cara (lo va bajando)
    if (o.paper) {
      c.save(); c.translate(0, o.paper * 70);
      c.save(); c.shadowColor = hexA(P.maderaHond, 0.35); c.shadowBlur = 10; c.shadowOffsetY = 4; rr(c, 30, 70, 180, 118, 6); c.fillStyle = P.papel; c.fill(); c.restore();
      rr(c, 30, 70, 180, 118, 6); fine(c, lin(c, 0, 70, 0, 188, [P.papel, mix(P.crema, P.papelOsc, 0.35)]), K.paperX, 2);
      const hl = String(o.headline || 'EL CLARÍN'), maxW = 150;
      const fit = (txt, size) => { c.font = `${size}px ${FONT_NUM}`; while (size > 9 && c.measureText(txt).width > maxW) { size -= 0.5; c.font = `${size}px ${FONT_NUM}`; } return size; };
      let lines = [hl], size = fit(hl, 16);
      if (size < 12 && hl.includes(' ')) {
        const ws = hl.split(' '); let cut = 1, bestD = 1e9;
        for (let i = 1; i < ws.length; i++) { const d = Math.abs(ws.slice(0, i).join(' ').length - ws.slice(i).join(' ').length); if (d < bestD) { bestD = d; cut = i; } }
        lines = [ws.slice(0, cut).join(' '), ws.slice(cut).join(' ')]; size = Math.min(...lines.map(l => fit(l, 15)));
      }
      c.fillStyle = P.tinta; c.font = `${size}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      lines.forEach((l, i) => c.fillText(l, 120, (lines.length > 1 ? 91 : 96) + i * (size + 3)));
      const dy = lines.length > 1 ? size + 3 - 6 : 0;
      c.fillRect(46, 106 + dy, 148, 2.4); c.fillStyle = hexA(P.tinta, 0.42);
      for (let r = 0; r < 4; r++) { rr(c, 46, 118 + dy + r * 14, 64, 4, 2); c.fill(); rr(c, 126, 118 + dy + r * 14, 68, 4, 2); c.fill(); }
      for (const x of [32, 208]) { el(c, x, 150, 8, 11); fine(c, K.skin, K.skinX, 1.8); }                                                  // pulgares que lo sostienen
      c.restore();
    }
    if (o.arm && !o.arm.over) torso(() => arm(c, 194, 214, o.arm.a, o.arm.prop, o.arm.t || 0));   // over: el brazo va por encima del mostrador y lo dibuja la escena
    c.restore();
  }

  /* ---------------- cosas del mostrador ---------------- */
  function coin(c, x, y, r, sx) {
    const w = r * Math.max(0.14, sx);
    el(c, x, y, w, r); fine(c, rad(c, x - w * 0.3, y - r * 0.3, 1, r * 1.3, [K.coinL, [0.7, P.amarillo], mix(P.amarillo, K.coinX, 0.35)]), K.coinX, 1.6);
    if (sx > 0.5) { el(c, x, y, w * 0.7, r * 0.7); c.lineWidth = 1; c.strokeStyle = hexA(K.coinX, 0.5); c.stroke(); }
  }
  /* Tarro de la plata: vidrio con monedas adentro; cada tanto salta una */
  function jar(c, x, y, ms, still, tapMs) {
    const w = 40, h = 48, p = tapMs < 1100 ? tapMs / 1100 : still ? 2 : (ms % 6400) / 1100;
    if (p < 1) coin(c, x + w / 2 + Math.sin(p * 3) * 3, y - h - 8 - Math.sin(p * Math.PI) * 44, 8, Math.abs(Math.cos(p * 9)));
    rr(c, x, y - h + 6, w, h - 6, 9); c.fillStyle = lin(c, x, 0, x + w, 0, [hexA('#ffffff', 0.7), [0.3, hexA(P.plata, 0.5)], hexA(P.plataOsc, 0.55)]); c.fill();
    c.save(); rr(c, x + 2, y - h + 8, w - 4, h - 10, 7); c.clip();
    const r = rnd(11); for (let i = 0; i < 12; i++) coin(c, x + 7 + r() * (w - 14), y - 6 - Math.floor(i / 4) * 5.5 - r() * 2, 6.5, 1 - r() * 0.5 > 0.7 ? 1 : 0.35);
    c.restore();
    rr(c, x, y - h + 6, w, h - 6, 9); c.lineWidth = 1.8; c.strokeStyle = K.metalX; c.stroke();
    c.fillStyle = hexA('#ffffff', 0.65); rr(c, x + 5, y - h + 13, 3.6, h - 24, 2); c.fill();
    rr(c, x + 3, y - h, w - 6, 9, 3); fine(c, lin(c, 0, y - h, 0, y - h + 9, [K.metalL, P.plataOsc]), K.metalX, 1.6);
  }
  function radio(c, x, y, ms) {
    c.beginPath(); c.moveTo(x + 60, y - 46); c.lineTo(x + 78, y - 84); c.lineWidth = 2; c.strokeStyle = K.metalX; c.stroke();
    rr(c, x, y - 48, 74, 48, 9); fine(c, lin(c, 0, y - 48, 0, y, [P.madera, mix(P.madera, P.maderaOsc, 0.7)]), P.maderaHond, 2);
    c.fillStyle = hexA(P.papel, 0.4); c.fillRect(x + 4, y - 46, 66, 1.3);
    c.beginPath(); c.arc(x + 23, y - 24, 14, 0, TAU); fine(c, mix(P.maderaOsc, P.tinta, 0.4), P.maderaHond, 1.6);
    c.fillStyle = hexA(P.papel, 0.5); for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x + 23 + (i % 3 - 1) * 6, y - 24 + (Math.floor(i / 3) - 1) * 6, 1.3, 0, TAU); c.fill(); }
    rr(c, x + 44, y - 40, 24, 13, 3); fine(c, P.papel, K.paperX, 1.2); c.fillStyle = PAL.franja; c.fillRect(x + 50 + Math.sin(ms / 900) * 5, y - 39, 1.6, 11);
    for (const kx of [50, 62]) { c.beginPath(); c.arc(x + kx, y - 14, 4.2, 0, TAU); fine(c, lin(c, 0, y - 18, 0, y - 10, [K.metalL, P.plataOsc]), K.metalX, 1.2); }
  }
  function cat(c, x, y, ms, perk = 0) {
    const br = 1 + 0.03 * Math.sin(ms / 900), body = mix(P.tinta, P.maderaOsc, 0.18), rim = hexA(P.maderaLuz, 0.5);
    c.beginPath(); c.moveTo(x - 27, y - 10); c.quadraticCurveTo(x - 50, y - 4 + Math.sin(ms / (perk ? 90 : 520)) * (6 + perk * 5), x - 40, y - 30 - perk * 6); c.lineWidth = 6.5; c.lineCap = 'round'; c.strokeStyle = body; c.stroke();
    c.save(); c.translate(x, y); c.scale(1, br); el(c, 0, -17, 30, 19); c.fillStyle = body; c.fill(); el(c, 0, -17, 30, 19, 0, Math.PI * 1.1, Math.PI * 1.75); c.lineWidth = 1.6; c.strokeStyle = rim; c.stroke(); c.restore();
    c.beginPath(); c.arc(x + 23, y - 26, 13.5, 0, TAU); c.fillStyle = body; c.fill();
    for (const ex of [15, 31]) { c.beginPath(); c.moveTo(x + ex - 6, y - 35); c.lineTo(x + ex, y - 48 - perk * 5); c.lineTo(x + ex + 5.5, y - 35); c.closePath(); c.fillStyle = body; c.fill(); }
    c.beginPath(); c.arc(x + 23, y - 26, 13.5, Math.PI * 1.15, Math.PI * 1.8); c.lineWidth = 1.5; c.strokeStyle = rim; c.stroke();
  }
  function fiado(c, x, y, ms, still, tapMs) {
    c.save(); c.translate(x, y); c.rotate(-0.05 + (still ? 0 : Math.sin(ms / 1400) * 0.012) + (tapMs < 1500 ? Math.sin(tapMs / 85) * 0.2 * Math.exp(-tapMs / 420) : 0));
    c.fillStyle = hexA(P.maderaHond, 0.3); el(c, 0, 1, 32, 4); c.fill();
    c.beginPath(); c.moveTo(-34, 0); c.lineTo(-30, -42); c.lineTo(30, -42); c.lineTo(34, 0); c.closePath(); fine(c, lin(c, 0, -42, 0, 0, [P.papel, mix(P.crema, P.papelOsc, 0.4)]), K.paperX, 1.6);
    c.fillStyle = P.tinta; c.font = `15px ${FONT_HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t('chucho.fiado'), 0, -20, 54);
    c.restore();
  }
  /* Globo de diálogo en papel: sale con un rebote y la cola apunta a Don Chucho. Se pinta una sola vez por frase (la sombra difuminada es cara en un celular). */
  function bubble(c, W, text, tipX, tipY, topMin, pop, dpr) {
    c.font = `600 15px ${FONT_TXT}`;
    const maxW = Math.min(W - 44, 300) - 28, lines = [];
    for (const word of text.split(' ')) { const cur = lines.length ? lines[lines.length - 1] : null; if (cur !== null && c.measureText(cur + ' ' + word).width <= maxW) lines[lines.length - 1] = cur + ' ' + word; else lines.push(word); }
    const lw = Math.max(...lines.map(l => c.measureText(l).width)), tw = Math.ceil(lw + 28), bh = lines.length * 19 + 18;
    const bx = Math.round(clamp(tipX - tw * 0.3, 14, W - 14 - tw)), by = Math.round(Math.max(topMin, tipY - bh - 14)), tx = Math.round(clamp(tipX, bx + 22, bx + tw - 22)), pad = 18, rx = tx - bx;
    const B = layer('bubble', [text, tw, rx, dpr].join('|'), tw + pad * 2, bh + pad * 2 + 14, dpr, x => {
      x.translate(pad, pad);
      x.save(); x.shadowColor = hexA(P.maderaHond, 0.4); x.shadowBlur = 12; x.shadowOffsetY = 4; rr(x, 0, 0, tw, bh, 13); x.fillStyle = P.papel; x.fill(); x.restore();
      x.beginPath(); x.moveTo(rx - 9, bh - 2); x.lineTo(rx + 2, bh + 13); x.lineTo(rx + 10, bh - 2); x.closePath(); fine(x, P.crema, K.paperX, 1.6);
      rr(x, 0, 0, tw, bh, 13); fine(x, lin(x, 0, 0, 0, bh, ['#ffffff', [0.3, P.papel], P.crema]), K.paperX, 1.6);
      x.fillStyle = P.crema; x.fillRect(rx - 7.8, bh - 3, 16.6, 3.4);
      x.font = `600 15px ${FONT_TXT}`; x.fillStyle = P.tinta; x.textAlign = 'center'; x.textBaseline = 'middle'; lines.forEach((l, n) => x.fillText(l, tw / 2, 19 + n * 19));
    });
    c.save(); c.translate(tx, by + bh); c.scale(pop, pop); c.drawImage(B.cv, -rx - pad, -bh - pad, B.w, B.h); c.restore();
  }
  /* Pizarra de la pared: tu récord en tiza, una rayita por picadito y la corona si ya ganaste uno */
  function paintBoard(c, b, eg) {
    const w = b.w, h = b.h;
    c.save(); c.translate(b.x + w / 2, b.y + h / 2); c.rotate(-0.035);
    c.beginPath(); c.moveTo(-w * 0.3, -h / 2); c.lineTo(0, -h / 2 - 11); c.lineTo(w * 0.3, -h / 2); c.lineWidth = 1; c.strokeStyle = hexA(P.maderaHond, 0.75); c.stroke();
    c.beginPath(); c.arc(0, -h / 2 - 11, 1.8, 0, TAU); c.fillStyle = P.plataOsc; c.fill();
    c.fillStyle = hexA(P.maderaHond, 0.25); rr(c, -w / 2 + 2, -h / 2 + 5, w, h, 5); c.fill();
    rr(c, -w / 2, -h / 2, w, h, 5); fine(c, lin(c, 0, -h / 2, 0, h / 2, [P.maderaLuz, [0.4, P.madera], mix(P.madera, P.maderaOsc, 0.6)]), P.maderaHond, 1.6);
    rr(c, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 3); fine(c, lin(c, 0, -h / 2, 0, h / 2, [mix(P.noche, P.tinta, 0.5), mix(P.noche, P.tinta, 0.75)]), hexA(P.tinta, 0.7), 1.2);
    c.fillStyle = hexA(P.papel, 0.07); el(c, -w * 0.1, -h * 0.05, w * 0.3, h * 0.2, -0.3); c.fill();                                       // tiza mal borrada
    c.fillStyle = hexA(P.papel, 0.9); c.strokeStyle = hexA(P.papel, 0.9); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineCap = 'round';
    let y = -h / 2 + 16;
    if (eg.record) { c.font = `9px ${FONT_HAND}`; c.fillText(t('menu.boardRecord'), eg.corona ? -8 : 0, y); c.font = `16px ${FONT_HAND}`; c.fillText(fmt(eg.record), 0, y + 16, w - 18); y += 32; }
    if (eg.corona) { const kx = eg.record ? w / 2 - 20 : 0, ky = eg.record ? -h / 2 + 17 : y; c.lineWidth = 1.5; c.beginPath(); c.moveTo(kx - 8, ky + 4); c.lineTo(kx - 8, ky - 4); c.lineTo(kx - 4, ky); c.lineTo(kx, ky - 6); c.lineTo(kx + 4, ky); c.lineTo(kx + 8, ky - 4); c.lineTo(kx + 8, ky + 4); c.closePath(); c.stroke(); if (!eg.record) y += 16; }
    const n = Math.min(10, eg.rayitas || 0), x0 = -(Math.ceil(n / 5) * 24 - 6) / 2;
    c.lineWidth = 1.5; for (let i = 0; i < n; i++) { const gx = x0 + Math.floor(i / 5) * 24 + (i % 5) * 4.2; c.beginPath(); if (i % 5 === 4) { c.moveTo(gx - 19, y + 5); c.lineTo(gx - 1, y - 5); } else { c.moveTo(gx, y + 6); c.lineTo(gx + 0.6, y - 6); } c.stroke(); }
    c.restore();
  }
  /* Copa de plata en la repisa: ya ganaste un picadito */
  function trophy(c, x, y) {
    const m = [K.metalL, [0.45, P.plata], P.plataOsc];
    rr(c, x - 9, y - 5, 18, 5, 1.5); fine(c, lin(c, x - 9, 0, x + 9, 0, m), K.metalX, 1.2);
    rr(c, x - 2.6, y - 13, 5.2, 9, 1); fine(c, lin(c, x - 3, 0, x + 3, 0, m), K.metalX, 1.2);
    c.lineWidth = 1.7; c.strokeStyle = K.metalX; for (const s of [-1, 1]) { c.beginPath(); c.arc(x + s * 11, y - 25, 5, s < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, s < 0 ? Math.PI * 1.5 : Math.PI * 0.5); c.stroke(); }
    c.beginPath(); c.moveTo(x - 11, y - 32); c.lineTo(x + 11, y - 32); c.quadraticCurveTo(x + 10, y - 14, x, y - 12.5); c.quadraticCurveTo(x - 10, y - 14, x - 11, y - 32); c.closePath(); fine(c, lin(c, x - 11, 0, x + 11, 0, m), K.metalX, 1.4);
    c.fillStyle = hexA('#ffffff', 0.7); rr(c, x - 7.5, y - 29.5, 2.6, 11, 1.3); c.fill();
  }

  /* ---------------- la escena completa ----------------
     Dos lienzos: el fondo (pared, repisas, pizarra, mostrador) se pinta una sola vez y encima va lo que se mueve. Así cada cuadro
     solo redibuja a Don Chucho y sus cosas: es lo que más alivia a un celular modesto.
     o: {topH (alto de la franja de arriba), cy (borde de arriba del mostrador), eggs, dpr} */
  function layout(W, o) {
    const cy = Math.round(o.cy), hx = W / 2, sK = clamp((cy - o.topH) / 540, 0.7, 1), big = W >= 700 && cy >= 620;
    const bw = Math.min(big ? 300 : 216, W * 0.52) * sK, bh = bw * 0.36, signTop = o.topH + 12 * sK, signBot = signTop + bh + 30 * sK;
    const ch = Math.max(120, Math.min(Math.min(big ? 500 : 350, W * 0.8) * 280 / 240, (cy - signBot - 66) / 0.84)), cw = ch * 240 / 280, cx = hx - cw / 2, chY = cy - ch * 0.84, hy = chY + ch * 0.42;
    const sy = Math.round(hy + ch * 0.02), sw = Math.max(0, hx - cw * 0.34);
    const board = sw > 84 && sy - 132 > signBot + 4 ? { x: 12, y: sy - 132, w: Math.min(92, sw - 8), h: 64 } : null;      // la pizarra solo si cabe entre el rótulo y la repisa
    return { cy, hx, sK, big, bw, bh, signTop, signBot, ch, cw, cx, chY, hy, sy, sw, board };
  }
  function back(c, W, H, o) {
    const L = layout(W, o), eg = o.eggs || {};
    paintWall(c, W, L.cy, L.hx, L.hy);
    if (L.sw > 50) { paintShelf(c, 0, L.sw, L.sy, 3, 0.62); paintShelf(c, W - L.sw, W, L.sy, 9, 0.62); }
    if (W > 760) { paintShelf(c, 0, L.sw, L.sy - 96, 14, 0.5); paintShelf(c, W - L.sw, W, L.sy - 96, 17, 0.5); }
    if (L.board && (eg.record || eg.rayitas || eg.corona)) paintBoard(c, L.board, eg);
    if (eg.corona && L.sw > 50) trophy(c, W - 26, L.sy);
    c.save(); c.translate(0, L.cy); paintCounter(c, W, H - L.cy); c.restore();
  }
  /* Lo que se mueve. o además trae: {ms, now, scene:{key,line,n}, fx (lo que se tocó), hat, glasses, still (sin movimiento)} */
  const hits = {};
  function scene(c, W, H, o) {
    const ms = o.ms, still = !!o.still, L = layout(W, o), { cy, hx, cw, ch, cx, chY, hy, bw, bh, signTop, signBot } = L, sc = o.scene || {}, fx = o.fx || {}, eg = o.eggs || {}, k = cw / 240;
    const since = t0 => (t0 ? o.now - t0 : 1e9);
    c.save(); c.beginPath(); c.rect(0, 0, W, cy + 1); c.clip();                                   // de la pared hacia arriba: el mostrador tapa a Don Chucho
    if (!still) { const r = rnd(31); for (let i = 0; i < 14; i++) { const span = cy * 0.7, sp = 5 + r() * 9, px = hx + (r() - 0.5) * W * 0.86 + Math.sin(ms / 2300 + i) * 12, q = ((ms * sp / 1000 + r() * span) % span) / span; c.globalAlpha = Math.sin(q * Math.PI) * (0.3 + r() * 0.3); c.beginPath(); c.arc(px, cy - 20 - q * span, 0.9 + r() * 1.4, 0, TAU); c.fillStyle = P.maderaLuz; c.fill(); } c.globalAlpha = 1; }
    // qué está haciendo Don Chucho
    const pose = { eyes: 'wink', breath: still ? 0 : Math.sin(ms / 573), blink: !still && ms % 4300 < 130, tilt: still ? 0 : Math.sin(ms / 2100) * 0.012, arm: { a: 0.25 }, hat: o.hat, glasses: o.glasses || fx.glasses };
    let over = null, fly = null, lean = 0;
    switch (sc.key) {
      case 'saludo': pose.arm = { a: -2.6 + (still ? 0 : Math.sin(ms / 240) * 0.2), prop: 'wave' }; pose.eyes = 'open'; break;
      case 'monedas': pose.arm = { a: -2.52, prop: 'coin', t: still ? 0 : ms }; break;
      case 'tinto': pose.arm = { a: -2.56 + (still ? 0 : Math.sin(ms / 800) * 0.04), prop: 'cup', t: ms }; break;   // levanta el pocillo a un lado: no le tapa la cara
      case 'periodico': pose.paper = still ? 1 : Math.min(1, Math.max(0, (ms - 600) / 900)); pose.headline = sc.headline || (sc.headline = headline()); pose.arm = null; break;
      case 'radio': pose.bob = still ? 0 : Math.sin(ms / 210) * 2.4; pose.tilt = still ? 0 : Math.sin(ms / 420) * 0.03; pose.eyes = 'closed'; break;
      case 'escoba': pose.arm = { a: -2.5 + (still ? 0 : Math.sin(ms / 300) * 0.12), prop: 'broom' }; break;
      case 'dormido': if (!still && ms < 1800) { pose.eyes = 'closed'; pose.tilt = 0.06; pose.bob = 3; pose.blink = false; } else if (!still && ms < 3000) { pose.eyes = 'wide'; pose.bob = -5; } break;
      case 'balon': pose.arm = { a: -2.56 + (still ? 0 : Math.sin(ms / 500) * 0.03), prop: 'ball', t: still ? 0 : ms }; pose.eyes = 'open'; pose.look = [1.6, -1.6]; break;                 // hace girar un balón en el dedo
      case 'trapo': over = { a: 1.3, prop: 'rag', dx: still ? 0 : Math.sin(ms / 340) * 17 }; lean = (over.dx || 0) * 0.2; pose.eyes = 'open'; pose.look = [-1.4, 2.6]; pose.tilt = 0.03; break;   // limpia el mostrador
      case 'cuaderno': over = { a: 1.3 + (still ? 0 : Math.sin(ms / 60) * 0.018), prop: 'pencil', dx: still ? 0 : ((ms / 1500) % 1) * 22 - 11 }; pose.eyes = 'open'; pose.look = [-1, 3]; pose.tilt = 0.035; break;   // anota el fiado
      case 'mosca': if (!still) { const a = ms / 520; fly = { x: hx + Math.sin(a) * cw * 0.52 + Math.sin(a * 2.7) * 14, y: chY + ch * 0.17 + Math.cos(a * 1.3) * ch * 0.15 }; const dx = fly.x - hx, dy = fly.y - (chY + ch * 0.41), d = Math.hypot(dx, dy) || 1; pose.look = [dx / d * 3, dy / d * 2.6]; pose.blink = false; } pose.eyes = 'open'; break;   // la sigue con la mirada
    }
    if (over) pose.arm = { over: true };
    const tp = since(fx.chuT);                                                                    // lo tocaste: se asusta y da un brinquito
    if (!still && tp < 620) { pose.eyes = 'wide'; pose.blink = false; pose.look = null; pose.bob = (pose.bob || 0) - 9 * Math.sin(tp / 620 * Math.PI); }
    c.save(); c.translate(cx + lean, chY); chucho(c, cw, ch, pose); c.restore();
    if (sc.key === 'dormido' && !still && ms < 1800) { c.fillStyle = P.maderaOsc; c.textAlign = 'center'; for (let i = 0; i < 3; i++) { const q = ((ms / 1500) + i / 3) % 1; c.globalAlpha = Math.sin(q * Math.PI) * 0.9; c.font = `${12 + q * 12}px ${FONT_NUM}`; c.fillText('z', cx + cw * 0.78 + q * 24, hy - ch * 0.12 - q * 46); } c.globalAlpha = 1; }
    c.restore();
    // sombra de Don Chucho sobre la tabla y lo que hay encima del mostrador
    c.fillStyle = hexA(P.maderaHond, 0.16); el(c, hx + lean, cy + 6, cw * 0.44, 5); c.fill();
    const left = Math.max(12, cx - 50), oy = cy + 7, rx = Math.max(8, cx - 78), fxX = Math.min(W - 50, cx + cw + 30);
    hits.jar = hits.cat = hits.fiado = null;
    if (sc.key === 'radio') {
      radio(c, rx, oy, ms);
      if (!still) { c.fillStyle = P.maderaOsc; c.font = '24px system-ui'; c.textAlign = 'center'; for (let i = 0; i < 3; i++) { const q = ((ms / 1800) + i / 3) % 1; c.globalAlpha = Math.sin(q * Math.PI) * 0.85; c.fillText(i % 2 ? '♪' : '♫', rx + 30 + i * 16 + Math.sin(q * 6 + i) * 6, oy - 60 - q * 70); } c.globalAlpha = 1; }
    } else { jar(c, left, oy, ms, still, since(fx.jarT)); hits.jar = [left - 8, oy - 64, 56, 70]; }
    if (eg.gato) {                                                        // El Gato duerme en el mostrador; si no cabe (celular), en la repisa
      const cp = since(fx.catT), perk = cp < 1300 ? Math.sin(Math.min(1, cp / 200) * Math.PI / 2) * (1 - Math.max(0, (cp - 900) / 400)) : 0;
      const onShelf = cx - 50 <= 96, gx = onShelf ? 46 : left + 86, gy = onShelf ? L.sy + 1 : oy, gs = onShelf ? 0.78 : 1;
      c.save(); c.translate(gx, gy); c.scale(gs, gs); cat(c, 0, 0, still ? 0 : ms, perk); c.restore();
      if (cp < 1300) { c.globalAlpha = 1 - cp / 1300; c.fillStyle = P.maderaHond; c.font = `13px ${FONT_HAND}`; c.textAlign = 'center'; c.fillText(t('chucho.miau'), gx + 30 * gs, gy - 50 * gs - cp / 40); c.globalAlpha = 1; }
      hits.cat = [gx - 44 * gs, gy - 52 * gs, 86 * gs, 56 * gs];
    }
    if (eg.fiado) { fiado(c, fxX, oy + 1, ms, still, since(fx.fiadoT)); hits.fiado = [fxX - 38, oy - 46, 76, 52]; }
    if (over) {                                                           // el brazo que trabaja sobre el mostrador
      const hx2 = cx + lean + (over.dx || 0) + 105 * k;
      if (over.prop === 'pencil') {                                       // la libreta del fiado, abierta sobre la tabla
        const nx = cx + 104 * k, nw = 104 * k;
        c.save(); c.transform(1, 0, -0.35, 1, 0, 0); const sx = nx + cy * 0.35 - nw / 2;
        rr(c, sx, cy - 3, nw, 15, 2.5); fine(c, lin(c, 0, cy - 3, 0, cy + 12, ['#ffffff', P.papel, P.papelOsc]), K.paperX, 1.4);
        c.fillStyle = hexA(K.paperX, 0.8); c.fillRect(sx + nw / 2 - 0.7, cy - 3, 1.4, 15);
        c.fillStyle = hexA(P.tinta, 0.3); for (let i = 0; i < 3; i++) { c.fillRect(sx + 6, cy + 0.5 + i * 3.6, nw / 2 - 12, 1); c.fillRect(sx + nw / 2 + 6, cy + 0.5 + i * 3.6, (nw / 2 - 12) * (i < 1 ? 0.7 : 0.25), 1); }
        c.restore();
      }
      c.save(); c.translate(cx + lean + (over.dx || 0), chY); c.scale(k, k); c.lineJoin = 'round'; c.lineCap = 'round'; arm(c, 194, 214, over.a, over.prop, ms); c.restore();
      if (over.prop === 'rag' && !still) for (let i = 0; i < 3; i++) {    // el brillo que deja el trapo
        const q = ((ms / 900) + i / 3) % 1, sxx = cx + 105 * k + (i - 1) * 34 * k, r1 = 5 * Math.sin(q * Math.PI);
        c.fillStyle = hexA('#ffffff', 0.85 * Math.sin(q * Math.PI)); c.beginPath(); for (let j = 0; j < 8; j++) { const an = j * Math.PI / 4, rr2 = j % 2 ? r1 * 0.3 : r1; c.lineTo(sxx + Math.cos(an) * rr2, cy + 6 + Math.sin(an) * rr2); } c.closePath(); c.fill();
      }
      hits.hand = hx2;
    }
    if (fly) {                                                            // la mosca de todos los días
      c.strokeStyle = hexA(P.tinta, 0.25); c.lineWidth = 1; c.setLineDash([2, 4]); c.beginPath();
      for (let i = 1; i <= 7; i++) { const a = (ms - i * 28) / 520; c.lineTo(hx + Math.sin(a) * cw * 0.52 + Math.sin(a * 2.7) * 14, chY + ch * 0.17 + Math.cos(a * 1.3) * ch * 0.15); }
      c.stroke(); c.setLineDash([]);
      const wb = Math.sin(ms / 16) * 2.5; c.fillStyle = hexA(P.plataOsc, 0.6); el(c, fly.x - 3, fly.y - 3 - wb * 0.3, 4, 2.2, -0.6); c.fill(); el(c, fly.x + 3, fly.y - 3 + wb * 0.3, 4, 2.2, 0.6); c.fill();
      el(c, fly.x, fly.y, 3.2, 2.4); c.fillStyle = mix(P.tinta, P.maderaOsc, 0.2); c.fill();
    }
    // globo de diálogo: su frase del día, o lo que responde cuando lo tocas
    const lp = since(fx.lineT), tapLine = fx.line && lp < 2800, text = tapLine ? t(fx.line) : sc.line ? t(sc.line, { n: sc.n || PROFILE.shopVisits }) : '', age = tapLine ? lp : lp < 3100 ? lp - 2800 : ms - 500;
    if (text && age > 0) {
      const q = still ? 1 : Math.min(1, age / 320), pop = q < 1 ? 1 + 0.12 * Math.sin(q * Math.PI) - (1 - q) * (1 - q) * 0.5 : 1;
      bubble(c, W, text, cx + cw * 0.72, chY + ch * (pose.hat ? 0.02 : 0.1), signBot + 4, pop, o.dpr);   // con gorro, el globo sube un poco
    }
    // el rótulo, colgado de dos cadenas: se mece apenas, y más si lo tocas
    const fonts = document.fonts && document.fonts.check ? (document.fonts.check(`20px ${FONT_NUM}`) ? 1 : 0) : 1;
    const pad = 22, sg = layer('sign', [Math.round(bw), fonts, o.dpr, t('menu.tag')].join(), bw + pad * 2, bh + pad * 2 + 30, o.dpr, x => paintSign(x, bw, bh, pad, t('menu.tag')));
    const sp = since(fx.signT), sway = still ? 0 : Math.sin(ms / 1900) * 0.011 + (sp < 4000 ? Math.sin(sp / 190) * 0.085 * Math.exp(-sp / 900) : 0);
    c.save(); c.translate(hx, signTop - 26); c.rotate(sway);
    for (const s of [-1, 1]) { const lx = s * bw * 0.34; for (let y = 0; y < 30; y += 6.5) { el(c, lx, y + 2, 2.3, 3.8); c.lineWidth = 1.5; c.strokeStyle = (y / 6.5) % 2 < 1 ? K.metalX : P.plataOsc; c.stroke(); } }
    c.drawImage(sg.cv, -bw / 2 - pad, 26 - pad, sg.w, sg.h);
    c.restore();
    hits.sign = [hx - bw / 2, signTop, bw, bh + 24];
    hits.chucho = [cx + cw * 0.18, chY + ch * 0.12, cw * 0.64, cy - (chY + ch * 0.12)];
  }
  /* Qué se tocó en el punto (x, y) del lienzo: 'sign' | 'jar' | 'cat' | 'fiado' | 'chucho' | null */
  function hitAt(x, y) { for (const kk of ['sign', 'jar', 'cat', 'fiado', 'chucho']) { const r = hits[kk]; if (r && x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]) return kk; } return null; }
  /* ---------------- íconos ilustrados (SVG) ----------------
     Mismo trato que la escena: volumen con degradado, contorno fino del mismo color y un brillo arriba. Cada ícono trae sus propios
     degradados (ids con su nombre) para poder repetirse en la página. Sin atributos style: solo atributos de presentación (CSP). */
  const S = n => (Math.round(n * 100) / 100);
  const stops = list => list.map((st, i) => `<stop offset="${Array.isArray(st) ? st[0] : S(i / (list.length - 1))}" stop-color="${Array.isArray(st) ? st[1] : st}"/>`).join('');
  const lg = (id, list, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
  const rg = (id, list, cx = 0.35, cy = 0.3, r = 0.8) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;
  const ol = (col, w = 1.4) => `stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
  const ballDark = mix(P.tinta, P.maderaOsc, 0.15), metal = [K.metalL, [0.45, P.plata], P.plataOsc];
  const gearPath = (() => {
    let d = ''; const n = 8;
    for (let i = 0; i < n; i++) [[-0.16, 12.7], [0.16, 12.7], [0.27, 9.6], [TAU / n - 0.27, 9.6]].forEach(([da, r], j) => { const a = i * TAU / n + da; d += (i + j ? 'L' : 'M') + S(16 + Math.cos(a) * r) + ' ' + S(16 + Math.sin(a) * r); });
    return d + 'zM19.9 16a3.9 3.9 0 1 0-7.8 0 3.9 3.9 0 1 0 7.8 0z';
  })();
  const SHIRT = 'M11 4L4.5 8.5 8 14.5l3-1.7V27h10V12.8l3 1.7 3.5-6L21 4c-1 2.2-2.8 3.2-5 3.2S12 6.2 11 4z';
  const icons = {
    // ÁLBUM: dos cartas en abanico; la de adelante trae un muñeco
    col: `<defs>${lg('ig-col-a', ['#ffffff', [0.3, P.papel], P.crema])}${lg('ig-col-b', [P.crema, P.papelOsc])}${lg('ig-col-c', [P.canchaLuz, P.canchaOsc])}${rg('ig-col-d', [K.skinL, [0.55, P.piel], P.pielOsc])}</defs>` +
      `<g transform="rotate(-15 11 18)"><rect x="4.5" y="7.5" width="14" height="19.5" rx="2.6" fill="url(#ig-col-b)" ${ol(K.paperX, 1.3)}/></g>` +
      `<g transform="rotate(9 20 16)"><rect x="12" y="5" width="15" height="21" rx="2.8" fill="url(#ig-col-a)" ${ol(P.maderaOsc)}/>` +
      `<rect x="14" y="7" width="11" height="10.5" rx="1.6" fill="url(#ig-col-c)" ${ol(P.noche, 0.8)}/>` +
      `<path d="M16 17.5c.4-2.7 1.8-3.7 3.5-3.7s3.1 1 3.5 3.7z" fill="${P.papel}" ${ol(K.paperX, 0.8)}/><circle cx="19.5" cy="11.3" r="2.7" fill="url(#ig-col-d)" ${ol(K.skinX, 0.8)}/>` +
      `<rect x="14.5" y="19.6" width="10" height="1.6" rx=".8" fill="${P.maderaOsc}" opacity=".5"/><rect x="14.5" y="22.4" width="6.5" height="1.4" rx=".7" fill="${P.maderaOsc}" opacity=".32"/></g>`,
    // CHUCHO: su cara, con la ceja arriba y el bigotazo
    chu: `<defs>${rg('ig-chu-a', [K.skinL, [0.55, P.piel], mix(P.piel, P.pielOsc, 0.8)], 0.36, 0.26, 0.85)}${lg('ig-chu-b', [K.hairL, K.hair])}</defs>` +
      `<circle cx="5.3" cy="17" r="2.6" fill="${P.piel}" ${ol(K.skinX, 1.2)}/><circle cx="26.7" cy="17" r="2.6" fill="${P.piel}" ${ol(K.skinX, 1.2)}/>` +
      `<ellipse cx="16" cy="15.6" rx="10.6" ry="11.8" fill="url(#ig-chu-a)" ${ol(K.skinX)}/><ellipse cx="12" cy="8.3" rx="3.7" ry="1.5" transform="rotate(-25 12 8.3)" fill="#ffffff" opacity=".5"/>` +
      `<path d="M9.4 13.3l4.3-.4M18.3 12.5c1.6-1.9 3.4-1.7 4.6-.3" fill="none" ${ol(K.hair, 1.7)}/>` +
      `<ellipse cx="11.9" cy="15.9" rx="1.25" ry="1.4" fill="${P.tinta}"/><circle cx="11.5" cy="15.4" r=".45" fill="#ffffff"/><path d="M18.8 16.1c1-1.1 2.3-1.1 3.2 0" fill="none" ${ol(K.hair, 1.3)}/>` +
      `<ellipse cx="16.2" cy="18.7" rx="2.4" ry="2" fill="${P.pielOsc}"/><ellipse cx="15.5" cy="18" rx=".9" ry=".5" fill="#ffffff" opacity=".35"/>` +
      `<path d="M16.2 20.7c-3-1.8-6.5-.6-8.3 2.4 2.7-1 5.3-.5 8.3-.3 3-.2 5.6-.7 8.3.3-1.8-3-5.3-4.2-8.3-2.4z" fill="url(#ig-chu-b)" ${ol(K.hairX, 0.7)}/>`,
    // JUGAR: el balón
    jug: `<defs>${rg('ig-jug-a', ['#ffffff', [0.6, P.papel], P.papelOsc])}<clipPath id="ig-jug-c"><circle cx="16" cy="16" r="12.4"/></clipPath></defs>` +
      `<circle cx="16" cy="16" r="13" fill="url(#ig-jug-a)"/><g clip-path="url(#ig-jug-c)" fill="${ballDark}">` +
      `<path d="M16 10.4l5.33 3.87-2.04 6.26h-6.58l-2.04-6.26z"/><circle cx="16" cy="2.6" r="4.4"/><circle cx="28.7" cy="11.9" r="4.4"/><circle cx="23.9" cy="26.8" r="4.4"/><circle cx="8.1" cy="26.8" r="4.4"/><circle cx="3.3" cy="11.9" r="4.4"/>` +
      `<path d="M16 10.4V6.5M21.33 14.27l3.9-1.3M19.29 20.53l2.4 3.3M12.71 20.53l-2.4 3.3M10.67 14.27l-3.9-1.3" fill="none" ${ol(ballDark, 1)}/></g>` +
      `<circle cx="16" cy="16" r="13" fill="none" ${ol(mix(P.tinta, P.maderaOsc, 0.3))}/><ellipse cx="11.3" cy="9.4" rx="3.5" ry="1.7" transform="rotate(-32 11.3 9.4)" fill="#ffffff" opacity=".8"/>`,
    // ESTILO: la camiseta crema de franjas rojas
    per: `<defs>${lg('ig-per-a', ['#ffffff', [0.35, P.papel], P.papelOsc])}<clipPath id="ig-per-c"><path d="${SHIRT}"/></clipPath></defs>` +
      `<path d="${SHIRT}" fill="url(#ig-per-a)"/><g clip-path="url(#ig-per-c)"><path d="M12.9 4v24M16 6v22M19.1 4v24" fill="none" stroke="${P.franja}" stroke-width="1.7"/>` +
      `<path d="M5.6 11.4l3.4 2.2M26.4 11.4L23 13.6" fill="none" stroke="${P.franja}" stroke-width="2.2"/><rect x="11" y="23" width="10" height="4" fill="${P.maderaOsc}" opacity=".14"/></g>` +
      `<path d="${SHIRT}" fill="none" ${ol(P.maderaOsc)}/><path d="M11.4 4.6c1 1.9 2.6 2.7 4.6 2.7s3.6-.8 4.6-2.7" fill="none" ${ol(P.cancha, 1.5)}/>`,
    // MÁS: una tuerca de metal
    mas: `<defs>${lg('ig-mas-a', metal)}</defs><path d="${gearPath}" fill="url(#ig-mas-a)" fill-rule="evenodd" ${ol(K.metalX, 1.3)}/>` +
      `<circle cx="16" cy="16" r="6.6" fill="none" stroke="${K.metalX}" stroke-width=".9" opacity=".35"/><path d="M9.6 10.2a8.6 8.6 0 0 1 5-2.7" fill="none" ${ol('#ffffff', 1.3)} opacity=".8"/>`,
    // temporada: el banderín
    tem: `<defs>${lg('ig-tem-a', [P.canchaLuz, P.cancha, P.canchaOsc])}${lg('ig-tem-b', [P.maderaLuz, P.maderaOsc], 1, 0)}</defs>` +
      `<rect x="5.4" y="4" width="2.8" height="25" rx="1.4" fill="url(#ig-tem-b)" ${ol(P.maderaHond, 1)}/><path d="M8.2 6.2l19.6 5.9-19.6 6.4z" fill="url(#ig-tem-a)" ${ol(P.noche, 1.3)}/>` +
      `<path d="M8.2 6.2l3.6 1.1v10l-3.6 1.2z" fill="${P.papel}"/><circle cx="16.4" cy="12.3" r="2.2" fill="${P.papel}"/><path d="M8.2 6.2l19.6 5.9-19.6 6.4z" fill="none" ${ol(P.noche, 1.3)}/>` +
      `<circle cx="6.8" cy="4.2" r="2.1" fill="${P.plata}" ${ol(K.metalX, 1)}/><circle cx="6.2" cy="3.6" r=".7" fill="#ffffff"/>`,
    // plata: la moneda amarilla
    pla: `<defs>${rg('ig-pla-a', [K.coinL, [0.65, P.amarillo], mix(P.amarillo, K.coinX, 0.35)])}</defs><circle cx="16" cy="16" r="12.4" fill="url(#ig-pla-a)" ${ol(K.coinX)}/>` +
      `<circle cx="16" cy="16" r="8.9" fill="none" stroke="${K.coinX}" stroke-width="1" opacity=".5"/><text x="16" y="20.9" text-anchor="middle" font-family="Bungee, Impact, sans-serif" font-size="13" fill="${K.coinX}">$</text>` +
      `<path d="M8 12.4a9 9 0 0 1 5.4-5" fill="none" ${ol('#ffffff', 1.5)} opacity=".85"/>`,
  };
  /* Rarezas: el mismo material de la peana (madera, plata, dorado brillante, esmeralda tallada), en chiquito */
  const rarity = {
    comun: `<defs>${lg('ig-rc', [P.maderaLuz, P.madera, P.maderaOsc])}</defs><circle cx="8" cy="8" r="6.5" fill="url(#ig-rc)" ${ol(P.maderaHond, 1.1)}/><path d="M3.6 8.6c2.4-1.4 5.6 1 8.8-.6M4.6 11c2-.8 4.2.6 6.6-.2" fill="none" stroke="${P.maderaOsc}" stroke-width=".8" opacity=".55"/><path d="M4.2 5.6a4.6 4.6 0 0 1 3-2.3" fill="none" ${ol('#ffffff', 1)} opacity=".6"/>`,
    raro: `<defs>${lg('ig-rr', metal)}</defs><circle cx="8" cy="8" r="6.5" fill="url(#ig-rr)" ${ol(K.metalX, 1.1)}/><circle cx="5.2" cy="8.6" r=".8" fill="${K.metalX}" opacity=".6"/><circle cx="10.8" cy="8.6" r=".8" fill="${K.metalX}" opacity=".6"/><path d="M4.2 5.6a4.6 4.6 0 0 1 3-2.3" fill="none" ${ol('#ffffff', 1.2)} opacity=".9"/>`,
    especial: `<defs>${lg('ig-re', ['#ffffff', [0.3, P.oroLuz], P.oro])}</defs><circle cx="8" cy="8" r="6.5" fill="url(#ig-re)" ${ol(P.oroOsc, 1.1)}/><circle cx="8" cy="8" r="4.2" fill="none" stroke="${P.oroOsc}" stroke-width=".8" opacity=".45"/><path d="M10.8 2.6l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" fill="#ffffff"/>`,
    legendario: `<path d="M5 1.3h6L14.7 5v6L11 14.7H5L1.3 11V5z" fill="${P.esmeralda}"/><path d="M5 1.3h6l-1.6 3.3H6.6zM1.3 5L5 1.3l1.6 3.3-2 2z" fill="${P.esmeraldaLuz}"/><path d="M14.7 11L11 14.7l-1.6-3.3 2-2zM11 14.7H5l1.6-3.3h2.8z" fill="${P.esmeraldaOsc}" opacity=".75"/>` +
      `<path d="M6.6 4.6h2.8l2 2v2.8l-2 2H6.6l-2-2V6.6z" fill="${P.esmeraldaLuz}" opacity=".55"/><path d="M5 1.3h6L14.7 5v6L11 14.7H5L1.3 11V5z" fill="none" ${ol(P.esmeraldaOsc, 1.1)}/><path d="M5.6 3.4l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="#ffffff"/>`,
  };
  icons.lock = `<defs>${lg('ig-lock-a', metal)}</defs><path d="M10.5 14.5v-4a5.5 5.5 0 0 1 11 0v4" fill="none" stroke="${K.metalX}" stroke-width="4.4" stroke-linecap="round"/><path d="M10.5 14.5v-4a5.5 5.5 0 0 1 11 0v4" fill="none" stroke="${P.plata}" stroke-width="2" stroke-linecap="round"/>` +
    `<rect x="6.8" y="13.6" width="18.4" height="14.2" rx="3.4" fill="url(#ig-lock-a)" ${ol(K.metalX)}/><circle cx="16" cy="19.6" r="2.1" fill="${K.metalX}"/><rect x="15.05" y="19.6" width="1.9" height="4.4" rx=".95" fill="${K.metalX}"/><path d="M9.8 16.3h5.6" fill="none" ${ol('#ffffff', 1.2)} opacity=".75"/>`;

  /* ---------------- retrato de un muñeco (álbum) ----------------
     De frente, parado en su peana, sobre un fondo de papel teñido con el material de su rareza. Si aún no lo tienes: su silueta
     (se reconoce por la forma, que es la regla del rediseño) con un signo de pregunta. o: {locked} */
  const TINT = { comun: P.madera, raro: P.plata, especial: P.oroLuz, legendario: P.esmeralda };
  let silCv = null;
  function portrait(c, id, w, h, o = {}) {
    const def = GOLIN.DOLL[id], tint = TINT[def.rarity] || P.madera, s = Math.min(w, h), ox = (w - s) / 2, oy = h - s;
    c.fillStyle = rad(c, w / 2, h * 0.36, 2, Math.max(w, h) * 0.82, o.locked ? [mix(P.papelOsc, tint, 0.2), mix(mix(P.papelOsc, tint, 0.3), P.maderaHond, 0.5)] : ['#ffffff', [0.3, mix(P.papel, tint, 0.2)], mix(P.papel, tint, 0.6)]);
    c.fillRect(0, 0, w, h);
    c.fillStyle = lin(c, 0, h * 0.78, 0, h, [hexA(P.maderaHond, 0), hexA(P.maderaHond, 0.2)]); c.fillRect(0, h * 0.78, w, h * 0.22);
    if (typeof drawFront !== 'function') return;
    if (!o.locked) { c.save(); c.translate(ox, oy); drawFront(c, id, s, s); c.restore(); return; }
    const k = c.getTransform().a, px = Math.ceil(s * k);
    if (!silCv) silCv = document.createElement('canvas');
    silCv.width = silCv.height = px;
    const x = silCv.getContext('2d'); x.setTransform(k, 0, 0, k, 0, 0); drawFront(x, id, s, s);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = mix(P.maderaHond, P.tinta, 0.4); x.fillRect(0, 0, s, s);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = lin(x, 0, 0, s * 0.8, s, [hexA(P.maderaLuz, 0.42), [0.55, hexA(P.maderaLuz, 0)], hexA(P.maderaLuz, 0)]); x.fillRect(0, 0, s, s);   // un poco de luz arriba a la izquierda: volumen
    c.drawImage(silCv, ox, oy, s, s);
    c.font = `${s * 0.3}px ${FONT_NUM}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = hexA(P.tinta, 0.35); c.fillText('?', w / 2 + 1, oy + s * 0.57 + 2); c.fillStyle = hexA(P.papel, 0.92); c.fillText('?', w / 2, oy + s * 0.57);
  }
  icons.ok = `<defs>${rg('ig-ok-a', [P.canchaLuz, [0.6, P.cancha], P.canchaOsc])}</defs><circle cx="16" cy="16" r="12.6" fill="url(#ig-ok-a)" ${ol(P.noche)}/>` +
    `<path d="M9.9 17.4l4.2 4.2 8.4-9" fill="none" ${ol(P.noche, 5)} opacity=".35"/><path d="M9.9 16.6l4.2 4.2 8.4-9" fill="none" ${ol(P.papel, 3.2)}/><path d="M7.4 12.2a9.4 9.4 0 0 1 5.2-5" fill="none" ${ol('#ffffff', 1.3)} opacity=".7"/>`;

  /* ---------------- busto de Don Chucho (pestaña CHUCHO) ----------------
     La cabeza y los hombros sobre la misma luz cálida de la tienda. Respira y parpadea; si lo tocas, se asusta.
     o: {ms, tapMs (hace cuánto lo tocaste), still, glasses, hat} */
  function bust(c, w, h, o = {}) {
    const ms = o.ms || 0, still = !!o.still, tp = o.tapMs === undefined ? 1e9 : o.tapMs, cw = w * 1.36, ch = cw * 280 / 240;
    c.fillStyle = rad(c, w / 2, h * 0.42, 4, Math.max(w, h) * 0.9, [P.papel, [0.28, P.crema], [0.6, P.maderaLuz], mix(P.madera, P.maderaOsc, 0.4)]); c.fillRect(0, 0, w, h);
    const pose = { eyes: 'wink', breath: still ? 0 : Math.sin(ms / 573), blink: !still && ms % 4300 < 130, tilt: still ? 0 : Math.sin(ms / 2100) * 0.014, arm: { a: 0.25 }, glasses: o.glasses, hat: o.hat };
    if (!still && tp < 620) { pose.eyes = 'wide'; pose.blink = false; pose.bob = -7 * Math.sin(tp / 620 * Math.PI); }
    c.save(); c.translate((w - cw) / 2, h * (o.hat ? 0.24 : 0.1) - ch * 48 / 280); chucho(c, cw, ch, pose); c.restore();
  }
  icons.reg = `<defs>${lg('ig-reg-a', ['#ffffff', [0.3, P.papel], P.crema])}${lg('ig-reg-b', metal)}</defs><rect x="7" y="5.4" width="18" height="22.6" rx="2.6" fill="url(#ig-reg-a)" ${ol(P.maderaOsc)}/>` +
    `<path d="M10.6 13.4h10.8M10.6 17.4h10.8M10.6 21.4h6.6" fill="none" ${ol(P.maderaOsc, 1.5)} opacity=".5"/><rect x="11.4" y="3" width="9.2" height="5.2" rx="1.7" fill="url(#ig-reg-b)" ${ol(K.metalX, 1.1)}/>`;

  /* ---------------- la mesa de cada cancha, en miniatura (pestaña ESTILO) ----------------
     La mesa vista desde arriba con los colores de esa cancha (LEVEL_THEMES de js/art.js): marco, tapete con bandas, líneas, arcos y barras. */
  function miniTable(c, w, h, level) {
    const th = themeOf(level), fr = Math.max(4, w * 0.09), x0 = fr, y0 = fr, tw = w - fr * 2, tH = h - fr * 2, dark = mix(th.frameDark, P.tinta, 0.5);
    rr(c, 0.75, 0.75, w - 1.5, h - 1.5, w * 0.11); fine(c, lin(c, 0, 0, w * 0.6, h, [mix(th.frame, '#ffffff', 0.3), [0.35, th.frame], th.frameDark]), dark, 1.5);
    c.save(); rr(c, 0.75, 0.75, w - 1.5, h - 1.5, w * 0.11); c.clip(); c.strokeStyle = hexA(th.frameDark, 0.45); c.lineWidth = 0.8;
    for (let y = 5; y < h; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 1.5); c.stroke(); }
    c.fillStyle = hexA('#ffffff', 0.4); c.fillRect(0, 1.6, w, 1); c.restore();
    c.save(); rr(c, x0, y0, tw, tH, 2.5); c.clip();
    c.fillStyle = th.turf; c.fillRect(x0, y0, tw, tH);
    const n = Math.max(4, Math.round(th.bands / 2)), bh = tH / n; c.fillStyle = th.band; for (let i = 1; i < n; i += 2) c.fillRect(x0, y0 + i * bh, tw, bh);
    if (th.spot) { c.fillStyle = rad(c, w / 2, h / 2, 2, h * 0.6, [hexA('#fff8d6', 0.22), hexA('#000000', 0.3)]); c.fillRect(x0, y0, tw, tH); }   // canchas de noche: foco al centro
    c.strokeStyle = th.line; c.lineWidth = 1;
    c.strokeRect(x0 + 2.5, y0 + 2.5, tw - 5, tH - 5); c.beginPath(); c.moveTo(x0 + 2.5, h / 2); c.lineTo(x0 + tw - 2.5, h / 2); c.stroke();
    c.beginPath(); c.arc(w / 2, h / 2, tw * 0.17, 0, TAU); c.stroke();
    c.strokeRect(x0 + tw * 0.27, y0 + 2.5, tw * 0.46, tH * 0.09); c.strokeRect(x0 + tw * 0.27, y0 + tH - 2.5 - tH * 0.09, tw * 0.46, tH * 0.09);
    c.fillStyle = lin(c, 0, y0, 0, y0 + tH, [hexA('#ffffff', 0.2), [0.45, hexA('#ffffff', 0)], hexA(P.tinta, 0.14)]); c.fillRect(x0, y0, tw, tH);
    c.restore();
    rr(c, x0, y0, tw, tH, 2.5); c.lineWidth = 1.2; c.strokeStyle = dark; c.stroke();
    c.fillStyle = P.tinta; c.fillRect(w * 0.36, 1.2, w * 0.28, fr - 1.4); c.fillRect(w * 0.36, h - fr + 0.2, w * 0.28, fr - 1.4);                   // arcos
    [0.2, 0.4, 0.62, 0.82].forEach((k, i) => {                                                                                                // barras con sus muñecos
      const y = y0 + tH * k, m = [3, 4, 2, 1][i];
      c.fillStyle = hexA(P.tinta, 0.28); c.fillRect(0.8, y + 0.8, w - 1.6, 1.6); c.fillStyle = P.plata; c.fillRect(0.8, y - 1, w - 1.6, 2); c.fillStyle = '#ffffff'; c.fillRect(0.8, y - 1, w - 1.6, 0.6);
      for (let j = 0; j < m; j++) { c.beginPath(); c.arc(x0 + tw * (j + 1) / (m + 1), y, Math.max(1.8, w * 0.04), 0, TAU); c.fillStyle = i < 1 ? P.azul : P.crema; c.fill(); c.lineWidth = 0.9; c.strokeStyle = P.tinta; c.stroke(); }
    });
  }
  return { scene, back, layout, chucho, hitAt, mix, K, lin, rad, fine, icons, rarity, portrait, bust, miniTable };
})();
