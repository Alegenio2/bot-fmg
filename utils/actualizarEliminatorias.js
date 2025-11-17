// utils/actualizarEliminatorias.js
const fs = require("fs/promises");
const { calcularTablaPosiciones } = require("./calcularTablaPosiciones.js");

async function actualizarEliminatorias(torneo, filePath, interaction) {
  try {
    // ---------------------------------------------------
    // 🔍 PRIMERA ETAPA: GENERAR SEMIFINALES
    // ---------------------------------------------------
    if (!torneo.eliminatorias || torneo.eliminatorias.length === 0) {

      // Verificar que existan rondas de grupos
      if (!torneo.rondas_grupos || torneo.rondas_grupos.length === 0) {
        return;
      }

      // Verificar si TODOS los partidos de grupos tienen resultado
      let gruposCompletos = true;

      for (const ronda of torneo.rondas_grupos) {
        for (const grupo of ronda.partidos) {
          for (const partido of grupo.partidos) {
            if (!partido.resultado) {
              gruposCompletos = false;
              break;
            }
          }
          if (!gruposCompletos) break;
        }
        if (!gruposCompletos) break;
      }

      if (!gruposCompletos) return; // Fase de grupos NO terminada todavía

      // Calcular posiciones finales
      const tablas = calcularTablaPosiciones(torneo);
      const grupos = Object.keys(tablas);

      if (grupos.length < 2) {
        console.error("❌ No hay suficientes grupos para generar semifinales.");
        return;
      }

      const grupoA = tablas[grupos[0]];
      const grupoB = tablas[grupos[1]];

      const semifinales = [
        {
          nombre: "Semifinales",
          partidos: [
            {
              equipo1Nombre: grupoA[0].nombre,
              equipo2Nombre: grupoB[1].nombre,
              resultado: null,
            },
            {
              equipo1Nombre: grupoB[0].nombre,
              equipo2Nombre: grupoA[1].nombre,
              resultado: null,
            },
          ],
        },
      ];

      torneo.eliminatorias = semifinales;

      await fs.writeFile(filePath, JSON.stringify(torneo, null, 2));

      await interaction.followUp({
        content: "🏆 **Fase de grupos finalizada! Se generaron automáticamente las Semifinales.**",
        ephemeral: false,
      });

      return; // Termina aquí porque recién se generaron
    }

    // ---------------------------------------------------
    // 🔍 SEGUNDA ETAPA: GENERAR FINAL DESPUÉS DE LAS SEMIS
    // ---------------------------------------------------

    const faseSemis = torneo.eliminatorias.find(f => f.nombre === "Semifinales");
    const faseFinal = torneo.eliminatorias.find(f => f.nombre === "Final");

    // Si NO hay semifinales, no seguimos
    if (!faseSemis) return;

    // Si YA existe la final → no regenerar
    if (faseFinal) return;

    // Verificar que TODOS los partidos de semifinales tienen resultado
    let semifinalesCompletas = true;
    for (const partido of faseSemis.partidos) {
      if (!partido.resultado) {
        semifinalesCompletas = false;
        break;
      }
    }

    if (!semifinalesCompletas) return;

    // Obtener ganadores
    const ganadores = [];

    for (const partido of faseSemis.partidos) {
      const eq1 = partido.equipo1Nombre;
      const eq2 = partido.equipo2Nombre;
      const r = partido.resultado;

      const puntosEq1 = r[eq1];
      const puntosEq2 = r[eq2];

      if (puntosEq1 > puntosEq2) ganadores.push(eq1);
      else ganadores.push(eq2);
    }

    if (ganadores.length !== 2) {
      console.error("❌ No se pudieron determinar los ganadores de semifinales.");
      return;
    }

    // Crear la Final
    const final = {
      nombre: "Final",
      partidos: [
        {
          equipo1Nombre: ganadores[0],
          equipo2Nombre: ganadores[1],
          resultado: null,
        },
      ],
    };

    // Agregar final al torneo
    torneo.eliminatorias.push(final);

    // Guardar archivo
    await fs.writeFile(filePath, JSON.stringify(torneo, null, 2));

    await interaction.followUp({
      content: "🏆 **Semifinales finalizadas! Se generó automáticamente la GRAN FINAL.**",
      ephemeral: false,
    });

  } catch (error) {
    console.error("❌ Error al actualizar eliminatorias:", error);
  }
}

module.exports = { actualizarEliminatorias };
