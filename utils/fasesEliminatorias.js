// utiles/fasesEliminatorias.js
// 🏆 Calcula automáticamente semifinales y final a partir de los resultados de grupos
function calcularTablaGrupo(participantes, partidos) {
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,
    ganados: 0,
    perdidos: 0,
    pendiente: false, // indica si aún tiene partidos sin jugar
  }));

  for (const partido of partidos) {
    const [id1, id2] = [partido.jugador1Id, partido.jugador2Id];
    const p1 = tabla.find(t => t.id === id1);
    const p2 = tabla.find(t => t.id === id2);

    if (!partido.resultado) {
      if (p1) p1.pendiente = true;
      if (p2) p2.pendiente = true;
      continue;
    }

    // 🔹 Tomamos los puntos según tu estructura actual
    const score1 = partido.resultado[id1] ?? 0;
    const score2 = partido.resultado[id2] ?? 0;

    if (score1 > score2) {
      p1.ganados++;
      p2.perdidos++;
    } else if (score2 > score1) {
      p2.ganados++;
      p1.perdidos++;
    }
    // puntos = cantidad de juegos ganados en la partida
    p1.puntos += score1;
    p2.puntos += score2;
  }

  // ordenar por puntos > diferencia de victorias > nombre
  tabla.sort((a, b) =>
    b.puntos - a.puntos ||
    (b.ganados - b.perdidos) - (a.ganados - a.perdidos) ||
    a.nombre.localeCompare(b.nombre)
  );

  return tabla;
}

function actualizarSemifinales(liga) {
  if (liga.modo !== "grupos_final" || !liga.grupos) return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  if (!semifinales) return liga;

  const partidosRondas = liga.jornadas
    .filter(j => typeof j.ronda === "number")
    .flatMap(j => j.partidos);

  const tablaA = calcularTablaGrupo(liga.grupos.A, partidosRondas);
  const tablaB = calcularTablaGrupo(liga.grupos.B, partidosRondas);

  const clasificadosA = tablaA.filter(t => !t.pendiente).slice(0, 2);
  const clasificadosB = tablaB.filter(t => !t.pendiente).slice(0, 2);

  if (clasificadosA.length < 2 || clasificadosB.length < 2) return liga;

  // Semifinal 1: A1 vs B2
  semifinales.partidos[0].jugador1Id = clasificadosA[0].id;
  semifinales.partidos[0].jugador2Id = clasificadosB[1].id;

  // Semifinal 2: B1 vs A2
  semifinales.partidos[1].jugador1Id = clasificadosB[0].id;
  semifinales.partidos[1].jugador2Id = clasificadosA[1].id;

  return liga;
}

function actualizarFinal(liga) {
  if (liga.modo !== "grupos_final") return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  const final = liga.jornadas.find(j => j.ronda === "Final");
  if (!semifinales || !final) return liga;

  // 🔹 Ganador de semi 1
  const semi1 = semifinales.partidos[0];
  if (semi1.resultado) {
    const ids = [semi1.jugador1Id, semi1.jugador2Id];
    const idGanador = ids.reduce((a, b) => (semi1.resultado[a] > semi1.resultado[b] ? a : b));
    final.partidos[0].jugador1Id = idGanador;
  }

  // 🔹 Ganador de semi 2
  const semi2 = semifinales.partidos[1];
  if (semi2.resultado) {
    const ids = [semi2.jugador1Id, semi2.jugador2Id];
    const idGanador = ids.reduce((a, b) => (semi2.resultado[a] > semi2.resultado[b] ? a : b));
    final.partidos[0].jugador2Id = idGanador;
  }

  return liga;
}

module.exports = {
  actualizarSemifinales,
  actualizarFinal,
};
