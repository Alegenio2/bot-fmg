// utils/asignarRoles.js
const fs = require("fs");
const path = require("path");

/**
 * Asigna roles según el promedio de ELO individual
 * @param {GuildMember} member - Miembro de Discord
 * @param {number} promedio - Promedio de ELO del jugador
 * @param {Object} configServidor - Configuración del servidor
 * @param {string} torneo - Clave del torneo (ej: "copa_uruguaya_1v1" o "copa_uruguaya_2v2")
 */
async function asignarRolesPorPromedio(member, promedio, configServidor, torneo) {
  try {
    const categoria = definirCategoria(promedio, torneo);
    const rolInscripto = configServidor?.rolInscripto;
    const rolCategoria = configServidor?.[`categoria${categoria.toUpperCase()}`];

    const rolesCategorias = obtenerRolesCategorias(configServidor);

    // Remover roles antiguos y agregar nuevos
    await member.roles.remove(rolesCategorias);
    if (rolInscripto) await member.roles.add(rolInscripto);
    if (rolCategoria) await member.roles.add(rolCategoria);

    guardarEnCategoria(member.id, member.user.username, categoria, torneo);

    console.log(`✅ ${member.user.username} asignado a categoría ${categoria.toUpperCase()} (${torneo})`);
  } catch (error) {
    console.error("❌ Error al asignar roles:", error);
  }
}

/**
 * Asigna roles y guarda los jugadores de un equipo (2v2, 3v3, 4v4)
 */
async function asignarRolesPorPromedioEquipo(jugadores, promedioEquipo, configServidor, torneo) {
  if (!Array.isArray(jugadores) || jugadores.length === 0) {
    console.error("❌ asignarRolesPorPromedioEquipo: lista de jugadores vacía");
    return;
  }

  try {
    const categoria = definirCategoria(promedioEquipo, torneo);
    const rolInscripto = configServidor?.rolInscripto;
    const rolCategoria = configServidor?.[`categoria${categoria.toUpperCase()}`];
    const rolesCategorias = obtenerRolesCategorias(configServidor);

    for (const member of jugadores) {
      if (!member) continue;

      await member.roles.remove(rolesCategorias);
      if (rolInscripto) await member.roles.add(rolInscripto);
      if (rolCategoria) await member.roles.add(rolCategoria);

      guardarEnCategoria(member.id, member.user.username, categoria, torneo);
    }

    console.log(
      `✅ Roles asignados a equipo (${torneo}): ${jugadores.map(j => j.user.username).join(", ")} → ${categoria.toUpperCase()}`
    );
  } catch (error) {
    console.error("❌ Error al asignar roles de equipo:", error);
  }
}

/**
 * Determina la categoría según el ELO promedio y el torneo indicado.
 */
function definirCategoria(promedio, torneo) {
  const eloPath = path.join(__dirname, "..", "elo_limites.json");

  if (!fs.existsSync(eloPath)) {
    console.warn("⚠️ No se encontró elo_limites.json, usando categorías por defecto.");
    return calcularCategoriaPorDefecto(promedio);
  }

  const data = JSON.parse(fs.readFileSync(eloPath, "utf8"));
  const limites = data[torneo];

  if (!limites) {
    console.warn(`⚠️ No hay límites definidos para el torneo ${torneo}. Usando valores por defecto.`);
    return calcularCategoriaPorDefecto(promedio);
  }

  // Ordenar categorías de mayor a menor (por valor)
  const categoriasOrdenadas = Object.entries(limites).sort((a, b) => b[1] - a[1]);

  for (const [cat, valor] of categoriasOrdenadas) {
    if (promedio >= valor) return cat;
  }

  // Si no cumple con ninguna, va a la más baja
  return categoriasOrdenadas.at(-1)?.[0] || "sin_categoria";
}

/**
 * Categorías de fallback si no existe el JSON
 */
function calcularCategoriaPorDefecto(promedio) {
  if (promedio >= 1701) return "a";
  if (promedio >= 1501) return "b";
  if (promedio >= 1301) return "c";
  if (promedio >= 1101) return "d";
  return "e";
}

/**
 * Devuelve todos los roles de categorías definidos en la config
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
 * Guarda el jugador en el archivo de su categoría y torneo
 */
function guardarEnCategoria(id, nombre, categoria, torneo) {
  try {
    const dataPath = path.join(__dirname, "..", "categorias", torneo);
    const filePath = path.join(dataPath, `categoria_${categoria}.json`);

    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });

    let jugadores = [];
    if (fs.existsSync(filePath)) {
      jugadores = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }

    if (!jugadores.some(j => j.id === id)) {
      jugadores.push({ id, nombre });
      fs.writeFileSync(filePath, JSON.stringify(jugadores, null, 2), "utf8");
      console.log(`✅ Agregado ${nombre} a ${torneo}/categoria_${categoria}.json`);
    }
  } catch (err) {
    console.error("❌ Error guardando jugador en categoría:", err);
  }
}

module.exports = { asignarRolesPorPromedio, asignarRolesPorPromedioEquipo };
