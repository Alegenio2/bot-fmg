// utils/guardarLiga.js
const fs = require('fs');
const path = require('path');

async function guardarLiga(liga, filePath, letraDivision, interaction) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(liga, null, 2), 'utf8');
    console.log(`✅ Resultado guardado en liga_${letraDivision}.json`);

    const { subirTodasLasLigas } = require('../git/guardarLigasGit');
    await subirTodasLasLigas();
  } catch (error) {
    console.warn('⚠️ No se pudo subir a GitHub:', error.message);
    if (interaction) {
      await interaction.followUp("⚠️ El resultado fue guardado pero no se pudo subir a GitHub.");
    }
  }
}

module.exports = { guardarLiga };
