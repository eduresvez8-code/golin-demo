/* =====================================================================
   GOLÍN — TEXTOS DE LA UI
   Todo texto que ve el jugador vive aquí, separado del código.
   Para traducir: copiar el bloque `es` como `en` / `pt` y cambiar LANG.
   Voz (manual §Voz y tono): regla primero, chiste después; máximo 12
   palabras por línea; pícaro y cariñoso; nunca humilla; nada de apuestas.
   Los nombres de los muñecos NO se traducen (viven en js/roster.js).
   Plantillas: {nombre} se reemplaza con el valor de la config.
   \n = salto de línea en pantalla (cada línea, máximo 12 palabras).
   ===================================================================== */
(function (root) {
  const GOLIN = root.GOLIN = root.GOLIN || {};

  const es = {
    // ---------- rarezas y familias ----------
    'rarity.comun': 'Común', 'rarity.raro': 'Raro', 'rarity.especial': 'Especial', 'rarity.legendario': 'Legendario',
    'family.sumador': 'Sumador', 'family.multiplicador': 'Multiplicador', 'family.posicional': 'Posicional',
    'family.manipulador': 'Manipulador', 'family.economia': 'Economía', 'family.escalador': 'Escalador',
    'family.condicional': 'Condicional',
    'rod.0': 'Delantera', 'rod.1': 'Medio', 'rod.2': 'Defensa', 'rod.3': 'Portero',
    'rodShort.0': 'DEL', 'rodShort.1': 'MED', 'rodShort.2': 'DEF', 'rodShort.3': 'POR',

    // ---------- muñecos: regla + chiste ----------
    'doll.poste.rule': '+{pts} puntos al primer toque del tiro.\nEl segundo toque en el mismo tiro paga el doble.',
    'doll.poste.joke': 'Engordó un poquito. Ahora sí se ve.',
    'doll.muro.rule': '+{pts} puntos por contacto.',
    'doll.muro.joke': 'Por aquí no pasa ni el aire.',
    'doll.rebotador.rule': '+{pts} puntos. Devuelve el balón con más fuerza de la que llega.',
    'doll.rebotador.joke': 'Le das suave y te la devuelve con rabia.',
    'doll.tendero.rule': '+{pts} puntos. Después de tocarlo, cada contacto da +{plata} de plata.',
    'doll.tendero.joke': 'Aquí todo rebote se cobra, mijo.',
    'doll.ninamal.rule': '+{value} puntos por contacto. +{growth} permanente cada tiro que la toques.',
    'doll.ninamal.joke': 'Nadie la tomaba en serio.',
    'doll.cabezon.rule': '+{pts} puntos al primer toque.\nCada toque siguiente en el mismo tiro paga el doble.',
    'doll.cabezon.joke': 'La cabeza más dura del barrio.',
    'doll.garra.rule': 'En tus últimos {shots} tiros, sin cuota: +{pct}% a los puntos.',
    'doll.garra.joke': 'Cuando más duele, más empuja. No hace falta tocarla.',
    'doll.pirlito.rule': '+{pts} puntos. Los {bounces} rebotes siguientes no pierden velocidad.',
    'doll.pirlito.joke': 'Ni se despeina.',
    'doll.kante.rule': '+{pts} puntos. Una vez por tiro, rescata un balón que se muere.',
    'doll.kante.joke': 'Está en todas partes. Nadie lo vio llegar.',
    'doll.rambos.rule': '×{xmult} al Mult final si lo tocas.\n{redAfter} tiros tocándolo y ve la roja.',
    'doll.rambos.joke': 'Juega bravo. A veces demasiado.',
    'doll.llave.rule': '+{pts} puntos. Duplica el efecto de sus vecinos de barra.',
    'doll.llave.joke': 'Abre cualquier puerta. Y cualquier defensa.',
    'doll.veterano.rule': '+{pts} puntos por contacto.\nEn los últimos {window} tiros: ×{xmult} Mult si lo tocas.',
    'doll.veterano.joke': 'Ya no corre, pero aparece cuando más se necesita.',
    'doll.chilena.rule': '+{pts} puntos. Tócala, {needed}+ cosas distintas y gol: ×{xmult} Mult.',
    'doll.chilena.joke': 'De espaldas, en el aire y con estilo.',
    'doll.fantasma.rule': '+{pts} puntos. Tócalo y gol antes de {time} s: ×{xmult} Mult.',
    'doll.fantasma.joke': 'Nadie lo marca porque nadie lo ve.',
    'doll.pesi.rule': '+{pts} puntos. {pct}% de gambeta: el balón busca el arco.',
    'doll.pesi.joke': 'Nadie sabe cómo lo hace.',
    'doll.cp7.rule': '+{pts} puntos. Si el tiro termina en gol: ×{xmult} Mult.',
    'doll.cp7.joke': 'No celebra, posa.',
    'doll.gemelo.rule': '+{pts} puntos. Al primer contacto, el balón se divide en dos.',
    'doll.gemelo.joke': 'Uno para ti y otro para el arco.',
    'doll.bekam.rule': '+{pts} puntos. El siguiente rebote en banda sale con comba.',
    'doll.bekam.joke': 'La manda con curva y peinado intacto.',
    'doll.cazagoles.rule': '+{mult} Mult si fue el último muñeco tocado antes del gol.',
    'doll.cazagoles.joke': 'Siempre aparece para empujarla.',
    'doll.mano.rule': 'Una vez por partido, un autogol se vuelve gol con ×{xmult} Mult.',
    'doll.mano.joke': 'El árbitro no vio nada. Nadie vio nada.',
    'doll.diez.rule': 'Cada gol suma +{growth} al Mult base para siempre. Va en +{value}.',
    'doll.diez.joke': 'El barrio entero se para cuando la toca.',
    'doll.cacique.rule': 'Una vez por partido, si ibas a perder una vida:\nte regala {shots} tiro más para alcanzar la meta.',
    'doll.cacique.joke': 'Aquí manda él, y él dice que todavía no.',
    'doll.cambista.rule': '+{plata} de plata la primera vez que lo tocas en cada partido.',
    'doll.cambista.joke': 'Le cambia un billete a cualquiera. Con comisión.',
    'doll.antena.rule': '+{pts} puntos. Atrae un poquito el balón cuando pasa cerca.',
    'doll.antena.joke': 'Capta todos los canales. Y todos los balones.',
    'doll.madrugador.rule': '+{pts} puntos. Si es tu primer tiro del partido y es gol:\n×{xmult} Mult.',
    'doll.madrugador.joke': 'A las cinco ya está calentando.',
    'doll.tardon.rule': '+{pts} puntos. Si es tu último tiro del partido y es gol:\n×{xmult} Mult.',
    'doll.tardon.joke': 'Llega tarde, pero llega a tiempo.',
    'doll.gato.rule': '+{pts} puntos. {pct}% de atajar un autogol antes de que entre.',
    'doll.gato.joke': 'Siete vidas, y todas bajo el arco.',
    'doll.costurera.rule': '+{pts} puntos. Si sus dos vecinos son de la misma familia:\ncada uno da +{mult} Mult al tocarlo.',
    'doll.costurera.joke': 'Remienda cualquier defensa.',
    'doll.caliente.rule': '×{xmult} al Mult final si lo tocas.\nSi no lo tocas en el tiro: −{penalty} de plata.',
    'doll.caliente.joke': 'Si no le pasas el balón, se ofende.',
    'doll.arquitecto.rule': '+{pts} puntos. Duplica el efecto de TODA su barra, no solo vecinos.',
    'doll.arquitecto.joke': 'Hizo los planos de la cancha. Y los de la jugada.',
    'doll.colector.rule': 'Al cobrar: +{per} de plata por cada rareza en tu mesa.\nMáximo +{max} por partido.',
    'doll.colector.joke': 'Tiene uno de cada. Y los quiere todos.',
    'doll.revancha.rule': '+{pts} puntos por contacto.\nSi perdiste el partido anterior: +{mult} Mult por contacto.',
    'doll.revancha.joke': 'No olvida. Nunca olvida.',
    'doll.justiciero.rule': 'No suma nada. Mientras esté en la mesa,\nlos malditos no hacen daño: Rambos no ve la roja.',
    'doll.justiciero.joke': 'En este barrio hay ley. Más o menos.',
    'doll.capitan.rule': 'Al empezar cada partido eliges a un muñeco de tu mesa:\nese partido su efecto vale el doble.',
    'doll.capitan.joke': 'La cinta no se presta. Se gana.',

    // ---------- marcador ----------
    'board.match': 'PARTIDO', 'board.round': 'RONDA {r}/{n}', 'board.quota': 'MARCADOR / META',
    'board.shots': 'TIROS', 'board.plata': 'PLATA', 'board.lives': 'VIDAS', 'board.boss': 'JEFE',
    'board.endless': 'SIN FIN',
    'bar.points': 'Puntos', 'bar.mult': 'Mult',
    'bar.shop': 'TIENDA DE DON CHUCHO — arma tu mesa',
    'chip.chilena': '{n}/{needed} distintas', 'chip.chilenaTouch': '(tócala)',
    'chip.fantasma': '{t} s', 'chip.fantasmaTouch': '(tócalo)',
    'chip.tendero': '+{n} de plata', 'chip.goal': '¡GOL!', 'chip.garra': 'GARRA: +{pct}% pts',
    'chip.arbitro': 'Delantera sin efectos', 'chip.base': 'Mult base ×{m}', 'chip.cacique': 'El Cacique: un tiro más si fallas', 'chip.veterano': 'El Veterano: ×{m} si lo tocas', 'chip.revancha': 'La Revancha: +{m} Mult por toque', 'chip.left': 'Faltan {n}', 'chip.walls': 'Bandas ×{m}', 'chip.wallsZero': 'Bandas no pagan',
    'wallReason.pesada': 'Tapete pesado', 'wallReason.polvora': 'Pólvora', 'wallReason.tacano': 'El Tacaño', 'chip.over': '¡Meta! Llevas +{n} para el próximo',
    'board.matchQuota': 'este partido +{q}', 'fx.carry': 'Traes +{n} del partido anterior',
    'skip': 'Saltar tiros (+{n} de plata)',

    // ---------- en la mesa ----------
    'table.goalRival': 'ARCO RIVAL', 'table.goalOwn': 'TU ARCO',
    'table.hint': 'Jala hacia atrás desde el balón y suelta',
    'table.kick': 'zona de saque: clic para mover el balón',
    'table.hint.touch': 'Pon el dedo en la mesa, jala hacia atrás y suelta',
    'table.kick.touch': 'zona de saque: toca o arrastra para mover el balón',
    'aim.goal': '¿GOL?', 'aim.own': '¡AUTOGOL!', 'aim.cancel': 'Suelta aquí para cancelar',
    'fx.best': '¡NUEVO RÉCORD!', 'fx.left': 'Faltan {n}', 'fx.almost': '¡Casi!', 'fx.over': '¡Cuota! Sobran {n}',
    'fx.goal': '¡GOOOL!', 'fx.autogol': 'AUTOGOL', 'fx.gambeta': '¡GAMBETA!', 'fx.kante': '¡KAN-TÉ!',
    'fx.gemelo': '¡GEMELO!', 'fx.comba': '¡COMBA!', 'fx.mano': '¡LA MANO!', 'fx.roja': '¡ROJA!',
    'fx.tendero': '¡TENDERO!', 'fx.quota': '¡CUOTA!', 'fx.pirlito': 'TOQUE FINO', 'fx.miss': 'Ese tiro pidió permiso.',
    'fx.levelUp': '+{n}', 'fx.signed': '¡Fichado!', 'fx.noPlata': 'Sin plata no hay muñeco. Aquí no se fía.',
    'fx.cacique': '¡EL CACIQUE TE SALVA!', 'fx.caciqueSub': 'Te regala {n} tiro más',
    'fx.gato': '¡ATAJADA DEL GATO!', 'fx.caliente': '−{n} de plata: no le pasaste el balón', 'fx.justiciero': 'EL JUSTICIERO LO PROTEGE',
    'fx.match': 'PARTIDO {n}', 'fx.quotaSub': 'Meta {q} · faltan {f}', 'fx.expelled': 'EXPULSADO',

    // ---------- conteo del tiro ----------
    'tally.points': 'Puntos', 'tally.mult': 'Mult', 'tally.final': 'PUNTAJE DEL TIRO', 'tally.skip': 'clic para acelerar', 'tally.skip.touch': 'toca para acelerar',
    'mod.garra': 'La Garra +{pct}% puntos', 'mod.rambos': 'Rambos', 'mod.chilena': 'Chilena ({n} distintas)',
    'mod.chilenaFail': 'Chilena ({n}/{needed})', 'mod.fantasma': 'El Fantasma ({t} s)',
    'mod.fantasmaFail': 'El Fantasma — tarde ({t} s)', 'mod.cp7': 'CP7', 'mod.mano': 'La Mano', 'mod.veterano': 'El Veterano (últimos tiros)', 'mod.veteranoFail': 'El Veterano — todavía no es su hora',
    'mod.madrugador': 'El Madrugador (primer tiro)', 'mod.madrugadorFail': 'El Madrugador — no fue el primero',
    'mod.tardon': 'El Tardón (último tiro)', 'mod.tardonFail': 'El Tardón — no fue el último',
    'mod.caliente': 'El Cabeza Caliente',
    'mod.goal': '¡Gol!', 'mod.noGoal': 'Sin gol', 'mod.autogol': 'Autogol',

    // ---------- fin de partido ----------
    'end.win': '¡PARTIDO GANADO!', 'end.lose': 'PARTIDO PERDIDO',
    'end.loseNote': 'Pierdes una vida. Este partido se repite.',
    'end.win.line': 'Victoria', 'end.colector.line': 'El Colector', 'end.shots.line': 'Tiros sobrantes ({n})', 'end.goals.line': 'Goles ({n})',
    'end.nothing': 'Sin victoria no hay plata. Los goles sí pagan.',
    'end.total': 'Total', 'end.toShop': 'A la tienda de Don Chucho ▶',

    // ---------- jefes ----------
    'boss.tag': 'PARTIDO DE JEFE', 'boss.quota': 'Meta', 'boss.left': 'Te faltan', 'boss.go': '¡A jugar!',
    'boss.gigante.name': 'EL GIGANTE', 'boss.gigante.rule': 'El portero rival mide el doble de ancho.',
    'boss.barra.name': 'BARRA LOCA', 'boss.barra.rule': 'La defensa rival no se queda quieta.',
    'boss.arbitro.name': 'EL ÁRBITRO', 'boss.arbitro.rule': 'Tu delantera choca, pero no aplica efectos.',
    'boss.final': 'JEFE FINAL',
    'legend.title': '¡Ganaste un legendario!', 'legend.toBench': 'Va directo a tu banca.',
    'legend.dup': 'Ya lo tienes: +{n} de plata.', 'legend.full': 'La banca está llena. ¿Qué descartas?',
    'legend.discard': 'Descartar', 'legend.ok': 'Seguir ▶',
    'legend.capfull': 'Solo caben {n} Legendarios. ¿A cuál le das las gracias?',
    'legend.swap': 'Soltarlo y quedarme con el nuevo', 'legend.reject': 'Dejar el nuevo. Me quedo con los míos.',
    'legend.pick': 'El jefe final te deja escoger uno:',

    // ---------- Don Chucho (voz del tendero pícaro) ----------
    'chucho.first': '¡Siga, mijo! Aquí no se fía, pero se goza.',
    'chucho.lost': 'Tranquilo, mijo. Cómase esta empanada y vuelva.',
    'chucho.boss': '¿Le ganó al jefe? ¡Eso merece fiesta!',
    'chucho.loyal': 'Visita número {n}. Usted ya es de la casa.',
    'chucho.sleep': '¡Ay! No estaba dormido. Estaba pensando.',
    'chucho.endless': '¿Usted no se cansa? A mí me gusta la gente así.',
    'chucho.rich': 'Uy, llegó con plata. Pase, pase, siga.',
    'chucho.poor': 'Con esa plata le alcanza para mirar.',
    'chucho.monedas': 'Una, dos, tres… todo cuadra. Casi siempre.',
    'chucho.tinto': 'Un tintico y a vender. ¿Qué va a llevar?',
    'chucho.periodico': 'Salió en el periódico. Bueno, casi.',
    'chucho.radio': 'Esa cumbia está buena. ¿Qué le muestro?',
    'chucho.escoba': 'Barro yo, cobra usted. ¡No, al revés!',
    'chucho.fiado': 'FIADO NO', 'chucho.record': 'RÉCORD {n}',
    'chucho.news.default': 'EL CLARÍN DEL BARRIO', 'chucho.news.big': '¡TIRAZO EN EL BARRIO!',
    'chucho.news.streak': '¡{n} PARTIDOS AL HILO!',
    'captain.title': 'EL CAPITÁN', 'captain.pick': '¿A quién le pones la cinta este partido?',
    'captain.none': 'Sin cinta', 'captain.tag': 'Capitán: efecto ×2',

    // ---------- tienda ----------
    'shop.title': 'TIENDA DE DON CHUCHO',
    'shop.welcome': '¡Siga, mijo! Lo barato sale caro… y lo caro también.',
    'shop.hint': 'Arrastra un muñeco a la mesa o a la banca.\nEn la mesa puedes moverlos.',
    'shop.hint.touch': 'Toca un muñeco y luego un hueco de la mesa.\nLos de la mesa también se pueden arrastrar.',
    'shop.reroll': 'Cambiar la vitrina ({n})', 'shop.sell': 'Vender', 'shop.selling': 'Vendiendo… clic en la mesa', 'shop.selling.touch': 'Vendiendo… toca la mesa',
    'shop.next': 'Siguiente partido ▶', 'shop.nextInfo': 'Próximo: partido {m}, meta {q}. Te faltan {f} en {s} tiros.',
    'shop.sold': 'Fichado ✓', 'shop.toBench': 'A la banca', 'shop.bench': 'BANCA',
    'shop.benchEmpty': 'Vacía', 'shop.benchFull': 'La banca está llena.', 'shop.noSlot': 'Ese hueco está ocupado.',
    'shop.sellFor': 'Vender +{n}', 'shop.discard': 'Descartar', 'shop.table': 'TU MESA',
    'shop.tableEmpty': 'Vacía. Gana plata y ficha muñecos.', 'shop.catalog': 'CATÁLOGO',

    // ---------- pantallas finales ----------
    'final.win': '¡GOOOOL! ¡Que se caiga el barrio!', 'final.winSub': 'Venciste al jefe final.',
    'final.lose': 'Se acabó el picadito.', 'final.loseSub': 'La revancha es ya mismo.',
    'final.won': 'Partidos ganados', 'final.score': 'Marcador final', 'final.best': 'Mejor tiro', 'final.goals': 'Goles',
    'final.fav': 'Muñeco más usado', 'final.none': '—', 'final.reached': 'Partido alcanzado',
    'final.continue': 'Seguir jugando', 'final.rematch': 'La revancha es ya mismo',

    // ---------- cómo jugar ----------
    'help.title': 'Cómo jugar',
    'help.1': 'Jala hacia atrás desde el balón y suelta.',
    'help.1.touch': 'Jala hacia atrás desde cualquier parte de la mesa y suelta.',
    'help.2': 'Puntaje = Puntos × Mult. Gol ×{goal}; sin gol ×{nogoal}.',
    'help.3': 'Llega a la meta en {s} tiros. Cada banda: +{wall}.',
    'help.5': 'Lo que pases de la meta se guarda para el próximo partido.',
    'help.4': 'El autogol no puntúa. Tres vidas por picadito.',

    // ---------- jefes nuevos y mesas especiales ----------
    'boss.niebla.name': 'LA NIEBLA', 'boss.niebla.rule': 'No hay guía de tiro. Apunta de memoria.',
    'boss.tacano.name': 'EL TACAÑO', 'boss.tacano.rule': 'Las bandas no pagan puntos. Solo tus muñecos.',
    'boss.torcida.name': 'CANCHA TORCIDA', 'boss.torcida.rule': 'La mesa está torcida: el balón se va de lado.',
    'board.mod': 'MESA',
    'mod.encerada.name': 'MESA ENCERADA', 'mod.encerada.rule': 'El balón corre más y tarda en frenar.',
    'mod.goma.name': 'BANDAS DE GOMA', 'mod.goma.rule': 'Las bandas rebotan sin perder fuerza.',
    'mod.pesada.name': 'TAPETE PESADO', 'mod.pesada.rule': 'El balón frena antes, pero cada banda paga doble.',

    // ---------- mostrador de Don Chucho (consumibles) ----------
    'shop.counter': 'MOSTRADOR', 'shop.pocket': 'Bolsillo', 'shop.pocketFull': 'El bolsillo está lleno. Úsalo en la mesa.',
    'shop.new': '¡NUEVO!',
    'shop.noSell': 'Este no se suelta. Los Legendarios se quedan.', 'shop.noSellShort': '🔒 No se suelta',
    'shop.legCap': 'Legendarios: {n} de {m}',
    'item.tiza.name': 'Tiza', 'item.tiza.rule': '+1 tiro en este partido.', 'item.tiza.used': '+1 TIRO',
    'item.empanada.name': 'Empanada', 'item.empanada.rule': '+2 Mult base en tu próximo tiro.', 'item.empanada.used': '¡EMPANADA! +2 MULT',
    'item.iman.name': 'Imán', 'item.iman.rule': 'La guía muestra dos rebotes en tu próximo tiro.', 'item.iman.used': 'IMÁN: 2 REBOTES',
    'item.pito.name': 'Pito', 'item.pito.rule': 'Tu próximo tiro no puede ser autogol.', 'item.pito.used': 'ARCO CERRADO',
    'item.gaseosa.name': 'Gaseosa', 'item.gaseosa.rule': 'La plata de este partido sale doble.', 'item.gaseosa.used': '¡GASEOSA! PLATA ×2',
    'item.talco.name': 'Talco', 'item.talco.rule': 'Tu próximo tiro rueda mucho más lejos.', 'item.talco.used': 'TALCO: EL BALÓN SE DESLIZA',
    'item.polvora.name': 'Pólvora', 'item.polvora.rule': 'En tu próximo tiro, las bandas pagan doble.', 'item.polvora.used': '¡PÓLVORA! BANDAS ×2',
    'item.radio.name': 'La Radio', 'item.radio.rule': '+1 al Mult base en todos los tiros del partido.', 'item.radio.used': 'RADIO PRENDIDA: +1 MULT',
    'item.alcancia.name': 'La Alcancía', 'item.alcancia.rule': 'Todo el picadito: +2 de plata al terminar cada partido.', 'item.alcancia.used': 'ALCANCÍA: +2 POR PARTIDO',
    'item.banquito.name': 'El Banquito', 'item.banquito.rule': 'Todo el picadito: un espacio más en la banca.', 'item.banquito.used': 'UN PUESTO MÁS EN LA BANCA',
    'item.vitrina.name': 'La Vitrina Grande', 'item.vitrina.rule': 'Todo el picadito: cabe un Legendario más. Se compra una sola vez.', 'item.vitrina.used': 'VITRINA GRANDE: CUPO +1',
    'item.when.shot': 'un tiro', 'item.when.match': 'un partido', 'item.when.run': 'todo el picadito',

    // ---------- progreso: desbloqueos y canchas ----------
    'unlock.title': '¡NUEVO MUÑECO!',
    'unlock.kante': 'Termina tu primer picadito.', 'unlock.pirlito': 'Haz 12 contactos en un tiro.',
    'unlock.rambos': 'Llega a ×6 de Mult en un tiro.', 'unlock.garra': 'Gana un partido con tu último tiro.',
    'unlock.pesi': 'Mete 3 goles en un partido.', 'unlock.cp7': 'Haz un tiro de 3.000 o más.',
    'unlock.bekam': 'Vence a tu primer jefe.', 'unlock.cazagoles': 'Gana el partido 6.',
    'unlock.cambista': 'Mete tu primer gol.', 'unlock.antena': 'Haz 6 contactos en un tiro.',
    'unlock.madrugador': 'Gana un partido con tu primer tiro.', 'unlock.tardon': 'Gana un partido con tu último tiro.',
    'unlock.gato': 'Gana un partido en la cancha Final.', 'unlock.costurera': 'Haz 8 contactos en un tiro.',
    'unlock.caliente': 'Termina un tiro con Mult 0.', 'unlock.arquitecto': 'Gana un picadito completo.',
    'unlock.colector': 'Haz un tiro de 5.000 o más.', 'unlock.revancha': 'Pierde un partido.',
    'unlock.justiciero': 'Gana un picadito en la cancha Barrio o más difícil.',
    'unlock.capitan': 'Gana un picadito completo: el jefe final te lo ofrecerá.',
    'album.title': 'ÁLBUM ({n}/{m})', 'album.legend': 'Los legendarios se ganan venciendo jefes.',
    'level.pick': 'CANCHA DEL PRÓXIMO PICADITO', 'level.opened': 'Se abrió una cancha nueva: {n}.',
    'level.1.name': 'Potrero', 'level.1.rule': 'Las reglas de siempre.',
    'level.2.name': 'Barrio', 'level.2.rule': 'Cuotas 20% más altas.',
    'level.3.name': 'Liga', 'level.3.rule': 'Un tiro menos por partido.',
    'level.4.name': 'Clásico', 'level.4.rule': 'Los jefes piden todavía más.',
    'level.5.name': 'Final', 'level.5.rule': 'Perder no paga goles. Todo cuesta +1.',

    // ---------- primer picadito guiado ----------
    'tour.badge': 'CÓMO SE JUEGA', 'tour.skip': 'Saltar tutorial', 'tour.next': 'Siguiente ▶', 'tour.go': '¡A jugar!',
    'tour.demo.go': '¡Sale el tiro!', 'tour.demo.cancel': 'Cancelado: apunta otra vez',
    'tour.aim.0.title': 'Así se tira',
    'tour.aim.0': 'Jala hacia atrás desde el balón y suelta.\nMientras más estiras, más fuerte sale.\nLa línea muestra el camino hasta el primer rebote.',
    'tour.aim.0.touch': 'Pon el dedo en la mesa, jala hacia atrás y suelta.\nMientras más estiras, más fuerte sale.\nLa línea muestra el camino hasta el primer rebote.',
    'tour.aim.1.title': '¿Te arrepentiste?',
    'tour.aim.1': 'Vuelve dentro del círculo pequeño y suelta.\nNo se tira: mueve el balón y apunta otra vez.',
    'tour.bounce.0.title': 'Puntos × Mult',
    'tour.bounce.0': 'Cada banda y cada muñeco suman puntos.\nSi termina en gol, el Mult sube ×1.5.\nLo que pases de la meta se guarda para después.',
    'tour.shop.0.title': 'La tienda de Don Chucho',
    'tour.shop.0': 'Arrastra un muñeco a un hueco de la mesa.\nCuando el balón lo toque, hace su efecto.\nEl mostrador vende ayudas de un solo uso.',
    'tour.shop.0.touch': 'Toca un muñeco y luego un hueco de la mesa.\nCuando el balón lo toque, hace su efecto.\nEl mostrador vende ayudas de un solo uso.',
    'tour.walls2.0.title': 'Bandas al doble',
    'tour.walls2.0': 'Una banda vale siempre 15.\nAhora pagan 30: míralo en el chip y en la etiqueta ×2.',
    'tour.mod.0.title': 'Mesa especial',
    'tour.mod.0': 'Este partido la mesa cambia una regla.\nEl chip de arriba te dice cuál.',
    'tour.items.0.title': 'El mostrador',
    'tour.items.0': 'Don Chucho vende ayudas de un solo uso.\nVan a tu bolsillo: úsalas con su botón antes de tirar.',
    'tour.legend.0.title': 'Tus Legendarios',
    'tour.legend.0': 'Los Legendarios no se venden ni se descartan.\nCaben 2 a la vez; la Vitrina Grande da un cupo más.',
    'tour.demo.mod': 'Mira el chip de arriba', 'tour.demo.items': 'Tócalo antes de tirar',
    'tour.table.0.title': 'Tu mesa ya juega',
    'tour.table.0': 'Busca que el balón toque a tus muñecos.\nPasa el ratón encima para ver qué hace cada uno.',
    'tour.table.0.touch': 'Busca que el balón toque a tus muñecos.\nToca uno para ver qué hace.',
    'opt.tutorial': 'Repetir el tutorial', 'board.help': 'Cómo se juega',
    'opt.fullscreen': 'Pantalla completa', 'opt.debug': 'Panel de pruebas',
    'dock.shop': 'Tienda ▲', 'dock.go': 'Jugar ▶', 'dock.table': 'Ver la mesa ▼', 'dock.team': 'Tu equipo y álbum ▲', 'dock.close': 'Cerrar ▼',
    'dock.place': 'Toca dónde va {n}', 'dock.cancel': 'Cancelar', 'dock.bench': 'Banca',
    'rotate.title': 'Gira el celular', 'rotate.text': 'GOLÍN se juega con el celular vertical.',

    // ---------- opciones ----------
    'opt.title': 'Opciones', 'opt.button': 'Opciones', 'opt.shake': 'Temblor de pantalla',
    'opt.flashes': 'Reducir destellos y partículas', 'opt.fast': 'Acelerar animaciones de puntuación',
    'opt.colorblind': 'Modo daltónico', 'opt.master': 'Volumen general', 'opt.music': 'Música y ambiente',
    'opt.sfx': 'Efectos', 'opt.text': 'Tamaño de texto', 'opt.close': 'Listo',
  };

  const LANGS = { es };
  let LANG = 'es';

  /* En pantallas táctiles, si existe 'clave.touch' se usa esa versión ("toca" en vez de "clic"). */
  function t(key, params) {
    const L = LANGS[LANG] || LANGS.es;
    let s = (GOLIN.touch && (L[key + '.touch'] || LANGS.es[key + '.touch'])) || L[key] || LANGS.es[key];
    if (s === undefined) return key;
    if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
    return s;
  }

  GOLIN.STRINGS = LANGS;
  GOLIN.t = t;
  GOLIN.setLang = l => { if (LANGS[l]) LANG = l; };
  if (typeof module !== 'undefined' && module.exports) module.exports = { STRINGS: LANGS, t };
})(typeof globalThis !== 'undefined' ? globalThis : this);
