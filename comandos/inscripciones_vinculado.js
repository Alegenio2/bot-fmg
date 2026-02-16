const { obtenerEloActual } = require('../utils/elo');
const { actualizarCategoriasDesdeRoles } = require('../utils/actualizarCategorias.js');
const { asignarRolesPorPromedio } = require('../utils/asignarRoles.js');
const vinculados = require('../usuarios.json');

module.exports = {
  name: 'inscripciones_vinculado',
  description: 'Inscripción al torneo para usuarios vinculados.',
  
  async execute(interaction) {
    const { user, member, guild } = interaction;
    await interaction.deferReply({ ephemeral: false });

    const profileId = vinculados[user.id];
    if (!profileId) {
      return interaction.editReply('⚠️ No estás vinculado. Por favor usa el comando /inscripciones.');
    }

    const datos = await obtenerEloActual(profileId);
    if (!datos) {
      return interaction.editReply('⚠️ No se pudo obtener tu perfil de AOE2 Companion.');
    }

    const promedio = Math.round((datos.elo + datos.elomax) / 2);
    const mensaje = `✅ Inscripto a la Copa Uruguaya 2026 (vía vinculación)
🎮 **Nick Steam**: ${datos.nombre}
📈 **ELO Actual**: ${datos.elo}
📉 **ELO Máximo**: ${datos.elomax}
📊 **Promedio**: ${promedio}
🌍 **País**: ${datos.pais}
🔗 **Perfil**: https://www.aoe2companion.com/profile/${profileId}`;

    await interaction.editReply(mensaje);

    const configServidor = require('../botConfig').servidores[guild.id];
    if (member) {
      await asignarRolesPorPromedio(member, promedio, configServidor);
      await actualizarCategoriasDesdeRoles(guild);
    }
  }
};

