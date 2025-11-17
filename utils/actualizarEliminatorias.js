// utils/actualizarEliminatorias.js
const fs = require("fs/promises");

async function actualizarEliminatorias(torneo, filePath, interaction) {
  try {
    // Si ya existen eliminatorias, no regenerar
    if (torneo.eliminatorias && torneo.eliminatorias.length > 0) {
      return; 
    }

    // Verificar que existan rondas de grupos
    if (!torneo.rondas_grupos || torneo.rondas_grupos.length === 0) {
      return;
    }

    // 1️⃣ Verificar si TODOS los partidos de grupo tienen resultado
    let todosCompletos = true;

    for (const ronda of torneo.rondas_grupos) {
      for (const grupo of ronda.partidos) {
        for (const partido of grupo.partidos) {
          if (!partido.resultado) {
            todosCompletos = false;
            break;
          }
        }
        if (!todosCompletos) break;
      }
      if (!todosCompletos) break;
    }

    if (!todosCompletos) {
      return; // aún no terminó la fase de grupos
    }

    // 2️⃣ Obtener tabla de posiciones final
    const { calcularTablaPosiciones } = require("./calcularTablaPosiciones.js");
    const tablas = calcularTablaPosiciones(torneo);

    // Se espera que sean grupos A, B, etc.
    const nombresGrupos = Object.keys(tablas);
    if (nombresGrupos.length < 2) {
      console.error("❌ No hay suficientes grupos para hacer semifinales");
      return;
    }

    const grupoA = tablas[nombresGrupos[0]];
    const grupoB = tablas[nombresGrupos[1]];

    const semi1 = {
      equipo1Nombre: grupoA[0].nombre,
      equipo2Nombre: grupoB[1].nombre,
      resultado: null
    };

    const semi2 = {
      equipo1Nombre: grupoB[0].nombre,
      equipo2Nombre: grupoA[1].nombre,
      resultado: null
    };

    // 3️⃣ Guardar eliminatorias
    torneo.eliminatorias = [
      {
        nombre: "Semifinales",
        partidos: [semi1, semi2]
      }
    ];

    // Guardar archivo
    await fs.writeFile(filePath, JSON.stringify(torneo, null, 2));

    // Avisar en Discord
    await interaction.followUp({
      content: "🏆 **Fase de grupos finalizada. Semifinales generadas automáticamente!**",
      ephemeral: false
    });

  } catch (error) {
    console.error("❌ Error al actualizar eliminatorias automáticamente:", error);
  }
}

module.exports = { actualizarEliminatorias };

