//comandos/enviar_guia.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enviar_guia')
    .setDescription('Envía una guía informativa de la AUA según el tipo.')
    .addStringOption(option =>
      option
        .setName('tipo')
        .setDescription('Selecciona el tipo de guía.')
        .setRequired(true)
        .addChoices(
          { name: '⚔️ Coordinar Partida', value: 'coordinar' },
          { name: '💾 Enviar RECs', value: 'recs' },
          { name: '📝 Inscripción', value: 'inscripcion' }
        )
    ),

  async execute(interaction) {
    const tipo = interaction.options.getString('tipo');

    const colores = { coordinar: '#0a1930', recs: '#1e3a8a', inscripcion: '#d4af37' };
    const titulos = {
      coordinar: '⚔️ Coordinación de Partidas Oficiales',
      recs: '💾 Envío de Archivos RECs',
      inscripcion: '📝 Guía de Inscripción al Torneo'
    };

    const botones = {
      coordinar: { id: 'ver_guia_coordinar', label: '📘 Ver Guía de Coordinación' },
      recs: { id: 'ver_guia_recs', label: '💾 Ver Guía de RECs' },
      inscripcion: { id: 'ver_guia_inscripcion', label: '📝 Ver Guía de Inscripción' }
    };

    const embed = new EmbedBuilder()
      .setColor(colores[tipo])
      .setTitle(titulos[tipo])
      .setDescription('Haz clic en el botón de abajo para ver la guía paso a paso.')
      .setFooter({ text: 'AUA - Asociación Uruguaya de Age of Empires II' })
      .setTimestamp();

    const boton = new ButtonBuilder()
      .setCustomId(botones[tipo].id)
      .setLabel(botones[tipo].label)
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(boton);

    await interaction.reply({ content: `✅ Guía **${tipo}** enviada.`, ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  },
};

