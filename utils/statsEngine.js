/**
 * utils/statsEngine.js
 * Acumula estadísticas del torneo en un JSON persistente.
 *
 * Estructura del archivo stats_copa_2026.json:
 * {
 *   "meta": { torneo, ultima_actualizacion, total_partidas },
 *
 *   "jugadores": {
 *     "DISCORD_ID": {
 *       "nick": "...", "aoe2Id": "...",
 *       "global": { pj, pg, pp, winrate },
 *       "civs": {
 *         "Mongols": { pj, pg, pp, winrate,
 *           "por_mapa": { "Arabia": { pj, pg, pp, winrate } }
 *         }
 *       },
 *       "mapas": {
 *         "Arabia": { pj, pg, pp, winrate }
 *       }
 *     }
 *   },
 *
 *   "mapas": {
 *     "Arabia": {
 *       "total_partidas": N,
 *       "civs_ganadoras": { "Mongols": N, ... },
 *       "civs_perdedoras": { "Vietnamese": N, ... },
 *       "enfrentamientos": { "Mongols_vs_Vietnamese": { total, gano_primero: N } }
 *     }
 *   },
 *
 *   "civs": {
 *     "Mongols": {
 *       "total_jugadas": N, "total_ganadas": N, "winrate": X,
 *       "por_mapa": { "Arabia": { jugadas, ganadas, winrate } },
 *       "vs_civs": { "Vietnamese": { jugadas, ganadas, winrate } }
 *     }
 *   },
 *
 *   "partidas": [ ...historial completo ]
 * }
 */

const fs   = require('fs');
const path = require('path');

const STATS_PATH = path.join(__dirname, '..', 'torneos', 'stats_copa_2026.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcWinrate(pg, pj) {
  if (!pj) return 0;
  return Math.round((pg / pj) * 1000) / 10; // 1 decimal
}

function initJugador(nick, aoe2Id) {
  return {
    nick,
    aoe2Id,
    global: { pj: 0, pg: 0, pp: 0, winrate: 0 },
    civs:   {},
    mapas:  {},
  };
}

function initCivStats() {
  return { pj: 0, pg: 0, pp: 0, winrate: 0, por_mapa: {} };
}

function initMapaStats() {
  return { pj: 0, pg: 0, pp: 0, winrate: 0 };
}

function updateStats(obj, gano) {
  obj.pj++;
  if (gano) obj.pg++; else obj.pp++;
  obj.winrate = calcWinrate(obj.pg, obj.pj);
}

// ─── Cargar / crear stats ─────────────────────────────────────────────────────

function cargarStats() {
  if (fs.existsSync(STATS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    } catch (e) {
      console.error('⚠️ [statsEngine] Error leyendo stats, creando nuevo:', e.message);
    }
  }
  return {
    meta:     { torneo: 'copa_uruguaya_2026', ultima_actualizacion: null, total_partidas: 0 },
    jugadores: {},
    mapas:    {},
    civs:     {},
    partidas: [],
  };
}

function guardarStats(stats) {
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2), 'utf8');
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Toma el resultado de buscarEstadisticasEncuentro() y lo acumula en el JSON de stats.
 *
 * @param {Object} encuentro  — resultado de buscarEstadisticasEncuentro()
 * @param {string} grupo      — "A", "B", etc.
 * @param {number} ronda      — número de ronda
 */
