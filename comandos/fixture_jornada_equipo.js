// comandos/fixture_jornada_equipo.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fixture_jornada_equipo')
    .setDescription('Muestra los partidos de una jornada de un torneo por equipos')
    .addStringOption(option =>
      option.setName('torneo')
        .setDescription('ID del torneo')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('fase')
        .setDescription('Número de jornada o fase (ej: 1, 2, Semifinal, Final)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const torneoId = interaction.options.getString('torneo');
    const faseInput = interaction.options.getString('fase');
    const filePath = path.join(__dirname, '..', 'torneos', `torneo_${torneoId}.json`);

    if (!fs.existsSync(filePath)) {
      return interaction.reply({
        content: `⚠️ No se encontró el torneo con ID **${torneoId}**.`,
        ephemeral: true
      });
    }

    const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Buscar la jornada en grupos
    let jornada = torneo.rondas_grupos.find(j => String(j.grupo) === faseInput);
    // Si no está en grupos, buscar en eliminatorias
    if (!jornada && torneo.eliminatorias) {
      jornada = torneo.eliminatorias.find(f => f.ronda.toLowerCase() === faseInput.toLowerCase());
    }

    if (!jornada) {
      return interaction.reply({
        content: `⚠️ No se encontró la jornada/fase **${faseInput}** en el torneo **${torneo.torneo}**.`,
        ephemeral: true
      });
    }

    // Crear mensaje con los partidos
    let mensaje = `📅 **${jornada.grupo || jornada.ronda} - Torneo ${torneo.torneo}**\n\n`;
    for (const partido of jornada.partidos) {
      mensaje += `🏆 **${partido.equipo1}** vs **${partido.equipo2}**`;
      if (partido.resultado) {
        mensaje += ` ||${partido.resultado.equipo1 || '-'} - ${partido.resultado.equipo2 || '-'}||`;
      }
      mensaje += `\n`;
    }

    await interaction.reply({ content: mensaje, ephemeral: false });
  }
};
