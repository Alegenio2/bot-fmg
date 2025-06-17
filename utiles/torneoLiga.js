// utiles/torneoLiga.js
const fs = require('fs');
const path = require('path');
const { obtenerEloActual } = require('../elo'); // tu función para la API
const usuariosMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'usuarios.json'), 'utf8'));

async function ejecutarTorneoLiga(interaction, categoria) {
  const categoriasPath = path.join(__dirname, '..', 'categorias', `categoria_${categoria}.json`);

  if (!fs.existsSync(categoriasPath)) {
    return await interaction.reply({
      content: `⚠️ No hay inscriptos registrados en la categoría **${categoria}**.`,
      ephemeral: true
    });
  }

  const participantesBasicos = JSON.parse(fs.readFileSync(categoriasPath, 'utf8'));

  if (participantesBasicos.length < 2) {
    return await interaction.reply({
      content: `⚠️ Se necesitan al menos 2 jugadores para crear una liga.`,
      ephemeral: true
    });
  }

  // Para cada participante básico, obtenemos su profileId, luego datos extendidos
  const participantesConDatos = [];

  for (const participante of participantesBasicos) {
    const profileId = usuariosMap[participante.id];
    if (!profileId) {
      console.warn(`No se encontró profileId para Discord ID ${participante.id}`);
      participantesConDatos.push({ ...participante }); // sin datos extendidos
      continue;
    }

    const datosExtendidos = await obtenerEloActual(profileId);
    if (!datosExtendidos) {
      participantesConDatos.push({ ...participante }); // si no pudo obtener datos, solo info básica
    } else {
      participantesConDatos.push({
        id: participante.id,
        nombre: participante.nombre,
        ...datosExtendidos
      });
    }
  }

  // Crear encuentros
  const encuentros = [];
  for (let i = 0; i < participantesConDatos.length; i++) {
    for (let j = i + 1; j < participantesConDatos.length; j++) {
      encuentros.push({
        jugador1: participantesConDatos[i],
        jugador2: participantesConDatos[j],
        resultado: null
      });
    }
  }

  const torneoData = {
    categoria,
    participantes: participantesConDatos,
    encuentros,
    creado: new Date().toISOString()
  };

  const savePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
  if (!fs.existsSync(path.dirname(savePath))) fs.mkdirSync(path.dirname(savePath));

  fs.writeFileSync(savePath, JSON.stringify(torneoData, null, 2), 'utf8');

  await interaction.reply(
    `✅ Liga creada para la categoría **${categoria}** con ${participantesConDatos.length} jugadores y ${encuentros.length} duelos.`
  );
}

module.exports = { ejecutarTorneoLiga };

