/**
 * utils/aoe2stats.js
 * Busca en la API de aoe2companion las partidas de un encuentro del torneo
 * y devuelve civs, mapas y ganador de cada juego.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

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

// ─── Fetch partidas ──────────────────────────────────────────────────────────

async function fetchPartidas(profileId, perPage = 300) {
  const path = `/api/matches?profile_ids=${profileId}&use_enums=true&page=1&per_page=${perPage}`;
  const data = await httpGet('data.aoe2companion.com', path);
  return Array.isArray(data) ? data : (data.matches ?? []);
}

// ─── Filtro: 1v1 unranked ────────────────────────────────────────────────────

function filtrarDuelos(matches, aoe2Id1, aoe2Id2) {
  const id1 = String(aoe2Id1);
  const id2 = String(aoe2Id2);

  return matches.filter(match => {
    if (match.leaderboard !== 'unranked' && match.leaderboardId !== 'unranked') return false;

    let team1 = null, team2 = null;
    for (const team of (match.teams ?? [])) {
      for (const p of (team.players ?? [])) {
        const pid = String(p.profileId ?? '');
        if (pid === id1) team1 = team.teamId;
        if (pid === id2) team2 = team.teamId;
      }
    }
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

  const duracionMinutos = match.finished && match.started
    ? Math.round((new Date(match.finished) - new Date(match.started)) / 60000)
    : 0;

  return {
    matchId:  match.matchId,
    fecha:    match.started ? new Date(match.started).toISOString() : null,
    mapa:     match.mapName ?? 'Desconocido',
    duracion: duracionMinutos,
    jugador1: {
      aoe2Id:    id1,
      discordId: discordId1,
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

async function buscarEstadisticasEncuentro(torneo, discordId1, discordId2, totalPartidas) {
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

  let matches;
  try {
    matches = await fetchPartidas(aoe2Id1);
  } catch (e) {
    console.error(`❌ [aoe2stats] Error: ${e.message}`);
    return null;
  }

  const duelos = filtrarDuelos(matches, aoe2Id1, aoe2Id2);
  if (duelos.length === 0) return null;

  // 1. Ordenar por fecha (más reciente primero)
  duelos.sort((a, b) => new Date(b.started ?? 0) - new Date(a.started ?? 0));

  const duelosSinRestores = [];
  for (let i = 0; i < duelos.length; i++) {
    const actual = duelos[i];
    
    // --- FILTRO POR DURACIÓN (Mínimo 8 minutos) ---
    const duracionSegundos = actual.finished && actual.started 
      ? (new Date(actual.finished) - new Date(actual.started)) / 1000 
      : 0;

    if (duracionSegundos < 480) { // 8 minutos * 60 segundos
      const logPath = path.join(__dirname, 'restores.log');
      fs.appendFileSync(logPath, `[${new Date().toLocaleString()}] DESCARTADA (Corta): Match ${actual.matchId} duró ${Math.round(duracionSegundos)}s\n`);
      continue; 
    }

    // --- FILTRO POR PROXIMIDAD (Detectar restores largos) ---
    const siguiente = duelos[i + 1];
    if (siguiente && actual.mapName === siguiente.mapName) {
      const diffHoras = Math.abs(new Date(actual.started) - new Date(siguiente.started)) / (1000 * 60 * 60);
      
      if (diffHoras < 1.5) {
        const logPath = path.join(__dirname, 'restores.log');
        fs.appendFileSync(logPath, `[${new Date().toLocaleString()}] RESTORE DETECTADO: Se conserva ${actual.matchId} y se ignora ${siguiente.matchId}\n`);
        
        duelosSinRestores.push(actual);
        i++; // Saltar el siguiente duelo (el restore)
        continue;
      }
    }
    duelosSinRestores.push(actual);
  }

  // 3. Tomar la cantidad de partidas que indica el resultado
  const partidas = duelosSinRestores
    .slice(0, totalPartidas)
    .map(m => extraerPartida(m, aoe2Id1, aoe2Id2, discordId1, discordId2));

  // Procesar acumulados (Civs y Mapas)
  const civs1 = {}, civs2 = {}, mapas = {};
  let victorias1 = 0, victorias2 = 0;

  for (const p of partidas) {
    if (p.jugador1.gano) victorias1++;
    if (p.jugador2.gano) victorias2++;

    civs1[p.jugador1.civ] = civs1[p.jugador1.civ] ?? { jugadas: 0, ganadas: 0 };
    civs1[p.jugador1.civ].jugadas++;
    if (p.jugador1.gano) civs1[p.jugador1.civ].ganadas++;

    civs2[p.jugador2.civ] = civs2[p.jugador2.civ] ?? { jugadas: 0, ganadas: 0 };
    civs2[p.jugador2.civ].jugadas++;
    if (p.jugador2.gano) civs2[p.jugador2.civ].ganadas++;

    mapas[p.mapa] = mapas[p.mapa] ?? { jugadas: 0, gano1: 0, gano2: 0 };
    mapas[p.mapa].jugadas++;
    if (p.jugador1.gano) mapas[p.mapa].gano1++;
    if (p.jugador2.gano) mapas[p.mapa].gano2++;
  }

  return {
    jugador1: { discordId: discordId1, aoe2Id: aoe2Id1, nick: nick1, victorias: victorias1, civs: civs1 },
    jugador2: { discordId: discordId2, aoe2Id: aoe2Id2, nick: nick2, victorias: victorias2, civs: civs2 },
    mapas,
    partidas,
  };
}

module.exports = { buscarEstadisticasEncuentro };