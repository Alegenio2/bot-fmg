// comandos/duelo.js
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

    // 1. Ruta al nuevo JSON del torneo
    const rutaTorneo = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
    
    if (!fs.existsSync(rutaTorneo)) {
      return interaction.reply("❌ No se encontró el archivo del torneo `1v1_copa_uruguaya_2026.json`.");
    }
    
    const dataTorneo = JSON.parse(fs.readFileSync(rutaTorneo, 'utf8'));

    // 2. Extraer todos los jugadores de todos los grupos en una sola lista
    const todosLosJugadores = dataTorneo.grupos.flatMap(g => g.jugadores);

    // 3. Buscar a los jugadores por su ID de Discord
    const data1 = todosLosJugadores.find(u => u.id === j1.id);
    const data2 = todosLosJugadores.find(u => u.id === j2.id);

    if (!data1 || !data2) {
      return interaction.reply("❌ Uno o ambos jugadores no están registrados en los grupos del torneo actual.");
    }

    // 4. Calcular la diferencia usando los campos 'elo' del JSON
    const elo1 = data1.elo;
    const elo2 = data2.elo;
    const diferencia = Math.abs(elo1 - elo2);
    
    let handicap = 0;
    let favorecido = null;

    // Lógica de hándicap (se mantiene igual)
    if (diferencia >= 150) {
      if (diferencia >= 1050) handicap = 35;
      else if (diferencia >= 900) handicap = 30;
      else if (diferencia >= 750) handicap = 25;
      else if (diferencia >= 600) handicap = 20;
      else if (diferencia >= 450) handicap = 15;
      else if (diferencia >= 300) handicap = 10;
      else if (diferencia >= 150) handicap = 5;

      favorecido = elo1 < elo2 ? data1.nick : data2.nick;
    }

    // 5. Responder
    let respuesta = `⚔️ **PREPARACIÓN DE DUELO (COPA 2026)** ⚔️\n\n` +
                    `👤 **${data1.nick}** (${elo1} ELO)\n` +
                    `👤 **${data2.nick}** (${elo2} ELO)\n` +
                    `📊 Diferencia: **${diferencia} pts**\n\n`;

    if (handicap > 0) {
      respuesta += `⚖️ **Hándicap recomendado:**\n` +
                   `El jugador **${favorecido}** debería recibir un **${handicap}%** de hándicap.`;
    } else {
      respuesta += `⚖️ **Duelo equilibrado:** No se recomienda hándicap (diferencia menor a 150 pts).`;
    }

    await interaction.reply(respuesta);
  }
};
