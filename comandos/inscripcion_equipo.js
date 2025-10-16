const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// Funciones de utilidad de tu sistema
const { asociarUsuario } = require("../utils/asociar.js");
const { guardarYSubirEquipos } = require("../git/guardarInscripcionesGit.js");

const torneosActivos = [
  { label: "Uruguay Open Cup 2v2", value: "uruguay_open_cup_2v2" },
  { label: "Copa Uruguaya 3v3", value: "copa_uruguaya_3v3" },
];

const eloLimites = JSON.parse(fs.readFileSync("./elo_limites.json", "utf8"));
const rutaEquipos = "./equipos_inscritos.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inscripcion_equipo")
    .setDescription("Inscribir un equipo en un torneo")
    .addStringOption((opt) =>
      opt
        .setName("modo")
        .setDescription("Modo del torneo")
        .setRequired(true)
        .addChoices(
          { name: "2v2", value: "2v2" },
          { name: "3v3", value: "3v3" },
          { name: "4v4", value: "4v4" }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("nombre_equipo")
        .setDescription("Nombre del equipo")
        .setRequired(true)
    )
    // Jugadores
    .addStringOption((opt) =>
      opt.setName("nick1").setDescription("Nick jugador 1").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("elo_actual1").setDescription("Elo actual jugador 1").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("elo_max1").setDescription("Elo máximo jugador 1").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("perfil1").setDescription("Link de perfil jugador 1").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("nick2").setDescription("Nick jugador 2").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("elo_actual2").setDescription("Elo actual jugador 2").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("elo_max2").setDescription("Elo máximo jugador 2").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("perfil2").setDescription("Link de perfil jugador 2").setRequired(true)
    )
    .addAttachmentOption((opt) =>
      opt.setName("logo").setDescription("Logo o imagen del equipo").setRequired(false)
    ),

  async execute(interaction) {
    try {
      const { options, user, guild, member } = interaction;
      const modo = options.getString("modo");
      const nombreEquipo = options.getString("nombre_equipo");
      const archivoAdjunto = options.getAttachment("logo");

      // Construir jugadores según el modo
      const jugadores = [];
      for (let i = 1; i <= parseInt(modo[0]); i++) {
        const perfil = options.getString(`perfil${i}`);
        const match = perfil.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);

        // Validar perfil
        if (!match) {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel("Buscar tu perfil en AoE2 Companion")
              .setStyle(ButtonStyle.Link)
              .setURL("https://www.aoe2companion.com/")
          );

          return interaction.reply({
            content: `❌ El perfil del jugador ${i} no es válido. Asegurate de que sea como:\n\`https://www.aoe2companion.com/profile/2587873713\``,
            components: [row],
            ephemeral: true,
          });
        }

        // Asociar perfil con usuario (si es jugador 1, el que ejecuta el comando)
        if (i === 1) {
          const aoeId = match[2];
          asociarUsuario(user.id, aoeId);
        }

        jugadores.push({
          nick: options.getString(`nick${i}`),
          elo_actual: options.getInteger(`elo_actual${i}`),
          elo_max: options.getInteger(`elo_max${i}`),
          perfil,
        });
      }

      // Calcular promedio del equipo
      const promedioEquipo =
        jugadores.reduce((acc, j) => acc + (j.elo_actual + j.elo_max) / 2, 0) /
        jugadores.length;

      // Select del torneo
      const torneoSelect = new StringSelectMenuBuilder()
        .setCustomId("select_torneo")
        .setPlaceholder("Selecciona el torneo")
        .addOptions(torneosActivos);

      const row = new ActionRowBuilder().addComponents(torneoSelect);

      await interaction.reply({
        content: `Promedio del equipo: **${promedioEquipo.toFixed(2)}**\nSelecciona el torneo:`,
        components: [row],
        ephemeral: true,
      });

      // Recolector de selección
      const filter = (i) => i.user.id === user.id;
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
        max: 1,
      });

      collector.on("collect", async (i) => {
        const torneoId = i.values[0];
        const limites = eloLimites[torneoId];
        let categoriaSeleccionada = null;

        for (const cat in limites) {
          if (promedioEquipo <= limites[cat]) {
            categoriaSeleccionada = cat;
            break;
          }
        }

        if (!categoriaSeleccionada) {
          return i.update({
            content: `❌ El promedio del equipo (${promedioEquipo}) supera todos los límites permitidos.`,
            components: [],
          });
        }

        // Crear ID y guardar
        const idEquipo = uuidv4();
        let equipos = fs.existsSync(rutaEquipos)
          ? JSON.parse(fs.readFileSync(rutaEquipos, "utf8"))
          : [];

        const nuevoEquipo = {
          id: idEquipo,
          torneo: torneoId,
          modo,
          categoria: categoriaSeleccionada,
          nombre: nombreEquipo,
          jugadores,
          promedio_elo: promedioEquipo,
          logo: archivoAdjunto ? archivoAdjunto.url : null,
        };

        equipos.push(nuevoEquipo);
        fs.writeFileSync(rutaEquipos, JSON.stringify(equipos, null, 2));
        guardarYSubirEquipos();
        // Crear embed visual
        const embed = new EmbedBuilder()
          .setTitle(`✅ Equipo inscrito: ${nombreEquipo}`)
          .setColor(0x0c74f5)
          .setDescription(
            `🏆 **Torneo:** ${torneoId.replace(/_/g, " ")}\n💠 **Categoría:** ${
              categoriaSeleccionada
            }\n📊 **Promedio ELO:** ${promedioEquipo.toFixed(2)}`
          );

        if (archivoAdjunto) embed.setThumbnail(archivoAdjunto.url);

        jugadores.forEach((j, idx) => {
          embed.addFields({
            name: `🎮 Jugador ${idx + 1}: ${j.nick}`,
            value: `📈 ELO Actual: ${j.elo_actual}\n📉 ELO Máximo: ${j.elo_max}\n🔗 [Perfil](${j.perfil})`,
            inline: true,
          });
        });

        await i.update({
          content: `✅ Equipo **${nombreEquipo}** registrado correctamente.`,
          components: [],
        });

        // Enviar embed público
        await interaction.channel.send({ embeds: [embed] });

       });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "❌ Ocurrió un error al inscribir el equipo.",
        ephemeral: true,
      });
    }
  },
};
