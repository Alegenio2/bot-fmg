const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

function guardarYSubirCambiosArchivo(archivo, mensaje = "Actualización automática del archivo") {
  try {
    // Verifica que el archivo existe
    const archivoPath = path.resolve(__dirname, archivo);
    if (!fs.existsSync(archivoPath)) {
      console.log(`❌ Archivo no encontrado: ${archivo}`);
      return;
    }

    // Configura el usuario de git (por si no está)
    execSync(`git config user.name "${process.env.GIT_USERNAME}"`);
    execSync(`git config user.email "${process.env.GIT_EMAIL}"`);

    // Agrega, comitea y pushea
    execSync(`git add ${archivo}`);
    execSync(`git commit -m "${mensaje}"`);
    execSync(`git push https://${process.env.GH_TOKEN}@github.com/${process.env.GIT_USERNAME}/bot-fmg.git main`);

    console.log(`✅ Cambios subidos con éxito a GitHub.`);
  } catch (err) {
    console.error("❌ Error al subir cambios a GitHub:", err.message);
  }
}

module.exports = { guardarYSubirCambiosArchivo };
