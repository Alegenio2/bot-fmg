//utils/tablaTorneoEquipos.js

const { EmbedBuilder } = require('discord.js');

/**
 * Publica o actualiza la tabla de posiciones de un torneo de equipos en Discord
 * @param {Object} interaction - Interacción de Discord
 * @param {Object} torneo - Datos del torneo
 * @param {Object} tablasPorGrupo - Tablas calculadas por grupo (desde calcularTablaPosiciones)
 */
async function tablaTorneoEquipos(interaction, torneo, tablasPorGrupo) {
  const canal = interaction.channel;

  for (const [grupo, posiciones] of Object.entries(tablasPorGrupo)) {
    // Crear tabla de texto alineada
    let tablaTexto = `\`\`\`\n`;
    tablaTexto += `Pos | Equipo            | PJ | PG | PP | Pts | Dif\n`;
    tablaTexto += `------------------------------------------------\n`;
    posiciones.forEach((p, i) => {
      tablaTexto += `${(i + 1).toString().padEnd(3)} | ${p.nombre.padEnd(16)} | ${p.pj.toString().padEnd(2)} | ${p.pg.toString().padEnd(2)} | ${p.pp.toString().padEnd(2)} | ${p.pts.toString().padEnd(3)} | ${p.diff.toString().padEnd(3)}\n`;
    });
    tablaTexto += `\`\`\``;

    // Crear embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${torneo.torneo} - ${grupo}`)
      .setDescription(tablaTexto)
      .setColor("#0c74f5")
      .setFooter({ text: "Actualizado automáticamente" })
      .setTimestamp();

    await canal.send({ embeds: [embed] });
  }
}

module.exports = { tablaTorneoEquipos };
