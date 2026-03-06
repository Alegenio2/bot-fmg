const fs = require("fs");
const path = require("path");
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");

// Función de utilidad para el redondeo a múltiplos de 50
function aplicarRedondeo(elo) {
  return Math.round(elo / 50) * 50;
}

async function crearTorneo1v1(torneoId, cantidadGrupos, clasificadosPorGrupo, redondear) {
  const rutaInscriptos = path.join(__dirname, "..", "usuarios_inscritos.json");
  if (!fs.existsSync(rutaInscriptos)) return "⚠️ No hay archivo de usuarios inscritos.";

  // Cargamos jugadores y filtramos por el torneo actual
  const jugadoresOriginales = JSON.parse(fs.readFileSync(rutaInscriptos, "utf8"))
    .filter(u => u.torneo === torneoId);

  if (jugadoresOriginales.length === 0) return `⚠️ No hay inscritos para **${torneoId}**.`;

  // Ordenar por promedio de ELO (descendente)
  // Usamos 'promedio_elo' que es el nombre correcto en tu JSON de inscritos
  jugadoresOriginales.sort((a, b) => (b.promedio_elo || 0) - (a.promedio_elo || 0));

  // Snake Draft para balancear grupos
  const grupos = Array.from({ length: cantidadGrupos }, () => []);
  let direccion = 1;
  let gIdx = 0;
  for (const jugador of jugadoresOriginales) {
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
    config: {
      redondeo_aplicado: redondear,
      clasificados_por_grupo: clasificadosPorGrupo
    },
    grupos: grupos.map((g, i) => ({
      nombre: `Grupo ${String.fromCharCode(65 + i)}`,
      jugadores: g.map(j => ({ 
        id: j.id,
        nick: j.nombre, 
        // Aplicamos redondeo si el usuario marcó "True" en el comando
        elo: redondear ? aplicarRedondeo(j.promedio_elo) : j.promedio_elo,
        elo_real: j.promedio_elo // Guardamos el real por si necesitas consultar sin redondeo
      })),
    })),
    rondas_grupos: rondasGrupos,
    creado: new Date().toISOString(),
  };

  const rutaArchivo = path.join(__dirname, "..", "torneos", `1v1_${torneoId}.json`);
  fs.writeFileSync(rutaArchivo, JSON.stringify(torneoData, null, 2), "utf8");

  try { 
    await subirTodosLosTorneos(); 
  } catch (e) { 
    console.error("Error al subir a Git:", e); 
  }

  return `✅ Torneo 1v1 **${torneoId}** creado.\n👤 ${jugadoresOriginales.length} jugadores en ${cantidadGrupos} grupos.\n⚖️ Redondeo ELO (50): **${redondear ? "Activado" : "Desactivado"}**.`;
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
          jugador1Id: p1.id,
          jugador1Nick: p1.nombre,
          jugador2Id: p2.id,
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