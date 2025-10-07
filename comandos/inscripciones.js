// comandos/inscripciones.js
const { ApplicationCommandOptionType } = require("discord.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { asociarUsuario } = require("../utils/asociar.js");
const { actualizarCategoriasDesdeRoles } = require("../utils/actualizarCategorias.js");
const { asignarRolesPorPromedio } = require("../utils/asignarRoles.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "inscripciones",
  description: "Inscripción al Torneo.",
  options: [
    {
      name: "nombre",
      description: "Nick en Steam.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "eloactual",
      description: "ELO actual.",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: "elomaximo",
      description: "ELO máximo alcanzado.",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: "link",
      description: "Link de AoE2 Companion.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "archivo",
      description: "Logo o foto.",
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
    {
      name: "torneo",
      description: "Selecciona el torneo al que te estás inscribiendo.",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Copa Uruguaya 1v1", value: "copa_uruguya_1v1" },
        { name: "Copa Uruguaya 2v2", value: "copa_uruguaya_2v2" },
      ],
    },
  ],

  async execute(interaction) {
    const { options, user, member, guild } = interaction;

    const nombre = options.getString("nombre");
    const eloactual = options.getNumber("eloactual");
    const elomaximo = options.getNumber("elomaximo");
    const link = options.getString("link");
    const archivoAdjunto = options.get("archivo");
    const torneo = options.getString("torneo");

    const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );
      return interaction.reply({
        content:
          "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        components: [row],
        ephemeral: true,
      });
    }

    const aoeId = match[2];
    asociarUsuario(user.id, aoeId);

    // 📊 Calcular promedio
    const promedio = Math.round((eloactual + elomaximo) / 2);

    // 📁 Leer límites dinámicamente desde elo_limites.json
    const eloPath = path.join(__dirname, "..", "elo_limites.json");
    const eloLimites = JSON.parse(fs.readFileSync(eloPath, "utf8"));

    // 🧩 Verificar torneo
    const limites = eloLimites[torneo];
    if (!limites) {
      return interaction.reply({
        content: `❌ No se encontraron límites de ELO para el torneo **${torneo}**.`,
        ephemeral: true,
      });
    }

    // 🏷️ Determinar categoría según los límites del torneo
    let categoria = "sin_categoria";
    for (const [cat, valor] of Object.entries(limites)) {
      if (promedio >= valor) {
        categoria = cat;
        break;
      }
    }

    let mensaje = `✅ **Inscripto a la Copa Uruguaya 2025**
🎮 **Nick Steam:** ${nombre}
📈 **ELO Actual:** ${eloactual}
📉 **ELO Máximo:** ${elomaximo}
📊 **Promedio:** ${promedio}
🏅 **Categoría:** ${categoria.toUpperCase()}
🔗 **Perfil:** ${link}`;

    if (archivoAdjunto) {
      mensaje += `\n🖼️ **Logo:** ${archivoAdjunto.attachment.url}`;
    }

    await interaction.reply(mensaje);

    // 🧠 Cargar configuración del servidor
    const configServidor = require("../botConfig").servidores[guild.id];

    if (member) {
      // 🪄 Asignar roles según promedio
      await asignarRolesPorPromedio(member, promedio, configServidor, torneo);
      await actualizarCategoriasDesdeRoles(guild);
    }
  },
};


