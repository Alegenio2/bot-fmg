// utils/torneoEquipos.js
const fs = require('fs');
const path = require('path');

async function ejecutarTorneoEquipos(interaction, torneo, modo = 1) {
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  const equiposPath = path.join(__dirname, '..', 'inscripciones_equipos.json');
  if (!fs.existsSync(equiposPath)) {
    return interaction.editReply(`⚠️ No existe el archivo de inscripciones de equipos.`);
  }

  const todosEquipos = JSON.parse(fs.readFileSync(equiposPath, 'utf8'));
  const equipos = todosEquipos.filter(e => e.torneo === torneo);

  if (equipos.length < 2) {
    return interaction.editReply(`⚠️ Se necesitan al menos 2 equipos en **${torneo}**.`);
  }

  // Detectar tamaño del equipo automáticamente
  const teamSize = equipos[0].jugadores?.length || 2; // por defecto 2 si algo falla

  let torneoData;

  if (modo === 1) {
    // Todos contra todos
    const jornadas = generarFixtureEquipos(equipos, teamSize);
    torneoData = {
      torneo,
      modo: 'todos_contra_todos',
      equipos,
      teamSize,
      jornadas,
      creado: new Date().toISOString(),
    };
  } else {
    // Grupos + final
    const equiposOrdenados = equipos.slice().sort((a, b) => (b.promedioElo || 0) - (a.promedioElo || 0));

    const grupoA = [];
    const grupoB = [];

    equiposOrdenados.forEach((e, i) => {
      if (i % 2 === 0) grupoA.push(e);
      else grupoB.push(e);
    });

    const jornadasA = generarFixtureEquipos(grupoA, teamSize);
    const jornadasB = generarFixtureEquipos(grupoB, teamSize);

    const semifinales = [
      {
        ronda: 'Semifinal',
        partidos: [
          { equipo1Id: '1A', equipo2Id: '2B', resultado: null },
          { equipo1Id: '1B', equipo2Id: '2A', resultado: null },
        ],
      },
    ];

    const final = [
      {
        ronda: 'Final',
        partidos: [
          { equipo1Id: 'GanadorSemi1', equipo2Id: 'GanadorSemi2', resultado: null },
        ],
      },
    ];

    torneoData = {
      torneo,
      modo: 'grupos_final',
      teamSize,
      grupos: {
        A: grupoA.map(e => ({ id: e.id, nombre: e.nombre })),
        B: grupoB.map(e => ({ id: e.id, nombre: e.nombre })),
      },
      jornadas: [...jornadasA, ...jornadasB, ...semifinales, ...final],
      creado: new Date().toISOString(),
    };
  }

  const savePath = path.join(__dirname, '..', 'ligas', `${torneo}.json`);
  fs.writeFileSync(savePath, JSON.stringify(torneoData, null, 2), 'utf8');

  try {
    const { subirTodasLasLigas } = require('../git/guardarLigasGit');
    await subirTodasLasLigas();
  } catch (err) {
    console.warn('⚠️ No se pudo subir a GitHub:', err.message);
  }

  await interaction.editReply(
    `✅ Liga creada para el torneo **${torneo}** con ${equipos.length} equipos de ${teamSize} jugadores cada uno.\nModo: **${modo === 1 ? 'Todos contra todos' : 'Grupos + Final'}**`
  );
}

function generarFixtureEquipos(equipos, teamSize) {
  const lista = [...equipos];
  if (lista.length % 2 !== 0) lista.push(null); // descanso

  const n = lista.length;
  const rondas = [];

  for (let ronda = 0; ronda < n - 1; ronda++) {
    const partidos = [];
    for (let i = 0; i < n / 2; i++) {
      const e1 = lista[i];
      const e2 = lista[n - 1 - i];
      if (e1 && e2) {
        // Agregamos los jugadores según teamSize
        const jugadores1 = e1.jugadores.slice(0, teamSize);
        const jugadores2 = e2.jugadores.slice(0, teamSize);

        partidos.push({
          equipo1Id: e1.id,
          equipo2Id: e2.id,
          jugadores1,
          jugadores2,
          resultado: null,
        });
      }
    }

    rondas.push({ ronda: ronda + 1, partidos });

    // rotación
    const fijo = lista[0];
    const resto = lista.slice(1);
    resto.unshift(resto.pop());
    lista.splice(0, lista.length, fijo, ...resto);
  }

  return rondas;
}

module.exports = { ejecutarTorneoEquipos };
