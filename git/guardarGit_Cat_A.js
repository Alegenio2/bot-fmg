// git/guardarGit_Cat_A.js 
const axios = require('axios');
const fs = require('fs');

const GITHUB_REPO = 'Alegenio2/bot-fmg'; // tu usuario/repositorio
const FILE_PATH = './categorias/categoria_a.json';
const BRANCH = 'main'; // o el branch que uses

const GH_TOKEN = process.env.GH_TOKEN;

async function guardarYSubirCatA() {
  const nuevoContenido = fs.readFileSync(FILE_PATH, 'utf8');
  const nuevoContenidoBase64 = Buffer.from(nuevoContenido).toString('base64');

  try {
    // 1. Obtener el SHA actual del archivo
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    const shaActual = fileData.sha;

    // 2. Enviar PUT para actualizar
    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${FILE_PATH}`,
      {
        message: 'Actualización automática de categoria_a.json',
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

    console.log('✅ Archivo categoria_a.json actualizado en GitHub');
  } catch (error) {
    console.error('❌ Error al subir archivo:', error.response?.data || error.message);
  }
}

module.exports = {
  guardarYSubirCatA
};