function acumularStats(encuentro, grupo, ronda) {
  if (!encuentro?.partidas?.length) return null;

  const stats = cargarStats();

  for (const partida of encuentro.partidas) {
    const { matchId, fecha, mapa, duracion, jugador1, jugador2 } = partida;

    // Evitar duplicados (si se llama dos veces por el mismo partido)
    if (stats.partidas.find(p => p.matchId === matchId)) {
      console.log(`⚠️ [statsEngine] Partida ${matchId} ya registrada, saltando.`);
      continue;
    }

    // ── Guardar partida en historial ──────────────────────────────────────────
    stats.partidas.push({
      matchId, fecha, mapa, duracion, grupo, ronda,
      jugador1: { discordId: jugador1.discordId ?? jugador1.aoe2Id, nick: jugador1.nick, civ: jugador1.civ, gano: jugador1.gano },
      jugador2: { discordId: jugador2.discordId ?? jugador2.aoe2Id, nick: jugador2.nick, civ: jugador2.civ, gano: jugador2.gano },
    });
    stats.meta.total_partidas++;

    // ── Procesar cada jugador ─────────────────────────────────────────────────
    for (const [jData, rival] of [[jugador1, jugador2], [jugador2, jugador1]]) {
      const did  = jData.discordId ?? jData.aoe2Id;
      const civ  = jData.civ;
      const gano = jData.gano;

      // Init jugador si no existe
      if (!stats.jugadores[did]) {
        stats.jugadores[did] = initJugador(jData.nick, jData.aoe2Id);
      }
      const j = stats.jugadores[did];
      j.nick   = jData.nick; // actualizar por si cambió

      // Global
      updateStats(j.global, gano);

      // Civ global
      if (!j.civs[civ]) j.civs[civ] = initCivStats();
      updateStats(j.civs[civ], gano);

      // Civ × mapa
      if (!j.civs[civ].por_mapa[mapa]) j.civs[civ].por_mapa[mapa] = initMapaStats();
      updateStats(j.civs[civ].por_mapa[mapa], gano);

      // Mapa global del jugador
      if (!j.mapas[mapa]) j.mapas[mapa] = initMapaStats();
      updateStats(j.mapas[mapa], gano);

      // ── Civs globales del torneo ────────────────────────────────────────────
      if (!stats.civs[civ]) {
        stats.civs[civ] = { total_jugadas: 0, total_ganadas: 0, winrate: 0, por_mapa: {}, vs_civs: {} };
      }
      const civG = stats.civs[civ];
      civG.total_jugadas++;
      if (gano) civG.total_ganadas++;
      civG.winrate = calcWinrate(civG.total_ganadas, civG.total_jugadas);

      // Civ × mapa (global torneo)
      if (!civG.por_mapa[mapa]) civG.por_mapa[mapa] = { jugadas: 0, ganadas: 0, winrate: 0 };
      civG.por_mapa[mapa].jugadas++;
      if (gano) civG.por_mapa[mapa].ganadas++;
      civG.por_mapa[mapa].winrate = calcWinrate(civG.por_mapa[mapa].ganadas, civG.por_mapa[mapa].jugadas);

      // Civ vs civ
      const rivalCiv = rival.civ;
      if (!civG.vs_civs[rivalCiv]) civG.vs_civs[rivalCiv] = { jugadas: 0, ganadas: 0, winrate: 0 };
      civG.vs_civs[rivalCiv].jugadas++;
      if (gano) civG.vs_civs[rivalCiv].ganadas++;
      civG.vs_civs[rivalCiv].winrate = calcWinrate(civG.vs_civs[rivalCiv].ganadas, civG.vs_civs[rivalCiv].jugadas);
    }

    // ── Estadísticas por mapa (global torneo) ─────────────────────────────────
    if (!stats.mapas[mapa]) {
      stats.mapas[mapa] = { total_partidas: 0, civs_ganadoras: {}, civs_perdedoras: {}, enfrentamientos: {} };
    }
    const mapaG = stats.mapas[mapa];
    mapaG.total_partidas++;

    const civGanadora  = jugador1.gano ? jugador1.civ : jugador2.civ;
    const civPerdedora = jugador1.gano ? jugador2.civ : jugador1.civ;

    mapaG.civs_ganadoras[civGanadora]   = (mapaG.civs_ganadoras[civGanadora]   ?? 0) + 1;
    mapaG.civs_perdedoras[civPerdedora] = (mapaG.civs_perdedoras[civPerdedora] ?? 0) + 1;

    // Enfrentamiento civ vs civ en ese mapa (ordenado alfabéticamente para consistencia)
    const [civA, civB] = [jugador1.civ, jugador2.civ].sort();
    const key = `${civA}_vs_${civB}`;
    if (!mapaG.enfrentamientos[key]) mapaG.enfrentamientos[key] = { total: 0, gano_primero: 0, civ_a: civA, civ_b: civB };
    mapaG.enfrentamientos[key].total++;
    if (civGanadora === civA) mapaG.enfrentamientos[key].gano_primero++;
  }

  // ── Guardar ───────────────────────────────────────────────────────────────────
  stats.meta.ultima_actualizacion = new Date().toISOString();
  guardarStats(stats);

  console.log(`✅ [statsEngine] Stats actualizadas — ${encuentro.partidas.length} partidas procesadas`);
  return stats;
}

/**
 * Devuelve el JSON de stats completo (para dashboard/overlay).
 */
function obtenerStats() {
  return cargarStats();
}

module.exports = { acumularStats, obtenerStats };