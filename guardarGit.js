//guardarGit.js 
const { execSync } = require('child_process');
const fs = require('fs');

function guardarYSubirCambiosArchivo(rutaArchivo, mensajeCommit = '📦 Actualización automática') {
  try {
    // Verifica que el archivo exista antes de continuar
    if (!fs.existsSync(rutaArchivo)) {
      console.error(`❌ El archivo ${rutaArchivo} no existe.`);
      return;
    }

    // Configura Git si no está hecho
    execSync('git config user.name "Alegenio2"');
    execSync('git config user.email "alegenio2@gmail.com"');

    // Añadir archivo, commit y push
    execSync(`git add ${rutaArchivo}`);
    execSync(`git commit -m "${mensajeCommit}"`);

    // Establece remote con token solo si es necesario
    const repoUrl = `https://${process.env.GITHUB_TOKEN}@github.com/Alegenio2/bot-fmg.git`;
    execSync(`git remote set-url origin ${repoUrl}`);

    // Push usando HEAD:main para que funcione en Render (detached HEAD)
    execSync(`git push origin HEAD:main`);

    console.log('✅ Cambios subidos correctamente a GitHub');
  } catch (error) {
    console.error('❌ Error al subir cambios a GitHub:', error.message || error);
  }
}

module.exports = {
  guardarYSubirCambiosArchivo
};
