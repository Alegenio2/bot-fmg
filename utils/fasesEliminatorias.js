// utiles/fasesEliminatorias.js
function calcularTablaGrupo(participantes, partidos) {
  const tabla = participantes.map(p => ({
    id: p.id,
    nombre: p.nombre,
    puntos: 0,
    ganados: 0,
    perdidos: 0,
  }));

  for (const partido of partidos) {
    if (!partido.resultado) continue;

    const [id1, id2] = [partido.jugador1Id, partido.jugador2Id];
    const res = partido.resultado;

    const p1 = tabla.find(t => t.id === id1);
    const p2 = tabla.find(t => t.id === id2);

    const score1 = res[id1] ?? 0;
    const score2 = res[id2] ?? 0;

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

  const tablaA = calcularTablaGrupo(
    liga.grupos.A,
    liga.jornadas.filter(j => typeof j.ronda === "number")
      .flatMap(j => j.partidos.filter(p =>
        liga.grupos.A.some(x => x.id === p.jugador1Id || x.id === p.jugador2Id)
      ))
  );

  const tablaB = calcularTablaGrupo(
    liga.grupos.B,
    liga.jornadas.filter(j => typeof j.ronda === "number")
      .flatMap(j => j.partidos.filter(p =>
        liga.grupos.B.some(x => x.id === p.jugador1Id || x.id === p.jugador2Id)
      ))
  );

  if (tablaA.length < 2 || tablaB.length < 2) return liga;

  semifinales.partidos[0].jugador1Id = tablaA[0].id; // 1A
  semifinales.partidos[0].jugador2Id = tablaB[1].id; // 2B

  semifinales.partidos[1].jugador1Id = tablaB[0].id; // 1B
  semifinales.partidos[1].jugador2Id = tablaA[1].id; // 2A

  return liga;
}

function actualizarFinal(liga) {
  if (liga.modo !== "grupos_final") return liga;

  const semifinales = liga.jornadas.find(j => j.ronda === "Semifinal");
  const final = liga.jornadas.find(j => j.ronda === "Final");

  if (!semifinales || !final) return liga;

  const [semi1, semi2] = semifinales.partidos;

  if (semi1.resultado) {
    const idGanadorSemi1 = Object.keys(semi1.resultado).reduce((a, b) =>
      semi1.resultado[a] > semi1.resultado[b] ? a : b
    );
    final.partidos[0].jugador1Id = idGanadorSemi1;
  }

  if (semi2.resultado) {
    const idGanadorSemi2 = Object.keys(semi2.resultado).reduce((a, b) =>
      semi2.resultado[a] > semi2.resultado[b] ? a : b
    );
    final.partidos[0].jugador2Id = idGanadorSemi2;
  }

  return liga;
}

module.exports = {
  actualizarSemifinales,
  actualizarFinal
};
