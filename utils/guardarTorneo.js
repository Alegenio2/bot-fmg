// utils/guardarTorneo.js
const fs = require('fs');
const path = require('path');

async function guardarTorneo(torneo, filePath, interaction) {
  try {
    // Guardar el JSON del torneo localmente
    fs.writeFileSync(filePath, JSON.stringify(torneo, null, 2), 'utf8');
    console.log(`✅ Torneo guardado en ${path.basename(filePath)}`);

    // Subir todos los torneos a GitHub
    const { subirTodosLosTorneos } = require('../git/guardarTorneosGit');
    await subirTodosLosTorneos();

  } catch (error) {
    console.warn('⚠️ No se pudo subir a GitHub:', error.message);
    if (interaction) {
      await interaction.followUp({ 
        content: "⚠️ El torneo fue guardado localmente pero no se pudo subir a GitHub.", 
        ephemeral: true 
      });
    }
  }
}

module.exports = { guardarTorneo };
