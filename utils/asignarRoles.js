// utiles/asignarRoles.js
const fs = require('fs');
const path = require('path');

/**
 * 🔹 Asigna roles según el promedio de ELO y guarda en la categoría correspondiente.
 * Usa los límites configurados en elo_limites.json
 */
async function asignarRolesPorPromedio(member, promedio, configServidor, torneo = 'copa_uruguaya_1v1') {
  const rolInscripto = configServidor?.rolInscripto;
  const categoria = definirCategoriaDesdeJSON(promedio, torneo);
  const rolCategoria = configServidor?.[`categoria${categoria.toUpperCase()}`];

  try {
    const rolesCategorias = obtenerRolesCategorias(configServidor);

    await member.roles.remove(rolesCategorias);
    if (rolInscripto) await member.roles.add(rolInscripto);
    if (rolCategoria) await member.roles.add(rolCategoria);

    guardarEnCategoria(member.id, member.user.username, categoria);
  } catch (error) {
    console.error("❌ Error al asignar roles o guardar jugador:", error);
  }
}

/**
 * 🔹 Asigna roles y guarda jugadores de un equipo de cualquier tamaño
 * Ejemplo: asignarRolesPorPromedioEquipo([j1, j2], promedio, config, 'copa_uruguaya_2v2')
 */
async function asignarRolesPorPromedioEquipo(jugadores, promedioEquipo, configServidor, torneo = 'copa_uruguaya_2v2') {
  if (!Array.isArray(jugadores) || jugadores.length === 0) {
    console.error("❌ asignarRolesPorPromedioEquipo: lista de jugadores vacía");
    return;
  }

  const rolInscripto = configServidor?.rolInscripto;
  const categoria = definirCategoriaDesdeJSON(promedioEquipo, torneo);
  const rolCategoria = configServidor?.[`categoria${categoria.toUpperCase()}`];
  const rolesCategorias = obtenerRolesCategorias(configServidor);

  try {
    for (const member of jugadores) {
      if (!member) continue;

      await member.roles.remove(rolesCategorias);
      if (rolInscripto) await member.roles.add(rolInscripto);
      if (rolCategoria) await member.roles.add(rolCategoria);

      guardarEnCategoria(member.id, member.user.username, categoria);
    }

    console.log(`✅ Roles asignados correctamente a equipo ${jugadores.map(j => j.user.username).join(", ")}`);
  } catch (error) {
    console.error("❌ Error al asignar roles de equipo:", error);
  }
}

/**
 * 📊 Determina la categoría según el promedio y los límites del torneo
 */
function definirCategoriaDesdeJSON(promedio, torneo) {
  const filePath = path.join(__dirname, '..', 'elo_limites.json');
  if (!fs.existsSync(filePath)) {
    console.warn("⚠️ No se encontró elo_limites.json, usando valores por defecto");
    return definirCategoriaPorDefecto(promedio);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const limites = data[torneo];

  if (!limites) {
    console.warn(`⚠️ No hay configuración para el torneo ${torneo}, usando valores por defecto`);
    return definirCategoriaPorDefecto(promedio);
  }

  // Ordenar categorías por ELO máximo descendente
  const ordenadas = Object.entries(limites).sort((a, b) => b[1] - a[1]);

  for (const [cat, max] of ordenadas) {
    if (promedio >= max) return cat;
  }

  // Si no cumple ninguna, asignar la más baja
  return ordenadas[ordenadas.length - 1][0];
}

/**
 * 🔹 Categorías de respaldo si no hay JSON
 */
function definirCategoriaPorDefecto(promedio) {
  if (promedio >= 1701) return "a";
  if (promedio >= 1501) return "b";
  if (promedio >= 1301) return "c";
  if (promedio >= 1101) return "d";
  return "e";
}

/**
 * Devuelve la lista de roles de categorías configurados
 */
function obtenerRolesCategorias(configServidor) {
  return [
    configServidor?.categoriaA,
    configServidor?.categoriaB,
    configServidor?.categoriaC,
    configServidor?.categoriaD,
    configServidor?.categoriaE,
  ].filter(Boolean);
}

/**
 * Guarda un jugador en el archivo JSON de su categoría
 */
function guardarEnCategoria(id, nombre, categoria) {
  try {
    const dataPath = path.join(__dirname, '..', 'categorias');
    const filePath = path.join(dataPath, `categoria_${categoria}.json`);

    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

    let jugadores = [];
    if (fs.existsSync(filePath)) {
      jugadores = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    if (!jugadores.some(j => j.id === id)) {
      jugadores.push({ id, nombre });
      fs.writeFileSync(filePath, JSON.stringify(jugadores, null, 2), 'utf8');
      console.log(`✅ Agregado ${nombre} a categoria_${categoria}.json`);
    }
  } catch (err) {
    console.error("❌ Error guardando jugador en categoría:", err);
  }
}

module.exports = { asignarRolesPorPromedio, asignarRolesPorPromedioEquipo };

