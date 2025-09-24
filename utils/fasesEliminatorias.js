// utils/fasesEliminatorias.js

/**
 * Calcula la tabla de un grupo a partir de sus participantes y partidos jugados.
 */
function calcularTablaGrupo(participantes, partidos) {
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,
    ganados: 0,
    perdidos: 0,
    diferencia: 0,
    pendiente: false, // flag para indicar si aún tiene partidos sin jugar
  }));

  for (const partido of partidos) {
    const [id1, id2] = [partido.jugador1Id, partido.jugador2Id];
    const p1 = tabla.find(t => t.id === id1);
    const p2 = tabla.find(t => t.id === id2);

    // si alguno de los jugadores no pertenece al grupo, ignorar este partido
    if (!p1 || !p2) continue;

    if (!partido.resultado) {
      // marcar como pendiente si no hay resultado
      p1.pendiente = true;
      p2.pendiente = true;
      continue;
    }

    const score1 = partido.resultado[id1] ?? 0;
    const score2 = partido.resultado[id2] ?? 0;

    if (score1 > score2) {
      p1.ganados++;
      p2.perdidos++;
      p1.puntos += 3;
    } else if (score2 > score1) {
      p2.ganados++;
      p1.perdidos++;
      p2.puntos += 3;
    } else {
      // empate
      p1.puntos += 1;
      p2.puntos += 1;
    }

    // actualizar diferencia
    p1.diferencia = p1.ganados - p1.perdidos;
    p2.diferencia = p2.ganados - p2.perdidos;
  }

  // ordenar por puntos > diferencia > nombre
  tabla.sort((a, b) =>
    b.puntos - a.puntos ||
    b.diferencia - a.diferencia ||
    a.nombre.localeCompare(b.nombre)
  );

  return tabla;
}

/**
 * Genera y actualiza las semifinales de la liga.
 */
function actualizarSemifinales(liga) {
  if (liga.modo !== "grupos_final" || !liga.grupos) return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  if (!semifinales) return liga;

  // Partidos de Grupo A
  const partidosGrupoA = liga.jornadas
    .filter(j => typeof j.ronda === "number")
    .flatMap(j => j.partidos)
    .filter(p =>
      liga.grupos.A.some(x => x.id === p.jugador1Id || x.id === p.jugador2Id)
    );

  // Partidos de Grupo B
  const partidosGrupoB = liga.jornadas
    .filter(j => typeof j.ronda === "number")
    .flatMap(j => j.partidos)
    .filter(p =>
      liga.grupos.B.some(x => x.id === p.jugador1Id || x.id === p.jugador2Id)
    );

  const tablaA = calcularTablaGrupo(liga.grupos.A, partidosGrupoA);
  const tablaB = calcularTablaGrupo(liga.grupos.B, partidosGrupoB);

  // solo clasificar jugadores que no tengan partidos pendientes
  const clasificadosA = tablaA.filter(t => !t.pendiente).slice(0, 2);
  const clasificadosB = tablaB.filter(t => !t.pendiente).slice(0, 2);

  if (clasificadosA.length < 2 || clasificadosB.length < 2) {
    // todavía hay partidos pendientes, no llenar semifinales
    return liga;
  }

  // Emparejamientos correctos: 1A vs 2B, 1B vs 2A
  semifinales.partidos[0].jugador1Id = clasificadosA[0].id; // 1A
  semifinales.partidos[0].jugador2Id = clasificadosB[1].id; // 2B

  semifinales.partidos[1].jugador1Id = clasificadosB[0].id; // 1B
  semifinales.partidos[1].jugador2Id = clasificadosA[1].id; // 2A

  return liga;
}

/**
 * Genera y actualiza la final de la liga.
 */
function actualizarFinal(liga) {
  if (liga.modo !== "grupos_final") return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  const final = liga.jornadas.find(j => j.ronda === "Final");

  if (!semifinales || !final) return liga;

  const [semi1, semi2] = semifinales.partidos;

  if (semi1 && semi1.resultado) {
    const jugadores = Object.keys(semi1.resultado).filter(id => /^\d+$/.test(id));
    if (jugadores.length === 2) {
      const idGanadorSemi1 = jugadores.reduce((a, b) =>
        semi1.resultado[a] > semi1.resultado[b] ? a : b
      );
      final.partidos[0].jugador1Id = idGanadorSemi1;
    }
  }

  if (semi2 && semi2.resultado) {
    const jugadores = Object.keys(semi2.resultado).filter(id => /^\d+$/.test(id));
    if (jugadores.length === 2) {
      const idGanadorSemi2 = jugadores.reduce((a, b) =>
        semi2.resultado[a] > semi2.resultado[b] ? a : b
      );
      final.partidos[0].jugador2Id = idGanadorSemi2;
    }
  }

  return liga;
}

module.exports = {
  actualizarSemifinales,
  actualizarFinal
};

