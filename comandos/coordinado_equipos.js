// comandos/coordinado_equipos.js
const { SlashCommandBuilder } = require('discord.js');
const path = require('path');
const { convertirFormatoFecha, obtenerDiaSemana } = require('../utils/fechas');
const { validarYFormatearHorario } = require('../utils/horarios');
const { guardarTorneo } = require('../utils/guardarTorneo.js');
// Importamos la nueva utilidad para el autocompletado
const { obtenerTorneosDisponibles, obtenerEquiposInscritos } = require('../utils/obtenerTorneos.js');
const fs = require('fs/promises'); // fs SÍ es necesario para leer el JSON principal en execute

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coordinado_equipos')
    .setDescription('Registra la fecha y horario de un encuentro de equipos')
    .addStringOption(opt =>
      opt
        .setName('torneo')
        .setDescription('Selecciona el torneo')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt
        .setName('equipo1')
        .setDescription('Primer equipo')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt
        .setName('equipo2')
        .setDescription('Segundo equipo')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt
        .setName('fecha')
        .setDescription('Fecha en formato DD-MM-YYYY')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName('horario')
        .setDescription('Horario del encuentro HH:MM')
        .setRequired(true)
    ),

  // Autocomplete: Usamos la sintaxis de asignación de función (CORRECCIÓN de SyntaxError)
  autocomplete: async (interaction) => {
    const focusedOption = interaction.options.getFocused(true);

    // Autocomplete para el nombre del torneo
    if (focusedOption.name === 'torneo') {
        const torneos = await obtenerTorneosDisponibles(); 
        console.log(torneos);    
        const filtered = torneos.filter(t => t.value.toLowerCase().includes(focusedOption.value.toLowerCase()));
        return await interaction.respond(filtered);
    }

    // Autocomplete para los equipos
    if (focusedOption.name === 'equipo1' || focusedOption.isFocused.name === 'equipo2') {
        const torneoId = interaction.options.getString('torneo');
        console.log(torneoId);  
        if (!torneoId) {
          return await interaction.respond([]);
        }
        
        const equipos = await obtenerEquiposInscritos(torneoId);

        const filtered = equipos
            .filter(e => e.toLowerCase().includes(focusedOption.value.toLowerCase()))
            .map(e => ({ name: e, value: e }));
            
        return await interaction.respond(filtered);
    }
  },

  // Execute: Usamos la sintaxis de asignación de función (CORRECCIÓN de SyntaxError)
  execute: async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const torneoId = interaction.options.getString('torneo');
    const eq1 = interaction.options.getString('equipo1');
    const eq2 = interaction.options.getString('equipo2');
    const fecha = interaction.options.getString('fecha');
    const horario = interaction.options.getString('horario');

    const filePath = path.join(__dirname, '..', 'torneos', `${torneoId}.json`);

    let torneo;
    try {
        const data = await fs.readFile(filePath, 'utf8'); 
        torneo = JSON.parse(data);
        console.log(torneo);    
    } catch (error) {
        if (error.code === 'ENOENT') {
            return await interaction.editReply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}`, ephemeral: true });
        }
        console.error('Error leyendo el archivo del torneo:', error);
        return await interaction.editReply({ content: `❌ Ocurrió un error al cargar el torneo ${torneoId}.`, ephemeral: true });
    }

    const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
    if (!fechaFormatoCorrecto) return await interaction.editReply({ content: "❌ Fecha inválida DD-MM-YYYY", ephemeral: true });

    const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);
    const horarioFormateado = validarYFormatearHorario(horario);
    if (!horarioFormateado) return await interaction.editReply({ content: "❌ Formato de horario inválido (HH:MM)", ephemeral: true });

    let partidoCoordinado = false;

    // Buscamos el partido en grupos
    for (const grupo of torneo.grupos || []) {
      for (const partido of grupo.partidos || []) {
        if (
          (partido.equipo1Nombre === eq1 && partido.equipo2Nombre === eq2) ||
          (partido.equipo1Nombre === eq2 && partido.equipo2Nombre === eq1)
        ) {
          partido.fecha = fecha;
          partido.horario = horarioFormateado;
          partido.diaSemana = diaSemana;
          partidoCoordinado = true;
          break;
        }
      }
      if (partidoCoordinado) break;
    }

    // Si no lo encontramos en grupos, buscamos en eliminatorias
    if (!partidoCoordinado) {
      for (const fase of torneo.eliminatorias || []) {
        for (const partido of fase.partidos || []) {
          if (
            (partido.equipo1Nombre === eq1 && partido.equipo2Nombre === eq2) ||
            (partido.equipo1Nombre === eq2 && partido.equipo2Nombre === eq1)
          ) {
            partido.fecha = fecha;
            partido.horario = horarioFormateado;
            partido.diaSemana = diaSemana;
            partidoCoordinado = true;
            break;
          }
        }
        if (partidoCoordinado) break;
      }
    }

    if (partidoCoordinado) {
        await guardarTorneo(torneo, filePath, interaction);
        await interaction.editReply({ content: `✅ Partido coordinado correctamente: **${eq1}** vs **${eq2}** el **${fecha}** (${diaSemana}) a las **${horarioFormateado}**`, ephemeral: false });
    } else {
        await interaction.editReply({ content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`, ephemeral: true });
    }
  }
};


