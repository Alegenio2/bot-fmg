// git/guardarInscripcionesGit.js
const axios = require('axios');
const fs = require('fs');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'main';
const GH_TOKEN = process.env.GH_TOKEN;

async function subirArchivoAGit(nombreArchivo, mensajeCommit) {
  if (!fs.existsSync(nombreArchivo)) return;
  
  const nuevoContenido = fs.readFileSync(nombreArchivo, 'utf8');
  const nuevoContenidoBase64 = Buffer.from(nuevoContenido).toString('base64');

  try {
    // 1. Obtener SHA (con bypass de caché para seguridad)
    let shaActual = null;
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}?ref=${BRANCH}&t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Cache-Control': 'no-cache' } }
      );
      shaActual = data.sha;
    } catch (e) { /* Archivo nuevo */ }

    // 2. Subir
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}`,
      {
        message: mensajeCommit,
        content: nuevoContenidoBase64,
        sha: shaActual,
        branch: BRANCH
      },
      { headers: { Authorization: `Bearer ${GH_TOKEN}` } }
    );
    console.log(`✅ ${nombreArchivo} sincronizado con GitHub`);
  } catch (error) {
    console.error(`❌ Error Git (${nombreArchivo}):`, error.response?.data?.message || error.message);
  }
}

module.exports = {
  // Ahora esta función solo sube el archivo de inscritos
  guardarYSubirUsuarios1v1: () => subirArchivoAGit('usuarios_inscritos.json', 'Update usuarios_inscritos.json'),
  guardarYSubirEquipos: () => subirArchivoAGit('equipos_inscritos.json', 'Update equipos_inscritos.json')
};


