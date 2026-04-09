const fs = require('fs').promises;
const path = require('path');

async function obtenerEstadisticasCopa() {
  const filePath = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
  const data = await fs.readFile(filePath, 'utf8');
  const torneo = JSON.parse(data);

  const tablas = {}; 

  torneo.rondas_grupos.forEach(grupoObj => {
    const letraGrupo = grupoObj.grupo;
    const stats = {};
    const grupoOriginal = torneo.grupos.find(g => g.nombre === `Grupo ${letraGrupo}`);
   
    if (!grupoOriginal) return;

    grupoOriginal.jugadores.forEach(j => {
      stats[j.id] = { nick: j.nick, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0, pts: 0 };
    });

    grupoObj.partidos.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (partido.resultado) {
          const ids = Object.keys(partido.resultado);
          const id1 = ids[0];
          const id2 = ids[1];
          const pts1 = partido.resultado[id1];
          const pts2 = partido.resultado[id2];

          if (stats[id1] && stats[id2]) {
             stats[id1].pj++; stats[id2].pj++;
             stats[id1].sf += pts1; stats[id1].sc += pts2;
             stats[id2].sf += pts2; stats[id2].sc += pts1;

             // Lógica 2-0 / 2-1 (Copa Uruguaya)
             if (pts1 === 2 && pts2 === 0) {
               stats[id1].pg++; stats[id1].pts += 2; stats[id2].pp++;
             } else if (pts1 === 2 && pts2 === 1) {
               stats[id1].pg++; stats[id1].pts += 2; stats[id2].pp++; stats[id2].pts += 1;
             } else if (pts2 === 2 && pts1 === 0) {
               stats[id2].pg++; stats[id2].pts += 2; stats[id1].pp++;
             } else if (pts2 === 2 && pts1 === 1) {
               stats[id2].pg++; stats[id2].pts += 2; stats[id1].pp++; stats[id1].pts += 1;
             }
          }
        }
      });
    });

    // Convertir a array y ordenar
    tablas[`Grupo ${letraGrupo}`] = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return (b.sf - b.sc) - (a.sf - a.sc); // Diferencia de sets
    });
  });

  // GUARDAR ARCHIVO PARA LA API
  try {
    const outputPath = path.join(__dirname, '..', 'torneos', 'tabla_posiciones.json');
    await fs.writeFile(outputPath, JSON.stringify(tablas, null, 2));
    console.log('✅ tabla_posiciones.json actualizada correctamente');
  } catch (err) {
    console.error('❌ Error al escribir tabla_posiciones.json:', err);
  }

  return tablas;
}

module.exports = { obtenerEstadisticasCopa };