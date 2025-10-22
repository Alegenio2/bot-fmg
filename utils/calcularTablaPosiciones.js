// utils/calcularTablaPosiciones.js (Versión Corregida)

function calcularTablaPosiciones(torneo) {
  const tablas = {};

  // Bucle 1: Itera sobre los objetos que definen el GRUPO ("A" y "B")
  for (const infoGrupo of torneo.rondas_grupos || []) {
    
    // Obtiene el nombre del grupo (ej: "A" o "B")
    const nombreGrupo = infoGrupo.grupo || "Grupo Desconocido";
    if (!tablas[nombreGrupo]) {
      tablas[nombreGrupo] = {};
    }

    // Bucle 2: Itera sobre las RONDAS dentro de ese GRUPO (Ronda 1, Ronda 2, etc.)
    for (const ronda of infoGrupo.partidos || []) { 
      
      // Bucle 3: Itera sobre los PARTIDOS dentro de esa RONDA
      for (const partido of ronda.partidos || []) { // Ahora itera sobre los objetos de partido
        
        const { equipo1Id: eq1Id, equipo1Nombre: eq1Nombre, equipo2Id: eq2Id, equipo2Nombre: eq2Nombre, resultado } = partido;
        if (!eq1Id || !eq2Id) continue;

        // Inicializar equipos si no existen
        if (!tablas[nombreGrupo][eq1Id]) {
          tablas[nombreGrupo][eq1Id] = { nombre: eq1Nombre, jugados: 0, ganados: 0, perdidos: 0, setsGanados: 0, setsPerdidos: 0, puntos: 0 };
        }
        if (!tablas[nombreGrupo][eq2Id]) {
          tablas[nombreGrupo][eq2Id] = { nombre: eq2Nombre, jugados: 0, ganados: 0, perdidos: 0, setsGanados: 0, setsPerdidos: 0, puntos: 0 };
        }

        // Si hay un resultado, procesar estadísticas (la lógica interna se mantiene igual)
        if (resultado) {
          const puntosEq1 = resultado[eq1Id];
          const puntosEq2 = resultado[eq2Id];
          if (typeof puntosEq1 !== 'number' || typeof puntosEq2 !== 'number') continue;

          // ... (resto de la lógica de cálculo de sets/puntos) ...
          tablas[nombreGrupo][eq1Id].jugados++;
          tablas[nombreGrupo][eq2Id].jugados++;
          tablas[nombreGrupo][eq1Id].setsGanados += puntosEq1;
          tablas[nombreGrupo][eq1Id].setsPerdidos += puntosEq2;
          tablas[nombreGrupo][eq2Id].setsGanados += puntosEq2;
          tablas[nombreGrupo][eq2Id].setsPerdidos += puntosEq1;

          if (puntosEq1 > puntosEq2) {
            tablas[nombreGrupo][eq1Id].ganados++;
            tablas[nombreGrupo][eq2Id].perdidos++;
            tablas[nombreGrupo][eq1Id].puntos += 3;
          } else if (puntosEq2 > puntosEq1) {
            tablas[nombreGrupo][eq2Id].ganados++;
            tablas[nombreGrupo][eq1Id].perdidos++;
            tablas[nombreGrupo][eq2Id].puntos += 3;
          } else {
            // Empate
            tablas[nombreGrupo][eq1Id].puntos += 1;
            tablas[nombreGrupo][eq2Id].puntos += 1;
          }
        }
      }
    }
  }

  // Ordenar los grupos (esta parte no necesita cambios)
  for (const grupo in tablas) {
    tablas[grupo] = Object.entries(tablas[grupo])
      .map(([id, datos]) => ({
        id,
        nombre: datos.nombre,
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
