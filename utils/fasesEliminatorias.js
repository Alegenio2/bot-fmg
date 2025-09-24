// utils/fasesEliminatorias.js

/**
 * Calcula la tabla de un grupo, solo con jugadores del grupo
 * Ignora partidos cuyos jugadores no estén en participantes
 */
function calcularTablaGrupo(participantes, partidos) {
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,
    ganados: 0,
    perdidos: 0,
    pendiente: false, // flag para indicar si hay partidos sin jugar
  }));

  for (const partido of partidos) {
    const [id1, id2] = [partido.jugador1Id, partido.jugador2Id];
    const p1 = tabla.find(t => t.id === id1);
    const p2 = tabla.find(t => t.id === id2);

    // 🔹 Ignorar partidos cuyos jugadores no estén en el grupo
    if (!p1 || !p2) continue;

    if (!partido.resultado) {
      p1.pendiente = true;
      p2.pendiente = true;
      continue;
    }

    const score1 = partido.resultado[id1] ?? 0;
    const score2 = partido.resultado[id2] ?? 0;

    p1.puntos += score1;
    p2.puntos += score2;

    if (score1 > score2) {
      p1.ganados++;
      p2.perdidos++;
    } else if (score2 > score1) {
      p2.ganados++;
      p1.perdidos++;
    }
  }

  // Ordenar por puntos > diferencia victorias > nombre
  tabla.sort((a, b) =>
    b.puntos - a.puntos ||
    (b.ganados - b.perdidos) - (a.ganados - a.perdidos) ||
    a.nombre.localeCompare(b.nombre)
  );

  return tabla;
}

/**
 * Actualiza automáticamente los partidos de semifinales según los resultados de grupos
 */
function actualizarSemifinales(liga) {
  if (liga.modo !== "grupos_final" || !liga.grupos) return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  if (!semifinales) return liga;

  // Todos los partidos de fase de grupos
  const partidosRondas = liga.jornadas
    .filter(j => typeof j.ronda === "number")
    .flatMap(j => j.partidos);

  const tablaA = calcularTablaGrupo(liga.grupos.A, partidosRondas);
  const tablaB = calcularTablaGrupo(liga.grupos.B, partidosRondas);

  const clasificadosA = tablaA.filter(t => !t.pendiente).slice(0, 2);
  const clasificadosB = tablaB.filter(t => !t.pendiente).slice(0, 2);

  if (clasificadosA.length < 2 || clasificadosB.length < 2) {
    // partidos pendientes, no llenar semifinales
    return liga;
  }

  // Semifinal 1: A1 vs B2
  semifinales.partidos[0].jugador1Id = clasificadosA[0].id;
  semifinales.partidos[0].jugador2Id = clasificadosB[1].id;

  // Semifinal 2: B1 vs A2
  semifinales.partidos[1].jugador1Id = clasificadosB[0].id;
  semifinales.partidos[1].jugador2Id = clasificadosA[1].id;

  return liga;
}

/**
 * Actualiza automáticamente los partidos de final según resultados de semifinales
 */
function actualizarFinal(liga) {
  if (liga.modo !== "grupos_final") return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  const final = liga.jornadas.find(j => j.ronda === "Final");

  if (!semifinales || !final) return liga;

  const [semi1, semi2] = semifinales.partidos;

  // Semifinal 1
  if (semi1.resultado) {
    const jugadores = Object.keys(semi1.resultado).filter(id => /^\d+$/.test(id));
    if (jugadores.length === 2) {
      const idGanador = jugadores.reduce((a, b) =>
        semi1.resultado[a] > semi1.resultado[b] ? a : b
      );
      final.partidos[0].jugador1Id = idGanador;
    }
  }

  // Semifinal 2
  if (semi2.resultado) {
    const jugadores = Object.keys(semi2.resultado).filter(id => /^\d+$/.test(id));
    if (jugadores.length === 2) {
      const idGanador = jugadores.reduce((a, b) =>
        semi2.resultado[a] > semi2.resultado[b] ? a : b
      );
      final.partidos[0].jugador2Id = idGanador;
    }
  }

  return liga;
}

module.exports = {
  actualizarSemifinales,
  actualizarFinal,
};

