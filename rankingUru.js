const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('./elo');
const rankingConfig = require('./rankingConfig.json');

const usuariosPath = path.resolve(__dirname, 'usuarios.json');
const PAIS_BUSCADO = 'uy';

async function actualizarYPublicarRankingURU(client, guildId) {
  const canalId = rankingConfig.rankingURU[guildId];
  if (!canalId) {
    console.log(`❌ No hay canal configurado para rankingURU en guild ${guildId}`);
    return;
  }

  if (!fs.existsSync(usuariosPath)) {
    console.log('No hay usuarios vinculados.');
    return;
  }

  const asociaciones = JSON.parse(fs.readFileSync(usuariosPath));
  let jugadores = [];

  for (const discordId of Object.keys(asociaciones)) {
    const aoeId = asociaciones[discordId];
    if (!aoeId) continue;

    const datos = await obtenerEloActual(aoeId);
    if (!datos) continue;

    if (datos.country && datos.country.toLowerCase() === PAIS_BUSCADO.toLowerCase()) {
      jugadores.push({
        discordId,
        nombre: datos.nombre,
        elo: datos.elo,
        pais: datos.country,
      });
    }
  }

  if (jugadores.length === 0) {
    console.log(`No se encontraron jugadores del país ${PAIS_BUSCADO}.`);
    return;
  }

  jugadores.sort((a, b) => b.elo - a.elo);

  let mensaje = `**Ranking ELO Uruguay**\n Actualización diaria 19h\n\n `;
  jugadores.forEach((jugador, i) => {
    mensaje += `${i + 1}. ${jugador.nombre} — ELO: ${jugador.elo} — País: ${jugador.pais.toUpperCase()}\n`;
  });

  try {
    const canal = await client.channels.fetch(canalId);
    const mensajes = await canal.messages.fetch({ limit: 10 });
   // Buscar el último mensaje del bot en el canal
    const ultimoMensajeBot = mensajes.find(msg => msg.author.id === client.user.id);
    if (ultimoMensajeBot) {
      await ultimoMensajeBot.delete();
    }

    await canal.send(mensaje);
    console.log(`✅ Ranking URU publicado correctamente en guild ${guildId}.`);
  } catch (error) {
    console.error(`❌ Error al publicar el ranking URU en guild ${guildId}:`, error);
  }
}

module.exports = { actualizarYPublicarRankingURU };
