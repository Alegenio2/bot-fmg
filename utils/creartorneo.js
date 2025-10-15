// utils/crearTorneo.js
const fs = require("fs");
const path = require("path");

async function crearTorneoDesdeEquipos(torneoId, cantidadGrupos, clasificadosPorGrupo) {
  const rutaEquipos = path.join(__dirname, "..", "equipos_inscritos.json");
  if (!fs.existsSync(rutaEquipos))
    return "⚠️ No se encontró el archivo de equipos inscritos.";

  const equipos = JSON.parse(fs.readFileSync(rutaEquipos, "utf8"))
    .filter(e => e.torneo === torneoId);

  if (equipos.length === 0)
    return `⚠️ No hay equipos inscritos en el torneo **${torneoId}**.`;

  // Ordenar por ELO promedio (desc)
  equipos.sort((a, b) => b.promedio_elo - a.promedio_elo);

  // Crear grupos balanceados tipo “snake draft”
  const grupos = Array.from({ length: cantidadGrupos }, () => []);
  let direccion = 1;
  let grupoIndex = 0;
  for (const eq of equipos) {
    grupos[grupoIndex].push(eq);
    grupoIndex += direccion;
    if (grupoIndex === cantidadGrupos) {
      grupoIndex = cantidadGrupos - 1;
      direccion = -1;
    } else if (grupoIndex < 0) {
      grupoIndex = 0;
      direccion = 1;
    }
  }

  // Crear fixture de grupos (round robin) usando id
  const rondasGrupos = grupos.map((g, idx) => ({
    grupo: String.fromCharCode(65 + idx),
    partidos: generarFixtureRoundRobin(g),
  }));

  // Generar fases eliminatorias vacías
  const fases = generarEliminatorias(grupos, clasificadosPorGrupo);

  const torneoData = {
    torneo: torneoId,
    grupos: grupos.map((g, i) => ({
      nombre: `Grupo ${String.fromCharCode(65 + i)}`,
      equipos: g.map(e => ({ id: e.id, nombre: e.nombre })),
    })),
    rondas_grupos: rondasGrupos,
    eliminatorias: fases,
    creado: new Date().toISOString(),
  };

  // Guardar archivo
  const rutaTorneo = path.join(__dirname, "..", "torneos", `torneo_${torneoId}.json`);
  fs.mkdirSync(path.dirname(rutaTorneo), { recursive: true });
  fs.writeFileSync(rutaTorneo, JSON.stringify(torneoData, null, 2), "utf8");

  return `✅ Torneo **${torneoId}** creado con éxito.\n📦 ${equipos.length} equipos distribuidos en ${cantidadGrupos} grupos.`;
}

// Fixture round robin usando id
function generarFixtureRoundRobin(equipos) {
  const lista = [...equipos];
  if (lista.length % 2 !== 0) lista.push(null); // descanso
  const n = lista.length;
  const rondas = [];

  for (let r = 0; r < n - 1; r++) {
    const partidos = [];
    for (let i = 0; i < n / 2; i++) {
      const e1 = lista[i];
      const e2 = lista[n - 1 - i];
      if (e1 && e2) {
        partidos.push({
          equipo1Id: e1.id,
          equipo1Nombre: e1.nombre,
          equipo2Id: e2.id,
          equipo2Nombre: e2.nombre,
          resultado: null,
          fecha: null,
          horario: null,
          diaSemana: null
        });
      }
    }
    rondas.push({ ronda: r + 1, partidos });

    // Rotación
    const fijo = lista[0];
    const resto = lista.slice(1);
    resto.unshift(resto.pop());
    lista.splice(0, lista.length, fijo, ...resto);
  }

  return rondas;
}

// Eliminatorias usando id (vacías)
function generarEliminatorias(grupos, clasificadosPorGrupo) {
  const totalClasificados = grupos.length * clasificadosPorGrupo;

  let rondas = [];
  if (totalClasificados === 2) rondas = ["Final"];
  else if (totalClasificados === 4) rondas = ["Semifinal", "Final"];
  else if (totalClasificados === 8) rondas = ["Cuartos", "Semifinal", "Final"];
  else if (totalClasificados === 16) rondas = ["Octavos", "Cuartos", "Semifinal", "Final"];
  else return [];

  // Creamos eliminatorias vacías
  const eliminatorias = rondas.map(ronda => ({ ronda, partidos: [] }));
  return eliminatorias;
}

module.exports = { crearTorneoDesdeEquipos };
