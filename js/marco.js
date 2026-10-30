/* Marco de celular: da el foco al juego (para que Esc y el teclado funcionen) y, si la ventana se vuelve chica
   o táctil, pasa al juego normal. */
(function () {
  var f = document.getElementById('juego');
  var focus = function () { try { f.focus(); } catch (e) {} };
  f.addEventListener('load', focus);
  document.addEventListener('pointerdown', function () { setTimeout(focus, 0); });
  window.addEventListener('resize', function () {
    if (!matchMedia('(min-width: 901px)').matches) location.replace('index.html?completo');
  });
})();
