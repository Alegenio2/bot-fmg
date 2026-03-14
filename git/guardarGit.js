//guardarGit.js 
// git/guardarGit.js
const axios = require('axios');
const fs = require('fs');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const FILE_PATH = 'usuarios.json';
const BRANCH = 'data'; // ✅ Branch separado, Square Cloud no lo escucha
const GH_TOKEN = process.env.GH_TOKEN;

const HEADERS = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'Cache-Control': 'no-cache'
};

async function guardarYSubirCambiosArchivo() {
  const nuevoContenido = fs.readFileSync(FILE_PATH, 'utf8');
  const nuevoContenidoBase64 = Buffer.from(nuevoContenido).toString('base64');

  try {
    // 1. Obtener SHA actual desde branch data
    let shaActual = null;
    try {
      const { data: fileData } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}&t=${Date.now()}`,
        { headers: HEADERS }
      );
      shaActual = fileData.sha;
    } catch (e) { /* Archivo nuevo en el branch */ }

    // 2. Subir al branch data
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        message: 'Actualización automática de usuarios.json',
        content: nuevoContenidoBase64,
        sha: shaActual,
        branch: BRANCH
      },
      { headers: HEADERS }
    );

    console.log('✅ Archivo usuarios.json actualizado en GitHub (branch: data)');
  } catch (error) {
    console.error('❌ Error al subir usuarios.json:', error.response?.data || error.message);
  }
}

/**
 * Lee usuarios.json desde el branch data de GitHub.
 * Se llama al arrancar el bot para restaurar datos tras un reinicio.
 */
async function cargarUsuariosDesdeGit() {
  try {
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}&t=${Date.now()}`,
      { headers: HEADERS }
    );

    const contenido = Buffer.from(fileData.content, 'base64').toString('utf8');
    fs.writeFileSync(FILE_PATH, contenido, 'utf8');
    console.log('✅ usuarios.json restaurado desde GitHub (branch: data)');
  } catch (error) {
    // Si el archivo no existe todavía en el branch, arrancamos con objeto vacío
    if (error.response?.status === 404) {
      console.log('⚠️ usuarios.json no encontrado en branch data, arrancando vacío.');
      if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, '{}', 'utf8');
    } else {
      console.error('❌ Error cargando usuarios.json desde GitHub:', error.response?.data || error.message);
    }
  }
}

module.exports = {
  guardarYSubirCambiosArchivo,
  cargarUsuariosDesdeGit
};
