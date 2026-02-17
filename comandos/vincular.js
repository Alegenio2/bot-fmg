// comandos/vincular.js
const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const botConfig = require('../botConfig.json');
const { asociarUsuario } = require('../utils/asociar');
const { obtenerEloActual } = require('../utils/elo');

module.exports = {
  name: 'vincular',
  description: 'Vincula tu cuenta de Discord con tu perfil de AoE2 Companion.',
  options: [
    {
      name: 'aoe2id',
      description: 'Link de tu perfil de aoe2companion.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    const { user, options, guildId, channelId, member, guild } = interaction;
    const configServidor = botConfig.servidores[guildId];
    const canalVincular = configServidor?.canalVincular;
    const ROL_ACCESO_ID = '1377760878807613520'; // <--- Tu ID de rol de acceso

    // 🔒 Validar canal
    if (!canalVincular || channelId !== canalVincular) {
      return interaction.reply({
        content: "⚠️ Este comando solo se puede usar en el canal de vinculación correspondiente.",
        ephemeral: true
      });
    }

    // ⏳ Diferir respuesta (importante para evitar timeouts de la API de AoE)
    await interaction.deferReply({ ephemeral: true });

    // 🔗 Validar URL
    const urlCompleta = options.getString('aoe2id');
    const match = urlCompleta.match(/^https:\/\/(www\.)?aoe2companion\.com\/players\/(\d+)$/);

    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );

      return interaction.editReply({
        content: "❌ La URL no es válida.\nEjemplo:\n`https://www.aoe2companion.com/players/2304739`",
        components: [row]
      });
    }

    const profileId = match[2];

    // 🔍 Obtener datos reales del jugador
    const datos = await obtenerEloActual(profileId);

    if (!datos) {
      return interaction.editReply({
        content: "❌ No se pudieron obtener los datos del perfil. Verificá el ID o intentá más tarde."
      });
    }

    // 🧠 Construir objeto usuario
    const usuario = {
      profileId,
      nombre: datos.nombre,
      elo: datos.elo,
      rank: datos.rank,
      wins: datos.wins,
      losses: datos.losses,
      pais: datos.pais,
      country: datos.country,
      clan: datos.clan,
      elomax: datos.elomax,
      ultimapartida: datos.ultimapartida
    };

    // 💾 Guardar en JSON y subir a Git
    asociarUsuario(user.id, usuario);

    // 🎭 ASIGNAR ROL DE ACCESO
    try {
      if (member) {
        const rolAcceso = guild.roles.cache.get(ROL_ACCESO_ID);
        if (rolAcceso) {
          await member.roles.add(rolAcceso);
        } else {
          console.error("⚠️ El rol de acceso no existe en el servidor.");
        }
      }
    } catch (error) {
      console.error("❌ Error al asignar el rol de acceso:", error);
      // No cortamos el flujo aquí porque la vinculación ya se guardó
    }

    return interaction.editReply({
      content: `✅ Tu cuenta fue vinculada correctamente con **${usuario.nombre}** (ELO ${usuario.elo}).\n🔓 **Se te ha otorgado acceso al servidor.**`
    });
  }
};
