const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GH_TOKEN = process.env.GH_TOKEN;
const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'main';

async function subirArchivoGit(nombreArchivoLocal, rutaRemotaGitHub, mensaje) {
  const LOCAL_FILE_PATH = path.join(__dirname, '..', 'data', nombreArchivoLocal);

  if (!fs.existsSync(LOCAL_FILE_PATH)) {
    console.error(`❌ No se encontró el archivo local: ${LOCAL_FILE_PATH}`);
    return;
  }

  const nuevoContenido = fs.readFileSync(LOCAL_FILE_PATH, 'utf8');
  const nuevoContenidoBase64 = Buffer.from(nuevoContenido).toString('base64');

  try {
    // Obtener SHA actual si existe
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemotaGitHub}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    const shaActual = fileData.sha;

    // Subir nuevo contenido
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemotaGitHub}`,
      {
        message,
        content: nuevoContenidoBase64,
        sha: shaActual,
        branch: BRANCH
      },
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    console.log(`✅ Archivo ${rutaRemotaGitHub} actualizado en GitHub`);
  } catch (error) {
    console.error(`❌ Error al subir ${rutaRemotaGitHub}:`, error.response?.data || error.message);
  }
}

async function subirTorneos() {
  await subirArchivoGit('tournaments.json', 'torneos/tournaments.json', 'Auto: actualización tournaments.json');
  await subirArchivoGit('torneo_actual.json', 'torneos/torneo_actual.json', 'Auto: actualización torneo_actual.json');
}

module.exports = { subirTorneos };
