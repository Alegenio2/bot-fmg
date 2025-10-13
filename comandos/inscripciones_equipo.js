// comandos/inscripciones_equipo.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { asignarRolesPorPromedio } = require("../utils/asignarRoles.js");
const { actualizarCategoriasDesdeRoles } = require("../utils/actualizarCategorias.js");

module.exports = {
  name: "inscripciones_equipo",
  description: "Inscripción de equipos para torneos 2v2, 3v3 o 4v4.",
  options: [
    {
      name: "nombre_equipo",
      description: "Nombre del equipo.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "torneo",
      description: "Selecciona el torneo.",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Copa Uruguaya 2v2", value: "copa_uruguaya_2v2" },
        { name: "Uruguay Open Cup 2v2", value: "uruguay_open_cup_2v2" },
        { name: "Uruguay Open Cup 3v3", value: "uruguay_open_cup_3v3" },
        { name: "Uruguay Open Cup 4v4", value: "uruguay_open_cup_4v4" },
      ],
    },
    // Jugador 1
    {
      name: "jugador1",
      description: "Nombre del Jugador 1.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    { name: "elo_max_j1", description: "ELO máximo del Jugador 1.", type: ApplicationCommandOptionType.Number, required: true },
    { name: "elo_actual_j1", description: "ELO actual del Jugador 1.", type: ApplicationCommandOptionType.Number, required: true },
    { name: "link_j1", description: "Link de perfil AoE2 Companion del Jugador 1.", type: ApplicationCommandOptionType.String, required: true },

    // Jugador 2
    {
      name: "jugador2",
      description: "Nombre del Jugador 2.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    { name: "elo_max_j2", description: "ELO máximo del Jugador 2.", type: ApplicationCommandOptionType.Number, required: true },
    { name: "elo_actual_j2", description: "ELO actual del Jugador 2.", type: ApplicationCommandOptionType.Number, required: true },
    { name: "link_j2", description: "Link de perfil AoE2 Companion del Jugador 2.", type: ApplicationCommandOptionType.String, required: true },

    // Jugador 3 (opcional)
    {
      name: "jugador3",
      description: "Nombre del Jugador 3 (si aplica).",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    { name: "elo_max_j3", description: "ELO máximo del Jugador 3.", type: ApplicationCommandOptionType.Number, required: false },
    { name: "elo_actual_j3", description: "ELO actual del Jugador 3.", type: ApplicationCommandOptionType.Number, required: false },
    { name: "link_j3", description: "Link de perfil AoE2 Companion del Jugador 3.", type: ApplicationCommandOptionType.String, required: false },

    // Jugador 4 (opcional)
    {
      name: "jugador4",
      description: "Nombre del Jugador 4 (si aplica).",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    { name: "elo_max_j4", description: "ELO máximo del Jugador 4.", type: ApplicationCommandOptionType.Number, required: false },
    { name: "elo_actual_j4", description: "ELO actual del Jugador 4.", type: ApplicationCommandOptionType.Number, required: false },
    { name: "link_j4", description: "Link de perfil AoE2 Companion del Jugador 4.", type: ApplicationCommandOptionType.String, required: false },
  ],

  async execute(interaction) {
    const { options, user, member, guild } = interaction;

    const nombre_equipo = options.getString("nombre_equipo");
    const torneo = options.getString("torneo");

    // Crear array de jugadores (filtrando los no usados)
    const jugadores = [];
    for (let i = 1; i <= 4; i++) {
      const nombre = options.getString(`jugador${i}`);
      if (!nombre) continue;
      jugadores.push({
        nombre,
        elo_max: options.getNumber(`elo_max_j${i}`),
        elo_actual: options.getNumber(`elo_actual_j${i}`),
        link: options.getString(`link_j${i}`),
      });
    }

    // ✅ Validar cantidad mínima según el torneo
    const tipo = torneo.includes("4v4") ? 4 : torneo.includes("3v3") ? 3 : 2;
    if (jugadores.length !== tipo) {
      return interaction.reply({
        content: `❌ Este torneo es **${tipo}v${tipo}**, y registraste **${jugadores.length} jugadores**.`,
        ephemeral: true,
      });
    }

    // ✅ Validar links
    for (const j of jugadores) {
      if (!/^https:\/\/(www\.)?aoe2companion\.com\/profile\/\d+$/.test(j.link)) {
        return interaction.reply({
          content: `❌ El link del jugador **${j.nombre}** no es válido. Debe ser algo como:
https://www.aoe2companion.com/profile/2587873713`,
          ephemeral: true,
        });
      }
    }

    // 📊 Calcular promedio general del equipo
    const promedios = jugadores.map(j => Math.round((j.elo_actual + j.elo_max) / 2));
    const promedioEquipo = Math.round(promedios.reduce((a, b) => a + b, 0) / jugadores.length);

    // 📁 Leer límites de ELO
    const eloPath = path.join(__dirname, "..", "elo_limites.json");
    const eloLimites = JSON.parse(fs.readFileSync(eloPath, "utf8"));
    const limites = eloLimites[torneo];

    if (!limites) {
      return interaction.reply({
        content: `❌ No se encontraron límites de ELO para el torneo **${torneo}**.`,
        ephemeral: true,
      });
    }

    // 🏅 Determinar categoría
    let categoria = "sin_categoria";
    for (const [cat, valor] of Object.entries(limites)) {
      if (promedioEquipo >= valor) {
        categoria = cat;
        break;
      }
    }

    // 🆔 Crear ID de equipo único
    const equipoId = crypto.randomBytes(4).toString("hex");

    // 📦 Guardar inscripción
    const inscripcionesPath = path.join(__dirname, "..", "data", "inscripciones_equipos.json");
    let inscripciones = [];
    if (fs.existsSync(inscripcionesPath)) {
      inscripciones = JSON.parse(fs.readFileSync(inscripcionesPath, "utf8"));
    }

    inscripciones.push({
      id: equipoId,
      nombre_equipo,
      torneo,
      categoria,
      promedio: promedioEquipo,
      jugadores,
    });

    fs.writeFileSync(inscripcionesPath, JSON.stringify(inscripciones, null, 2));

    // 💬 Mensaje resumen
    let mensaje = `✅ **Equipo Inscripto Correctamente**
🏆 **Torneo:** ${torneo.replace(/_/g, " ")}
🎯 **Categoría:** ${categoria.toUpperCase()}
📊 **Promedio del equipo:** ${promedioEquipo}
🆔 **ID del equipo:** \`${equipoId}\`
🎮 **Nombre del equipo:** ${nombre_equipo}

👥 **Integrantes:**
${jugadores
  .map(
    (j, i) =>
      `**Jugador ${i + 1}:** ${j.nombre}\n• Máximo: ${j.elo_max}\n• Actual: ${j.elo_actual}\n🔗 ${j.link}`
  )
  .join("\n\n")}`;

    await interaction.reply(mensaje);

    // 🎭 Asignar roles automáticamente si corresponde
    const configServidor = require("../botConfig").servidores[guild.id];
    if (member) {
      await asignarRolesPorPromedio(member, promedioEquipo, configServidor, torneo);
      await actualizarCategoriasDesdeRoles(guild);
    }
  },
};
