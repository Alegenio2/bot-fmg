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
    // 1. Obtener SHA
    let shaActual = null;
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}?ref=${BRANCH}`,
        { headers: { Authorization: `Bearer ${GH_TOKEN}` } }
      );
      shaActual = data.sha;
    } catch (e) {
      // Si el archivo no existe en Git, no pasa nada, se crea
    }

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
    console.error(`❌ Error Git (${nombreArchivo}):`, error.response?.data || error.message);
  }
}

// Exportamos funciones específicas para que sea más fácil usarlas
module.exports = {
  guardarYSubirEquipos: () => subirArchivoAGit('equipos_inscritos.json', 'Update equipos_inscritos.json'),
  guardarYSubirUsuarios1v1: () => subirArchivoAGit('usuarios_inscritos.json', 'Update usuarios_inscritos.json')
};

