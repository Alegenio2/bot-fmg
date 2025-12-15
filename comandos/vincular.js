// comandos/vincular.js
const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const botConfig = require('../botConfig.json');
const { asociarUsuario } = require('../utils/asociar');
const { obtenerEloActual } = require('../utils/elo');

module.exports = {
  name: 'vincular',
  description: 'Vincula tu cuenta de Discord con tu perfil de AoE2 Companion.',
  options: [
    {
      name: 'aoe2id',
      description: 'Link de tu perfil de aoe2companion.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    const { user, options, guildId, channelId } = interaction;
    const canalVincular = botConfig.servidores[guildId]?.canalVincular;

    // 🔒 Validar canal
    if (!canalVincular || channelId !== canalVincular) {
      return interaction.reply({
        content: "⚠️ Este comando solo se puede usar en el canal de vinculación correspondiente.",
        ephemeral: true
      });
    }

    // 🔗 Validar URL
    const urlCompleta = options.getString('aoe2id');
    const match = urlCompleta.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);

    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );

      return interaction.reply({
        content: "❌ La URL no es válida.\nEjemplo:\n`https://www.aoe2companion.com/profile/2304739`",
        components: [row],
        ephemeral: true
      });
    }

    const profileId = match[2];

    // 🔍 Obtener datos reales del jugador
    const datos = await obtenerEloActual(profileId);

    if (!datos) {
      return interaction.reply({
        content: "❌ No se pudieron obtener los datos del perfil. Verificá el ID.",
        ephemeral: true
      });
    }

    // 🧠 Construir objeto usuario
    const usuario = {
      profileId,
      nombre: datos.nombre,
      elo: datos.elo,
      rank: datos.rank,
      wins: datos.wins,
      losses: datos.losses,
      pais: datos.pais,
      country: datos.country,
      clan: datos.clan,
      elomax: datos.elomax,
      ultimapartida: datos.ultimapartida
    };

    // 💾 Guardar
    asociarUsuario(user.id, usuario);

    return interaction.reply({
      content: `✅ Tu cuenta fue vinculada correctamente con **${usuario.nombre}** (ELO ${usuario.elo})`,
      ephemeral: true
    });
  }
};
