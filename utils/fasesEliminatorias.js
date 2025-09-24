// utiles/fasesEliminatorias.js
// 🏆 Calcula automáticamente semifinales y final a partir de los resultados de grupos

function calcularTablaGrupo(participantes, partidos) {
  // Inicializa tabla de puntos por jugador
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,
    ganados: 0,
    perdidos: 0,
    pendiente: false
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

  // Ordena por puntos, luego por diferencia de victorias, luego por nombre
  tabla.sort((a, b) =>
    b.puntos - a.puntos ||
    (b.ganados - b.perdidos) - (a.ganados - a.perdidos) ||
    a.nombre.localeCompare(b.nombre)
  );

  return tabla;
}

function actualizarSemifinales(liga) {
  if (!liga.grupos || !liga.jornadas) return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  if (!semifinales) return liga;

  // Recopilar todos los partidos de grupos
  const partidosRondas = liga.jornadas
    .filter(j => typeof j.ronda === "number")
    .flatMap(j => j.partidos);

  // Calcular tabla de cada grupo
  const tablaA = calcularTablaGrupo(liga.grupos.A, partidosRondas);
  const tablaB = calcularTablaGrupo(liga.grupos.B, partidosRondas);

  const clasificadosA = tablaA.filter(t => !t.pendiente).slice(0, 2);
  const clasificadosB = tablaB.filter(t => !t.pendiente).slice(0, 2);

  if (clasificadosA.length < 2 || clasificadosB.length < 2) return liga;

  // Llenar semifinales según 1A vs 2B y 1B vs 2A
  semifinales.partidos[0].jugador1Id = clasificadosA[0].id;
  semifinales.partidos[0].jugador2Id = clasificadosB[1].id;

  semifinales.partidos[1].jugador1Id = clasificadosB[0].id;
  semifinales.partidos[1].jugador2Id = clasificadosA[1].id;

  return liga;
}

function actualizarFinal(liga) {
  if (!liga.jornadas) return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  const final = liga.jornadas.find(j => j.ronda === "Final");

  if (!semifinales || !final) return liga;

  for (let i = 0; i < 2; i++) {
    const semi = semifinales.partidos[i];
    if (!semi.resultado) continue;

    const [id1, id2] = [semi.jugador1Id, semi.jugador2Id];
    const score1 = semi.resultado[id1] ?? 0;
    const score2 = semi.resultado[id2] ?? 0;
    const ganador = score1 > score2 ? id1 : (score2 > score1 ? id2 : null);

    if (ganador) {
      if (i === 0) final.partidos[0].jugador1Id = ganador;
      else final.partidos[0].jugador2Id = ganador;
    }
  }

  return liga;
}

module.exports = {
  actualizarSemifinales,
  actualizarFinal
};
