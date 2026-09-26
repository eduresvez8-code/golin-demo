/* Arranque del juego. Va en un archivo aparte (no en línea dentro del HTML) para que la
   política de seguridad (CSP) pueda prohibir cualquier script en línea. */
'use strict';
// Manifiesto ("Agregar a pantalla de inicio"): solo en la web. Con doble clic (file://) el navegador
// lo bloquearía y dejaría un error en la consola.
if (/^https?:$/.test(location.protocol)) {
  const m = document.createElement('link'); m.rel = 'manifest'; m.href = 'manifest.webmanifest'; document.head.appendChild(m);
}
if (typeof Matter === 'undefined') {
  // Matter.js no cargó: sin internet, o el archivo del CDN no pasó la verificación de integridad
  document.body.insertAdjacentHTML('afterbegin', '<p class="loadError">No se pudo cargar el motor de física. Revisa tu conexión y recarga.</p>');
} else startGame();
