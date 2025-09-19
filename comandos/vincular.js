// comandos/vincular.js
const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const botConfig = require('../botConfig.json');
const { asociarUsuario } = require('../utils/asociar');

module.exports = {
  name: 'vincular',
  description: 'Vincula tu cuenta de Discord con tu ID de aoe2companion.',
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
        content: "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        components: [row],
        ephemeral: true
      });
    }

    const aoeId = match[2];

    // Asociar usuario
    asociarUsuario(user.id, aoeId);

    // Respuesta confirmando
    return interaction.reply({
      content: `✅ Tu cuenta fue vinculada con AOE2 ID: ${aoeId}`,
      ephemeral: true
    });
  }
};
