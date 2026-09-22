/* =====================================================================
   GOLÍN — IDENTIDAD SONORA (síntesis con Web Audio, sin archivos)
   Manual §Identidad sonora. Las 5 firmas:
     toc     balón contra madera; cada rebote sube un paso en escala
             PENTATÓNICA, que se reinicia en cada tiro
     clac    muñeco golpeando (propio agudo, rival más grave)
     caja    monedas en un tarro de lata: solo en la tienda y al cobrar
     stinger reemplaza al relator: solo en combos grandes, 1 por tiro
     grito   grito de gol colectivo (nivel 5), precedido de 0.5 s de silencio
   Mezcla: máximo 6 efectos simultáneos (se descartan los de nivel más bajo);
   buses separados general / música y ambiente / efectos; la música baja
   sola en los niveles 4 y 5 y se corta en seco antes del grito de gol.
   Nada de sonidos de tragamonedas.
   ===================================================================== */
let AC = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, sfxDuck = null;

function audio() {
  if (!AC) {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = AC.createGain(); sfxBus = AC.createGain(); musicBus = AC.createGain(); sfxDuck = AC.createGain();
    sfxBus.connect(sfxDuck); sfxDuck.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    setVolumes();
    MUSIC.start();
  }
  if (AC.state === 'suspended') AC.resume();
}
function setVolumes() {
  if (!AC || typeof OPT === 'undefined') return;
  const t = AC.currentTime;
  master.gain.setTargetAtTime(OPT.master * 0.8, t, 0.05);
  sfxBus.gain.setTargetAtTime(OPT.sfx, t, 0.05);
  musicBus.gain.setTargetAtTime(OPT.music * 0.5, t, 0.05);
}

/* ---------- gestor de voces: máximo 6 efectos a la vez ---------- */
const MAX_VOICES = 6;
let voices = [];
function voice(level, dur, build) {
  if (!AC) return;
  const t = AC.currentTime;
  voices = voices.filter(v => v.end > t);
  if (voices.length >= MAX_VOICES) {
    const low = voices.reduce((a, v) => (v.level < a.level ? v : a), voices[0]);
    if (low.level >= level) return;                              // el nuevo es de menor nivel: se descarta
    low.g.gain.cancelScheduledValues(t); low.g.gain.setValueAtTime(low.g.gain.value, t); low.g.gain.linearRampToValueAtTime(0, t + 0.02);
    voices.splice(voices.indexOf(low), 1);
  }
  const g = AC.createGain(); g.connect(sfxBus);
  build(g, t);
  voices.push({ level, end: t + dur, g });
}
function osc(out, t, freq, dur, type = 'sine', vol = 0.2, slideTo = null, attack = 0.003) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
}
function nz(out, t, dur, vol, freq, type = 'bandpass', q = 1, attack = 0.002) {
  const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  return f;
}
// compatibilidad con llamadas sueltas (clic de mover el balón)
function tone(freq, dur, type, vol) { voice(1, dur, (g, t) => osc(g, t, freq, dur, type, vol)); }

/* ---------- escala pentatónica (do re mi sol la), se reinicia en cada tiro ---------- */
const PENTA = [0, 2, 4, 7, 9];
function noteFreq(i) {
  i = Math.max(0, Math.min(i, 17));
  return 261.63 * Math.pow(2, (12 * Math.floor(i / 5) + PENTA[i % 5]) / 12);
}

