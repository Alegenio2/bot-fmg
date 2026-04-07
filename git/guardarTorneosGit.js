// git/guardarTorneosGit.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'data'; // <-- Cambiado de 'main' a 'data'
const GH_TOKEN = process.env.GH_TOKEN;

async function subirTodosLosTorneos() {
  const torneoPath = path.join(__dirname, '..', 'torneos');
  if (!fs.existsSync(torneoPath)) {
    console.error(`❌ La carpeta torneos no existe en ${torneoPath}`);
    return;
  }

  const archivos = fs.readdirSync(torneoPath);

  for (const archivo of archivos) {
    // Filtramos para subir solo archivos .json
    if (!archivo.endsWith('.json')) continue;

    const LOCAL_FILE_PATH = path.join(torneoPath, archivo);
    const RELATIVE_FILE_PATH = `torneos/${archivo}`;

    const contenido = fs.readFileSync(LOCAL_FILE_PATH, 'utf8');
    const contenidoBase64 = Buffer.from(contenido).toString('base64');

    let sha = undefined;
    try {
      const { data: fileData } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${RELATIVE_FILE_PATH}?ref=${BRANCH}`,
        {
          headers: { Authorization: `Bearer ${GH_TOKEN}` }
        }
      );
      sha = fileData.sha;
    } catch (error) {
      // Si no existe (404), sha se queda como undefined y se crea el archivo
    }

    try {
      await axios.put(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${RELATIVE_FILE_PATH}`,
        {
          message: `Update data: ${archivo}`,
          content: contenidoBase64,
          sha: sha,
          branch: BRANCH,
        },
        {
          headers: { Authorization: `Bearer ${GH_TOKEN}` }
        }
      );
      console.log(`✅ [GIT DATA] Subido: ${archivo}`);
    } catch (error) {
      console.error(`❌ Error subiendo ${archivo}:`, error.response?.data || error.message);
    }
  }
}

// Nueva función para descargar los datos al iniciar el bot
async function cargarTorneosDesdeGit() {
  const torneoPath = path.join(__dirname, '..', 'torneos');
  if (!fs.existsSync(torneoPath)) fs.mkdirSync(torneoPath, { recursive: true });

  try {
    const { data: archivos } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/torneos?ref=${BRANCH}`,
      {
        headers: { Authorization: `Bearer ${GH_TOKEN}` }
      }
    );

    for (const file of archivos) {
      if (file.name.endsWith('.json')) {
        const { data: fileData } = await axios.get(file.download_url);
        fs.writeFileSync(path.join(torneoPath, file.name), JSON.stringify(fileData, null, 2));
      }
    }
    console.log('✅ Torneos descargados desde rama DATA');
  } catch (error) {
    console.error('❌ Error cargando torneos desde Git:', error.message);
  }
}

module.exports = { subirTodosLosTorneos, cargarTorneosDesdeGit };
