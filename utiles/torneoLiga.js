const fs = require('fs');
const path = require('path');

async function ejecutarTorneoLiga(interaction, categoria) {
  const filePath = path.join(__dirname, '..', 'categorias', `categoria_${categoria}.json`);

  if (!fs.existsSync(filePath)) {
    return await interaction.reply({ content: `⚠️ No hay inscriptos registrados en la categoría **${categoria}**.`, ephemeral: true });
  }

  const participantes = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (participantes.length < 2) {
    return await interaction.reply({ content: `⚠️ Se necesitan al menos 2 jugadores para crear una liga.`, ephemeral: true });
  }

  const encuentros = [];
  for (let i = 0; i < participantes.length; i++) {
    for (let j = i + 1; j < participantes.length; j++) {
      encuentros.push({
        jugador1: participantes[i],
        jugador2: participantes[j],
        resultado: null
      });
    }
  }

  const torneoData = {
    categoria,
    participantes,
    encuentros,
    creado: new Date().toISOString()
  };

  const savePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
  fs.writeFileSync(savePath, JSON.stringify(torneoData, null, 2), 'utf8');

  await interaction.reply(`✅ Liga creada para la categoría **${categoria}** con ${participantes.length} jugadores y ${encuentros.length} duelos.`);
}

module.exports = { ejecutarTorneoLiga };
