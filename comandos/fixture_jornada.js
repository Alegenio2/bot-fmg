// comandos/fixture_jornada.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fixture_jornada')        // ✅ name definido
    .setDescription('Muestra los partidos de una jornada de liga')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoría de la liga')
        .setRequired(true)
        .addChoices(
          { name: 'Campeón', value: 'a' },
          { name: 'Mandoble', value: 'b' },
          { name: 'Espada Larga', value: 'c' },
          { name: 'Hombre de Armas', value: 'd' },
          { name: 'Milicia', value: 'e' }
        )
    )
    .addIntegerOption(option =>
      option.setName('jornada')
        .setDescription('Número de la jornada')
        .setRequired(true)
    ),

  async execute(interaction) {
    const categoria = interaction.options.getString('categoria');
    const jornadaNum = interaction.options.getInteger('jornada');

    const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
    if (!fs.existsSync(filePath)) {
      return await interaction.reply({
        content: `⚠️ No se encontró el archivo de liga para la categoría **${categoria}**.`,
        ephemeral: true
      });
    }

    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const jornada = liga.jornadas.find(j => Number(j.ronda) === jornadaNum);

    if (!jornada) {
      return await interaction.reply({
        content: `⚠️ No se encontró la jornada **${jornadaNum}** en la categoría **${categoria}**.`,
        ephemeral: true
      });
    }

    let mensaje = `📅 **Jornada ${jornadaNum} - Categoría ${categoria.toUpperCase()}**\n\n`;

    for (const partido of jornada.partidos) {
      let tipoPartido = '';
      if (partido.semifinal) tipoPartido = '🏆 Semifinal';
      else if (partido.final) tipoPartido = '🏆 Final';

      mensaje += `👥 ${partido.jugador1} vs ${partido.jugador2} `;
      if (partido.resultado) {
        mensaje += `||${partido.resultado[partido.jugador1Id]} - ${partido.resultado[partido.jugador2Id]}|| `;
      }
      mensaje += tipoPartido ? `- ${tipoPartido}` : '';
      mensaje += `\n`;
    }

    await interaction.reply({ content: mensaje, ephemeral: false });
  }
};
