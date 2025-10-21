// utils/tablaTorneoEquipos.js
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../botConfig.json");
let config = require(configPath);

/**
 * Publica o actualiza la tabla de posiciones de un torneo de equipos en Discord.
 * Si el torneo no tiene aún posiciones, las inicia vacías.
 */
async function tablaTorneoEquipos(client, torneo) {
  const filePath = path.join(__dirname, "..", "torneos", `${torneo}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encontró el archivo ${torneo}.json`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const serverId = "1302823385167826995"; // 🔧 ID fijo para este caso
  const servidor = config.servidores[serverId];

  if (!servidor) {
    console.error(`Servidor ${serverId} no encontrado en botConfig.json`);
    return;
  }

  const canalId = "1430007183491207260"; // 🔧 Canal fijo de tabla
  const mensajeId = "1430007989800145028"; // 🔧 Mensaje fijo para editar
  const canal = await client.channels.fetch(canalId);

  // Si el JSON tiene "grupos" (como el tuyo)
  if (!data.grupos || !Array.isArray(data.grupos)) {
    console.error("❌ El JSON del torneo no contiene el campo 'grupos'");
    return;
  }

  let contenido = `📊 **${data.torneo.replaceAll("_", " ")} - Tabla de Posiciones**\n`;

  for (const grupo of data.grupos) {
    contenido += `\n📌 **${grupo.nombre}**\n`;
    contenido += "```\n";
    contenido += `Pos | Equipo               | PJ | PG | PP | Pts | Dif\n`;
    contenido += `----------------------------------------------------\n`;

    grupo.equipos.forEach((eq, i) => {
      const pj = eq.jugados ?? 0;
      const pg = eq.ganados ?? 0;
      const pp = eq.perdidos ?? 0;
      const pts = eq.puntos ?? 0;
      const dif = eq.diferencia ?? 0;

      contenido += `${(i + 1).toString().padEnd(3)} | ${eq.nombre.padEnd(20)} | ${pj
        .toString()
        .padEnd(2)} | ${pg.toString().padEnd(2)} | ${pp
        .toString()
        .padEnd(2)} | ${pts.toString().padEnd(3)} | ${dif.toString().padEnd(3)}\n`;
    });

    contenido += "```\n";
  }

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${data.torneo.replaceAll("_", " ")}`)
    .setDescription(contenido)
    .setColor("#0c74f5")
    .setFooter({ text: "Actualizado automáticamente" })
    .setTimestamp();

  try {
    const msg = await canal.messages.fetch(mensajeId);
    await msg.edit({ embeds: [embed] });
    console.log("✅ Tabla actualizada correctamente.");
  } catch (error) {
    console.warn("⚠️ No se pudo editar el mensaje, publicando uno nuevo...", error);
    const newMsg = await canal.send({ embeds: [embed] });
    console.log("🆕 Nueva tabla publicada:", newMsg.id);
  }
}

module.exports = { tablaTorneoEquipos };


