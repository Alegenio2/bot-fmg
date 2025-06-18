// git/guardarGit_Cat_B.js 
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const RELATIVE_FILE_PATH = 'categorias/categoria_b.json'; // Ruta relativa dentro del repo
const LOCAL_FILE_PATH = path.join(__dirname, '..', RELATIVE_FILE_PATH);
const BRANCH = 'main';

const GH_TOKEN = process.env.GH_TOKEN;

async function guardarYSubirCatB() {
  if (!fs.existsSync(LOCAL_FILE_PATH)) {
    console.error(`❌ No se encontró el archivo local: ${LOCAL_FILE_PATH}`);
    return;
  }

  const nuevoContenido = fs.readFileSync(LOCAL_FILE_PATH, 'utf8');
  const nuevoContenidoBase64 = Buffer.from(nuevoContenido).toString('base64');

  try {
    // 1. Obtener el SHA actual del archivo en GitHub
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${RELATIVE_FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    const shaActual = fileData.sha;

    // 2. Subir actualización del archivo
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${RELATIVE_FILE_PATH}`,
      {
        message: 'Actualización automática de categoria_b.json',
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

    console.log('✅ Archivo categoria_b.json actualizado en GitHub');
  } catch (error) {
    console.error('❌ Error al subir archivo:', error.response?.data || error.message);
  }
}

module.exports = {
  guardarYSubirCatB
};
