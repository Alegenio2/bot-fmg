// utils/tablaTorneoEquipos.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../botConfig.json');
let config = require(configPath);

// Canal y mensaje fijo para este torneo
const CANAL_TABLA = '1430007183491207260';
const MENSAJE_TABLA = '1430007989800145028';

async function tablaTorneoEquipos(client, torneoId) {
  // Leer JSON del torneo
  const filePath = path.join(__dirname, '..', 'torneos', `torneo_${torneoId}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encontró el archivo torneo_${torneoId}.json`);
    return;
  }

  const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Construir texto de la tabla por grupo
  const tablaTextoPorGrupo = torneo.grupos.map(grupo => {
    let texto = `📌 ${grupo.nombre}\n`;
    texto += `Pos | Equipo            | PJ | PG | PP | Pts | Dif\n`;
    texto += `------------------------------------------------\n`;
    grupo.equipos.forEach((eq, i) => {
      texto += `${(i + 1).toString().padEnd(3)} | ${eq.nombre.padEnd(16)} | 0  | 0  | 0  | 0   | 0\n`;
    });
    return texto;
  }).join('\n');

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


