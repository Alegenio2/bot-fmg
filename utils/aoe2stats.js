/**
 * utils/aoe2stats.js
 * Busca en la API de aoe2companion las partidas de un encuentro del torneo
 * y devuelve civs, mapas y ganador de cada juego.
 *
 * Uso desde resultado_copa.js:
 *   const { buscarEstadisticasEncuentro } = require('../utils/aoe2stats');
 *   const stats = await buscarEstadisticasEncuentro(torneo, j1.id, j2.id, totalPartidas);
 */

const https = require('https');

// ─── HTTP GET ─────────────────────────────────────────────────────────────────

function httpGet(hostname, path, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname, path, method: 'GET',
        headers: { 'User-Agent': 'bot-fmg/1.0', Accept: 'application/json' },
      },
      (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          const loc  = res.headers.location;
          const host = loc.replace(/^https?:\/\//, '').split('/')[0];
          const p    = loc.replace(/^https?:\/\/[^/]+/, '') || '/';
          return httpGet(host, p, timeoutMs).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => reject(new Error(`HTTP ${res.statusCode} — ${b.slice(0, 100)}`)));
          return;
        }
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve(JSON.parse(d)); }
          catch (e) { reject(new Error(`JSON inválido: ${e.message}`)); }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`Timeout ${timeoutMs}ms`)); });
    req.end();
  });
}

// ─── Fetch partidas — 1 solo request, perPage configurable ───────────────────
// En producción: page=1, perPage=300 trae todo el historial reciente de una vez.
// Las partidas del torneo siempre están dentro de las últimas 300 del jugador.

async function fetchPartidas(profileId, perPage = 300) {
  const path = `/api/matches?profile_ids=${profileId}&use_enums=true&page=1&per_page=${perPage}`;
  const data = await httpGet('data.aoe2companion.com', path);
  return Array.isArray(data) ? data : (data.matches ?? []);
}

// ─── Filtro: 1v1 unranked entre dos jugadores en equipos distintos ────────────

function filtrarDuelos(matches, aoe2Id1, aoe2Id2) {
  const id1 = String(aoe2Id1);
  const id2 = String(aoe2Id2);

  return matches.filter(match => {
    // Solo partidas unranked (las del torneo)
    if (match.leaderboard !== 'unranked' && match.leaderboardId !== 'unranked') return false;

    let team1 = null, team2 = null;
    for (const team of (match.teams ?? [])) {
      for (const p of (team.players ?? [])) {
        const pid = String(p.profileId ?? '');
        if (pid === id1) team1 = team.teamId;
        if (pid === id2) team2 = team.teamId;
      }
    }
    // Ambos presentes en equipos distintos (descarta teamgames)
    return team1 !== null && team2 !== null && team1 !== team2;
  });
}

// ─── Extrae info de una partida ───────────────────────────────────────────────

function extraerPartida(match, aoe2Id1, aoe2Id2, discordId1 = null, discordId2 = null) {
  const id1 = String(aoe2Id1);
  const id2 = String(aoe2Id2);

  let j1 = null, j2 = null;
  for (const team of (match.teams ?? [])) {
    for (const p of (team.players ?? [])) {
      const pid = String(p.profileId ?? '');
      if (pid === id1) j1 = p;
      if (pid === id2) j2 = p;
    }
  }

  return {
    matchId:  match.matchId,
    fecha:    match.started ? new Date(match.started).toISOString() : null,
    mapa:     match.mapName ?? 'Desconocido',
    duracion: match.finished && match.started
      ? Math.round((new Date(match.finished) - new Date(match.started)) / 60000)
      : null,
    jugador1: {
      aoe2Id:    id1,
      discordId: discordId1,   // para cruzar con el JSON del torneo
      nick:      j1?.name   ?? '?',
      civ:       j1?.civName ?? j1?.civ ?? '?',
      gano:      j1?.won === true,
    },
    jugador2: {
      aoe2Id:    id2,
      discordId: discordId2,
      nick:      j2?.name   ?? '?',
      civ:       j2?.civName ?? j2?.civ ?? '?',
      gano:      j2?.won === true,
    },
    ganador: j1?.won ? id1 : j2?.won ? id2 : null,
  };
}

// ─── Función principal exportada ─────────────────────────────────────────────

