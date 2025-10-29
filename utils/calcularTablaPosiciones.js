// utils/calcularTablaPosiciones.js
function calcularTablaPosiciones(torneo) {
  const tablas = {};

  for (const infoGrupo of torneo.rondas_grupos || []) {
    const claveGrupo = infoGrupo.grupo ?? "Desconocido";
    if (!tablas[claveGrupo]) tablas[claveGrupo] = {};

    for (const rondaObj of infoGrupo.partidos || []) {
      for (const partido of rondaObj.partidos || []) {
        const { equipo1Id, equipo1Nombre, equipo2Id, equipo2Nombre, resultado } = partido;

        if (!equipo1Id || !equipo2Id) continue;

        // Inicializar equipos
        if (!tablas[claveGrupo][equipo1Id]) tablas[claveGrupo][equipo1Id] = crearEquipo(equipo1Id, equipo1Nombre);
        if (!tablas[claveGrupo][equipo2Id]) tablas[claveGrupo][equipo2Id] = crearEquipo(equipo2Id, equipo2Nombre);

        if (!resultado) continue;

        // Obtener scores (sets ganados)
        const score1 = obtenerScore(resultado, equipo1Nombre, equipo1Id);
        const score2 = obtenerScore(resultado, equipo2Nombre, equipo2Id);
        if (!Number.isFinite(score1) || !Number.isFinite(score2)) continue;

        const equipo1 = tablas[claveGrupo][equipo1Id];
        const equipo2 = tablas[claveGrupo][equipo2Id];

        equipo1.jugados++;
        equipo2.jugados++;

        equipo1.setsGanados += score1;
        equipo1.setsPerdidos += score2;
        equipo2.setsGanados += score2;
        equipo2.setsPerdidos += score1;

        // --- Lógica de puntos personalizada ---
        if (score1 === 2 && score2 === 0) {
          equipo1.ganados++; equipo2.perdidos++;
          equipo1.puntos += 2;
        } else if (score1 === 2 && score2 === 1) {
          equipo1.ganados++; equipo2.perdidos++;
          equipo1.puntos += 2;
          equipo2.puntos += 1;
        } else if (score2 === 2 && score1 === 0) {
          equipo2.ganados++; equipo1.perdidos++;
          equipo2.puntos += 2;
        } else if (score2 === 2 && score1 === 1) {
          equipo2.ganados++; equipo1.perdidos++;
          equipo2.puntos += 2;
          equipo1.puntos += 1;
        } else if (score1 === score2) {
          // Empate (por si hay formato 1-1)
          equipo1.puntos += 1;
          equipo2.puntos += 1;
        }
      }
    }
  }

  // Calcular diferencia y ordenar
  const resultadoFinal = {};
  for (const [grupo, equiposObj] of Object.entries(tablas)) {
    const arr = Object.entries(equiposObj).map(([id, d]) => ({
      id,
      nombre: d.nombre,
      jugados: d.jugados,
      ganados: d.ganados,
      perdidos: d.perdidos,
      setsGanados: d.setsGanados,
      setsPerdidos: d.setsPerdidos,
      puntos: d.puntos,
      diferencia: d.setsGanados - d.setsPerdidos
    }));

    arr.sort((a, b) =>
      b.puntos - a.puntos ||
      b.diferencia - a.diferencia ||
      b.setsGanados - a.setsGanados
    );

    resultadoFinal[grupo] = arr;
  }

  return resultadoFinal;
}

// Helpers
function crearEquipo(id, nombre) {
  return {
    id,
    nombre: nombre ?? id,
    jugados: 0,
    ganados: 0,
    perdidos: 0,
    setsGanados: 0,
    setsPerdidos: 0,
    puntos: 0
  };
}

function obtenerScore(resultadoObj, equipoNombre, equipoId) {
  if (!resultadoObj || typeof resultadoObj !== 'object') return NaN;
  if (resultadoObj.hasOwnProperty(equipoNombre)) return Number(resultadoObj[equipoNombre]);
  if (resultadoObj.hasOwnProperty(equipoId)) return Number(resultadoObj[equipoId]);
  return NaN;
}

module.exports = { calcularTablaPosiciones };

