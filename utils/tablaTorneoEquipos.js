const { EmbedBuilder } = require('discord.js');

// Canal y mensaje fijo para este torneo
const CANAL_TABLA = '1430007183491207260';
const MENSAJE_TABLA = '1430007989800145028';

async function tablaTorneoEquipos(client, torneo, tablasPorGrupo) {
  // tablasPorGrupo: { A: [...], B: [...] }

  // Construir texto de la tabla por grupo
  const tablaTextoPorGrupo = Object.entries(tablasPorGrupo).map(([grupo, equipos]) => {
    let texto = `📌 Grupo ${grupo}\n`;
    texto += `Pos | Equipo            | PJ | PG | PP | Pts | Dif\n`;
    texto += `------------------------------------------------\n`;
    equipos.forEach((eq, i) => {
      texto += `${(i + 1).toString().padEnd(3)} | ${eq.nombre.padEnd(16)} | ${eq.pj}  | ${eq.pg}  | ${eq.pp}  | ${eq.pts}   | ${eq.dif}\n`;
    });
    return texto;
  }).join('\n\n');

  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${torneo.torneo} - Tabla de Posiciones`)
    .setDescription(tablaTextoPorGrupo)
    .setColor("#0c74f5")
    .setFooter({ text: "Actualizado automáticamente" })
    .setTimestamp();

  try {
    const canal = await client.channels.fetch(CANAL_TABLA);
    const mensaje = await canal.messages.fetch(MENSAJE_TABLA);
    await mensaje.edit({ embeds: [embed] });
    console.log(`✅ Tabla de posiciones actualizada en el canal ${CANAL_TABLA}`);
  } catch (error) {
    console.error('Error actualizando el mensaje de la tabla:', error);
  }
}

module.exports = { tablaTorneoEquipos };


