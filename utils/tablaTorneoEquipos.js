//utils/tablaTorneoEquipos.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../botConfig.json');
let config = require(configPath);

/**
 * Publica o actualiza la tabla de posiciones de un torneo de equipos en Discord.
 * Si ya existe un mensaje registrado en botConfig.json, lo edita.
 * Si no existe, publica uno nuevo y guarda el messageId.
 *
 * @param {Object} client - Cliente de Discord
 * @param {Object} torneo - Datos del torneo (nombre, servidorId, etc.)
 * @param {Object} tablasPorGrupo - Tablas calculadas por grupo
 */
async function tablaTorneoEquipos(client, torneo, tablasPorGrupo) {
  const serverId = torneo.serverId;
  const servidor = config.servidores[serverId];

  if (!servidor) {
    console.error(`Servidor ${serverId} no encontrado en botConfig.json`);
    return;
  }

  for (const [grupo, posiciones] of Object.entries(tablasPorGrupo)) {
    // Crear tabla de texto
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

    // Canal de la categoría
    const canalId = servidor[`tablaCategoria${grupo.toUpperCase()}`];
    if (!canalId) {
      console.warn(`No se encontró tablaCategoria${grupo.toUpperCase()} en botConfig.json`);
      continue;
    }

    const canal = await client.channels.fetch(canalId);

    // Buscar si ya hay un mensaje guardado
    const messageId = servidor.mensajeTabla?.[grupo.toLowerCase()];
    if (messageId) {
      try {
        const message = await canal.messages.fetch(messageId);
        await message.edit({ embeds: [embed] });
        console.log(`✅ Tabla del grupo ${grupo} actualizada.`);
      } catch (error) {
        console.warn(`No se pudo editar el mensaje del grupo ${grupo}. Se publicará uno nuevo.`, error);
        await publicarNuevoMensaje(canal, embed, serverId, grupo);
      }
    } else {
      await publicarNuevoMensaje(canal, embed, serverId, grupo);
    }
  }
}

/**
 * Publica un nuevo mensaje de tabla y guarda su ID en botConfig.json
 */
async function publicarNuevoMensaje(canal, embed, serverId, grupo) {
  const message = await canal.send({ embeds: [embed] });

  if (!config.servidores[serverId].mensajeTabla) {
    config.servidores[serverId].mensajeTabla = {};
  }
  config.servidores[serverId].mensajeTabla[grupo.toLowerCase()] = message.id;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`🆕 Nueva tabla publicada para grupo ${grupo}, messageId guardado.`);
}

module.exports = { tablaTorneoEquipos };

