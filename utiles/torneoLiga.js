// utiles/torneoLiga.js
const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('../elo');
const usuariosMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'usuarios.json'), 'utf8'));

async function ejecutarTorneoLiga(interaction, categoria, modo = 1) {
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
  await interaction.deferReply();
}

  const categoriasPath = path.join(__dirname, '..', 'categorias', `categoria_${categoria}.json`);
  if (!fs.existsSync(categoriasPath)) {
    return interaction.editReply(`⚠️ No hay inscriptos en la categoría **${categoria}**.`);
  }

  const participantesBasicos = JSON.parse(fs.readFileSync(categoriasPath, 'utf8'));
  if (participantesBasicos.length < 2) {
    return interaction.editReply(`⚠️ Se necesitan al menos 2 jugadores para crear una liga.`);
  }

  // Obtener datos extendidos
  const participantesConDatos = [];
  for (const p of participantesBasicos) {
    const profileId = usuariosMap[p.id] || null;
    const datos = profileId ? await obtenerEloActual(profileId) : null;
    participantesConDatos.push({ ...p, profileId, ...(datos || {}) });
  }

  let torneoData;

  if (modo === 1) {
    // Todos contra todos (Round Robin)
    const jornadas = generarFixtureRoundRobin(participantesConDatos);
    torneoData = {
      categoria,
      modo: 'todos_contra_todos',
      participantes: participantesConDatos,
      jornadas,
      creado: new Date().toISOString()
    };
  } else {
    // Grupos balanceados según ELO
    // Ordenar por ELO descendente (si no tiene, poner 0)
    const participantesOrdenados = participantesConDatos.slice().sort((a, b) => (b.elo || 0) - (a.elo || 0));

    const grupoA = [];
    const grupoB = [];

    // Repartir alternando (pares a A, impares a B)
    participantesOrdenados.forEach((p, i) => {
      if (i % 2 === 0) grupoA.push(p);
      else grupoB.push(p);
    });

    const jornadasA = generarFixtureRoundRobin(grupoA);
    const jornadasB = generarFixtureRoundRobin(grupoB);

    const semifinales = [
      {
        ronda: 'Semifinal',
        partidos: [
          { jugador1Id: '1A', jugador2Id: '2B', resultado: null },
          { jugador1Id: '1B', jugador2Id: '2A', resultado: null }
        ]
      }
    ];

    const final = [
      {
        ronda: 'Final',
        partidos: [
          { jugador1Id: 'GanadorSemi1', jugador2Id: 'GanadorSemi2', resultado: null }
        ]
      }
    ];

    torneoData = {
      categoria,
      modo: 'grupos_final',
      participantes: participantesConDatos,
      grupos: {
        A: grupoA.map(p => ({ id: p.id, nombre: p.nombre })),
        B: grupoB.map(p => ({ id: p.id, nombre: p.nombre })),
      },
      jornadas: [...jornadasA, ...jornadasB, ...semifinales, ...final],
      creado: new Date().toISOString()
    };
  }

  const savePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
  fs.writeFileSync(savePath, JSON.stringify(torneoData, null, 2), 'utf8');

  try {
    const { subirTodasLasLigas } = require('../git/guardarLigasGit');
    await subirTodasLasLigas();
  } catch (err) {
    console.warn('⚠️ No se pudo subir a GitHub:', err.message);
  }

  await interaction.editReply(`✅ Liga creada para la categoría **${categoria}** con ${participantesConDatos.length} jugadores.\nModo: **${modo === 1 ? 'Todos contra todos' : 'Grupos + Final'}**`);
}

function generarFixtureRoundRobin(participantes) {
  const jugadores = [...participantes];
  if (jugadores.length % 2 !== 0) jugadores.push(null); // descanso

  const n = jugadores.length;
  const rondas = [];

  for (let ronda = 0; ronda < n - 1; ronda++) {
    const partidos = [];
    for (let i = 0; i < n / 2; i++) {
      const j1 = jugadores[i];
      const j2 = jugadores[n - 1 - i];
      if (j1 && j2) {
        partidos.push({
          jugador1Id: j1.id,
          jugador2Id: j2.id,
          resultado: null
        });
      }
    }

    rondas.push({ ronda: ronda + 1, partidos });

    // rotación
    const fijo = jugadores[0];
    const resto = jugadores.slice(1);
    resto.unshift(resto.pop());
    jugadores.splice(0, jugadores.length, fijo, ...resto);
  }

  return rondas;
}

module.exports = { ejecutarTorneoLiga };


