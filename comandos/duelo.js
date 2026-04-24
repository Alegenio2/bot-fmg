// comandos/duelo.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'duelo',
  description: 'Calcula el hándicap recomendado para un duelo entre dos jugadores del torneo.',
  options: [
    {
      name: 'jugador1',
      description: 'Primer jugador',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'jugador2',
      description: 'Segundo jugador',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],

  async execute(interaction) {
    const j1 = interaction.options.getUser('jugador1');
    const j2 = interaction.options.getUser('jugador2');

    const rutaTorneo = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
    
    if (!fs.existsSync(rutaTorneo)) {
      return interaction.reply("❌ No se encontró el archivo del torneo.");
    }
    
    const dataTorneo = JSON.parse(fs.readFileSync(rutaTorneo, 'utf8'));

    // ═══════════════════════════════════════════════════════════
    // 🔍 BUSCAR PARTIDO (GRUPOS + ELIMINATORIAS)
    // ═══════════════════════════════════════════════════════════
    let partidoEncontrado = null;
    let faseEncontrada = "";

    // GRUPOS
    for (const grupoObj of dataTorneo.rondas_grupos) {
      for (const rondaObj of grupoObj.partidos) {
        for (const partido of rondaObj.partidos) {
          if (
            (partido.jugador1Id === j1.id && partido.jugador2Id === j2.id) ||
            (partido.jugador1Id === j2.id && partido.jugador2Id === j1.id)
          ) {
            partidoEncontrado = partido;
            faseEncontrada = `🏆 Grupo ${grupoObj.grupo} - Ronda ${rondaObj.ronda}`;
            break;
          }
        }
        if (partidoEncontrado) break;
      }
      if (partidoEncontrado) break;
    }

    // ELIMINATORIAS
    if (!partidoEncontrado && dataTorneo.eliminatorias) {
      const fases = ['octavos', 'cuartos', 'semis', 'final'];

      for (const nombreFase of fases) {
        const fase = dataTorneo.eliminatorias[nombreFase];
        if (!fase) continue;

        for (const partido of fase) {
          if (
            (partido.jugador1Id === j1.id && partido.jugador2Id === j2.id) ||
            (partido.jugador1Id === j2.id && partido.jugador2Id === j1.id)
          ) {
            partidoEncontrado = partido;
            faseEncontrada = `🏆 ${nombreFase.toUpperCase()} - ${partido.partidoId}`;
            break;
          }
        }
        if (partidoEncontrado) break;
      }
    }

    // VALIDACIÓN
    if (!partidoEncontrado) {
      return interaction.reply("❌ Estos jugadores no tienen un enfrentamiento en el torneo.");
    }

    // ═══════════════════════════════════════════════════════════
    // 📊 BUSCAR DATOS DE JUGADORES
    // ═══════════════════════════════════════════════════════════
    const todosLosJugadores = dataTorneo.grupos.flatMap(g => g.jugadores);

    const data1 = todosLosJugadores.find(u => u.id === j1.id);
    const data2 = todosLosJugadores.find(u => u.id === j2.id);

    if (!data1 || !data2) {
      return interaction.reply("❌ No encontré los datos de ELO de uno o ambos jugadores.");
    }

    const elo1 = data1.elo;
    const elo2 = data2.elo;
    const diferencia = Math.abs(elo1 - elo2);

    let handicap = 0;
    let favorecido = null;

    if (diferencia >= 150) {
      if (diferencia >= 1050) handicap = 35;
      else if (diferencia >= 900) handicap = 30;
      else if (diferencia >= 750) handicap = 25;
      else if (diferencia >= 600) handicap = 20;
      else if (diferencia >= 450) handicap = 15;
      else if (diferencia >= 300) handicap = 10;
      else handicap = 5;

      favorecido = elo1 < elo2 ? data1.nick : data2.nick;
    }

    // ═══════════════════════════════════════════════════════════
    // 📢 RESPUESTA
    // ═══════════════════════════════════════════════════════════
    let respuesta = `⚔️ **PREPARACIÓN DE DUELO (COPA 2026)** ⚔️\n\n` +
                    `${faseEncontrada}\n\n` +
                    `👤 **${data1.nick}** (${elo1} ELO)\n` +
                    `👤 **${data2.nick}** (${elo2} ELO)\n` +
                    `📊 Diferencia: **${diferencia} pts**\n\n`;

    if (handicap > 0) {
      respuesta += `⚖️ **Hándicap recomendado:**\n` +
                   `El jugador **${favorecido}** recibe un **${handicap}%**.`;
    } else {
      respuesta += `⚖️ **Duelo equilibrado:** Sin hándicap (diferencia menor a 150 pts).`;
    }

    await interaction.reply(respuesta);
  }
};