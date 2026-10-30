/* GOLÍN se juega en celular y tableta. En un computador (pantalla grande y ratón) se abre dentro de un marco de
   celular (marco.html) para ver lo mismo que verá quien lo juegue en el teléfono. Para verlo a pantalla completa:
   index.html?completo. Las pruebas automáticas (?directo) tampoco usan el marco. */
(function () {
  try {
    if (window.self !== window.top) return;                                  // ya está dentro del marco
    if (/[?&](directo|completo)\b/.test(location.search)) return;
    var wide = matchMedia('(min-width: 901px)').matches && matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (wide) location.replace('marco.html');
  } catch (e) { /* sin marco: se juega normal */ }
})();
