//comandos/coordinado_equipos.js
const { SlashCommandBuilder } = require('discord.js');
// ➡️ NO necesitamos fs aquí si usamos las utilidades
const path = require('path');
const { convertirFormatoFecha, obtenerDiaSemana } = require('../utils/fechas');
const { validarYFormatearHorario } = require('../utils/horarios');
const { guardarTorneo } = require('../utils/guardarTorneo.js');
// ➡️ Importamos la nueva utilidad
const { obtenerTorneosDisponibles, obtenerEquiposInscritos } = require('../utils/obtenerTorneos.js');
const fs = require('fs/promises'); // fs SÍ es necesario para leer el JSON principal en execute

module.exports = {
  data: new SlashCommandBuilder()
    // ... (data del comando)
    // ...

  // Autocomplete (Usando las utilidades asíncronas)
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    // Autocomplete para el nombre del torneo
    if (focusedOption.name === 'torneo') {
        // ⬅️ Llamada asíncrona a la utilidad
        const torneos = await obtenerTorneosDisponibles(); 
        const filtered = torneos.filter(t => t.value.toLowerCase().includes(focusedOption.value.toLowerCase()));
        return await interaction.respond(filtered);
    }

    // Autocomplete para los equipos
    if (focusedOption.name === 'equipo1' || focusedOption.isFocused.name === 'equipo2') {
        const torneoId = interaction.options.getString('torneo');
        if (!torneoId) {
          return await interaction.respond([]);
        }
        
        // ⬅️ Llamada asíncrona a la utilidad
        const equipos = await obtenerEquiposInscritos(torneoId);

        const filtered = equipos
            .filter(e => e.toLowerCase().includes(focusedOption.value.toLowerCase()))
            .map(e => ({ name: e, value: e })); // Mapear al formato {name, value}
            
        return await interaction.respond(filtered);
    }
  },

  async execute(interaction) {
    // ⚠️ ATENCIÓN: El código de execute debe seguir leyendo el JSON del torneo
    //    ya que necesita la estructura COMPLETA (grupos, partidos, eliminatorias)
    //    para actualizar fechas y guardarlo. El resto del execute se mantiene igual.
    await interaction.deferReply({ ephemeral: true });

    const torneoId = interaction.options.getString('torneo');
    const eq1 = interaction.options.getString('equipo1');
    const eq2 = interaction.options.getString('equipo2');
    const fecha = interaction.options.getString('fecha');
    const horario = interaction.options.getString('horario');

    const filePath = path.join(__dirname, '..', 'torneos', `${torneoId}.json`);

    let torneo;
    try {
        // ➡️ Mantenemos la lectura del archivo principal aquí (asíncrona)
        const data = await fs.readFile(filePath, 'utf8'); 
        torneo = JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return await interaction.editReply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}`, ephemeral: true });
        }
        console.error('Error leyendo el archivo del torneo:', error);
        return await interaction.editReply({ content: `❌ Ocurrió un error al cargar el torneo ${torneoId}.`, ephemeral: true });
    }
    
    // ... (El resto de la lógica de execute es la misma)
    const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
    if (!fechaFormatoCorrecto) return await interaction.editReply({ content: "❌ Fecha inválida DD-MM-YYYY", ephemeral: true });

    // ... (restos de validaciones y bucles de búsqueda)
    
    let partidoCoordinado = false;
    // ... (búsqueda en grupos)
    // ... (búsqueda en eliminatorias)
    
    if (partidoCoordinado) {
        await guardarTorneo(torneo, filePath, interaction);
        await interaction.editReply({ content: `✅ Partido coordinado correctamente: **${eq1}** vs **${eq2}** el **${fecha}** (${diaSemana}) a las **${horarioFormateado}**`, ephemeral: false });
    } else {
        await interaction.editReply({ content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`, ephemeral: true });
    }
  }
};
