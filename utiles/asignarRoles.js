// utiles/asignarRoles.js

async function asignarRolesPorPromedio(member, promedio, configServidor) {
  const rolInscripto = configServidor?.rolInscripto;

  // Definir categorías según el promedio
  let rolCategoria = null;
  if (promedio >= 1701 && promedio <= 1900) {
    rolCategoria = configServidor?.categoriaA;
  } else if (promedio >= 1501 && promedio <= 1700) {
    rolCategoria = configServidor?.categoriaB;
  } else if (promedio >= 1301 && promedio <= 1500) {
    rolCategoria = configServidor?.categoriaC;
  } else if (promedio >= 1101 && promedio <= 1300) {
    rolCategoria = configServidor?.categoriaD;
  } else {
    rolCategoria = configServidor?.categoriaE;
  }

  try {
    // Eliminar otras categorías anteriores si existen (opcional)
    const rolesCategorias = [
      configServidor?.categoriaA,
      configServidor?.categoriaB,
      configServidor?.categoriaC,
      configServidor?.categoriaD,
      configServidor?.categoriaE,
    ].filter(Boolean);

    await member.roles.remove(rolesCategorias); // Elimina cualquier categoría previa

    if (rolInscripto) await member.roles.add(rolInscripto);
    if (rolCategoria) await member.roles.add(rolCategoria);
  } catch (error) {
    console.error("Error al asignar roles por promedio:", error);
  }
}

module.exports = { asignarRolesPorPromedio };
