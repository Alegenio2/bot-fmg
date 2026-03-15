/**
 * utils/publicarStatsEncuentro.js
 * Publica un embed en Discord con las civs y mapas del encuentro.
 */

const { EmbedBuilder } = require('discord.js');

// ID del canal donde se publican las stats de civs
// Cambialo por el canal que quieras usar en tu servidor
const CANAL_STATS_ID = process.env.CANAL_STATS_ID || '1473071125541027860';

/**
 * Publica un embed con las estadísticas de civs y mapas del encuentro.
 *
 * @param {Object} client   — El cliente de Discord
 * @param {Object} stats    — Resultado de buscarEstadisticasEncuentro()
 * @param {number} score1   — Puntos del jugador 1 (ej: 1)
 * @param {number} score2   — Puntos del jugador 2 (ej: 3)
 * @param {string} grupo    — Letra del grupo (ej: "B")
 * @param {number} ronda    — Número de ronda
 */
async function publicarStatsEncuentro(client, stats, score1, score2, grupo, ronda) {
  if (!stats) return;

  try {
    const canal = await client.channels.fetch(CANAL_STATS_ID);
    if (!canal) return console.error('⚠️ [publicarStats] Canal no encontrado:', CANAL_STATS_ID);

    const { jugador1, jugador2, mapas, partidas } = stats;
    const ganador = score1 > score2 ? jugador1.nick : jugador2.nick;

    // ── Civs jugador 1 ──
    const civs1Texto = Object.entries(jugador1.civs)
      .map(([civ, d]) => `${getCivEmoji(civ)} **${civ}** — ${d.ganadas}/${d.jugadas} ${d.ganadas === d.jugadas ? '✅' : ''}`)
      .join('\n') || '_Sin datos_';

    // ── Civs jugador 2 ──
    const civs2Texto = Object.entries(jugador2.civs)
      .map(([civ, d]) => `${getCivEmoji(civ)} **${civ}** — ${d.ganadas}/${d.jugadas} ${d.ganadas === d.jugadas ? '✅' : ''}`)
      .join('\n') || '_Sin datos_';

    // ── Detalle partido a partido ──
    const detalleTexto = partidas.map((p, i) => {
      const g1 = p.jugador1.gano ? '✅' : '❌';
      const g2 = p.jugador2.gano ? '✅' : '❌';
      const mins = p.duracion ? ` _(${p.duracion}min)_` : '';
      return `**Juego ${i + 1}** — ${p.mapa}${mins}\n${g1} ${p.jugador1.nick}: **${p.jugador1.civ}**\n${g2} ${p.jugador2.nick}: **${p.jugador2.civ}**`;
    }).join('\n\n') || '_Sin datos_';

    // ── Mapas jugados ──
    const mapasTexto = Object.entries(mapas)
      .map(([mapa, d]) => `🗺️ **${mapa}** (${d.jugadas}x)`)
      .join('\n') || '_Sin datos_';

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ ESTADÍSTICAS — Grupo ${grupo} · Ronda ${ronda}`)
      .setDescription(
        `**${jugador1.nick}** \`${score1}\` — \`${score2}\` **${jugador2.nick}**\n` +
        `🏆 Ganador: **${ganador}**`
      )
      .setColor(score1 > score2 ? '#3498db' : '#e74c3c')
      .addFields(
        { name: `🛡️ Civs — ${jugador1.nick}`, value: civs1Texto, inline: true },
        { name: `🛡️ Civs — ${jugador2.nick}`, value: civs2Texto, inline: true },
        { name: '\u200B', value: '\u200B', inline: false }, // spacer
        { name: '🗺️ Mapas jugados', value: mapasTexto, inline: true },
        { name: '📋 Detalle juego a juego', value: detalleTexto, inline: false },
      )
      .setFooter({ text: 'Copa Uruguaya 2026 · Datos: aoe2companion.com' })
      .setTimestamp();

    await canal.send({ embeds: [embed] });
    console.log(`✅ [publicarStats] Stats publicadas para ${jugador1.nick} vs ${jugador2.nick}`);

  } catch (err) {
    // No bloqueamos nada — si falla el embed, el resultado ya fue guardado
    console.error('❌ [publicarStats] Error publicando embed:', err.message);
  }
}

// Emojis por civ (podés agregar más o reemplazar por emojis de tu servidor)
function getCivEmoji(civ) {
  const map = {
    'Mongols': '🏹', 'Chinese': '🐲', 'Aztecs': '🌞', 'Mayans': '🌿',
    'Franks': '⚜️', 'Britons': '🏹', 'Byzantines': '🏛️', 'Vikings': '⚓',
    'Japanese': '⛩️', 'Persians': '🕌', 'Saracens': '🌙', 'Turks': '🌙',
    'Celts': '🍀', 'Teutons': '🏰', 'Huns': '🐎', 'Koreans': '🎋',
    'Spanish': '⚔️', 'Italians': '🏛️', 'Indians': '🐘', 'Incas': '🦙',
    'Magyars': '🦅', 'Slavs': '🌾', 'Portuguese': '⛵', 'Ethiopians': '🦁',
    'Malians': '🌍', 'Berbers': '🐪', 'Khmer': '🏯', 'Malay': '⛵',
    'Burmese': '🐘', 'Vietnamese': '🎋', 'Bulgarians': '⚔️', 'Tatars': '🐴',
    'Cumans': '🏇', 'Lithuanians': '🐺', 'Burgundians': '🍇', 'Sicilians': '🏝️',
    'Poles': '🦅', 'Bohemians': '⚗️', 'Dravidians': '🌊', 'Bengalis': '🐅',
    'Gurjaras': '🐄', 'Armenians': '⛪', 'Georgians': '🏔️', 'Romans': '🏛️',
    'Hindustanis': '🕌', 'Wei': '⚔️', 'Goths': '💀',
  };
  return map[civ] ?? '🛡️';
}

module.exports = { publicarStatsEncuentro };