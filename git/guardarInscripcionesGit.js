// git/guardarInscripcionesGit.js
// git/guardarInscripcionesGit.js
const axios = require('axios');
const fs = require('fs');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'data'; // ✅ Branch separado, Square Cloud no lo escucha
const GH_TOKEN = process.env.GH_TOKEN;

const HEADERS = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Cache-Control': 'no-cache'
};

async function subirArchivoAGit(nombreArchivo, mensajeCommit) {
  if (!fs.existsSync(nombreArchivo)) return;

  const nuevoContenido = fs.readFileSync(nombreArchivo, 'utf8');
  const nuevoContenidoBase64 = Buffer.from(nuevoContenido).toString('base64');

  try {
    // 1. Obtener SHA actual desde branch data
    let shaActual = null;
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}?ref=${BRANCH}&t=${Date.now()}`,
        { headers: HEADERS }
      );
      shaActual = data.sha;
    } catch (e) { /* Archivo nuevo en el branch */ }

    // 2. Subir al branch data
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}`,
      {
        message: mensajeCommit,
        content: nuevoContenidoBase64,
        sha: shaActual,
        branch: BRANCH
      },
      { headers: HEADERS }
    );

    console.log(`✅ ${nombreArchivo} sincronizado con GitHub (branch: data)`);
  } catch (error) {
    console.error(`❌ Error Git (${nombreArchivo}):`, error.response?.data?.message || error.message);
  }
}

/**
 * Lee un archivo JSON desde el branch data de GitHub.
 * Se llama al arrancar el bot para restaurar datos tras un reinicio.
 */
async function cargarArchivoDesdeGit(nombreArchivo, valorPorDefecto = '[]') {
  try {
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}?ref=${BRANCH}&t=${Date.now()}`,
      { headers: HEADERS }
    );

    const contenido = Buffer.from(fileData.content, 'base64').toString('utf8');
    fs.writeFileSync(nombreArchivo, contenido, 'utf8');
    console.log(`✅ ${nombreArchivo} restaurado desde GitHub (branch: data)`);
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`⚠️ ${nombreArchivo} no encontrado en branch data, arrancando con valor por defecto.`);
      if (!fs.existsSync(nombreArchivo)) fs.writeFileSync(nombreArchivo, valorPorDefecto, 'utf8');
    } else {
      console.error(`❌ Error cargando ${nombreArchivo} desde GitHub:`, error.response?.data || error.message);
    }
  }
}

module.exports = {
  guardarYSubirUsuarios1v1: () => subirArchivoAGit('usuarios_inscritos.json', 'Update usuarios_inscritos.json'),
  guardarYSubirEquipos:     () => subirArchivoAGit('equipos_inscritos.json',  'Update equipos_inscritos.json'),
  cargarInscritosDesdeGit:  () => cargarArchivoDesdeGit('usuarios_inscritos.json', '[]'),
  cargarEquiposDesdeGit:    () => cargarArchivoDesdeGit('equipos_inscritos.json',  '[]'),
};


