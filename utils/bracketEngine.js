/**
 * utils/bracketEngine.js
 */

function generarEstructuraCompleta(primeros, segundos) {
    // 1. Orden de "Primeros" para que Seed 1 y Seed 2 solo se vean en la final (Estilo Grand Slam)
    const ordenTenis = [0, 7, 4, 3, 1, 6, 5, 2]; 
    const octavos = [];
    const segundosDisponibles = [...segundos];

    // 2. Generar Octavos con restricciones de grupo
    for (let i = 0; i < ordenTenis.length; i++) {
        const primero = primeros[ordenTenis[i]];
        // Filtramos segundos que no sean del mismo grupo que el primero actual
        let opciones = segundosDisponibles.filter(s => s.grupoOrigen !== primero.grupoOrigen);
        
        // Si hay un bloqueo (el único segundo disponible es del mismo grupo), reiniciamos el sorteo
        if (opciones.length === 0) return generarEstructuraCompleta(primeros, segundos); 

        const eleccion = opciones[Math.floor(Math.random() * opciones.length)];
        // Lo eliminamos de la lista de disponibles usando su ID
        const indexARemover = segundosDisponibles.findIndex(s => s.id === eleccion.id);
        segundosDisponibles.splice(indexARemover, 1);

        octavos.push({
            partidoId: `OF${i + 1}`,
            jugador1Id: primero.id,
            jugador1Nick: primero.nick,
            jugador2Id: eleccion.id,
            jugador2Nick: eleccion.nick,
            resultado: null,
            va_a: `CF${Math.floor(i / 2) + 1}`, 
            posicion_en_siguiente: (i % 2 === 0) ? 'jugador1' : 'jugador2'
        });
    }

    // 3. Estructura de Cuartos, Semis y Final (vacíos)
    const cuartos = [
        { partidoId: 'CF1', jugador1Id: null, jugador2Id: null, va_a: 'SF1', posicion_en_siguiente: 'jugador1' },
        { partidoId: 'CF2', jugador1Id: null, jugador2Id: null, va_a: 'SF1', posicion_en_siguiente: 'jugador2' },
        { partidoId: 'CF3', jugador1Id: null, jugador2Id: null, va_a: 'SF2', posicion_en_siguiente: 'jugador1' },
        { partidoId: 'CF4', jugador1Id: null, jugador2Id: null, va_a: 'SF2', posicion_en_siguiente: 'jugador2' }
    ];

    const semis = [
        { partidoId: 'SF1', jugador1Id: null, jugador2Id: null, va_a: 'FINAL', posicion_en_siguiente: 'jugador1' },
        { partidoId: 'SF2', jugador1Id: null, jugador2Id: null, va_a: 'FINAL', posicion_en_siguiente: 'jugador2' }
    ];

    const final = [
        { partidoId: 'FINAL', jugador1Id: null, jugador2Id: null, resultado: null }
    ];

    return { octavos, cuartos, semis, final };
}

module.exports = { generarEstructuraCompleta };