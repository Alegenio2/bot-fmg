// guardarLigasGit.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GITHUB_REPO = 'Alegenio2/bot-fmg'; // tu usuario/repositorio
const CARPETA_LIGAS = path.join(__dirname, 'ligas'); // carpeta local
const BRANCH = 'main';
const GH_TOKEN = process.env.GH_TOKEN;

async function subirTodasLasLigas() {
  const archivos = fs.readdirSync(CARPETA_LIGAS).filter(file => file.endsWith('.json'));

  for (const archivo of archivos) {
    const rutaLocal = path.join(CARPETA_LIGAS, archivo);
    const rutaGitHub = `ligas/${archivo}`;
    const contenido = fs.readFileSync(rutaLocal, 'utf8');
    const contenidoBase64 = Buffer.from(contenido).toString('base64');

    try {
      // 1. Obtener SHA actual (si el archivo ya existe)
      const { data: fileData } = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaGitHub}?ref=${BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${GH_TOKEN}`,
            Accept: 'application/vnd.github+json'
          }
        }
      );

      const shaActual = fileData.sha;

      // 2. Actualizar el archivo
      await axios.put(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaGitHub}`,
        {
          message: `Actualización automática de ${archivo}`,
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

      console.log(`✅ Archivo ${archivo} actualizado en GitHub`);
    } catch (error) {
      // Si no existe, lo creamos
      if (error.response?.status === 404) {
        try {
          await axios.put(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${rutaGitHub}`,
            {
              message: `Creación automática de ${archivo}`,
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

          console.log(`🆕 Archivo ${archivo} creado en GitHub`);
        } catch (err2) {
          console.error(`❌ Error al crear ${archivo}:`, err2.response?.data || err2.message);
        }
      } else {
        console.error(`❌ Error al procesar ${archivo}:`, error.response?.data || error.message);
      }
    }
  }
}

module.exports = { subirTodasLasLigas };
