// utils/tablaTorneoEquipos.js
const { EmbedBuilder } = require('discord.js');

/**
 * Publica o actualiza la tabla de posiciones de un torneo de equipos en Discord.
 * Hardcode para un canal y mensaje fijo (por ahora)
 *
 * @param {Object} client - Cliente de Discord
 * @param {Object} torneo - Objeto JSON completo del torneo
 * @param {Object} tablasPorGrupo - Tablas calculadas por grupo
 */
async function tablaTorneoEquipos(client, torneo, tablasPorGrupo) {
  try {
    // HARDCORE: canal y mensaje fijo
    const canalId = '1430007183491207260';
    const mensajeId = '1430007989800145028';

    const canal = await client.channels.fetch(canalId);

    // Construir tabla de texto
    let tablaTexto = '```';
    tablaTexto += `Pos | Equipo            | PJ | PG | PP | Pts | Dif\n`;
    tablaTexto += `------------------------------------------------\n`;

    for (const [grupo, posiciones] of Object.entries(tablasPorGrupo)) {
      tablaTexto += `\n📌 ${grupo}\n`;
      posiciones.forEach((p, i) => {
        const pj = p.jugados ?? 0;
        const pg = p.ganados ?? 0;
        const pp = p.perdidos ?? 0;
        const pts = p.puntos ?? 0;
        const diff = p.diferencia ?? 0;

        tablaTexto += `${(i + 1).toString().padEnd(3)} | ${p.nombre.padEnd(16)} | ${pj.toString().padEnd(2)} | ${pg.toString().padEnd(2)} | ${pp.toString().padEnd(2)} | ${pts.toString().padEnd(3)} | ${diff.toString().padEnd(3)}\n`;
      });
    }

    tablaTexto += '```';

    // Crear embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${torneo.torneo} - Tabla de Posiciones`)
      .setDescription(tablaTexto)
      .setColor('#0c74f5')
      .setFooter({ text: 'Actualizado automáticamente' })
      .setTimestamp();

    // Actualizar mensaje existente
    try {
      const mensaje = await canal.messages.fetch(mensajeId);
      await mensaje.edit({ embeds: [embed] });
      console.log('✅ Tabla de posiciones actualizada correctamente.');
    } catch (error) {
      console.warn('No se pudo actualizar el mensaje, se publicará uno nuevo.', error);
      await canal.send({ embeds: [embed] });
    }

  } catch (error) {
    console.error('Error publicando tabla de torneo:', error);
  }
}

module.exports = { tablaTorneoEquipos };


