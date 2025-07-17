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

  let shaActual = null;

  try {
    // Intentar obtener el SHA actual si el archivo existe
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemotaGitHub}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );
    shaActual = fileData.sha;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // El archivo no existe aún: está bien, lo vamos a crear
      console.log(`📁 El archivo ${rutaRemotaGitHub} no existe aún. Se creará.`);
    } else {
      // Otro error: detener
      console.error(`❌ Error al verificar el archivo en GitHub:`, error.response?.data || error.message);
      return;
    }
  }

  try {
    // Subir el archivo, si existe sha lo incluimos
    const payload = {
      message,
      content: nuevoContenidoBase64,
      branch: BRANCH
    };

    if (shaActual) {
      payload.sha = shaActual;
    }

    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemotaGitHub}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    console.log(`✅ Archivo ${rutaRemotaGitHub} subido a GitHub correctamente`);
  }catch (error) {
 console.error(`❌ Error al subir ${rutaRemotaGitHub}:`);
if (error.response) {
  console.error("🔴 Respuesta de GitHub:", JSON.stringify(error.response.data, null, 2));
} else {
  console.error("🔴 Error general:", error.message);
}

}

}


async function subirTorneos() {
  await subirArchivoGit('tournaments.json', 'torneos/tournaments.json', 'Auto: actualización tournaments.json');
  await subirArchivoGit('torneo_actual.json', 'torneos/torneo_actual.json', 'Auto: actualización torneo_actual.json');
}

module.exports = { subirTorneos };
