// utils/tablaTorneoEquipos.js
const { EmbedBuilder } = require('discord.js');

// Hardcode temporal para el torneo Uruguay Open Cup 2v2
const HARD_CODE_CANAL = '1430007183491207260';
const HARD_CODE_MESSAGE = '1430007989800145028';

/**
 * Publica o actualiza la tabla de posiciones de un torneo de equipos en Discord.
 * Para este caso, todos los grupos se publican en un solo canal y mensaje.
 *
 * @param {Object} client - Cliente de Discord
 * @param {Object} torneo - Datos del torneo
 * @param {Object} tablasPorGrupo - Tablas calculadas por grupo
 */
async function tablaTorneoEquipos(client, torneo, tablasPorGrupo) {
  try {
    const canal = await client.channels.fetch(HARD_CODE_CANAL);

    // Construir tabla combinada de todos los grupos
    let descripcion = '';
    for (const [grupo, posiciones] of Object.entries(tablasPorGrupo)) {
      descripcion += `📊 **${grupo}**\n\`\`\`\n`;
      descripcion += `Pos | Equipo            | PJ | PG | PP | Pts | Dif\n`;
      descripcion += `------------------------------------------------\n`;
      posiciones.forEach((p, i) => {
        const pj = p.jugados ?? 0;
        const pg = p.ganados ?? 0;
        const pp = p.perdidos ?? 0;
        const pts = p.puntos ?? 0;
        const diff = p.diferencia ?? 0;
        descripcion += `${(i + 1).toString().padEnd(3)} | ${p.nombre.padEnd(16)} | ${pj.toString().padEnd(2)} | ${pg.toString().padEnd(2)} | ${pp.toString().padEnd(2)} | ${pts.toString().padEnd(3)} | ${diff.toString().padEnd(3)}\n`;
      });
      descripcion += `\`\`\`\n\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${torneo.torneo} - Tabla de Posiciones`)
      .setDescription(descripcion)
      .setColor('#0c74f5')
      .setFooter({ text: 'Actualizado automáticamente' })
      .setTimestamp();

    // Editar mensaje existente o publicar uno nuevo
    try {
      const message = await canal.messages.fetch(HARD_CODE_MESSAGE);
      await message.edit({ embeds: [embed] });
      console.log('✅ Tabla de posiciones actualizada.');
    } catch (err) {
      // Si no existe el mensaje, crearlo
      const message = await canal.send({ embeds: [embed] });
      console.log('🆕 Tabla de posiciones publicada por primera vez.');
    }
  } catch (error) {
    console.error('Error publicando tabla de posiciones:', error);
  }
}

module.exports = { tablaTorneoEquipos };


