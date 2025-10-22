// utils/tablaTorneoEquipos.js
const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CANAL_TABLA = '1430007183491207260';
const DB_MENSAJES = path.join(__dirname, 'tablaMensajes.json');

// Cargar o crear registro de mensajes
let mensajesRegistro = {};
if (fs.existsSync(DB_MENSAJES)) {
  mensajesRegistro = JSON.parse(fs.readFileSync(DB_MENSAJES, 'utf8'));
}

async function tablaTorneoEquipos(client, torneo, tablasPorGrupo) {
  try {
    const canal = await client.channels.fetch(CANAL_TABLA);

    for (const [grupo, equipos] of Object.entries(tablasPorGrupo)) {
      let texto = `📌 Grupo ${grupo}\n`;
      texto += `Pos | Equipo            | PJ | PG | PP | Pts | Dif\n`;
      texto += `------------------------------------------------\n`;

      equipos.forEach((eq, i) => {
        texto += `${(i + 1).toString().padEnd(3)} | ${eq.nombre.padEnd(16)} | ${eq.jugados}  | ${eq.ganados}  | ${eq.perdidos}  | ${eq.puntos}   | ${eq.diferencia}\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${torneo.torneo} - Tabla de Posiciones`)
        .setDescription(texto)
        .setColor("#0c74f5")
        .setFooter({ text: "Actualizado automáticamente" })
        .setTimestamp();

      // Revisar si ya hay mensaje para este grupo
      const mensajeId = mensajesRegistro[grupo];
      if (mensajeId) {
        try {
          const mensaje = await canal.messages.fetch(mensajeId);
          await mensaje.edit({ embeds: [embed] });
          console.log(`✅ Grupo ${grupo} actualizado.`);
          continue; // pasa al siguiente grupo
        } catch {
          console.log(`⚠️ No se pudo editar el mensaje del grupo ${grupo}, se creará uno nuevo.`);
        }
      }

      // Enviar nuevo mensaje y guardar ID
      const nuevoMensaje = await canal.send({ embeds: [embed] });
      mensajesRegistro[grupo] = nuevoMensaje.id;
    }

    // Guardar registro actualizado
    fs.writeFileSync(DB_MENSAJES, JSON.stringify(mensajesRegistro, null, 2));

    console.log(`✅ Tabla de posiciones publicada/actualizada correctamente en ${CANAL_TABLA}`);
  } catch (error) {
    console.error('Error publicando la tabla de posiciones:', error);
  }
}

module.exports = { tablaTorneoEquipos };

