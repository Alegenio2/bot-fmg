// comandos/elos.js
const { ApplicationCommandOptionType } = require("discord.js");
const { obtenerEloActual } = require('../utils/elo');
const { obtenerProfileId } = require('../utils/asociar');

module.exports = {
  name: 'elos',
  description: 'Muestra el ELO actual de un jugador.',
  options: [
    {
      name: 'jugador',
      description: 'Usuario de Discord vinculado.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],

  async execute(interaction) {
    // Intentamos el deferReply de inmediato para ganar tiempo
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (e) {
        console.error("No se pudo iniciar el deferReply:", e);
        return;
    }

    const { options } = interaction;
    const jugador = options.getUser('jugador');

    try {
      // 1. Obtenemos el ID de AoE vinculado
      const aoeId = obtenerProfileId(jugador.id);
      
      if (!aoeId) {
        return interaction.editReply(`❌ **${jugador.username}** no ha vinculado su cuenta aún. Debe usar el comando de vinculación.`);
      }

      // 2. Consultar ELO a la API
      const datos = await obtenerEloActual(aoeId);
      
      if (!datos) {
        return interaction.editReply("❌ No se pudo obtener la información desde AoE2 Companion.");
      }

      // 3. Responder con la información formateada
      return interaction.editReply(
        `🏆 **${datos.nombre}**\n` +
        `🌍 País: ${datos.pais || 'N/A'}\n` +
        `🎯 ELO 1v1: **${datos.elo}** (Máx: ${datos.elomax})\n` +
        `📈 Rank global: #${datos.rank}\n` +
        `📜 Clan: ${datos.clan || 'Sin Clan'}\n` +
        `✅ Ganadas: ${datos.wins} | ❌ Perdidas: ${datos.losses}`
      );

    } catch (err) {
      console.error("❌ Error en el comando elos:", err);
      // Solo intentamos editar si la interacción sigue viva
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("⚠️ Ocurrió un error al obtener los datos del jugador.");
      }
    }
  }
};
