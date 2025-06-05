// rankingClan.js
const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('./elo');

const usuariosPath = path.resolve(__dirname, 'usuarios.json');

const CLAN_BUSCADO = 'FUMAG';
const CANAL_DISCORD_ID = '1380268923831980063';

async function actualizarYPublicarRanking(client) {
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

    if (datos.clan && datos.clan.toUpperCase() === CLAN_BUSCADO.toUpperCase()) {
      jugadores.push({
        discordId,
        nombre: datos.nombre,
        elo: datos.elo,
        pais: datos.pais,
      });
    }
  }

  if (jugadores.length === 0) {
    console.log(`No se encontraron jugadores del clan ${CLAN_BUSCADO}.`);
    return;
  }

  jugadores.sort((a, b) => b.elo - a.elo);

  let mensaje = `**Ranking ELO Clan ${CLAN_BUSCADO}**\n\n`;
  jugadores.forEach((jugador, i) => {
    mensaje += `${i + 1}. ${jugador.nombre} — ELO: ${jugador.elo} — País: ${jugador.pais}\n`;
  });

  try {
    const canal = await client.channels.fetch(CANAL_DISCORD_ID);
    await canal.send(mensaje);
    console.log('Ranking publicado correctamente.');
  } catch (error) {
    console.error('Error al publicar el ranking:', error);
  }
}

module.exports = { actualizarYPublicarRanking };
