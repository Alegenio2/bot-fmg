// guardarGit.js
const { execSync } = require('child_process');

function guardarYSubirCambiosArchivo(archivo, mensaje = "Actualización automática del archivo") {
  try {
    execSync('git config user.name "Alegenio2"');
    execSync('git config user.email "alegenio2@gmail.com"');

    execSync(`git add ${archivo}`);
    execSync(`git commit -m "${mensaje}"`);

    // 🧠 IMPORTANTE: Traer cambios remotos antes de pushear
    execSync('git pull --rebase');

    execSync(`git push https://ghp_TU_TOKEN@github.com/Alegenio2/bot-fmg.git main`);
    console.log(`✅ Archivo ${archivo} subido correctamente.`);
  } catch (err) {
    console.error("❌ Error al subir cambios a GitHub:", err.message);
  }
}

module.exports = {
  guardarYSubirCambiosArchivo
};
