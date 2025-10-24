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
  try {
    const focusedOption = interaction.options.getFocused(true);
    const value = focusedOption.value?.toLowerCase() || '';

    // --- AUTOCOMPLETAR TORNEOS ---
    if (focusedOption.name === 'torneo') {
      // Llamada rápida sin await lentos
      const torneos = await obtenerTorneosDisponibles();
      if (!torneos || torneos.length === 0) {
        return interaction.respond([]).catch(() => {});
      }

      const filtered = torneos
        .filter(t => t.name.toLowerCase().includes(value))
        .slice(0, 25);

      return interaction.respond(filtered).catch(() => {});
    }

    // --- AUTOCOMPLETAR EQUIPOS ---
    if (focusedOption.name === 'equipo1' || focusedOption.name === 'equipo2') {
      const torneoId = interaction.options.getString('torneo');
      if (!torneoId) {
        // Si el usuario no eligió torneo todavía
        return interaction.respond([]).catch(() => {});
      }

      const equipos = await obtenerEquiposInscritos(torneoId);
      if (!equipos || equipos.length === 0) {
        return interaction.respond([]).catch(() => {});
      }

      const filtered = equipos
        .filter(e => e.toLowerCase().includes(value))
        .map(e => ({ name: e, value: e }))
        .slice(0, 25);

      return interaction.respond(filtered).catch(() => {});
    }

    // En caso de que no entre en ninguno de los dos if
    return interaction.respond([]).catch(() => {});

  } catch (error) {
    console.error('❌ Error en autocomplete de coordinado_equipos:', error);
    // Prevenir crash si ya se respondió o la interacción expiró
    try { await interaction.respond([]); } catch {}
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

   const filePath = path.join(__dirname, '..', 'torneos', `torneo_${torneoId}.json`);
  console.log(filePath);  

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
const eq1Lower = eq1.toLowerCase().trim();
const eq2Lower = eq2.toLowerCase().trim();

// Buscamos el partido en las rondas de grupos (estructura anidada)
for (const grupo of torneo.rondas_grupos || []) {
  for (const ronda of grupo.partidos || []) {
    for (const partido of ronda.partidos || []) {
      const eq1Partido = partido.equipo1Nombre?.toLowerCase().trim();
      const eq2Partido = partido.equipo2Nombre?.toLowerCase().trim();

      if (
        (eq1Partido === eq1Lower && eq2Partido === eq2Lower) ||
        (eq1Partido === eq2Lower && eq2Partido === eq1Lower)
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
  // Guardamos el torneo
  await guardarTorneo(torneo, filePath, interaction);

  // ✅ Mensaje privado de confirmación
  await interaction.editReply({
    content: `✅ Partido coordinado correctamente: ${eq1} vs ${eq2} el ${fechaFormatoCorrecto} (${diaSemana}) a las ${horarioFormateado}`,
    ephemeral: true
  });

  // 🧾 Embed público para el canal
  const embed = {
    color: 0x0c74f5,
    title: `📅 Partido Coordinado`,
    fields: [
      { name: "🏆 Torneo", value: torneoId.replace(/_/g, ' '), inline: false },
      { name: "⚔️ Enfrentamiento", value: `**${eq1}** vs **${eq2}**`, inline: false },
      { name: "🗓 Fecha", value: fechaFormatoCorrecto, inline: true },
      { name: "⏰ Horario", value: horarioFormateado, inline: true },
      { name: "📅 Día", value: diaSemana, inline: true }
    ],
    footer: { text: "Uruguay Open Cup 2v2 - Coordinación de Partidas" },
    timestamp: new Date().toISOString()
  };

  // Enviamos el embed al mismo canal (visible para todos)
  await interaction.channel.send({ embeds: [embed] });

} else {
  await interaction.editReply({
    content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`,
    ephemeral: true
  });
}

  }
};












