// utiles/asignarRoles.js

const fs = require('fs');
const path = require('path');

async function asignarRolesPorPromedio(member, promedio, configServidor) {
  const rolInscripto = configServidor?.rolInscripto;

  let categoria = null;
  if (promedio >= 1701 && promedio <= 3000) {
    categoria = "a";
  } else if (promedio >= 1501 && promedio <= 1700) {
    categoria = "b";
  } else if (promedio >= 1301 && promedio <= 1500) {
    categoria = "c";
  } else if (promedio >= 1101 && promedio <= 1300) {
    categoria = "d";
  } else {
    categoria = "e";
  }

  const rolCategoria = configServidor?.[`categoria${categoria.toUpperCase()}`];

  try {
    // Quitar roles de otras categorías
    const rolesCategorias = [
      configServidor?.categoriaA,
      configServidor?.categoriaB,
      configServidor?.categoriaC,
      configServidor?.categoriaD,
      configServidor?.categoriaE,
    ].filter(Boolean);

    await member.roles.remove(rolesCategorias);
    if (rolInscripto) await member.roles.add(rolInscripto);
    if (rolCategoria) await member.roles.add(rolCategoria);

    // Guardar jugador en archivo JSON de su categoría
    const dataPath = path.join(__dirname, '..', 'categorias');
    const filePath = path.join(dataPath, `categoria_${categoria}.json`);

    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath);
    }

    let jugadores = [];
    if (fs.existsSync(filePath)) {
      jugadores = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    const yaRegistrado = jugadores.find(j => j.id === member.id);
    if (!yaRegistrado) {
      jugadores.push({ id: member.id, nombre: member.user.username });
      fs.writeFileSync(filePath, JSON.stringify(jugadores, null, 2), 'utf8');
      console.log(`✅ Agregado ${member.user.username} a categoria_${categoria}.json`);
    }

  } catch (error) {
    console.error("❌ Error al asignar roles o guardar jugador:", error);
  }
}

module.exports = { asignarRolesPorPromedio };

