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
    await interaction.deferReply({ ephemeral: true }); // Evita timeouts mientras se consulta

    const { user, options } = interaction;
    const jugador = options.getUser('jugador') || user;

    // Obtenemos el ID de AoE vinculado al usuario
    const aoeId = obtenerProfileId(jugador.id);
    if (!aoeId) {
      return interaction.editReply(`❌ ${jugador.username} no ha vinculado su cuenta aún. Usa /vincular.`);
    }

    try {
      // Consultar ELO
      const datos = await obtenerEloActual(aoeId);
      if (!datos) return interaction.editReply("❌ No se pudo obtener el ELO.");

      // Responder con información
      return interaction.editReply(
        `🏆 **${datos.nombre}**\n` +
        `🌍 País: ${datos.pais}\n` +
        `🎯 ELO 1v1: ${datos.elo}\n` +
        `📈 Rank global: #${datos.rank}\n` +
        `📜 Clan: ${datos.clan || 'N/A'}\n` +
        `✅ Ganadas: ${datos.wins} | ❌ Perdidas: ${datos.losses}`
      );
    } catch (err) {
      console.error("❌ Error obteniendo ELO:", err);
      return interaction.editReply("⚠️ Ocurrió un error al obtener el ELO del jugador.");
    }
  }
};

