//comandos/enviar_guia.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('enviar_guia')
    .setDescription('Envía una guía informativa según el tipo (coordinar, recs, inscripción).')
    .addStringOption(option =>
      option
        .setName('tipo')
        .setDescription('Selecciona el tipo de guía que deseas enviar.')
        .setRequired(true)
        .addChoices(
          { name: '🎯 Coordinar partida', value: 'coordinar' },
          { name: '💾 Enviar RECs', value: 'recs' },
          { name: '📝 Inscripción', value: 'inscripcion' }
        )
    ),

  async execute(interaction) {
    const tipo = interaction.options.getString('tipo');
    let embed, boton;

    // 🎯 Guía para coordinación
    if (tipo === 'coordinar') {
      embed = new EmbedBuilder()
        .setColor('#0a1930')
        .setTitle('⚔️ Coordinación de Partidas Oficiales')
        .setDescription(
          'Usa este canal exclusivamente para coordinar partidos oficiales del torneo.\n\n' +
          'Haz clic en el botón de abajo para ver una **guía paso a paso** con ejemplos del comando `/coordinarpartida`.'
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3143/3143643.png')
        .setFooter({
          text: 'AUA - Asociación Uruguaya de Age of Empires II',
          iconURL: 'https://i.imgur.com/0MQg5Lh.png', // puedes cambiar por el logo oficial AUA
        });

      boton = new ButtonBuilder()
        .setCustomId('ver_guia_coordinar')
        .setLabel('📘 Ver Guía de Coordinación')
        .setStyle(ButtonStyle.Primary);
    }

    // 💾 Guía para RECs
    else if (tipo === 'recs') {
      embed = new EmbedBuilder()
        .setColor('#1e3a8a')
        .setTitle('💾 Envío de Archivos RECs')
        .setDescription(
          'Cuando finalices tu partido, sube aquí los archivos **.aoe2record**.\n\n' +
          'Haz clic en el botón para ver la guía detallada sobre cómo encontrarlos y subirlos correctamente.'
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/2303/2303987.png')
        .setFooter({
          text: 'AUA - Asociación Uruguaya de Age of Empires II',
          iconURL: 'https://i.imgur.com/0MQg5Lh.png',
        });

      boton = new ButtonBuilder()
        .setCustomId('ver_guia_recs')
        .setLabel('💾 Ver Guía de RECs')
        .setStyle(ButtonStyle.Success);
    }

    // 📝 Guía para inscripción
    else if (tipo === 'inscripcion') {
      embed = new EmbedBuilder()
        .setColor('#d4af37')
        .setTitle('📝 Guía de Inscripción al Torneo')
        .setDescription(
          'Completa tu registro correctamente para participar en los torneos de la AUA.\n\n' +
          'Presiona el botón de abajo para ver los pasos detallados del comando `/inscribirequipo`.'
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/992/992700.png')
        .setFooter({
          text: 'AUA - Asociación Uruguaya de Age of Empires II',
          iconURL: 'https://i.imgur.com/0MQg5Lh.png',
        });

      boton = new ButtonBuilder()
        .setCustomId('ver_guia_inscripcion')
        .setLabel('📝 Ver Guía de Inscripción')
        .setStyle(ButtonStyle.Secondary);
    }

    const row = new ActionRowBuilder().addComponents(boton);

    await interaction.reply({ content: `✅ Guía de tipo **${tipo}** enviada.`, ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  },
};
