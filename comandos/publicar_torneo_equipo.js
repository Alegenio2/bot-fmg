const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../botConfig.json');
const { calcularTablaPosiciones } = require('../utils/calcularTablaPosiciones.js');
const { tablaTorneoEquipos } = require('../utils/tablaTorneoEquipos.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('publicar_torneo_equipo')
    .setDescription('Publica la tabla de posiciones del torneo')
    .addStringOption(option =>
      option.setName('torneo_id')
        .setDescription('ID del torneo a publicar')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const torneosPath = path.join(__dirname, '..', 'torneos');
    const files = fs.readdirSync(torneosPath).filter(f => f.endsWith('.json'));
    const torneos = files.map(f => f.replace('.json', ''));
    const filtered = torneos.filter(t => t.toLowerCase().includes(focusedValue.toLowerCase()));
    await interaction.respond(filtered.map(t => ({ name: t, value: t })));
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const { options, user, client } = interaction;
      const torneoId = options.getString('torneo_id');

      if (user.id !== botConfig.ownerId) {
        return interaction.editReply({ content: '❌ Solo el organizador puede ejecutar este comando.' });
      }

      // Leer JSON del torneo
      const filePath = path.join(__dirname, '..', 'torneos', `torneo_${torneoId}.json`);
      if (!fs.existsSync(filePath)) {
        return interaction.editReply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}` });
      }

      const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Calcular tabla de posiciones por grupo
      const tablas = calcularTablaPosiciones(torneo);

      // Publicar tabla separando grupos
      await tablaTorneoEquipos(client, torneo, tablas);

      await interaction.editReply({ content: `✅ Tabla del torneo ${torneo.torneo} publicada correctamente.` });

    } catch (error) {
      console.error('Error al publicar torneo:', error);
      try {
        await interaction.editReply({ content: '❌ Ocurrió un error ejecutando el comando.' });
      } catch {
        await interaction.followUp({ content: '❌ Ocurrió un error ejecutando el comando.', ephemeral: true });
      }
    }
  }
};


