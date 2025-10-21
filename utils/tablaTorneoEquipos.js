const fs = require('fs');
const path = require('path');

/**
 * Calcula la tabla de posiciones de los grupos de un torneo de equipos
 * @param {Object} torneo - JSON del torneo
 * @returns {Object} - Tablas de posiciones por grupo
 */
function calcularTablaEquipos(torneo) {
  if (!torneo.grupos || !torneo.rondas_grupos) return {};

  const tablasPorGrupo = {};

  for (const grupo of torneo.grupos) {
    const grupoId = grupo.nombre.slice(-1);
    const ronda = torneo.rondas_grupos.find(r => r.grupo === grupoId);
    if (!ronda) continue;

    const tabla = {};

    // Inicializar equipos del grupo
    grupo.equipos.forEach(eq => {
      tabla[eq] = { nombre: eq, pj: 0, pg: 0, pp: 0, pts: 0, diff: 0 };
    });

    // Procesar partidos
    for (const rondaPartidos of ronda.partidos) {
      for (const partido of rondaPartidos.partidos) {
        const eq1 = partido.equipo1Nombre;
        const eq2 = partido.equipo2Nombre;
        const resultado = partido.resultado;

        if (!eq1 || !eq2 || !resultado) continue;
        if (!tabla[eq1] || !tabla[eq2]) continue;

        const [s1, s2] = resultado.split('-').map(Number);
        if (isNaN(s1) || isNaN(s2)) continue;

        tabla[eq1].pj++;
        tabla[eq2].pj++;
        tabla[eq1].diff += s1 - s2;
        tabla[eq2].diff += s2 - s1;

        if (s1 > s2) {
          tabla[eq1].pg++;
          tabla[eq2].pp++;
          tabla[eq1].pts += 3;
        } else if (s2 > s1) {
          tabla[eq2].pg++;
          tabla[eq1].pp++;
          tabla[eq2].pts += 3;
        }
      }
    }

    // Ordenar tabla
    const posiciones = Object.values(tabla).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.diff !== a.diff) return b.diff - a.diff;
      return a.nombre.localeCompare(b.nombre);
    });

    tablasPorGrupo[grupo.nombre] = posiciones;
  }

  return tablasPorGrupo;
}

/**
 * Genera texto en formato tabla para mostrar en Discord
   utils/tablaTorneoEquipos.js
 */
function generarTextoTablaEquipos(tablasPorGrupo, torneoNombre) {
  let texto = `📊 **Tabla de posiciones - ${torneoNombre}**\n\n`;

  for (const [grupo, posiciones] of Object.entries(tablasPorGrupo)) {
    texto += `🔸 ${grupo}\n`;
    texto += "```\n";
    texto += `Pos | Equipo           | PJ | PG | PP | Pts | Dif\n`;
    texto += `------------------------------------------------\n`;
    posiciones.forEach((p, i) => {
      texto += `${(i + 1).toString().padEnd(3)} | ${p.nombre.padEnd(15)} | ${p.pj.toString().padEnd(2)} | ${p.pg.toString().padEnd(2)} | ${p.pp.toString().padEnd(2)} | ${p.pts.toString().padEnd(3)} | ${p.diff.toString().padEnd(3)}\n`;
    });
    texto += "```\n\n";
  }

  return texto;
}

module.exports = {
  calcularTablaEquipos,
  generarTextoTablaEquipos
};
