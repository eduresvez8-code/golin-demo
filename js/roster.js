/* =====================================================================
   GOLÍN — ROSTER: tabla única de muñecos.
   Agregar un muñeco = agregar una entrada aquí + su caso en EFFECTS
   (js/scoring.js) + sus textos en js/strings.js. Nada más.

   Campos:
     id        clave interna (también para textos y config)
     name      nombre en pantalla (no se traduce)
     rarity    'comun' | 'raro' | 'especial' | 'legendario'
     family    familia de efecto (solo informativo + filtro)
     price     precio en plata (los legendarios no se venden en tienda)
     shape     cuerpo físico: {kind:'circle', r} o {kind:'rect', w, h}
     rest      restitución del muñeco (componente normal del rebote)
     head      silueta de cabeza (js/art.js la dibuja)
     params    valores numéricos del efecto (editables en el debug)
     shop      false = nunca sale en la tienda
   Todos los valores de price/rest/params se copian a la config al cargar
   y desde ahí se editan en vivo; esta tabla es solo el valor por defecto.
   ===================================================================== */
(function (root) {
  const GOLIN = root.GOLIN = root.GOLIN || {};

  const RARITIES = ['comun', 'raro', 'especial', 'legendario'];
  const FAMILIES = ['sumador', 'multiplicador', 'posicional', 'manipulador', 'economia', 'escalador', 'condicional'];

  const ROSTER = [
    // ---------------- COMÚN ----------------
    { id:'poste', name:'El Poste', rarity:'comun', family:'sumador', price:3,
      shape:{ kind:'circle', r:7 }, rest:0.95, head:'palo', params:{ pts:15 } },
    { id:'muro', name:'El Muro', rarity:'comun', family:'sumador', price:4,
      shape:{ kind:'rect', w:46, h:20 }, rest:0.75, head:'rapado', params:{ pts:40 } },

    // ---------------- RARO ----------------
    { id:'rebotador', name:'El Rebotador', rarity:'raro', family:'manipulador', price:5,
      shape:{ kind:'circle', r:16 }, rest:1.6, head:'resorte', params:{ pts:10, minKick:10 } },
    { id:'tendero', name:'El Tendero', rarity:'raro', family:'economia', price:5,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'gorra', params:{ pts:5, plata:1 } },
    { id:'ninamal', name:'La Niña Mal', rarity:'raro', family:'escalador', price:5,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'colitas', params:{ base:3, growth:3 } },
    { id:'cabezon', name:'Cabezón', rarity:'raro', family:'multiplicador', price:6,
      shape:{ kind:'circle', r:19 }, rest:0.85, head:'cabezota', params:{ mult:2 } },
    { id:'garra', name:'La Garra', rarity:'raro', family:'condicional', price:6,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'bandana', params:{ shots:2, bonus:0.5 } },
    { id:'pirlito', name:'Pirlito', rarity:'raro', family:'manipulador', price:5,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'melena', params:{ pts:15, bounces:2 } },
    { id:'kante', name:'Kan-Té', rarity:'raro', family:'manipulador', price:6,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'calvo', params:{ pts:15, force:16, trigger:2.5 } },
    { id:'rambos', name:'Rambos', rarity:'raro', family:'multiplicador', price:5, cursed:true,
      shape:{ kind:'circle', r:17 }, rest:0.85, head:'cresta', params:{ xmult:2, redAfter:3 } },

    // ---------------- ESPECIAL ----------------
    { id:'llave', name:'La Llave', rarity:'especial', family:'posicional', price:6,
      shape:{ kind:'circle', r:14 }, rest:0.85, head:'gorro', params:{ pts:5, factor:2 } },
    { id:'veterano', name:'El Veterano', rarity:'especial', family:'escalador', price:5,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'boina', params:{ base:5, growth:2 } },
    { id:'chilena', name:'Chilena', rarity:'especial', family:'condicional', price:6,
      shape:{ kind:'circle', r:16 }, rest:0.9, head:'copete', params:{ pts:10, xmult:3, needed:8 } },
    { id:'fantasma', name:'El Fantasma', rarity:'especial', family:'condicional', price:6,
      shape:{ kind:'circle', r:16 }, rest:0.9, head:'capucha', params:{ pts:10, xmult:2, time:3 } },
    { id:'pesi', name:'Pesi', rarity:'especial', family:'manipulador', price:8,
      shape:{ kind:'circle', r:15 }, rest:0.85, head:'flequillo', params:{ pts:15, chance:0.2 } },
    { id:'cp7', name:'CP7', rarity:'especial', family:'multiplicador', price:8,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'tupe', params:{ pts:20, xmult:1.5 } },
    { id:'gemelo', name:'El Gemelo', rarity:'especial', family:'manipulador', price:9,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'dos', params:{ pts:10, angle:16 } },
    { id:'bekam', name:'Bekam', rarity:'especial', family:'manipulador', price:7,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'vincha', params:{ pts:20, curveTime:0.6, turn:2.6 } },
    { id:'cazagoles', name:'El Cazagoles', rarity:'especial', family:'multiplicador', price:5,
      shape:{ kind:'circle', r:16 }, rest:0.85, head:'mono', params:{ mult:5 } },

    // ---------------- LEGENDARIO (solo jefes) ----------------
    { id:'mano', name:'La Mano', rarity:'legendario', family:'condicional', price:0, shop:false,
      shape:{ kind:'circle', r:17 }, rest:0.85, head:'guante', params:{ xmult:2 } },
    { id:'diez', name:'El Diez', rarity:'legendario', family:'escalador', price:0, shop:false,
      shape:{ kind:'circle', r:17 }, rest:0.85, head:'rizos', params:{ growth:1 } },
  ];

  /* Cosas del mostrador de Don Chucho: consumibles de un solo uso (van al bolsillo). */
  const ITEMS = [
    { id:'tiza',     price:4, icon:'✏️', when:'match' },   // +1 tiro en este partido
    { id:'empanada', price:4, icon:'🥟', when:'shot' },    // +2 Mult base en el próximo tiro
    { id:'iman',     price:2, icon:'🧲', when:'shot' },    // la guía muestra 2 rebotes en el próximo tiro
    { id:'pito',     price:3, icon:'📣', when:'shot' },    // el próximo tiro no puede ser autogol
    { id:'gaseosa',  price:3, icon:'🥤', when:'match' },   // la plata de este partido ×2 al cobrar
  ];
  const ITEM = {}; for (const it of ITEMS) ITEM[it.id] = it;

  const BY_ID = {};
  for (const d of ROSTER) {
    if (d.shop === undefined) d.shop = d.rarity !== 'legendario';
    BY_ID[d.id] = d;
  }

  GOLIN.RARITIES = RARITIES;
  GOLIN.FAMILIES = FAMILIES;
  GOLIN.ROSTER = ROSTER;
  GOLIN.DOLL = BY_ID;
  GOLIN.ITEMS = ITEMS;
  GOLIN.ITEM = ITEM;
  if (typeof module !== 'undefined' && module.exports) module.exports = { RARITIES, FAMILIES, ROSTER, DOLL: BY_ID, ITEMS, ITEM };
})(typeof globalThis !== 'undefined' ? globalThis : this);
