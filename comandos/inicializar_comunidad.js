const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'inicializar_comunidad',
  description: 'Asigna el rol de acceso general a todos los miembros actuales.',
  default_member_permissions: PermissionFlagsBits.Administrator, // Solo administradores pueden usarlo

  async execute(interaction) {
    const { guild } = interaction;
    const ROL_ACCESO_ID = '1377760878807613520';

    // 1. Verificar si el rol existe en el servidor
    const rolAcceso = guild.roles.cache.get(ROL_ACCESO_ID);
    if (!rolAcceso) {
      return interaction.reply({
        content: `❌ No se encontró el rol con ID \`${ROL_ACCESO_ID}\` en este servidor.`,
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // 2. Traer a todos los miembros (fetch fuerza la descarga de la lista completa)
      const miembros = await guild.members.fetch();
      let procesados = 0;
      let yaTenianRol = 0;

      await interaction.editReply(`⏳ Procesando **${miembros.size}** miembros. Esto puede tardar un poco...`);

      for (const [id, member] of miembros) {
        // Saltamos a los bots
        if (member.user.bot) continue;

        // Si no tiene el rol, se lo damos
        if (!member.roles.cache.has(ROL_ACCESO_ID)) {
          await member.roles.add(rolAcceso).catch(err => {
            console.error(`Error al asignar rol a ${member.user.username}:`, err);
          });
          procesados++;

          // Delay de seguridad cada 15 miembros para evitar el Rate Limit de Discord
          if (procesados % 15 === 0) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          yaTenianRol++;
        }
      }

      await interaction.editReply({
        content: `✅ **Limpieza completada.**\n- Roles asignados: **${procesados}**\n- Usuarios que ya lo tenían: **${yaTenianRol}**\n- Total analizados: **${miembros.size}**`,
      });

    } catch (error) {
      console.error("Error en inicializar_comunidad:", error);
      if (interaction.deferred) {
        await interaction.editReply("❌ Hubo un error masivo al intentar asignar los roles.");
      }
    }
  }
};
