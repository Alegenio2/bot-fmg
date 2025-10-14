// comandos/fixture_jornada.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fixture_jornada')
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
    .addStringOption(option =>
      option.setName('jornada')
        .setDescription('Número de jornada o fase (ej: 1, 2, semi, final)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const categoria = interaction.options.getString('categoria');
    const jornadaInput = interaction.options.getString('jornada'); // ahora siempre string

    const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
    if (!fs.existsSync(filePath)) {
      return await interaction.reply({
        content: `⚠️ No se encontró el archivo de liga para la categoría **${categoria}**.`,
        ephemeral: true
      });
    }

    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let jornada;

    if (!isNaN(jornadaInput)) {
      // si el input es numérico, comparamos como string
      jornada = liga.jornadas.find(j => String(j.ronda) === jornadaInput);
    } else {
      // si es "semi" o "final"
      const fase = jornadaInput.toLowerCase();
      jornada = liga.jornadas.find(j => String(j.ronda).toLowerCase().includes(fase));
    }

    if (!jornada) {
      return await interaction.reply({
        content: `⚠️ No se encontró la jornada/fase **${jornadaInput}** en la categoría **${categoria}**.`,
        ephemeral: true
      });
    }

    let mensaje = `📅 **${jornada.ronda} - Categoría ${categoria.toUpperCase()}**\n\n`;

    for (const partido of jornada.partidos) {
      mensaje += `👥 <@${partido.jugador1Id}> vs <@${partido.jugador2Id}> `;
      if (partido.resultado) {
        mensaje += `||${partido.resultado[partido.jugador1Id]} - ${partido.resultado[partido.jugador2Id]}|| `;
      }
      mensaje += `\n`;
    }

    await interaction.reply({ content: mensaje, ephemeral: false });
  }
};
