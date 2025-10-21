// comandos/resultado_equipos.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { convertirFormatoFecha } = require("../utils/fechas");
const { guardarTorneo } = require("../utils/guardarTorneo");
const { calcularTablaPosiciones } = require("../utils/calcularTablaPosiciones");
const { tablaTorneoEquipos } = require("../utils/tablaTorneoEquipos");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resultado_equipos")
    .setDescription("Registra el resultado de un partido de equipos")
    .addStringOption((opt) =>
      opt
        .setName("torneo")
        .setDescription("Selecciona el torneo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt.setName("equipo1").setDescription("Primer equipo").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("puntos_equipo1").setDescription("Puntos del primer equipo").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("equipo2").setDescription("Segundo equipo").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("puntos_equipo2").setDescription("Puntos del segundo equipo").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("fecha").setDescription("Fecha del partido DD-MM-YYYY").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("draftmapas").setDescription("Draft de mapas").setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName("draftcivis").setDescription("Draft de civilizaciones").setRequired(false)
    )
    .addAttachmentOption((opt) =>
      opt.setName("archivo").setDescription("Archivo adjunto opcional").setRequired(false)
    ),

  // Autocomplete solo para torneos (o equipos si querés)
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const torneosPath = path.join(__dirname, "..", "torneos");
    const files = fs.readdirSync(torneosPath).filter((f) => f.endsWith(".json"));
    const torneos = files.map((f) => f.replace(".json", ""));
    const filtered = torneos.filter((t) => t.toLowerCase().includes(focusedValue.toLowerCase()));
    await interaction.respond(filtered.map((t) => ({ name: t, value: t })));
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

    const filePath = path.join(__dirname, "..", "torneos", `${torneoId}.json`);
    if (!fs.existsSync(filePath)) {
      return interaction.reply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}`, ephemeral: true });
    }

    const torneo = JSON.parse(fs.readFileSync(filePath, "utf8"));
    await interaction.deferReply({ ephemeral: true });

    let partidoEncontrado = false;

    // Buscar partido en rondas de grupos
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

    // Buscar partido en eliminatorias si no se encontró en grupos
    if (!partidoEncontrado) {
      for (const fase of torneo.eliminatorias || []) {
        for (const partido of fase.partidos || []) {
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
    }

    if (!partidoEncontrado)
      return interaction.editReply({
        content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`,
        ephemeral: true,
      });

    // Guardar torneo actualizado
    await guardarTorneo(torneo, filePath, interaction);

    // Actualizar eliminatorias automáticamente
    const { actualizarEliminatorias } = require("../utils/actualizarEliminatorias.js");
    await actualizarEliminatorias(torneo, filePath, interaction);

    // Actualizar tabla de posiciones
    const tablas = calcularTablaPosiciones(torneo);
    await tablaTorneoEquipos(client, torneo, tablas);

    // Determinar color según resultado
    let colorEmbed = "#0c74f5";
    if (puntosEq1 > puntosEq2) colorEmbed = "#16a34a"; // verde
    else if (puntosEq1 < puntosEq2) colorEmbed = "#dc2626"; // rojo

    // Crear embed con resultado
    const embedResultado = new EmbedBuilder()
      .setTitle("🏆 Resultado de Partido")
      .setDescription(`**${eq1}** 🆚 **${eq2}**`)
      .addFields(
        { name: "📊 Marcador", value: `**${eq1}** ||${puntosEq1}|| - ||${puntosEq2}|| **${eq2}**`, inline: true },
        { name: "📅 Fecha", value: fecha, inline: true },
        { name: "🗺️ Draft de Mapas", value: draftmapas || "No disponibles", inline: false },
        { name: "⚔️ Draft de Civilizaciones", value: draftcivis || "No disponibles", inline: false },
        { name: "📁 Archivo adjunto", value: archivoAdjunto ? `[Ver archivo](${archivoAdjunto})` : "No adjunto", inline: false }
      )
      .setColor(colorEmbed)
      .setThumbnail("https://cdn-icons-png.flaticon.com/512/149/149097.png")
      .setFooter({ text: `Registrado por ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    // Mostrar el resultado públicamente
    await channel.send({ embeds: [embedResultado] });

    // Confirmar en privado al organizador
    await interaction.editReply({ content: "✅ Resultado registrado correctamente y publicado en el canal.", ephemeral: true });
  },
};
