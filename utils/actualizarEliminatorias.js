// utils/actualizarEliminatorias.js
const { guardarTorneo } = require("./guardarTorneo.js");

/**
 * Devuelve los 2 mejores de cada grupo
 */
function obtenerClasificadosDeGrupos(torneo) {
  if (!torneo.rondas_grupos) return [];

  const clasificados = [];

  for (const grupo of torneo.rondas_grupos) {
    const tabla = {};

    // Inicializamos
    for (const ronda of grupo.partidos) {
      for (const p of ronda.partidos) {
        tabla[p.equipo1Id] = { id: p.equipo1Id, nombre: p.equipo1Nombre, pts: 0 };
        tabla[p.equipo2Id] = { id: p.equipo2Id, nombre: p.equipo2Nombre, pts: 0 };
      }
    }

    // Sumamos puntos
    for (const ronda of grupo.partidos) {
      for (const p of ronda.partidos) {
        if (!p.resultado) continue;

        const eq1 = p.equipo1Nombre;
        const eq2 = p.equipo2Nombre;

        const g1 = p.resultado[eq1];
        const g2 = p.resultado[eq2];

        if (g1 > g2) tabla[p.equipo1Id].pts += 3;
        else if (g2 > g1) tabla[p.equipo2Id].pts += 3;
      }
    }

    // Ordenamos por puntos
    const orden = Object.values(tabla).sort((a, b) => b.pts - a.pts);

    // Primeros 2 del grupo
    clasificados.push(orden[0], orden[1]);
  }

  return clasificados;
}

/**
 * Genera estructura de semifinales
 */
function generarSemifinales(clasificados) {
  return [
    {
      ronda: "Semifinal",
      partidos: [
        {
          equipo1Id: clasificados[0].id,
          equipo1Nombre: clasificados[0].nombre,
          equipo2Id: clasificados[3].id,
          equipo2Nombre: clasificados[3].nombre,
          resultado: null
        },
        {
          equipo1Id: clasificados[1].id,
          equipo1Nombre: clasificados[1].nombre,
          equipo2Id: clasificados[2].id,
          equipo2Nombre: clasificados[2].nombre,
          resultado: null
        }
      ]
    }
  ];
}

/**
 * Genera la final cuando las semifinales ya tienen ganador
 */
function generarFinal(ganadoresSemi) {
  return {
    ronda: "Final",
    partidos: [
      {
        equipo1Id: ganadoresSemi[0].id,
        equipo1Nombre: ganadoresSemi[0].nombre,
        equipo2Id: ganadoresSemi[1].id,
        equipo2Nombre: ganadoresSemi[1].nombre,
        resultado: null
      }
    ]
  };
}

async function actualizarEliminatorias(torneo, filePath, interaction = null) {
  // Si no existen eliminatorias, crear array
  if (!torneo.eliminatorias) torneo.eliminatorias = [];

  // ----------------------------------------------------
  // 1) GENERAR SEMIFINALES SI ESTÁN VACÍAS
  // ----------------------------------------------------
  const semi = torneo.eliminatorias.find(r => r.ronda === "Semifinal");

  const clasificados = obtenerClasificadosDeGrupos(torneo);

  if (clasificados.length === 4) {
    if (!semi || semi.partidos.length === 0) {
      torneo.eliminatorias = generarSemifinales(clasificados);

      // Si ya existía la final, la mantenemos
      const finalExistente = torneo.eliminatorias.find(r => r.ronda === "Final");
      if (finalExistente) torneo.eliminatorias.push(finalExistente);

      await guardarTorneo(torneo, filePath, interaction);
      return;
    }
  }

  // ----------------------------------------------------
  // 2) GENERAR FINAL CUANDO LAS SEMIS YA TIENEN GANADOR
  // ----------------------------------------------------
  const semifinales = torneo.eliminatorias.find(r => r.ronda === "Semifinal");
  const final = torneo.eliminatorias.find(r => r.ronda === "Final");

  if (semifinales && semifinales.partidos.length === 2) {
    const ganadoresSemi = [];

    for (const p of semifinales.partidos) {
      if (!p.resultado) return; // falta resultado

      const eq1 = p.equipo1Nombre;
      const eq2 = p.equipo2Nombre;
      const g1 = p.resultado[eq1];
      const g2 = p.resultado[eq2];

      if (g1 > g2) ganadoresSemi.push({ id: p.equipo1Id, nombre: eq1 });
      else ganadoresSemi.push({ id: p.equipo2Id, nombre: eq2 });
    }

    if (ganadoresSemi.length === 2 && (!final || final.partidos.length === 0)) {
      // Regeneramos final
      const finalNueva = generarFinal(ganadoresSemi);

      // Eliminamos final vieja si existía
      torneo.eliminatorias = torneo.eliminatorias.filter(r => r.ronda !== "Final");

      // Agregamos final nueva
      torneo.eliminatorias.push(finalNueva);

      await guardarTorneo(torneo, filePath, interaction);
      return;
    }
  }

  // ----------------------------------------------------
  // 3) AVANCE NORMAL ENTRE RONDAS (por si agregas 3º/4º puesto)
  // ----------------------------------------------------
  for (let r = 0; r < torneo.eliminatorias.length - 1; r++) {
    const rondaActual = torneo.eliminatorias[r];
    const rondaSiguiente = torneo.eliminatorias[r + 1];

    const ganadores = [];

    for (const partido of rondaActual.partidos) {
      if (!partido.resultado) continue;

      const eq1 = partido.equipo1Nombre;
      const eq2 = partido.equipo2Nombre;

      const g1 = partido.resultado[eq1];
      const g2 = partido.resultado[eq2];

      if (g1 > g2) ganadores.push({ id: partido.equipo1Id, nombre: eq1 });
      else ganadores.push({ id: partido.equipo2Id, nombre: eq2 });
    }

    if (ganadores.length !== rondaActual.partidos.length) continue;

    for (let i = 0; i < rondaSiguiente.partidos.length; i++) {
      const eq1 = ganadores[i * 2];
      const eq2 = ganadores[i * 2 + 1];

      if (eq1) {
        rondaSiguiente.partidos[i].equipo1Id = eq1.id;
        rondaSiguiente.partidos[i].equipo1Nombre = eq1.nombre;
      }

      if (eq2) {
        rondaSiguiente.partidos[i].equipo2Id = eq2.id;
        rondaSiguiente.partidos[i].equipo2Nombre = eq2.nombre;
      }
    }
  }

  await guardarTorneo(torneo, filePath, interaction);
}

module.exports = { actualizarEliminatorias };


