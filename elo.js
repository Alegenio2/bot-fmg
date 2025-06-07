// elo.js
const fetch = require('node-fetch');

async function obtenerEloActual(profileId) {
  const url = `https://data.aoe2companion.com/api/profiles/${profileId}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.leaderboards || data.leaderboards.length === 0) {
      return null;
    }

    const leaderboard1v1 = data.leaderboards.find(lb => lb.leaderboardId === 'rm_1v1');
    if (!leaderboard1v1) return null;

    return {
      nombre: data.name,
      elo: leaderboard1v1.rating,
      rank: leaderboard1v1.rank,
      wins: leaderboard1v1.wins,
      losses: leaderboard1v1.losses,
      pais: data.countryIcon,
      country : data.country,
      clan: data.clan || null,
      elomax: leaderboard1v1.maxRating,
      ultimapartida: leaderboard1v1.lastMatchTime || null,
    };
  } catch (error) {
    console.error("Error al obtener ELO:", error);
    return null;
  }
}

module.exports = { obtenerEloActual };
