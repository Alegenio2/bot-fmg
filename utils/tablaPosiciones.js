// utiles/tablaPosiciones.js
const fs = require('fs');
const path = require('path');
const config = require('../botConfig.json'); // Ruta de tu configuración

// 🧠 Calcula la tabla de posiciones a partir del archivo de liga
// Si faseFiltro es 'semi' o 'final', solo se toman partidos de esa fase
function calcularTablaPosiciones(categoria, jornadasFiltradas = null) {
  const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
  if (!fs.existsSync(filePath)) return null;

  const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const jornadas = jornadasFiltradas || liga.jornadas;

  // Si existen grupos definidos
  if (liga.grupos) {
    const resultadosPorGrupo = {};

    for (const grupoNombre of Object.keys(liga.grupos)) {
      const jugadoresGrupo = liga.grupos[grupoNombre];
      const tabla = {};

      // Inicializar tabla
      jugadoresGrupo.forEach(p => {
        tabla[p.id] = {
          nombre: p.nombre,
          pj: 0,
          pg: 0,
          pp: 0,
          puntos: 0,
          diff: 0
        };
      });

      // Solo considerar partidos entre miembros del grupo
      jornadas.forEach(jornada => {
        jornada.partidos.forEach(partido => {
          if (!partido.resultado) return;

          const j1 = partido.jugador1Id;
          const j2 = partido.jugador2Id;
          if (!(j1 in tabla && j2 in tabla)) return;

          const r = partido.resultado;
          const p1 = r[j1] ?? 0;
          const p2 = r[j2] ?? 0;

          tabla[j1].pj++;
          tabla[j2].pj++;

          tabla[j1].puntos += p1;
          tabla[j2].puntos += p2;

          tabla[j1].diff += p1 - p2;
          tabla[j2].diff += p2 - p1;

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

      resultadosPorGrupo[grupoNombre] = posiciones;
    }

    return resultadosPorGrupo;
  }

  // 🧾 Si no hay grupos, usar formato clásico
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

  jornadas.forEach(jornada => {
    jornada.partidos.forEach(partido => {
      if (!partido.resultado) return;

      const j1 = partido.jugador1Id;
      const j2 = partido.jugador2Id;

      if (!(j1 in tabla) || !(j2 in tabla)) return; // Evita jugadores que no estén en tabla

      const r = partido.resultado;
      const p1 = r[j1] ?? 0;
      const p2 = r[j2] ?? 0;

      tabla[j1].pj++;
      tabla[j2].pj++;

      tabla[j1].puntos += p1;
      tabla[j2].puntos += p2;

      tabla[j1].diff += p1 - p2;
      tabla[j2].diff += p2 - p1;

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

// 🖋️ Genera el texto para mostrar la tabla en Discord
// faseElegida puede ser null, 'semi' o 'final'
function generarTextoTabla(posiciones, categoria, faseElegida = null) {
  let mensaje = '';
  const tituloFase = faseElegida ? ` - ${faseElegida.toUpperCase()}` : '';

  if (Array.isArray(posiciones)) {
    // Formato clásico
    mensaje += `📊 **Tabla de posiciones - Categoría ${categoria.toUpperCase()}${tituloFase}**\n\n`;
    mensaje += generarSeccionTabla(posiciones);
  } else {
    // Formato por grupos
    mensaje += `📊 **Tabla de posiciones - Categoría ${categoria.toUpperCase()} (Grupos)${tituloFase}**\n\n`;
    for (const [grupo, lista] of Object.entries(posiciones)) {
      mensaje += `🔸 Grupo ${grupo.toUpperCase()}\n`;
      mensaje += generarSeccionTabla(lista);
      mensaje += '\n';
    }
  }

  return `\`\`\`\n${mensaje.trim()}\n\`\`\``;
}

// 🔧 Genera una tabla formateada
function generarSeccionTabla(posiciones) {
  let msg = `Pos | Jugador       | PJ | PG | PP | Pts | Dif\n`;
  msg += `--------------------------------------------\n`;
  posiciones.forEach((p, i) => {
    msg += `${(i + 1).toString().padEnd(3)} | ${p.nombre.padEnd(13)} | ${p.pj.toString().padEnd(2)} | ${p.pg.toString().padEnd(2)} | ${p.pp.toString().padEnd(2)} | ${p.puntos.toString().padEnd(3)} | ${p.diff.toString().padEnd(3)}\n`;
  });
  return msg;
}

// 🔁 Si se desea actualizar automáticamente un mensaje existente
async function actualizarTablaEnCanal(categoria, client, guildId, jornadasFiltradas = null) {
  const serverConfig = config.servidores[guildId];
  if (!serverConfig) return;

  const canalId = serverConfig[`tablaCategoria${categoria.toUpperCase()}`];
  const mensajeId = serverConfig.mensajeTabla?.[categoria];
  if (!canalId || !mensajeId) return;

  const posiciones = calcularTablaPosiciones(categoria, jornadasFiltradas);
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
