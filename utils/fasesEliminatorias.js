// utils/fasesEliminatorias.js

function calcularTablaGrupo(participantes, partidos) {
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,
    ganados: 0,
    perdidos: 0,
    diferencia: 0,
    pendiente: false, // jugador aún tiene partidos pendientes
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
      p1.puntos += 1;
      p2.puntos += 1;
    }

    // diferencia de victorias para desempate
    if (p1 && p2) {
      p1.diferencia = p1.ganados - p1.perdidos;
      p2.diferencia = p2.ganados - p2.perdidos;
    }
  }

  // ordenar por puntos > diferencia > nombre
  tabla.sort((a, b) =>
    b.puntos - a.puntos ||
    b.diferencia - a.diferencia ||
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

  // solo clasificados sin pendientes
  const clasificadosA = tablaA.filter(t => !t.pendiente).slice(0, 2);
  const clasificadosB = tablaB.filter(t => !t.pendiente).slice(0, 2);

  if (clasificadosA.length < 2 || clasificadosB.length < 2) {
    // todavía faltan partidos, no actualizar semi
    return liga;
  }

  // Emparejamientos correctos
  semifinales.partidos[0].jugador1Id = clasificadosA[0].id; // 1A
  semifinales.partidos[0].jugador2Id = clasificadosB[1].id; // 2B
  semifinales.partidos[1].jugador1Id = clasificadosB[0].id; // 1B
  semifinales.partidos[1].jugador2Id = clasificadosA[1].id; // 2A

  // Guardar nombres para mostrar en mensajes
  semifinales.partidos[0].jugador1Nombre = clasificadosA[0].nombre;
  semifinales.partidos[0].jugador2Nombre = clasificadosB[1].nombre;
  semifinales.partidos[1].jugador1Nombre = clasificadosB[0].nombre;
  semifinales.partidos[1].jugador2Nombre = clasificadosA[1].nombre;

  return liga;
}

function actualizarFinal(liga) {
  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  const final = liga.jornadas.find(j => j.ronda === "Final");
  if (!semifinales || !final) return liga;

  const [semi1, semi2] = semifinales.partidos;

  const ganadorSemi1 = obtenerGanador(semi1);
  const ganadorSemi2 = obtenerGanador(semi2);

  if (!ganadorSemi1 || !ganadorSemi2) return liga;

  final.partidos[0].jugador1Id = ganadorSemi1.id;
  final.partidos[0].jugador1Nombre = ganadorSemi1.nombre;
  final.partidos[0].jugador2Id = ganadorSemi2.id;
  final.partidos[0].jugador2Nombre = ganadorSemi2.nombre;

  return liga;
}

function obtenerGanador(partido) {
  if (!partido || !partido.resultado) return null;
  const { jugador1Id, jugador1Nombre, jugador2Id, jugador2Nombre, resultado } = partido;
  const score1 = resultado[jugador1Id] ?? 0;
  const score2 = resultado[jugador2Id] ?? 0;

  if (score1 > score2) return { id: jugador1Id, nombre: jugador1Nombre };
  if (score2 > score1) return { id: jugador2Id, nombre: jugador2Nombre };
  return null;
}

module.exports = {
  actualizarSemifinales,
  actualizarFinal
};