const SFX = {
  /* TOC: balón-madera, corto y seco (nivel 1–2) */
  toc(i, impact) {
    const f = noteFreq(i), v = Math.max(0.4, Math.min(1, 0.4 + impact / 20));
    voice(1, 0.14, (g, t) => { nz(g, t, 0.05, 0.35 * v, 1100, 'bandpass', 3); osc(g, t, f, 0.12, 'triangle', 0.22 * v); osc(g, t, f * 2, 0.05, 'sine', 0.06 * v); });
  },
  /* CLAC: barra metálica / muñeco. Propios más agudos; rivales más graves */
  clac(i, impact, rival, effect) {
    const f = noteFreq(i), v = Math.max(0.45, Math.min(1, 0.45 + impact / 18));
    if (rival) voice(1, 0.18, (g, t) => { nz(g, t, 0.04, 0.3 * v, 500, 'bandpass', 2); osc(g, t, f / 2, 0.16, 'square', 0.07 * v); osc(g, t, f / 2 * 1.5, 0.1, 'triangle', 0.05 * v); });
    else voice(effect ? 2 : 1, 0.25, (g, t) => {
      nz(g, t, 0.03, 0.25 * v, 3200, 'highpass', 1);
      osc(g, t, f, 0.22, 'triangle', 0.22 * v); osc(g, t, f * 2.76, 0.09, 'sine', 0.07 * v); osc(g, t, f * 4.1, 0.05, 'sine', 0.04 * v);
    });
  },
  /* Nivel 3 — multiplica: golpe más grave + campanita */
  multHit(i) {
    const f = noteFreq(i);
    voice(3, 0.8, (g, t) => {
      osc(g, t, 150, 0.25, 'sine', 0.5, 45); nz(g, t, 0.06, 0.3, 600, 'lowpass', 1);
      osc(g, t, f * 2, 0.7, 'sine', 0.12); osc(g, t, f * 3, 0.55, 'sine', 0.07); osc(g, t, f * 5.04, 0.35, 'sine', 0.04);
    });
  },
  /* CAJA: monedas cayendo en un tarro de lata (solo tienda y cobro) */
  caja(n = 1) {
    voice(2, 0.25 + n * 0.07, (g, t) => {
      for (let k = 0; k < n; k++) {
        const tt = t + k * 0.065 + Math.random() * 0.02;
        osc(g, tt, 2600 + Math.random() * 1600, 0.09, 'sine', 0.09); osc(g, tt, 4100 + Math.random() * 1500, 0.05, 'sine', 0.04);
        nz(g, tt, 0.12, 0.08, 2300, 'bandpass', 9);            // resonancia de lata
      }
    });
  },
  /* moneda del Tendero durante el tiro: un "tin" discreto (la caja queda para la tienda) */
  coin() { voice(1, 0.1, (g, t) => { osc(g, t, 3100, 0.07, 'sine', 0.05); }); },
  shoot(p) { voice(2, 0.25, (g, t) => { nz(g, t, 0.16, 0.25 + 0.25 * p, 500 + 2200 * p, 'bandpass', 0.8); osc(g, t, 140 + 180 * p, 0.12, 'sine', 0.3, 60); }); },
  /* golpe seco al aplicar un multiplicador en el conteo */
  thunk(k = 1) { voice(3, 0.2, (g, t) => { osc(g, t, 160, 0.16, 'sine', 0.45 * k, 42); nz(g, t, 0.05, 0.3 * k, 700, 'lowpass'); }); },
  /* conteo: clic de madera neutro (nada de campanitas de máquina) */
  tick() { voice(0, 0.03, (g, t) => { nz(g, t, 0.015, 0.12, 1700, 'bandpass', 4); }); },
  aim(p) { voice(0, 0.04, (g, t) => { nz(g, t, 0.02, 0.06 + 0.06 * p, 900 + 1500 * p, 'bandpass', 5); }); },
  /* Nivel 5 — GOL: medio segundo de silencio, luego el grito colectivo */
  goal() {
    if (!AC) return;
    const t = AC.currentTime;
    MUSIC.cut();
    sfxDuck.gain.cancelScheduledValues(t); sfxDuck.gain.setValueAtTime(0, t); sfxDuck.gain.setValueAtTime(1, t + 0.5);
    for (const v of voices) { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(0, t); }
    voices = [];
    setTimeout(() => SFX.grito(), 500);
  },
  grito() {
    voice(5, 2.4, (g, t) => {
      // multitud: muchas voces desafinadas en vocal "o" (formantes ~500/900 Hz) + ruido de tribuna
      const bus = AC.createGain(); bus.gain.setValueAtTime(0.0001, t); bus.gain.exponentialRampToValueAtTime(0.9, t + 0.12);
      bus.gain.setValueAtTime(0.9, t + 1.5); bus.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
      const f1 = AC.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 4;
      const f2 = AC.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 900; f2.Q.value = 5;
      bus.connect(f1); bus.connect(f2); f1.connect(g); f2.connect(g);
      for (let k = 0; k < 14; k++) {
        const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sawtooth';
        const base = 150 + Math.random() * 140;
        o.frequency.setValueAtTime(base * 0.85, t); o.frequency.linearRampToValueAtTime(base * 1.12, t + 0.35); o.frequency.linearRampToValueAtTime(base, t + 2.2);
        og.gain.value = 0.05; o.connect(og); og.connect(bus); o.start(t + Math.random() * 0.06); o.stop(t + 2.4);
      }
      nz(g, t, 2.2, 0.35, 1400, 'bandpass', 0.6, 0.15);
      [392, 523, 659, 784].forEach((f, i) => osc(g, t + 0.1 + i * 0.05, f, 0.9, 'triangle', 0.07));
    });
  },
  autogol() { voice(4, 0.8, (g, t) => { osc(g, t, 330, 0.7, 'sawtooth', 0.07, 90); osc(g, t + 0.05, 320, 0.7, 'sawtooth', 0.05, 85); nz(g, t, 0.5, 0.1, 400, 'lowpass'); }); },
  split() { voice(3, 0.3, (g, t) => { osc(g, t, 500, 0.22, 'sine', 0.15, 1300); osc(g, t + 0.04, 750, 0.22, 'sine', 0.12, 1900); }); },
  slowmo() { voice(4, 0.9, (g, t) => { osc(g, t, 220, 0.8, 'sine', 0.12, 90); nz(g, t, 0.8, 0.1, 350, 'lowpass', 1, 0.1); }); },
  /* cuota superada: palmas y tribuna corta (sin fanfarria de máquina) */
  victory() { voice(4, 1.3, (g, t) => { for (let k = 0; k < 10; k++) nz(g, t + k * 0.09 + Math.random() * 0.03, 0.05, 0.3, 1800, 'bandpass', 1.5); nz(g, t, 1.2, 0.18, 1200, 'bandpass', 0.7, 0.2); }); },
  levelup() { voice(2, 0.3, (g, t) => { osc(g, t, 660, 0.1, 'triangle', 0.12); osc(g, t + 0.07, 990, 0.16, 'triangle', 0.12); }); },
  sell() { SFX.caja(2); },
  error() { voice(2, 0.2, (g, t) => { osc(g, t, 150, 0.18, 'square', 0.07); nz(g, t, 0.1, 0.1, 400, 'lowpass'); }); },
  place() { voice(1, 0.12, (g, t) => { nz(g, t, 0.05, 0.25, 900, 'bandpass', 2); osc(g, t, 330, 0.08, 'triangle', 0.15, 180); }); },
  gambeta() { voice(3, 0.3, (g, t) => { osc(g, t, 500, 0.18, 'triangle', 0.14, 1300); nz(g, t, 0.12, 0.12, 2500, 'bandpass', 2); }); },
  comba() { voice(3, 0.5, (g, t) => { osc(g, t, 380, 0.45, 'sine', 0.13, 900); }); },
  kante() { voice(3, 0.35, (g, t) => { nz(g, t, 0.25, 0.25, 1500, 'bandpass', 1.2, 0.05); osc(g, t, 260, 0.2, 'triangle', 0.15, 700); }); },
  /* STINGER: remate de metales sintetizados en combos grandes (máx. 1 por tiro) */
  stinger() {
    voice(4, 0.9, (g, t) => {
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(800, t); lp.frequency.linearRampToValueAtTime(3200, t + 0.25); lp.connect(g);
      [[392, 0], [523, 0.1], [659, 0.2], [784, 0.3]].forEach(([f, d]) => { osc(lp, t + d, f, 0.45, 'sawtooth', 0.08, null, 0.02); osc(lp, t + d, f * 1.005, 0.45, 'sawtooth', 0.06, null, 0.02); });
    });
  },
  whistle() { voice(3, 0.45, (g, t) => { osc(g, t, 2350, 0.35, 'sine', 0.1); osc(g, t, 2480, 0.35, 'sine', 0.07); }); },
};

