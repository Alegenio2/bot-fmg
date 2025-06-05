// rankingUru.js
const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('./elo');

const usuariosPath = path.resolve(__dirname, 'usuarios.json');

const PAIS_BUSCADO = 'uy';
const CANAL_DISCORD_ID = '1380278243092988026';

async function actualizarYPublicarRankingUru(client) {
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
     console.log(datos);
    if (!datos) continue;

    if (datos.country && datos.country.toUpperCase() === PAIS_BUSCADO.toUpperCase()) {
        console.log(datos.country);
      jugadores.push({
        discordId,
        nombre: datos.nombre,
        elo: datos.elo,
        country: datos.country,
      });
    }
  }

  if (jugadores.length === 0) {
   
    console.log(`No se encontraron jugadores del pais ${PAIS_BUSCADO}.`);
    return;
  }

  jugadores.sort((a, b) => b.elo - a.elo);

  let mensaje = `**Ranking ELO Uruguay**\n\n`;
  jugadores.forEach((jugador, i) => {
    mensaje += `${i + 1}. ${jugador.nombre} — ELO: ${jugador.elo} — País: ${jugador.country}\n`;
  });

  try {
    const canal = await client.channels.fetch(CANAL_DISCORD_ID);
    await canal.send(mensaje);
    console.log('Ranking publicado correctamente.');
  } catch (error) {
    console.error('Error al publicar el ranking:', error);
  }
}

module.exports = { actualizarYPublicarRankingUru };
