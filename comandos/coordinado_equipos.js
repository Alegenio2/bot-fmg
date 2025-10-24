// comandos/coordinado_equipos.js
const { SlashCommandBuilder } = require('discord.js');
// ➡️ Importamos la versión de promesas (asíncrona)
const fs = require('fs/promises'); 
const path = require('path');
const { convertirFormatoFecha, obtenerDiaSemana } = require('../utils/fechas');
const { validarYFormatearHorario } = require('../utils/horarios');
// Asumimos que guardarTorneo.js ya ha sido actualizado a asíncrono
const { guardarTorneo } = require('../utils/guardarTorneo.js'); 

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coordinado_equipos')
    .setDescription('Registra la fecha y horario de un encuentro de equipos')
    .addStringOption(opt =>
      opt
        .setName('torneo')
        .setDescription('Selecciona el torneo')
        .setRequired(true)
        .setAutocomplete(true) // autocomplete activado
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

  // Autocomplete (Totalmente Asíncrono)
  async autocomplete(interaction) {
    // Usamos un try/catch global para asegurar la respuesta de autocompletado
    try {
        const focusedOption = interaction.options.getFocused(true); 
        const torneosPath = path.join(__dirname, '..', 'torneos');

        // ⬅️ readdirSync -> await fs.readdir
        const files = await fs.readdir(torneosPath); 
        const filteredFiles = files.filter(f => f.endsWith('.json'));
        const torneos = filteredFiles.map(f => f.replace('.json', ''));

        // Autocomplete para el nombre del torneo
        if (focusedOption.name === 'torneo') {
          const filtered = torneos.filter(t => t.toLowerCase().includes(focusedOption.value.toLowerCase()));
          return await interaction.respond(filtered.map(t => ({ name: t, value: t })));
        }

        // Autocomplete para los equipos
        if (focusedOption.name === 'equipo1' || focusedOption.name === 'equipo2') {
          const torneoId = interaction.options.getString('torneo');
          if (!torneoId) {
            return await interaction.respond([]);
          }

          const filePath = path.join(torneosPath, `${torneoId}.json`);
            
            // ❌ Eliminamos fs.existsSync y usamos try/catch implícito con readFile
            
            let torneo;
            try {
                // ⬅️ readFileSync -> await fs.readFile
                const data = await fs.readFile(filePath, 'utf8');
                torneo = JSON.parse(data);
            } catch (error) {
                // Si el archivo no existe o hay error de lectura, respondemos vacío.
                return await interaction.respond([]);
            }

          // Extraemos todos los nombres de equipos de grupos y eliminatorias
          let equipos = [];

          // La lógica de extracción sigue igual...
          if (torneo.grupos) {
            torneo.grupos.forEach(g => {
              if (g.equipos) equipos.push(...g.equipos.map(eq => eq.nombre || eq));
            });
          }

          if (torneo.eliminatorias) {
            torneo.eliminatorias.forEach(fase => {
              fase.partidos.forEach(p => {
                if (p.equipo1Nombre) equipos.push(p.equipo1Nombre);
                if (p.equipo2Nombre) equipos.push(p.equipo2Nombre);
              });
            });
          }

          // Eliminamos duplicados y valores no strings
          equipos = [...new Set(equipos.filter(e => typeof e === 'string'))];

          const filtered = equipos.filter(e => e.toLowerCase().includes(focusedOption.value.toLowerCase()));
          return await interaction.respond(filtered.map(e => ({ name: e, value: e })));
        }
    } catch (error) {
        console.error('Error en autocompletado:', error);
        // Si hay algún error imprevisto, respondemos vacío para evitar el fallo del autocompletado
        await interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const torneoId = interaction.options.getString('torneo');
    const eq1 = interaction.options.getString('equipo1');
    const eq2 = interaction.options.getString('equipo2');
    const fecha = interaction.options.getString('fecha');
    const horario = interaction.options.getString('horario');

    const filePath = path.join(__dirname, '..', 'torneos', `${torneoId}.json`);

    let torneo;
    try {
      // ⬅️ readFileSync -> await fs.readFile
      const data = await fs.readFile(filePath, 'utf8');
      torneo = JSON.parse(data);
    } catch (error) {
      // Manejamos el error de archivo no encontrado (ENOENT)
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

    // Buscamos el partido en grupos (usando la estructura torneo.rondas_grupos si es tu JSON)
    // NOTA: Tu código original usa 'torneo.grupos', ajusté el bucle para coincidir con tu JSON original
    // Si tu JSON usa 'rondas_grupos', el bucle debe ser: for (const infoGrupo of torneo.rondas_grupos || []) { for (const partido of infoGrupo.partidos || []) { ... } }
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
      // Guardar torneo actualizado (AHORA ASÍNCRONO)
      await guardarTorneo(torneo, filePath, interaction);
      
      await interaction.editReply({ content: `✅ Partido coordinado correctamente: **${eq1}** vs **${eq2}** el **${fecha}** (${diaSemana}) a las **${horarioFormateado}**`, ephemeral: false });
    } else {
      await interaction.editReply({ content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`, ephemeral: true });
    }
  }
};
