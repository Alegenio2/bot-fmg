// utils/actualizarEliminatorias.js
const { guardarTorneo } = require('./guardarTorneo.js');

/**
 * Actualiza automáticamente las eliminatorias de un torneo
 * a medida que se completan los resultados de cada ronda.
 * @param {Object} torneo - Objeto del torneo cargado del JSON
 */
async function actualizarEliminatorias(torneo, filePath, interaction = null) {
  if (!torneo.eliminatorias || torneo.eliminatorias.length === 0) return;

  for (let r = 0; r < torneo.eliminatorias.length - 1; r++) {
    const rondaActual = torneo.eliminatorias[r];
    const rondaSiguiente = torneo.eliminatorias[r + 1];

    // Recorremos los partidos de la ronda actual
    const ganadores = [];
    for (const partido of rondaActual.partidos) {
      if (!partido.resultado) continue; // aún no hay resultado
      // Determinar ganador
      let ganador = null;
      if (partido.resultado[partido.equipo1Id] > partido.resultado[partido.equipo2Id]) {
        ganador = { id: partido.equipo1Id, nombre: partido.equipo1Nombre };
      } else if (partido.resultado[partido.equipo2Id] > partido.resultado[partido.equipo1Id]) {
        ganador = { id: partido.equipo2Id, nombre: partido.equipo2Nombre };
      } else {
        // empate: no avanzamos hasta que se defina (opcional: definir reglas de desempate)
        continue;
      }
      ganadores.push(ganador);
    }

    // Si no todos los partidos tienen ganador, no avanzamos
    if (ganadores.length !== rondaActual.partidos.length) continue;

    // Actualizamos los partidos de la siguiente ronda
    for (let i = 0; i < rondaSiguiente.partidos.length; i++) {
      const p = rondaSiguiente.partidos[i];
      const eq1 = ganadores[i * 2];
      const eq2 = ganadores[i * 2 + 1];
      if (eq1) {
        p.equipo1Id = eq1.id;
        p.equipo1Nombre = eq1.nombre;
      }
      if (eq2) {
        p.equipo2Id = eq2.id;
        p.equipo2Nombre = eq2.nombre;
      }
    }
  }

  // Guardar torneo actualizado
  await guardarTorneo(torneo, filePath, interaction);
}

module.exports = { actualizarEliminatorias };
