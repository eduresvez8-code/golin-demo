/* =====================================================================
   GOLÍN — REGISTRO DE PARTIDAS (para balancear con datos, no a ojo)
   Guarda en el navegador los últimos 60 picaditos: cada partido, cada tiro,
   cada compra. Se descarga como JSON desde el debug (tecla D) o con
   __game.log.download(). No sale de la computadora de quien juega.
   ===================================================================== */
'use strict';
const LOG = (() => {
  const KEY = 'golinLog_v1', MAX_RUNS = 60;
  let runs = [];
  try { runs = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { runs = []; }
  if (!Array.isArray(runs)) runs = [];
  runs = runs.filter(r => r && typeof r === 'object' && Array.isArray(r.matches)).slice(-MAX_RUNS);   // basura fuera
  let run = null, match = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(runs.slice(-MAX_RUNS))); } catch (e) {} };
  const stamp = () => Math.round(performance.now());
  return {
    startRun(info) {
      run = Object.assign({}, info, { id: Date.now(), date: new Date().toISOString(), matches: [], result: null });
      runs.push(run); match = null; save();
    },
    startMatch(info) { if (!run) return; match = Object.assign({}, info, { t0: stamp(), shots: [], shop: [], items: [] }); run.matches.push(match); save(); },
    shot(s) { try { if (match) { match.shots.push(s); save(); } } catch (e) {} },
    shop(ev) { try { if (match) { match.shop.push(ev); save(); } } catch (e) {} },
    item(id) { try { if (match) { match.items.push(id); save(); } } catch (e) {} },
    endMatch(info) { if (match) { Object.assign(match, info, { secs: Math.round((stamp() - match.t0) / 1000) }); save(); } },
    endRun(info) { if (run) { run.result = info; save(); } },
    all: () => runs,
    clear() { runs = []; run = null; match = null; save(); },
    /* Resumen legible para el panel de debug */
    summary() {
      const done = runs.filter(r => r.result);
      if (!done.length) return 'Sin picaditos terminados todavía.';
      const reached = done.map(r => r.result.reached || 0);
      const lostAt = {};
      for (const r of runs) for (const m of r.matches) if (m.win === false) lostAt[m.match] = (lostAt[m.match] || 0) + 1;
      const worst = Object.entries(lostAt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => `P${m}×${n}`).join(' ');
      const buys = {};
      for (const r of runs) for (const m of r.matches) for (const e of m.shop) if (e.type === 'buy') buys[e.id] = (buys[e.id] || 0) + 1;
      const fav = Object.entries(buys).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${id}×${n}`).join(' ');
      return `${done.length} picaditos · ganados ${done.filter(r => r.result.win).length} · partido medio alcanzado ${(reached.reduce((a, b) => a + b, 0) / reached.length).toFixed(1)}\n` +
        `Donde más se pierde: ${worst || '—'}\nMás comprados: ${fav || '—'}`;
    },
    download() {
      const blob = new Blob([JSON.stringify({ game: 'GOLÍN', exported: new Date().toISOString(), runs }, null, 1)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'golin-registro-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
  };
})();
