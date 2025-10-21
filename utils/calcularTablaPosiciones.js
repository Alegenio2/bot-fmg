// utils/calcularTablaPosiciones.js

function calcularTablaPosiciones(torneo) {
  const tablas = {};

  for (const ronda of torneo.rondas_grupos || []) {
    for (const grupo of ronda.partidos || []) {
      const nombreGrupo = grupo.grupo || grupo.nombre || "Grupo Desconocido";
      if (!tablas[nombreGrupo]) tablas[nombreGrupo] = {};

      for (const partido of grupo.partidos || []) {
        const { equipo1Nombre: eq1, equipo2Nombre: eq2, resultado } = partido;
        if (!eq1 || !eq2) continue;

        // Inicializar equipos si no existen
        if (!tablas[nombreGrupo][eq1]) {
          tablas[nombreGrupo][eq1] = { jugados: 0, ganados: 0, perdidos: 0, setsGanados: 0, setsPerdidos: 0, puntos: 0 };
        }
        if (!tablas[nombreGrupo][eq2]) {
          tablas[nombreGrupo][eq2] = { jugados: 0, ganados: 0, perdidos: 0, setsGanados: 0, setsPerdidos: 0, puntos: 0 };
        }

        if (resultado) {
          const puntosEq1 = resultado[eq1];
          const puntosEq2 = resultado[eq2];
          if (typeof puntosEq1 !== 'number' || typeof puntosEq2 !== 'number') continue;

          tablas[nombreGrupo][eq1].jugados++;
          tablas[nombreGrupo][eq2].jugados++;
          tablas[nombreGrupo][eq1].setsGanados += puntosEq1;
          tablas[nombreGrupo][eq1].setsPerdidos += puntosEq2;
          tablas[nombreGrupo][eq2].setsGanados += puntosEq2;
          tablas[nombreGrupo][eq2].setsPerdidos += puntosEq1;

          if (puntosEq1 > puntosEq2) {
            tablas[nombreGrupo][eq1].ganados++;
            tablas[nombreGrupo][eq2].perdidos++;
            tablas[nombreGrupo][eq1].puntos += 3;
          } else if (puntosEq2 > puntosEq1) {
            tablas[nombreGrupo][eq2].ganados++;
            tablas[nombreGrupo][eq1].perdidos++;
            tablas[nombreGrupo][eq2].puntos += 3;
          } else {
            // Empate (si aplica)
            tablas[nombreGrupo][eq1].puntos += 1;
            tablas[nombreGrupo][eq2].puntos += 1;
          }
        }
      }
    }
  }

  // Ordenar los grupos
  for (const grupo in tablas) {
    tablas[grupo] = Object.entries(tablas[grupo])
      .map(([nombre, datos]) => ({
        equipo: nombre,
        ...datos,
        diferencia: datos.setsGanados - datos.setsPerdidos
      }))
      .sort((a, b) => 
        b.puntos - a.puntos ||
        b.diferencia - a.diferencia ||
        b.setsGanados - a.setsGanados
      );
  }

  return tablas;
}

module.exports = { calcularTablaPosiciones };
