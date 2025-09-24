// utils/fasesEliminatorias.js
function calcularTablaGrupo(grupo) {
  const jugadores = {};

  for (const jornada of grupo.jornadas) {
    for (const partido of jornada.partidos) {
      if (!partido.resultado) continue;

      const j1 = partido.jugador1Id;
      const j2 = partido.jugador2Id;
      const r1 = partido.resultado[j1];
      const r2 = partido.resultado[j2];

      // inicializar si no existe
      if (!jugadores[j1]) {
        jugadores[j1] = { id: j1, nombre: partido.jugador1Nombre || '', ganados: 0, perdidos: 0, puntos: 0 };
      }
      if (!jugadores[j2]) {
        jugadores[j2] = { id: j2, nombre: partido.jugador2Nombre || '', ganados: 0, perdidos: 0, puntos: 0 };
      }

      // sumar puntos
      jugadores[j1].puntos += r1;
      jugadores[j2].puntos += r2;

      if (r1 > r2) {
        jugadores[j1].ganados += 1;
        jugadores[j2].perdidos += 1;
      } else if (r2 > r1) {
        jugadores[j2].ganados += 1;
        jugadores[j1].perdidos += 1;
      }
    }
  }

  // devolver ranking ordenado
  return Object.values(jugadores).sort((a, b) => {
    if (b.ganados !== a.ganados) return b.ganados - a.ganados;
    return b.puntos - a.puntos;
  });
}

async function actualizarSemifinales(liga) {
  if (!liga.grupos || liga.grupos.length < 2) {
    console.log("⚠️ No hay suficientes grupos para semifinales");
    return;
  }

  const grupoA = liga.grupos.find(g => g.nombre === "A");
  const grupoB = liga.grupos.find(g => g.nombre === "B");

  if (!grupoA || !grupoB) {
    console.log("⚠️ No se encontraron los grupos A y B");
    return;
  }

  const rankingA = calcularTablaGrupo(grupoA);
  const rankingB = calcularTablaGrupo(grupoB);

  if (rankingA.length < 2 || rankingB.length < 2) {
    console.log("⚠️ No hay suficientes jugadores en los grupos");
    return;
  }

  const semifinales = [
    { jugador1: rankingA[0], jugador2: rankingB[1] }, // 1A vs 2B
    { jugador1: rankingB[0], jugador2: rankingA[1] }, // 1B vs 2A
  ];

  liga.semifinales = semifinales.map((sf, idx) => ({
    id: `SF${idx + 1}`,
    jugador1Id: sf.jugador1.id,
    jugador1Nombre: sf.jugador1.nombre,
    jugador2Id: sf.jugador2.id,
    jugador2Nombre: sf.jugador2.nombre,
    resultado: null,
  }));

  console.log("✅ Semifinales actualizadas:", liga.semifinales);
}

async function actualizarFinal(liga) {
  if (!liga.semifinales || liga.semifinales.length < 2) {
    console.log("⚠️ No hay semifinales suficientes para generar final");
    return;
  }

  const final = {
    id: "F1",
    jugador1Id: null,
    jugador1Nombre: null,
    jugador2Id: null,
    jugador2Nombre: null,
    resultado: null,
  };

  liga.final = final;
  console.log("✅ Final preparada (esperando semifinales)");
}

module.exports = {
  calcularTablaGrupo,
  actualizarSemifinales,
  actualizarFinal,
};


