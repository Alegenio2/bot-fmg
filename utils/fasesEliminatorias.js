// utiles/fasesEliminatorias.js
function calcularTablaGrupo(participantes, partidos) {
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,   // ahora serán los partidos ganados
    ganados: 0,
    perdidos: 0,
    pendiente: false,
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
    } else if (score2 > score1) {
      p2.ganados++;
      p1.perdidos++;
    }

    // puntos según partidos ganados
    if (p1) p1.puntos += score1;
    if (p2) p2.puntos += score2;
  }

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

  // Determinar ganadores de las semifinales
  for (let i = 0; i < 2; i++) {
    const semi = semifinales.partidos[i];
    if (!semi.resultado) continue;

    const ids = Object.keys(semi.resultado);
    const idGanador = ids.reduce((a, b) =>
      semi.resultado[a] > semi.resultado[b] ? a : b
    );

    if (i === 0) final.partidos[0].jugador1Id = idGanador;
    if (i === 1) final.partidos[0].jugador2Id = idGanador;
  }

  return liga;
}

module.exports = { actualizarSemifinales, actualizarFinal };


