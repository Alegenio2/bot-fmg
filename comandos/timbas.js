const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('anuncio-timbas')
    .setDescription('Envía el botón para unirse a las timbas')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('asignar_rol_timba')
        .setLabel('¡Quiero Timbear!')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🎲')
    );

    await interaction.reply({
      content: "## 🎰 Timbas de la Comunidad\n¿Quieres recibir notificaciones y participar en las timbas? ¡Presiona el botón de abajo!",
      components: [row]
    });
  },
};
