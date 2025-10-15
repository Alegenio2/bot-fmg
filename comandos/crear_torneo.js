//comandos/crear_torneo.js
const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { crearTorneoDesdeEquipos } = require("../utils/creartorneo.js");
const botConfig = require("../botConfig.json");

// Cargar torneos disponibles desde equipos_inscritos.json
function obtenerTorneosDisponibles() {
  const rutaEquipos = path.join(__dirname, "..", "equipos_inscritos.json");
  if (!fs.existsSync(rutaEquipos)) return [];
  const equipos = JSON.parse(fs.readFileSync(rutaEquipos, "utf8"));
  const torneosUnicos = [...new Set(equipos.map(e => e.torneo))];
  return torneosUnicos.map(t => ({ name: t, value: t }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crear_torneo")
    .setDescription("Genera automáticamente un torneo con grupos y fases finales")
    .addStringOption(opt =>
      opt
        .setName("torneo")
        .setDescription("Selecciona el torneo para crear la estructura")
        .setRequired(true)
        .addChoices(...obtenerTorneosDisponibles())
    )
    .addIntegerOption(opt =>
      opt
        .setName("cantidad_grupos")
        .setDescription("Número de grupos (2, 4 u 8)")
        .setRequired(true)
        .addChoices(
          { name: "2 Grupos", value: 2 },
          { name: "4 Grupos", value: 4 },
          { name: "8 Grupos", value: 8 }
        )
    )
    .addIntegerOption(opt =>
      opt
        .setName("clasificados")
        .setDescription("Equipos que clasifican por grupo (1 o 2)")
        .setRequired(true)
        .addChoices(
          { name: "1 por grupo", value: 1 },
          { name: "2 por grupo", value: 2 }
        )
    ),

  async execute(interaction) {
    try {
      const { options, user } = interaction;

      // Solo el organizador puede ejecutar
      if (user.id !== botConfig.ownerId) {
        return interaction.reply({
          content: "❌ Solo el organizador puede usar este comando.",
          ephemeral: true,
        });
      }

      const torneo = options.getString("torneo");
      const cantidadGrupos = options.getInteger("cantidad_grupos");
      const clasificados = options.getInteger("clasificados");

      await interaction.deferReply();

      const resultado = await crearTorneoDesdeEquipos(
        torneo,
        cantidadGrupos,
        clasificados
      );

      await interaction.editReply({
        content: resultado,
      });
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "⚠️ Ocurrió un error al crear el torneo.",
        ephemeral: true,
      });
    }
  },
};

