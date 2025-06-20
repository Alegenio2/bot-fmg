// utiles/tablaPosiciones.js
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// Calcula la tabla de posiciones a partir del JSON de liga
function calcularTablaPosiciones(categoria) {
  const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
  if (!fs.existsSync(filePath)) return null;

  const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const tabla = {};
  liga.participantes.forEach(p => {
    tabla[p.id] = {
      nombre: p.nombre,
      pj: 0,
      pg: 0,
      pp: 0,
      puntos: 0,
      diff: 0
    };
  });

  liga.jornadas.forEach(jornada => {
    jornada.partidos.forEach(partido => {
      if (!partido.resultado) return;

      const r = partido.resultado;
      const j1 = partido.jugador1Id;
      const j2 = partido.jugador2Id;
      const p1 = r[j1] ?? 0;
      const p2 = r[j2] ?? 0;

      tabla[j1].pj++;
      tabla[j2].pj++;

      tabla[j1].puntos += p1;
      tabla[j2].puntos += p2;

      tabla[j1].diff += (p1 - p2);
      tabla[j2].diff += (p2 - p1);

      if (p1 > p2) {
        tabla[j1].pg++;
        tabla[j2].pp++;
      } else if (p2 > p1) {
        tabla[j2].pg++;
        tabla[j1].pp++;
      }
    });
  });

  const posiciones = Object.values(tabla).sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.diff !== a.diff) return b.diff - a.diff;
    return a.nombre.localeCompare(b.nombre);
  });

  return posiciones;
}

// Genera el texto de la tabla para mostrar en Discord
function generarTextoTabla(posiciones, categoria) {
  let mensaje = `📊 **Tabla de posiciones - Categoría ${categoria.toUpperCase()}**\n\n`;
  mensaje += `Pos | Jugador       | PJ | PG | PP | Pts | Dif\n`;
  mensaje += `--------------------------------------------\n`;

  posiciones.forEach((p, i) => {
    mensaje += `${(i + 1).toString().padEnd(3)} | ${p.nombre.padEnd(13)} | ${p.pj.toString().padEnd(2)} | ${p.pg.toString().padEnd(2)} | ${p.pp.toString().padEnd(2)} | ${p.puntos.toString().padEnd(3)} | ${p.diff.toString().padEnd(3)}\n`;
  });

  return `\`\`\`\n${mensaje}\`\`\``;
}

// Edita el mensaje ya publicado en el canal correspondiente
async function actualizarTablaEnCanal(categoria, client, guildId) {
  const serverConfig = config.servidores[guildId];
  if (!serverConfig) return;

  const canalId = serverConfig[`categoria${categoria.toUpperCase()}`];
  const mensajeId = serverConfig.mensajeTabla?.[categoria];
  if (!canalId || !mensajeId) return;

  const posiciones = calcularTablaPosiciones(categoria);
  if (!posiciones) return;

  const mensaje = generarTextoTabla(posiciones, categoria);

  try {
    const canal = await client.channels.fetch(canalId);
    const mensajeExistente = await canal.messages.fetch(mensajeId);
    await mensajeExistente.edit(mensaje);
  } catch (error) {
    console.warn(`⚠️ No se pudo editar la tabla de posiciones: ${error.message}`);
  }
}

module.exports = {
  calcularTablaPosiciones,
  generarTextoTabla,
  actualizarTablaEnCanal
};
