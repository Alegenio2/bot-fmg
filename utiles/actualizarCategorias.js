// utils/actualizarCategorias.js
const fs = require('fs');
const path = require('path');
const { guardarYSubirCategorias } = require('../guardarCategoriasGit');
const config = require('../botConfig.json');

async function actualizarCategoriasDesdeRoles(guild) {
  const configServidor = config.servidores[guild.id];
  if (!configServidor) return;

  const categoriaRoles = {
    a: configServidor.categoriaA,
    b: configServidor.categoriaB,
    c: configServidor.categoriaC,
    d: configServidor.categoriaD,
    e: configServidor.categoriaE
  };

  await guild.members.fetch(); // aseguramos que estén todos

  for (const [letra, roleId] of Object.entries(categoriaRoles)) {
    if (!roleId) continue;

    const miembrosConRol = guild.members.cache.filter(m => m.roles.cache.has(roleId));
    const jugadores = miembrosConRol.map(m => ({
      id: m.id,
      nombre: m.user.username
    }));

    const carpeta = path.join(__dirname, '..', 'categorias');
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

    const archivo = path.join(carpeta, `categoria_${letra}.json`);
    fs.writeFileSync(archivo, JSON.stringify(jugadores, null, 2), 'utf8');
    console.log(`📂 Actualizado categoria_${letra}.json con ${jugadores.length} jugadores.`);
  }

  // Subida automática a GitHub
  await guardarYSubirCategorias();
}
module.exports = { actualizarCategoriasDesdeRoles };
