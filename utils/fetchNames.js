// fetchNames.js
const fs = require('fs');
const fetch = require('node-fetch'); // instalar con: npm install node-fetch@2
const path = require('path');
const DELAY_MS = 500;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ruta de tu JSON
const usuariosPath = path.resolve("./usuarios.json");

// Función para obtener datos de un perfil
async function obtenerEloActual(profileId) {
  const url = `https://data.aoe2companion.com/api/profiles/${profileId}`;

  try {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "aldeano-oscar-bot/1.0 (jabstv2@gmail.com)"
          }
        });
    const data = await res.json();

    if (!data.leaderboards || data.leaderboards.length === 0) return null;

    const leaderboard1v1 = data.leaderboards.find(
      (lb) => lb.leaderboardId === "rm_1v1"
    );
    if (!leaderboard1v1) return null;

    return {
      profileId,
      nombre: data.name,
     
    };
  } catch (error) {
    console.error(`Error al obtener datos del profileId ${profileId}:`, error);
    return null;
  }  } finally {
    // forzar delay después de cada request
    await delay(DELAY_MS);
  }
}

// Función para actualizar todos los usuarios
async function actualizarUsuarios() {
  if (!fs.existsSync(usuariosPath)) {
    console.error("No se encontró usuarios.json");
    return;
  }

  // Leer usuarios.json
  const usuariosRaw = fs.readFileSync(usuariosPath, "utf8");
  const usuarios = JSON.parse(usuariosRaw);

  const usuariosActualizados = {};

  for (const [discordId, profileId] of Object.entries(usuarios)) {
    const datos = await obtenerEloActual(profileId);
    if (datos) {
      usuariosActualizados[discordId] = datos;
      console.log(`✔ ${discordId} -> ${datos.nombre} (${datos.elo})`);
    } else {
      // si falla, mantener solo el profileId
      usuariosActualizados[discordId] = { profileId, nombre: "Desconocido" };
      console.log(`⚠ ${discordId} -> no se pudo obtener nombre`);
    }
  }

  // Guardar JSON actualizado
  fs.writeFileSync(
    usuariosPath,
    JSON.stringify(usuariosActualizados, null, 2),
    "utf8"
  );
  console.log("✅ usuarios.json actualizado con éxito");
}

// Ejecutar
actualizarUsuarios();
