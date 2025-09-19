// comandos/inscripciones.js
const { ApplicationCommandOptionType } = require("discord.js");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { asociarUsuario } = require('../utils/asociar.js');
const { actualizarCategoriasDesdeRoles } = require('../utils/actualizarCategorias.js');
const { asignarRolesPorPromedio } = require('../utils/asignarRoles.js');

module.exports = {
  name: 'inscripciones',
  description: 'Inscripcion al Torneo.',
  options: [
    {
      name: 'nombre',
      description: 'Nick en steam.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'eloactual',
      description: 'Elo actual',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'elomaximo',
      description: 'Elo Maximo alcanzado',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'link',
      description: 'Link de aoe2insights',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'archivo',
      description: 'Logo o foto.',
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
  ],

  async execute(interaction) {
    const { options, user, member, guild } = interaction;

    const nombre = options.getString('nombre');
    const eloactual = options.getNumber('eloactual');
    const elomaximo = options.getNumber('elomaximo');
    const link = options.getString('link');
    const archivoAdjunto = options.get('archivo');

    const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );
      return interaction.reply({
        content: "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        components: [row],
        ephemeral: true
      });
    }

    const aoeId = match[2];
    asociarUsuario(user.id, aoeId);

    const promedio = Math.round((eloactual + elomaximo) / 2);

    let mensaje = `✅ Inscripto a la Copa Uruguaya 2025
🎮 **Nick Steam**: ${nombre}
📈 **ELO Actual**: ${eloactual}
📉 **ELO Máximo**: ${elomaximo}
📊 **Promedio**: ${promedio}
🔗 **Perfil**: ${link}`;

    if (archivoAdjunto) {
      mensaje += `\n🖼️ **Logo**: ${archivoAdjunto.attachment.url}`;
    }

    await interaction.reply(mensaje);

    const configServidor = require('../botConfig').servidores[guild.id];
    if (member) {
      await asignarRolesPorPromedio(member, promedio, configServidor);
      await actualizarCategoriasDesdeRoles(guild);
    }
  }
};
