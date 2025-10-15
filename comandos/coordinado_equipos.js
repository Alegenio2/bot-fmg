// comandos/coordinado_equipos.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { convertirFormatoFecha, obtenerDiaSemana } = require('../utils/fechas');
const { validarYFormatearHorario } = require('../utils/horarios');
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

  // Autocomplete
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true); // option con nombre y valor
    const torneosPath = path.join(__dirname, '..', 'torneos');
    const files = fs.readdirSync(torneosPath).filter(f => f.endsWith('.json'));
    const torneos = files.map(f => f.replace('.json', ''));

    // Autocomplete para el nombre del torneo
    if (focusedOption.name === 'torneo') {
      const filtered = torneos.filter(t => t.toLowerCase().includes(focusedOption.value.toLowerCase()));
      await interaction.respond(filtered.map(t => ({ name: t, value: t })));
      return;
    }

    // Autocomplete para los equipos
    if (focusedOption.name === 'equipo1' || focusedOption.name === 'equipo2') {
      const torneoId = interaction.options.getString('torneo');
      if (!torneoId) {
        await interaction.respond([]);
        return;
      }

      const filePath = path.join(torneosPath, `${torneoId}.json`);
      if (!fs.existsSync(filePath)) {
        await interaction.respond([]);
        return;
      }

      const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Extraemos todos los nombres de equipos de grupos y eliminatorias
      let equipos = [];

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
      await interaction.respond(filtered.map(e => ({ name: e, value: e })));
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
    if (!fs.existsSync(filePath)) {
      return await interaction.editReply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}`, ephemeral: true });
    }

    const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

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
      await interaction.editReply({ content: `✅ Partido coordinado correctamente: ${eq1} vs ${eq2} el ${fecha} (${diaSemana}) a las ${horarioFormateado}`, ephemeral: false });
    } else {
      await interaction.editReply({ content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`, ephemeral: true });
    }
  }
};
