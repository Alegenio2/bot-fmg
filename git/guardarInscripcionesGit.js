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
    // 1. Obtener SHA actualizado (añadimos timestamp para evitar caché)
    let shaActual = null;
    try {
      const { data } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${nombreArchivo}?ref=${BRANCH}&t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${GH_TOKEN}`, 'Cache-Control': 'no-cache' } }
      );
      shaActual = data.sha;
    } catch (e) {
      // Archivo nuevo, no hay SHA
    }

    // 2. Subir archivo
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
    // Si da error 409, es que otro proceso ganó la carrera. No matamos el bot.
    console.error(`❌ Error Git (${nombreArchivo}):`, error.response?.data?.message || error.message);
    throw error; // Lanzamos el error para que la cadena sepa que falló
  }
}

// Función maestra para sincronizar todo en orden
async function sincronizarTodo() {
  try {
    // Subimos uno por uno con AWAIT para que no choquen
    await subirArchivoAGit('usuarios.json', 'Update usuarios.json');
    await subirArchivoAGit('usuarios_inscritos.json', 'Update usuarios_inscritos.json');
  } catch (err) {
    console.error("Error en la cadena de sincronización masiva.");
  }
}

module.exports = {
  subirArchivoAGit,
  guardarYSubirEquipos: () => subirArchivoAGit('equipos_inscritos.json', 'Update equipos_inscritos.json'),
  // Usamos sincronizarTodo para que actualice ambos archivos sin conflictos
  guardarYSubirUsuarios1v1: sincronizarTodo 
};

