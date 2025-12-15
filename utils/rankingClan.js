const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('./elo');
const rankingConfig = require('../rankingConfig.json');

const usuariosPath = path.resolve(__dirname, '../usuarios.json');
const CLAN_BUSCADO = 'FUMAG';

async function actualizarYPublicarRankingClan(client, guildId) {
  const canalId = rankingConfig.rankingClan[guildId];
  if (!canalId) {
    console.log(`❌ No hay canal configurado para rankingClan en guild ${guildId}`);
    return;
  }

  if (!fs.existsSync(usuariosPath)) {
    console.log('❌ No hay usuarios vinculados.');
    return;
  }

  const asociaciones = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
  let jugadores = [];

  for (const discordId of Object.keys(asociaciones)) {
    // 🔹 AHORA el usuario es un objeto
    const usuario = asociaciones[discordId];

    // 🔹 Tomamos el profileId correctamente
    const aoeId = usuario?.profileId;
    if (!aoeId) continue;

    const datos = await obtenerEloActual(aoeId);
    if (!datos) continue;

    if (
      datos.clan &&
      datos.clan.toUpperCase() === CLAN_BUSCADO.toUpperCase()
    ) {
      jugadores.push({
        discordId,
        nombre: datos.nombre || usuario.nombre,
        elo: datos.elo,
        pais: datos.country || datos.pais || usuario.pais,
      });
    }
  }

  if (jugadores.length === 0) {
    console.log(`❌ No se encontraron jugadores del clan ${CLAN_BUSCADO}.`);
    return;
  }

  jugadores.sort((a, b) => b.elo - a.elo);

  let mensaje = `**🏆 Ranking ELO Clan ${CLAN_BUSCADO}**\n\n`;
  jugadores.forEach((jugador, i) => {
    mensaje += `${i + 1}. ${jugador.nombre} — **ELO:** ${jugador.elo} — ${jugador.pais}\n`;
  });

  try {
    const canal = await client.channels.fetch(canalId);
    const mensajes = await canal.messages.fetch({ limit: 10 });

    // 🔹 borrar último mensaje del bot
    const ultimoMensajeBot = mensajes.find(
      msg => msg.author.id === client.user.id
    );

    if (ultimoMensajeBot) {
      await ultimoMensajeBot.delete();
    }

    await canal.send(mensaje);
    console.log('✅ Ranking del clan publicado correctamente.');
  } catch (error) {
    console.error('❌ Error al publicar el ranking del clan:', error);
  }
}

module.exports = { actualizarYPublicarRankingClan };



