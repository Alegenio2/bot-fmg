// utiles/torneoLiga.js
const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('../elo'); // tu función para la API
const usuariosMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'usuarios.json'), 'utf8'));

async function ejecutarTorneoLiga(interaction, categoria) {
  await interaction.deferReply(); // <-- Esto evita el error 10062

  const categoriasPath = path.join(__dirname, '..', 'categorias', `categoria_${categoria}.json`);

  if (!fs.existsSync(categoriasPath)) {
    return interaction.editReply({
      content: `⚠️ No hay inscriptos registrados en la categoría **${categoria}**.`,
      ephemeral: true
    });
  }

  const participantesBasicos = JSON.parse(fs.readFileSync(categoriasPath, 'utf8'));

  if (participantesBasicos.length < 2) {
    return interaction.editReply({
      content: `⚠️ Se necesitan al menos 2 jugadores para crear una liga.`,
      ephemeral: true
    });
  }

  // Obtener datos extendidos + profileId
  const participantesConDatos = [];

  for (const participante of participantesBasicos) {
    const profileId = usuariosMap[participante.id] || null;

    let datosExtendidos = null;
    if (profileId) {
      datosExtendidos = await obtenerEloActual(profileId);
    }

    participantesConDatos.push({
      ...participante,
      profileId,
      ...(datosExtendidos || {})
    });
  }

  // Generar fixture con rondas (round-robin)
  function generarFixtureRoundRobin(participantes) {
    const total = participantes.length;
    const esImpar = total % 2 !== 0;

    const jugadores = [...participantes];

    if (esImpar) {
      jugadores.push(null); // descanso
    }

    const rondas = [];
    const n = jugadores.length;

    for (let ronda = 0; ronda < n - 1; ronda++) {
      const partidos = [];

      for (let i = 0; i < n / 2; i++) {
        const jugador1 = jugadores[i];
        const jugador2 = jugadores[n - 1 - i];

        if (jugador1 && jugador2) {
          partidos.push({
            jugador1Id: jugador1.id,
            jugador2Id: jugador2.id,
            resultado: null
          });
        }
      }

      rondas.push({ ronda: ronda + 1, partidos });

      // Rotar (excepto el primero)
      const fijo = jugadores[0];
      const resto = jugadores.slice(1);
      resto.unshift(resto.pop());
      jugadores.splice(0, jugadores.length, fijo, ...resto);
    }

    return rondas;
  }

  const jornadas = generarFixtureRoundRobin(participantesConDatos);

  const torneoData = {
    categoria,
    participantes: participantesConDatos,
    jornadas,
    creado: new Date().toISOString()
  };

  const savePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
  if (!fs.existsSync(path.dirname(savePath))) fs.mkdirSync(path.dirname(savePath));

  fs.writeFileSync(savePath, JSON.stringify(torneoData, null, 2), 'utf8');

  try {
    const { subirTodasLasLigas } = require('../git/guardarLigasGit');
    await subirTodasLasLigas();
  } catch (error) {
    console.warn('⚠️ No se pudo subir a GitHub:', error.message);
  }

  await interaction.editReply(
    `✅ Liga creada para la categoría **${categoria}** con ${participantesConDatos.length} jugadores y ${jornadas.length} jornadas.`
  );
}

module.exports = { ejecutarTorneoLiga };

