// git/guardarLigasGit.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'main';
const GH_TOKEN = process.env.GH_TOKEN;

async function subirTodosLosTorneos() {
  const torneoPath = path.join(__dirname, '..', 'torneos');
  if (!fs.existsSync(torneoPath)) {
    console.error(`❌ La carpeta ligas no existe en ${torneoPath}`);
    return;
  }

  const archivos = fs.readdirSync(torneoPath);

  for (const archivo of archivos) {
    const LOCAL_FILE_PATH = path.join(torneoPath, archivo);
    const RELATIVE_FILE_PATH = `torneos/${archivo}`; // para GitHub

    if (!fs.existsSync(LOCAL_FILE_PATH)) continue;

    const contenido = fs.readFileSync(LOCAL_FILE_PATH, 'utf8');
    const contenidoBase64 = Buffer.from(contenido).toString('base64');

    let sha = undefined;
    try {
      const { data: fileData } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${RELATIVE_FILE_PATH}?ref=${BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${GH_TOKEN}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );
      sha = fileData.sha;
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error(`❌ Error al obtener SHA de ${RELATIVE_FILE_PATH}`, error.response?.data || error.message);
        continue;
      }
      // si es 404 está bien, es porque el archivo aún no existe en el repo
    }

    try {
      await axios.put(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${RELATIVE_FILE_PATH}`,
        {
          message: `Subida automática de ${archivo}`,
          content: contenidoBase64,
          ...(sha && { sha }),
          branch: BRANCH,
        },
        {
          headers: {
            Authorization: `Bearer ${GH_TOKEN}`,
            Accept: 'application/vnd.github+json',
          },
        }
      );

      console.log(`✅ Subido correctamente: ${archivo}`);
    } catch (error) {
      console.error(`❌ Error subiendo ${archivo}:`, error.response?.data || error.message);
    }
  }
}

module.exports = { subirTodosLosTorneos };


