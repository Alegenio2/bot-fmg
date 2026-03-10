// comandos/setupInscripcionDoble.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-inscripcion-copa')
    .setDescription('Envía el panel de inscripción con doble opción (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🏆 Copa Uruguaya 2026 - Inscripciones")
      .setDescription("¡Elige tu método de inscripción!\n\n" +
                      "**Option ⚔️: Inscripción Manual**\nSi no estás vinculado o quieres usar otro ID.\n\n" +
                      "**Option ⚡: Inscripción Rápida**\nSi ya vinculaste tu cuenta de Discord con AoE2.")
      .setColor("#f1c40f")
      .setThumbnail(interaction.guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_modal_copa_2026')
        .setLabel('Manual (Link/ID)')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
      
      new ButtonBuilder()
        .setCustomId('boton_inscripcion_rapida')
        .setLabel('Rápida (Vinculados)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⚡')
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.reply({ content: "✅ Panel de inscripción desplegado.", ephemeral: true });
  }
};
