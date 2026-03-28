const fs = require('fs').promises;
const path = require('path');

async function obtenerEstadisticasCopa() {
  const filePath = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
  const data = await fs.readFile(filePath, 'utf8');
  const torneo = JSON.parse(data);

  const tablas = {}; // Aquí guardaremos los resultados por grupo

  torneo.rondas_grupos.forEach(grupoObj => {
    const letraGrupo = grupoObj.grupo;
    const stats = {};

    // Inicializar jugadores del grupo (usando la lista oficial del grupo)
    const grupoOriginal = torneo.grupos.find(g => g.nombre === `Grupo ${letraGrupo}`);
   
if (!grupoOriginal) {
    console.warn(`⚠️ Grupo ${letraGrupo} no encontrado — puede ser Showmatch, saltando`);
    return;
}
    grupoOriginal.jugadores.forEach(j => {
      stats[j.id] = { nick: j.nick, pj: 0, pg: 0, pp: 0, sf: 0, sc: 0, pts: 0 };
    });

    // Procesar partidos
    grupoObj.partidos.forEach(ronda => {
      ronda.partidos.forEach(partido => {
        if (partido.resultado) {
          const ids = Object.keys(partido.resultado).filter(k => k !== 'mapas' && k !== 'civs' && k !== 'recs_url' && k !== 'fecha_registro' && k !== 'recs_local' && k !== 'evidencia');
          
          const id1 = ids[0];
          const id2 = ids[1];
          const pts1 = partido.resultado[id1];
          const pts2 = partido.resultado[id2];

          // Actualizar estadísticas si los jugadores existen en el grupo
          if (stats[id1] && stats[id2]) {
            stats[id1].pj++;
            stats[id2].pj++;
            stats[id1].sf += pts1;
            stats[id1].sc += pts2;
            stats[id2].sf += pts2;
            stats[id2].sc += pts1;

            if (pts1 > pts2) {
              stats[id1].pg++;
              stats[id1].pts += 3;
              stats[id2].pp++;
            } else if (pts2 > pts1) {
              stats[id2].pg++;
              stats[id2].pts += 3;
              stats[id1].pp++;
            }
          }
        }
      });
    });

    // Convertir a array y ordenar
    tablas[letraGrupo] = Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts; // 1. Puntos
      const diffA = a.sf - a.sc;
      const diffB = b.sf - b.sc;
      if (diffB !== diffA) return diffB - diffA; // 2. Diferencia de Sets
      return b.sf - a.sf; // 3. Sets a favor
    });
  });

  return tablas;
}

module.exports = { obtenerEstadisticasCopa };
