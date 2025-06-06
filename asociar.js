// asociar.js
const fs = require('fs');
const { guardarYSubirCambiosArchivo } = require('./guardarGit');

const archivo = './usuarios.json';

function cargarAsociaciones() {
  try {
    if (!fs.existsSync(archivo)) {
      return {};
    }
    const data = fs.readFileSync(archivo, 'utf8');
    if (!data.trim()) {
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Error leyendo el archivo usuarios.json:', error);
    return {};
  }
}

function guardarAsociaciones(asociaciones) {
  try {
    fs.writeFileSync(archivo, JSON.stringify(asociaciones, null, 2), 'utf8');
    guardarYSubirCambiosArchivo(); // << ✅ sube cambios a GitHub
  } catch (error) {
    console.error('Error guardando el archivo usuarios.json:', error);
  }
}

function asociarUsuario(discordId, aoe2Id) {
  const asociaciones = cargarAsociaciones();
  asociaciones[discordId] = aoe2Id;
  guardarAsociaciones(asociaciones);
}

function obtenerAoeId(discordId) {
  const asociaciones = cargarAsociaciones();
  return asociaciones[discordId] || null;
}

module.exports = {
  asociarUsuario,
  obtenerAoeId
};