/* ---------- música por capas: cumbia de barrio sintetizada ----------
   Tienda: versión tranquila (bajo + teclado). Partido: + guacharaca y bombo.
   Con el combo entran capas (timbal, teclado brillante); en niveles 4–5 baja sola. */
const MUSIC = (() => {
  const BPM = 96, STEP = 60 / BPM / 2;          // corcheas
  const CHORDS = [[48, 55, 60, 64], [43, 50, 55, 59], [45, 52, 57, 60], [43, 50, 55, 62]];   // Do · Sol · Lam · Sol
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  let layers = null, step = 0, nextT = 0, mode = 'shop', intensity = 0, cutUntil = 0;
  function start() {
    if (layers) return;
    layers = {};
    for (const k of ['bass', 'keys', 'guach', 'kick', 'timbal', 'bright', 'amb']) { const g = AC.createGain(); g.gain.value = 0; g.connect(musicBus); layers[k] = g; }
    // ambiente de tienda de barrio: murmullo muy bajo
    const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const ag = AC.createGain(); ag.gain.value = 0.05; s.connect(f); f.connect(ag); ag.connect(layers.amb); s.start();
    nextT = AC.currentTime + 0.1;
    setInterval(tick, 25);
    apply();
  }
  function tick() {
    if (AC.state !== 'running') return;
    if (nextT < AC.currentTime) nextT = AC.currentTime + 0.05;
    while (nextT < AC.currentTime + 0.12) { play(step, nextT); step = (step + 1) % 32; nextT += STEP; }
  }
  function play(s, t) {
    const chord = CHORDS[Math.floor(s / 8) % 4], beat = s % 8;
    if (beat === 0 || beat === 4 || beat === 7) osc(layers.bass, t, midi(chord[beat === 4 ? 1 : 0] - 12), STEP * 1.6, 'triangle', 0.35, null, 0.01);
    if (beat % 2 === 1) chord.slice(1).forEach(m => osc(layers.keys, t, midi(m), STEP * 0.7, 'square', 0.035, null, 0.005));
    nz(layers.guach, t, beat % 2 ? 0.05 : 0.11, beat % 2 ? 0.08 : 0.14, 3600, 'bandpass', 2.5, beat % 2 ? 0.002 : 0.04);
    if (beat === 0 || beat === 4) osc(layers.kick, t, 110, 0.18, 'sine', 0.5, 45);
    if (beat === 3 || beat === 6) osc(layers.timbal, t, 420 + (beat === 6 ? 90 : 0), 0.12, 'triangle', 0.12, 260);
    if (beat % 4 === 2) chord.slice(2).forEach(m => osc(layers.bright, t, midi(m + 12), STEP * 0.5, 'triangle', 0.05));
  }
  function apply() {
    if (!layers) return;
    const t = AC.currentTime;
    if (t < cutUntil) return;
    const match = mode === 'match';
    const set = (k, v) => layers[k].gain.setTargetAtTime(v, t, 0.25);
    const duck = intensity >= 4 ? 0.45 : 1;       // niveles 4 y 5: la música baja sola
    set('bass', 0.9 * duck); set('keys', (match ? 0.8 : 0.6) * duck); set('amb', match ? 0.6 : 1);
    set('guach', match ? 0.8 * duck : 0); set('kick', match ? 0.7 * duck : 0);
    set('timbal', match && intensity >= 2 ? 0.7 * duck : 0); set('bright', match && intensity >= 3 ? 0.8 * duck : 0);
  }
  return {
    start,
    setMode(m) { mode = m; apply(); },
    setIntensity(i) { if (i !== intensity) { intensity = i; apply(); } },
    cut() {                                        // corte en seco antes del grito de gol
      if (!layers) return;
      const t = AC.currentTime; cutUntil = t + 2.6;
      for (const g of Object.values(layers)) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); }
      setTimeout(apply, 2700);
    },
  };
})();
