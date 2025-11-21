// comandos/resultado_equipos.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs/promises");
const path = require("path");
const { convertirFormatoFecha } = require("../utils/fechas");
const { guardarTorneo } = require("../utils/guardarTorneo");
const { calcularTablaPosiciones } = require("../utils/calcularTablaPosiciones");
const { tablaTorneoEquipos } = require("../utils/tablaTorneoEquipos");
const { obtenerTorneosDisponibles, obtenerEquiposInscritos } = require("../utils/obtenerTorneos.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resultado_equipos")
    .setDescription("Registra el resultado de un partido de equipos")
    .addStringOption(opt =>
      opt
        .setName("torneo")
        .setDescription("Selecciona el torneo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt
        .setName("equipo1")
        .setDescription("Primer equipo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName("puntos_equipo1")
        .setDescription("Puntos del primer equipo")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("equipo2")
        .setDescription("Segundo equipo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(opt =>
      opt
        .setName("puntos_equipo2")
        .setDescription("Puntos del segundo equipo")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("fecha")
        .setDescription("Fecha del partido (DD-MM-YYYY)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("draftmapas")
        .setDescription("URL o ID del draft de mapas")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt
        .setName("draftcivis")
        .setDescription("URL o ID del draft de civilizaciones")
        .setRequired(true)
    )
    .addAttachmentOption(opt =>
      opt
        .setName("archivo")
        .setDescription("Archivo adjunto opcional (por ejemplo, captura del draft o resultado)")
        .setRequired(false)
    ),

  // 🔍 Autocompletado dinámico
  autocomplete: async (interaction) => {
    try {
      const focused = interaction.options.getFocused(true);
      const value = focused.value?.toLowerCase() || "";

      // --- AUTOCOMPLETAR TORNEOS ---
      if (focused.name === "torneo") {
        const torneos = await obtenerTorneosDisponibles();
        if (!torneos?.length) return interaction.respond([]).catch(() => {});
        const filtered = torneos
          .filter(t => t.name.toLowerCase().includes(value))
          .slice(0, 25);
        return interaction.respond(filtered).catch(() => {});
      }

      // --- AUTOCOMPLETAR EQUIPOS ---
      if (focused.name === "equipo1" || focused.name === "equipo2") {
        const torneoId = interaction.options.getString("torneo");
        if (!torneoId) return interaction.respond([]).catch(() => {});

        const equipos = await obtenerEquiposInscritos(torneoId);
        if (!equipos?.length) return interaction.respond([]).catch(() => {});

        const filtered = equipos
          .filter(e => e.toLowerCase().includes(value))
          .map(e => ({ name: e, value: e }))
          .slice(0, 25);

        return interaction.respond(filtered).catch(() => {});
      }

      return interaction.respond([]).catch(() => {});
    } catch (error) {
      console.error("❌ Error en autocomplete de resultado_equipos:", error);
      try { await interaction.respond([]); } catch {}
    }
  },

  async execute(interaction) {
    const { options, client, channel } = interaction;

    const torneoId = options.getString("torneo");
    const eq1 = options.getString("equipo1");
    const eq2 = options.getString("equipo2");
    const puntosEq1 = options.getInteger("puntos_equipo1");
    const puntosEq2 = options.getInteger("puntos_equipo2");
    const fecha = options.getString("fecha");
    const draftmapas = options.getString("draftmapas");
    const draftcivis = options.getString("draftcivis");
    const archivoAdjunto = options.getAttachment("archivo")?.url || null;
    const fechaISO = convertirFormatoFecha(fecha);

    await interaction.deferReply({ ephemeral: true });

    try {
      const filePath = path.join(__dirname, "..", "torneos", `torneo_${torneoId}.json`);

      const data = await fs.readFile(filePath, "utf8");
      const torneo = JSON.parse(data);

      let partidoEncontrado = false;

      // 🔹 Buscar en rondas de grupos
      for (const ronda of torneo.rondas_grupos || []) {
        for (const grupo of ronda.partidos || []) {
          for (const partido of grupo.partidos || []) {
            if (
              (partido.equipo1Nombre === eq1 && partido.equipo2Nombre === eq2) ||
              (partido.equipo1Nombre === eq2 && partido.equipo2Nombre === eq1)
            ) {
              partido.resultado = {
                [eq1]: puntosEq1,
                [eq2]: puntosEq2,
                fecha: fechaISO,
                draftmapas,
                draftcivis,
                archivo: archivoAdjunto,
              };
              partidoEncontrado = true;
              break;
            }
          }
          if (partidoEncontrado) break;
        }
        if (partidoEncontrado) break;
      }

      // 🔹 Buscar en eliminatorias si no se encontró en grupos
      if (!partidoEncontrado) {
        for (const fase of torneo.eliminatorias || []) {
          for (const partido of fase.partidos || []) {
const nombre1 = (partido.equipo1Nombre || "").toLowerCase().trim();
const nombre2 = (partido.equipo2Nombre || "").toLowerCase().trim();
const eq1Lower = eq1.toLowerCase().trim();
const eq2Lower = eq2.toLowerCase().trim();

if (
  (nombre1 === eq1Lower && nombre2 === eq2Lower) ||
  (nombre1 === eq2Lower && nombre2 === eq1Lower)
) {
  partido.resultado = {
    [eq1]: puntosEq1,
    [eq2]: puntosEq2,
    fecha: fechaISO,
    draftmapas,
    draftcivis,
    archivo: archivoAdjunto,
    ganador: puntosEq1 > puntosEq2 ? { id: partido.equipo1Id, nombre: partido.equipo1Nombre } :
              puntosEq2 > puntosEq1 ? { id: partido.equipo2Id, nombre: partido.equipo2Nombre } : null
  };
  partidoEncontrado = true;
  break;
}
          }
          if (partidoEncontrado) break;
        }
      }

      if (!partidoEncontrado) {
        return interaction.editReply({
          content: `⚠️ No se encontró el partido **${eq1} vs ${eq2}** en el torneo **${torneoId}**.`,
          ephemeral: true,
        });
      }

      // 💾 Guardar torneo actualizado
      await guardarTorneo(torneo, filePath, interaction);

      // 🔄 Actualizar eliminatorias automáticamente
      const { actualizarEliminatorias } = require("../utils/actualizarEliminatorias.js");
      await actualizarEliminatorias(torneo, filePath, interaction);

      // 🧮 Actualizar tabla de posiciones
      const tablas = calcularTablaPosiciones(torneo);
      await tablaTorneoEquipos(client, torneo, tablas);

      // 🎨 Color del resultado
      let colorEmbed = "#0c74f5";
      if (puntosEq1 > puntosEq2) colorEmbed = "#16a34a"; // verde
      else if (puntosEq1 < puntosEq2) colorEmbed = "#dc2626"; // rojo

      // 🏆 Embed de resultado
      const embedResultado = new EmbedBuilder()
        .setTitle("🏆 Resultado de Partido")
        .setDescription(`**${eq1}** 🆚 **${eq2}**`)
        .addFields(
          { name: "📊 Marcador", value: `**${eq1}** ||${puntosEq1}|| - ||${puntosEq2}|| **${eq2}**`, inline: true },
          { name: "📅 Fecha", value: fecha, inline: true },
          { name: "🗺️ Draft de Mapas", value: draftmapas || "No disponible", inline: false },
          { name: "⚔️ Draft de Civilizaciones", value: draftcivis || "No disponible", inline: false },
          { name: "📁 Archivo Adjunto", value: archivoAdjunto ? `[Ver archivo](${archivoAdjunto})` : "No adjunto", inline: false },
        )
        .setColor(colorEmbed)
        .setThumbnail("https://cdn-icons-png.flaticon.com/512/149/149097.png")
        .setFooter({ text: `Registrado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      // 📢 Publicar resultado
      await channel.send({ embeds: [embedResultado] });

      // ✅ Confirmación privada
      await interaction.editReply({
        content: "✅ Resultado registrado correctamente y publicado en el canal.",
        ephemeral: true,
      });
    } catch (error) {
      if (error.code === "ENOENT") {
        return interaction.editReply({
          content: `⚠️ No se encontró el archivo del torneo **${torneoId}**.`,
          ephemeral: true,
        });
      }

      console.error("❌ Error al registrar resultado:", error);
      return interaction.editReply({
        content: "❌ Ocurrió un error inesperado al registrar el resultado.",
        ephemeral: true,
      });
    }
  },
};







