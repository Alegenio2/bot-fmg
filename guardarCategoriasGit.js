// utiles/guardarCategoriasGit.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'Alegenio2/bot-fmg';
const BRANCH = 'main';
const GH_TOKEN = process.env.GH_TOKEN;

const CATEGORIAS_DIR = path.join(__dirname, '..', 'categorias');

async function subirCategoriaAGitHub(nombreArchivo, rutaLocal) {
  const contenido = fs.readFileSync(rutaLocal, 'utf8');
  const contenidoBase64 = Buffer.from(contenido).toString('base64');
  const rutaRemota = `categorias/${nombreArchivo}`;

  try {
    const { data: fileData } = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemota}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github+json'
        }
      }
    );

    const shaActual = fileData.sha;

    await axios.put(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemota}`,
      {
        message: `Actualización automática de ${nombreArchivo}`,
        content: contenidoBase64,
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

    console.log(`✅ ${nombreArchivo} actualizado en GitHub`);

  } catch (error) {
    if (error.response?.status === 404) {
      // Si no existe, lo creamos
      try {
        await axios.put(
          `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaRemota}`,
          {
            message: `Creación automática de ${nombreArchivo}`,
            content: contenidoBase64,
            branch: BRANCH
          },
          {
            headers: {
              Authorization: `Bearer ${GH_TOKEN}`,
              Accept: 'application/vnd.github+json'
            }
          }
        );
        console.log(`🆕 ${nombreArchivo} creado en GitHub`);
      } catch (err) {
        console.error(`❌ Error creando ${nombreArchivo}:`, err.response?.data || err.message);
      }
    } else {
      console.error(`❌ Error subiendo ${nombreArchivo}:`, error.response?.data || error.message);
    }
  }
}

async function guardarYSubirCategorias() {
  if (!fs.existsSync(CATEGORIAS_DIR)) {
    console.log('❌ No existe la carpeta categorias/');
    return;
  }

  const archivos = fs.readdirSync(CATEGORIAS_DIR).filter(file => file.endsWith('.json'));

  for (const archivo of archivos) {
    const ruta = path.join(CATEGORIAS_DIR, archivo);
    await subirCategoriaAGitHub(archivo, ruta);
  }
}

module.exports = {
  guardarYSubirCategorias
};
