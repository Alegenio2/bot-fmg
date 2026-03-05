// comandos/duelo.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'duelo',
  description: 'Calcula el hándicap recomendado para un duelo entre dos jugadores.',
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

    // 1. Leer los datos de los inscritos
    const ruta = path.join(__dirname, '..', 'usuarios_inscritos.json');
    if (!fs.existsSync(ruta)) return interaction.reply("❌ No hay base de datos de inscritos.");
    
    const inscritos = JSON.parse(fs.readFileSync(ruta, 'utf8'));

    // 2. Buscar a los jugadores en el JSON del torneo actual
    const data1 = inscritos.find(u => u.id === j1.id);
    const data2 = inscritos.find(u => u.id === j2.id);

    if (!data1 || !data2) {
      return interaction.reply("❌ Uno o ambos jugadores no están inscritos en el torneo.");
    }

    // 3. Calcular la diferencia
    const elo1 = data1.promedio_elo;
    const elo2 = data2.promedio_elo;
    const diferencia = Math.abs(elo1 - elo2);
    
    let handicap = 0;
    let favorecido = null;

    if (diferencia >= 200) {
      if (diferencia >= 600) handicap = 20;
      else if (diferencia >= 450) handicap = 15;
      else if (diferencia >= 300) handicap = 10;
      else if (diferencia >= 150) handicap = 5;

      favorecido = elo1 < elo2 ? data1.nombre : data2.nombre;
    }

    // 4. Responder
    let respuesta = `⚔️ **PREPARACIÓN DE DUELO** ⚔️\n\n` +
                    `👤 **${data1.nombre}** (${elo1} ELO)\n` +
                    `👤 **${data2.nombre}** (${elo2} ELO)\n` +
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
