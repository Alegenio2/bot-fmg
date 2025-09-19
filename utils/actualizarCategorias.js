// utils/actualizarCategorias.js
const fs = require('fs');
const path = require('path');
const { guardarYSubirCatA } = require('../git/guardarGit_Cat_A.js');
const { guardarYSubirCatB } = require('../git/guardarGit_Cat_B.js');
const { guardarYSubirCatC } = require('../git/guardarGit_Cat_C.js');
const { guardarYSubirCatD } = require('../git/guardarGit_Cat_D.js');
const { guardarYSubirCatE } = require('../git/guardarGit_Cat_E.js');
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

    // Subida automática a GitHub por cada categoría
    if (letra === 'a') {
      await guardarYSubirCatA();
    } else if (letra === 'b') {
      await guardarYSubirCatB();
    } else if (letra === 'c') {
      await guardarYSubirCatC();
    } else if (letra === 'd') {
      await guardarYSubirCatD();
    } else if (letra === 'e'){
      await guardarYSubirCatE();
    } 
  }
}

module.exports = { actualizarCategoriasDesdeRoles };

