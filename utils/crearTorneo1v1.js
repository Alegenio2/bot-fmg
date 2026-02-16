const fs = require("fs");
const path = require("path");
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");

async function crearTorneo1v1(torneoId, cantidadGrupos, clasificadosPorGrupo) {
  const rutaInscriptos = path.join(__dirname, "..", "usuarios_inscritos.json");
  if (!fs.existsSync(rutaInscriptos)) return "⚠️ No hay archivo de usuarios inscritos.";

  // Cargamos jugadores y filtramos por el torneo actual
  const jugadores = JSON.parse(fs.readFileSync(rutaInscriptos, "utf8"))
    .filter(u => u.torneo === torneoId);

  if (jugadores.length === 0) return `⚠️ No hay inscritos para **${torneoId}**.`;

  // Ordenar por promedio de ELO (descendente)
  jugadores.sort((a, b) => b.promedio - a.promedio);

  // Snake Draft para balancear grupos
  const grupos = Array.from({ length: cantidadGrupos }, () => []);
  let direccion = 1;
  let gIdx = 0;
  for (const jugador of jugadores) {
    grupos[gIdx].push(jugador);
    gIdx += direccion;
    if (gIdx === cantidadGrupos || gIdx < 0) {
      direccion *= -1;
      gIdx += direccion;
    }
  }

  // Generar Fixture Round Robin
  const rondasGrupos = grupos.map((g, idx) => ({
    grupo: String.fromCharCode(65 + idx),
    partidos: generarFixture1v1(g),
  }));

  const torneoData = {
    torneo: torneoId,
    tipo: "1v1",
    grupos: grupos.map((g, i) => ({
      nombre: `Grupo ${String.fromCharCode(65 + i)}`,
      jugadores: g.map(j => ({ id: j.userId, nick: j.nombre, elo: j.promedio })),
    })),
    rondas_grupos: rondasGrupos,
    creado: new Date().toISOString(),
  };

  const rutaArchivo = path.join(__dirname, "..", "torneos", `1v1_${torneoId}.json`);
  fs.writeFileSync(rutaArchivo, JSON.stringify(torneoData, null, 2), "utf8");

  try { await subirTodosLosTorneos(); } catch (e) { console.error(e); }

  return `✅ Torneo 1v1 **${torneoId}** creado.\n👤 ${jugadores.length} jugadores en ${cantidadGrupos} grupos.`;
}

function generarFixture1v1(participantes) {
  const lista = [...participantes];
  if (lista.length % 2 !== 0) lista.push(null);
  const n = lista.length;
  const rondas = [];

  for (let r = 0; r < n - 1; r++) {
    const partidos = [];
    for (let i = 0; i < n / 2; i++) {
      const p1 = lista[i];
      const p2 = lista[n - 1 - i];
      if (p1 && p2) {
        partidos.push({
          jugador1Id: p1.userId,
          jugador1Nick: p1.nombre,
          jugador2Id: p2.userId,
          jugador2Nick: p2.nombre,
          resultado: null
        });
      }
    }
    rondas.push({ ronda: r + 1, partidos });
    const fijo = lista[0];
    const resto = lista.slice(1);
    resto.unshift(resto.pop());
    lista.splice(0, lista.length, fijo, ...resto);
  }
  return rondas;
}

module.exports = { crearTorneo1v1 };
