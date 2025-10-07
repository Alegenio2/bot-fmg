//admin_set_elo.js
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_set_elo')
    .setDescription('Configura el ELO máximo permitido por categoría.')
    .addStringOption(opt =>
      opt.setName('torneo')
        .setDescription('Nombre del torneo (ej: copa_uruguaya_2v2)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('categoria')
        .setDescription('Categoría (ej: a, b, c)')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('promedio')
        .setDescription('Promedio máximo permitido de ELO')
        .setRequired(true)
    ),

  async execute(interaction) {
    const torneo = interaction.options.getString('torneo').toLowerCase();
    const categoria = interaction.options.getString('categoria').toLowerCase();
    const promedio = interaction.options.getInteger('promedio');

    const filePath = path.join(__dirname, '..', 'elo_limites.json');
    let data = {};

    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    if (!data[torneo]) {
      data[torneo] = {};
    }

    data[torneo][categoria] = promedio;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    await interaction.reply(`✅ Se configuró el promedio máximo de **${promedio}** para **${torneo}**, categoría **${categoria.toUpperCase()}**.`);
  }
};
