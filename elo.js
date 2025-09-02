// elo.js
const fetch = require('node-fetch');

// 🔹 Delay en ms entre cada request
const DELAY_MS = 500;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function obtenerEloActual(profileId) {
  const url = `https://data.aoe2companion.com/api/profiles/${profileId}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "aldeano-oscar-bot/1.0 (jabstv2@gmail.com)"
      }
    });

    const contentType = res.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const texto = await res.text();
      console.warn(`⚠️ Respuesta no-JSON para perfil ${profileId}:`, texto.slice(0, 150));
      return null;
    }

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
      country: data.country,
      clan: data.clan || null,
      elomax: leaderboard1v1.maxRating,
      ultimapartida: leaderboard1v1.lastMatchTime || null,
    };

  } catch (error) {
    console.error(`❌ Error al obtener ELO de perfil ${profileId}:`, error.message);
    return null;
  } finally {
    // 👇 forzar delay después de cada request
    await delay(DELAY_MS);
  }
}

module.exports = { obtenerEloActual };

