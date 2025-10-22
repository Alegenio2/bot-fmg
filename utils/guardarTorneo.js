// utils/guardarTorneo.js

// ➡️ IMPORTANTE: Cambiar 'fs' por 'fs/promises'
const fs = require('fs/promises'); 
const path = require('path');

async function guardarTorneo(torneo, filePath, interaction) {
  try {
    // Guardar el JSON del torneo localmente (AHORA ASÍNCRONO)
    // Se usa await y la versión de Promesas
    await fs.writeFile(filePath, JSON.stringify(torneo, null, 2), 'utf8');
    console.log(`✅ Torneo guardado en ${path.basename(filePath)}`);

    // Subir todos los torneos a GitHub
    const { subirTodosLosTorneos } = require('../git/guardarTorneosGit');
    await subirTodosLosTorneos();

  } catch (error) {
    console.warn('⚠️ No se pudo subir a GitHub:', error.message);
    if (interaction) {
      // Asegúrate de usar editReply si ya usaste deferReply antes, o followUp si deferReply ya respondió
      // Para mayor seguridad, si el comando original ya llamó a deferReply, aquí deberías usar editReply o followUp.
      // Si la llamada a guardarTorneo se hace después de un deferReply, usa editReply:
      await interaction.editReply({ 
        content: "⚠️ El torneo fue guardado localmente pero no se pudo subir a GitHub.", 
        ephemeral: true 
      });
    }
  }
}

module.exports = { guardarTorneo };
