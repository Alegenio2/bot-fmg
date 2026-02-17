// utils/asociar.js
const fs = require('fs');
const { guardarYSubirCambiosArchivo } = require('../git/guardarGit');

const archivo = './usuarios.json';

function cargarAsociaciones() {
  try {
    if (!fs.existsSync(archivo)) return {};

    const data = fs.readFileSync(archivo, 'utf8');
    if (!data.trim()) return {};

    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error leyendo usuarios.json:', error);
    return {};
  }
}

function guardarAsociaciones(asociaciones) {
  try {
    fs.writeFileSync(archivo, JSON.stringify(asociaciones, null, 2), 'utf8');
    guardarYSubirCambiosArchivo(); // ✅ sube cambios a GitHub
  } catch (error) {
    console.error('❌ Error guardando usuarios.json:', error);
  }
}

/**
 * 🧠 Guarda el usuario COMPLETO
 * @param {string} discordId
 * @param {object} usuarioData
 */
function asociarUsuario(discordId, usuarioData) {
  const asociaciones = cargarAsociaciones();

  asociaciones[discordId] = {
    profileId: usuarioData.profileId,
    nombre: usuarioData.nombre,
    elo: usuarioData.elo,
    rank: usuarioData.rank,
    wins: usuarioData.wins,
    losses: usuarioData.losses,
    pais: usuarioData.pais,
    country: usuarioData.country,
    clan: usuarioData.clan,
    elomax: usuarioData.elomax,
    ultimapartida: usuarioData.ultimapartida
  };

  guardarAsociaciones(asociaciones);
}

/**
 * 🔎 Obtiene el profileId desde Discord ID
 */
function obtenerProfileId(discordId) {
  const asociaciones = cargarAsociaciones();
  return asociaciones[discordId]?.profileId || null;
}

/**
 * 🔎 Obtiene el usuario completo
 */
function obtenerUsuario(discordId) {
  const asociaciones = cargarAsociaciones();
  return asociaciones[discordId] || null;
}

module.exports = {
  asociarUsuario,
  obtenerProfileId,
  obtenerUsuario
};


