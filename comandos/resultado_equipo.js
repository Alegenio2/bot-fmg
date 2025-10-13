// comandos/resultado_equipo.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { convertirFormatoFecha } = require('../utils/fechas.js');
const { guardarLiga } = require('../utils/guardarLiga.js');
const { actualizarTablaEnCanal } = require('../utils/tablaPosiciones.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resultado_equipo')
    .setDescription('Registra el resultado de una partida entre equipos.')
    .addStringOption(opt =>
      opt.setName('torneo')
        .setDescription('Selecciona el torneo.')
        .setRequired(true)
        .addChoices(
          { name: 'Uruguay_Open_Cup_2v2', value: 'uruguay_open_cup_2v2' },
          { name: 'Uruguay_Open_Cup_3v3', value: 'uruguay_open_cup_3v3' },
          { name: 'Uruguay_Open_Cup_4v4', value: 'uruguay_open_cup_4v4' },
          { name: 'Copa_Uruguaya_2v2', value: 'copa_uruguaya_2v2' }
        )
    )
    .addStringOption(opt =>
      opt.setName('equipo1')
        .setDescription('Primer equipo')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt.setName('puntos_equipo1')
        .setDescription('Puntos del primer equipo')
        .setRequired(true)
        .addChoices(
          { name: '0', value: 0 },
          { name: '1', value: 1 },
          { name: '2', value: 2 },
          { name: '3', value: 3 }
        )
    )
    .addStringOption(opt =>
      opt.setName('equipo2')
        .setDescription('Segundo equipo')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt.setName('puntos_equipo2')
        .setDescription('Puntos del segundo equipo')
        .setRequired(true)
        .addChoices(
          { name: '0', value: 0 },
          { name: '1', value: 1 },
          { name: '2', value: 2 },
          { name: '3', value: 3 }
        )
    )
    .addStringOption(opt =>
      opt.setName('fecha')
        .setDescription('Fecha del partido (DD/MM/AAAA)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('draftmapas')
        .setDescription('Draft de mapas')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('draftcivis')
        .setDescription('Draft de civilizaciones')
        .setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('archivo')
        .setDescription('Archivo adjunto (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.reply({ content: '⏳ Registrando resultado...', ephemeral: true });

    const torneo = interaction.options.getString('torneo');
    const equipo1 = interaction.options.getString('equipo1');
    const equipo2 = interaction.options.getString('equipo2');
    const puntos1 = interaction.options.getInteger('puntos_equipo1');
    const puntos2 = interaction.options.getInteger('puntos_equipo2');
    const fecha = interaction.options.getString('fecha');
    const draftmapas = interaction.options.getString('draftmapas') || null;
    const draftcivis = interaction.options.getString('draftcivis') || null;
    const archivoAdjunto = interaction.options.getAttachment('archivo');

    // Validaciones básicas
    if (equipo1 === equipo2) {
      return interaction.editReply({ content: '⚠️ No puedes registrar un partido entre el mismo equipo.' });
    }

    const fechaISO = convertirFormatoFecha(fecha);
    if (!fechaISO) {
      return interaction.editReply({ content: '⚠️ Fecha inválida.' });
    }

    // 📂 Leer la liga del torneo correspondiente
    const filePath = path.join(__dirname, '..', 'ligas', `${torneo}.json`);
    if (!fs.existsSync(filePath)) {
      return interaction.editReply({ content: `⚠️ No existe el archivo de liga para ${torneo}.` });
    }

    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Buscar partido entre esos equipos
    let partidoEncontrado = null;
    for (const ronda of liga.rondas || []) {
      for (const partido of ronda.partidos) {
        if (
          (partido.equipo1 === equipo1 && partido.equipo2 === equipo2) ||
          (partido.equipo1 === equipo2 && partido.equipo2 === equipo1)
        ) {
          partidoEncontrado = partido;
          partido.resultado = {
            [equipo1]: puntos1,
            [equipo2]: puntos2,
            draftmapas,
            draftcivis,
            rec: archivoAdjunto?.url || null,
            fecha: fechaISO,
          };
          break;
        }
      }
      if (partidoEncontrado) break;
    }

    if (!partidoEncontrado) {
      return interaction.editReply({ content: '⚠️ No se encontró un partido entre esos equipos.' });
    }

    // Guardar la liga actualizada
    await guardarLiga(liga, filePath, torneo, interaction);

    // Actualizar tabla de posiciones
    await actualizarTablaEnCanal(torneo, interaction.client, interaction.guildId);

    // Mensaje final público
    const mensaje = `🏆 **${torneo}**  
📅 Fecha: ${fecha}  
🎮 ${equipo1} (${puntos1}) 🆚 ${equipo2} (${puntos2})  
🗺️ Mapas: ${draftmapas || 'N/D'}  
⚔️ Civilizaciones: ${draftcivis || 'N/D'}  
📎 ${archivoAdjunto?.url || 'Sin archivo'}`;

    await interaction.followUp({ content: mensaje, ephemeral: false });
  },
};
