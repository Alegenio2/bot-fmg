// sincronizarCoordinados.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GH_TOKEN = process.env.GH_TOKEN;
const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'main';
const FILE_NAME = 'coordinados.json';

async function sincronizarCoordinados() {
  const filePath = path.join(__dirname, FILE_NAME);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ No se encontró el archivo ${FILE_NAME}`);
    return;
  }

  const contenido = fs.readFileSync(filePath, 'utf8');
  const base64Content = Buffer.from(contenido).toString('base64');

  try {
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_NAME}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    const sha = fileData.sha;

    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_NAME}`,
      {
        message: '🔄 Sincronización automática de coordinados.json',
        content: base64Content,
        sha,
        branch: BRANCH
      },
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    console.log(`✅ ${FILE_NAME} sincronizado exitosamente con GitHub`);
  } catch (err) {
    console.error('❌ Error al sincronizar:', err.response?.data || err.message);
  }
}

module.exports = {
  sincronizarCoordinados
};
