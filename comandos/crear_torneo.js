//comandos/crear_torneo.js
const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { crearTorneoDesdeEquipos } = require("../utils/creartorneo.js");
const { crearTorneo1v1 } = require("../utils/crearTorneo1v1.js");
const botConfig = require("../botConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crear_torneo")
    .setDescription("Genera automáticamente un torneo con grupos y fases finales")
    .addStringOption(opt =>
      opt.setName("tipo")
        .setDescription("¿Es un torneo de equipos o 1v1?")
        .setRequired(true)
        .addChoices(
          { name: "Individual (1v1)", value: "1v1" },
          { name: "Equipos (Team Games)", value: "equipos" }
        )
    )
    .addStringOption(opt =>
      opt.setName("nombre")
        .setDescription("ID del torneo (ej: copa_uruguaya_2026)")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("cantidad_grupos")
        .setDescription("Número de grupos")
        .setRequired(true)
        .addChoices(
          { name: "2 Grupos", value: 2 },
          { name: "4 Grupos", value: 4 },
          { name: "8 Grupos", value: 8 }
        )
    )
    .addIntegerOption(opt =>
      opt.setName("clasificados")
        .setDescription("Equipos/Jugadores que clasifican por grupo")
        .setRequired(true)
        .addChoices(
          { name: "1 por grupo", value: 1 },
          { name: "2 por grupo", value: 2 }
        )
    )
    .addBooleanOption(opt => 
    opt.setName('redondear')
       .setDescription('¿Redondear ELO a múltiplos de 50 para el hándicap?')
       .setRequired(true)
    ),

  async execute(interaction) {
    const { options, user } = interaction;

    // 1. Verificación de permisos
    if (user.id !== botConfig.ownerId) {
      return interaction.reply({
        content: "❌ Solo el organizador puede usar este comando.",
        ephemeral: true,
      });
    }

    try {
      await interaction.deferReply();

      const tipo = options.getString("tipo");
      const torneoId = options.getString("nombre"); // Ahora capturamos el nombre
      const cantidadGrupos = options.getInteger("cantidad_grupos");
      const clasificados = options.getInteger("clasificados");
      const redondear = options.getBoolean("redondear"); // <--- CAPTURAR ESTO

      let resultado;

      if (tipo === "1v1") {
        // Llamamos a la utilidad 1v1
        resultado = await crearTorneo1v1(torneoId, cantidadGrupos, clasificados, redondear);
      } else {
        // Llamamos a la utilidad de Equipos
        resultado = await crearTorneoDesdeEquipos(torneoId, cantidadGrupos, clasificados);
      }

      await interaction.editReply({
        content: resultado,
      });

    } catch (err) {
      console.error("Error en crear_torneo:", err);
      // Verificamos si ya respondimos para evitar doble respuesta
      if (interaction.deferred) {
        await interaction.editReply({ content: "⚠️ Ocurrió un error al crear el torneo." });
      } else {
        await interaction.reply({ content: "⚠️ Ocurrió un error al crear el torneo.", ephemeral: true });
      }
    }
  },
};