/**
 * Busca las partidas de un encuentro del torneo en la API de aoe2companion.
 *
 * @param {Object} torneo         — El objeto JSON del torneo (ya parseado)
 * @param {string} discordId1     — Discord ID del jugador 1
 * @param {string} discordId2     — Discord ID del jugador 2
 * @param {number} totalPartidas  — Cuántas partidas tiene el encuentro (ej: 4 para un 3-1)
 * @returns {Object|null}         — Stats del encuentro o null si no se encontró nada
 */
async function buscarEstadisticasEncuentro(torneo, discordId1, discordId2, totalPartidas) {
  // Obtener los aoe2 IDs de los jugadores desde el JSON del torneo
  let aoe2Id1 = null, aoe2Id2 = null, nick1 = null, nick2 = null;

  for (const grupo of (torneo.grupos ?? [])) {
    for (const j of (grupo.jugadores ?? [])) {
      if (j.id === discordId1) { aoe2Id1 = String(j.idaoe2); nick1 = j.nick; }
      if (j.id === discordId2) { aoe2Id2 = String(j.idaoe2); nick2 = j.nick; }
    }
  }

  if (!aoe2Id1 || !aoe2Id2) {
    console.warn(`⚠️ [aoe2stats] No se encontró idaoe2 para ${discordId1} o ${discordId2}`);
    return null;
  }

  console.log(`🔍 [aoe2stats] Buscando partidas: ${nick1} (${aoe2Id1}) vs ${nick2} (${aoe2Id2})`);

  // Un solo request con las últimas 300 partidas del jugador 1.
  // Con perPage=300 traemos todo de una, sin paginación ni deduplicación.
  // El jugador con menos partidas recientes puede no tener el encuentro,
  // por eso buscamos por quien tenga el historial más completo (jugador 1 por defecto).
  let matches;
  try {
    matches = await fetchPartidas(aoe2Id1);
    console.log(`   → ${matches.length} partidas obtenidas`);
  } catch (e) {
    console.error(`❌ [aoe2stats] Error fetching partidas: ${e.message}`);
    return null;
  }

  // Filtrar duelos válidos
  const duelos = filtrarDuelos(matches, aoe2Id1, aoe2Id2);

  if (duelos.length === 0) {
    console.warn(`⚠️ [aoe2stats] No se encontraron duelos en las últimas 30 partidas de cada jugador.`);
    return null;
  }

  // Ordenar por fecha descendente y tomar las N más recientes
  duelos.sort((a, b) => new Date(b.started ?? 0) - new Date(a.started ?? 0));
  const partidas = duelos.slice(0, totalPartidas).map(m => extraerPartida(m, aoe2Id1, aoe2Id2, discordId1, discordId2));

  // Construir estadísticas del encuentro
  const civs1 = {}, civs2 = {}, mapas = {};
  let victorias1 = 0, victorias2 = 0;

  for (const p of partidas) {
    if (p.jugador1.gano) victorias1++;
    if (p.jugador2.gano) victorias2++;

    // Civs jugador 1
    civs1[p.jugador1.civ] = civs1[p.jugador1.civ] ?? { jugadas: 0, ganadas: 0 };
    civs1[p.jugador1.civ].jugadas++;
    if (p.jugador1.gano) civs1[p.jugador1.civ].ganadas++;

    // Civs jugador 2
    civs2[p.jugador2.civ] = civs2[p.jugador2.civ] ?? { jugadas: 0, ganadas: 0 };
    civs2[p.jugador2.civ].jugadas++;
    if (p.jugador2.gano) civs2[p.jugador2.civ].ganadas++;

    // Mapas
    mapas[p.mapa] = mapas[p.mapa] ?? { jugadas: 0, gano1: 0, gano2: 0 };
    mapas[p.mapa].jugadas++;
    if (p.jugador1.gano) mapas[p.mapa].gano1++;
    if (p.jugador2.gano) mapas[p.mapa].gano2++;
  }

  return {
    jugador1:   { discordId: discordId1, aoe2Id: aoe2Id1, nick: nick1, victorias: victorias1, civs: civs1 },
    jugador2:   { discordId: discordId2, aoe2Id: aoe2Id2, nick: nick2, victorias: victorias2, civs: civs2 },
    mapas,
    partidas,   // detalle partido a partido
  };
}

module.exports = { buscarEstadisticasEncuentro };