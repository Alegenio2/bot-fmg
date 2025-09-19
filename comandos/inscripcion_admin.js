const { ApplicationCommandOptionType, PermissionsBitField } = require("discord.js");
const { asociarUsuario } = require('../utils/asociar.js');
const { actualizarCategoriasDesdeRoles } = require('../utils/actualizarCategorias.js');
const { asignarRolesPorPromedio } = require('../utils/asignarRoles.js');

module.exports = {
  name: 'inscripcion_admin',
  description: 'Inscribir a un jugador manualmente como administrador.',
  options: [
    {
      name: 'usuario',
      description: 'Usuario de Discord a inscribir.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: 'nombre',
      description: 'Nick en Steam.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'eloactual',
      description: 'ELO actual.',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'elomaximo',
      description: 'ELO máximo alcanzado.',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'link',
      description: 'Link del perfil en AoE2 Companion.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'archivo',
      description: 'Logo o imagen opcional.',
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
  ],

  async execute(interaction) {
    const { member, options, guild } = interaction;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: '⛔ No tenés permisos para usar este comando.',
        ephemeral: true
      });
    }

    const usuario = options.getUser('usuario');
    const nombre = options.getString('nombre');
    const eloactual = options.getNumber('eloactual');
    const elomaximo = options.getNumber('elomaximo');
    const link = options.getString('link');
    const archivoAdjunto = options.getAttachment('archivo');

    const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
    if (!match) {
      return interaction.reply({
        content: "❌ La URL no es válida. Debe ser algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        ephemeral: true
      });
    }

    const aoeId = match[2];
    asociarUsuario(usuario.id, aoeId);

    const promedio = Math.round((eloactual + elomaximo) / 2);

    let mensaje = `✅ ${usuario} fue inscripto a la Copa Uruguaya 2025 por un administrador.
🎮 **Nick Steam**: ${nombre}
📈 **ELO Actual**: ${eloactual}
📉 **ELO Máximo**: ${elomaximo}
📊 **Promedio**: ${promedio}
🔗 **Perfil**: ${link}
🔗 ✅ **Vinculado con AOE2 ID: ${aoeId}**`;

    if (archivoAdjunto) {
      mensaje += `\n🖼️ **Logo**: ${archivoAdjunto.url}`;
    }

    await interaction.reply(mensaje);

    const configServidor = require('../botConfig').servidores[guild.id];
    const miembroObjetivo = await guild.members.fetch(usuario.id).catch(() => null);
    if (miembroObjetivo) {
      await asignarRolesPorPromedio(miembroObjetivo, promedio, configServidor);
      await actualizarCategoriasDesdeRoles(guild);
    }
  }
};
