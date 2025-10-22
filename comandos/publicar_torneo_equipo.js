const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs/promises'); // <-- Asíncrono para execute() y autocomplete()
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
    
    try {
      // Cambio a fs.readdir (asíncrono)
      const files = await fs.readdir(torneosPath);
      const filteredFiles = files.filter(f => f.endsWith('.json'));
      const torneos = filteredFiles.map(f => f.replace('.json', ''));
      const filtered = torneos.filter(t => t.toLowerCase().includes(focusedValue.toLowerCase()));
      
      await interaction.respond(filtered.map(t => ({ name: t, value: t })));
    } catch (error) {
      console.error('Error en autocompletado:', error);
      await interaction.respond([]); // Responde con vacío para evitar fallos
    }
  },

  async execute(interaction) {
    // Es buena práctica usar { ephemeral: false } para publicación de resultados, 
    // pero mantenemos 'ephemeral: true' si solo el organizador ve el feedback.
    await interaction.deferReply({ ephemeral: true });

    const { options, user, client } = interaction;
    const torneoId = options.getString('torneo_id');

    // Validación de permisos
    if (user.id !== botConfig.ownerId) {
      return interaction.editReply({ content: '❌ Solo el organizador puede ejecutar este comando.' });
    }

    try {
      // Leer JSON del torneo (USANDO ASINCRONÍA)
      const filePath = path.join(__dirname, '..', 'torneos', `${torneoId}.json`);
      
      const data = await fs.readFile(filePath, 'utf8');
      const torneo = JSON.parse(data);

      // Calcular tabla de posiciones por grupo
      const tablas = calcularTablaPosiciones(torneo);

      // Publicar tabla separando grupos
      await tablaTorneoEquipos(client, torneo, tablas);

      await interaction.editReply({ content: `✅ Tabla del torneo ${torneo.torneo} publicada correctamente.` });

    } catch (error) {
      // Manejo del error específico de "Archivo no encontrado"
      if (error.code === 'ENOENT') { 
        return interaction.editReply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}` });
      }
      
      console.error('Error al publicar torneo:', error);
      try {
        await interaction.editReply({ content: '❌ Ocurrió un error ejecutando el comando.' });
      } catch {
        await interaction.followUp({ content: '❌ Ocurrió un error ejecutando el comando.', ephemeral: true });
      }
    }
  }
};

