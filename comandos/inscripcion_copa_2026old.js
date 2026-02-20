//comandos/inscripcion_copa_2026.js
const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { asociarUsuario } = require('../utils/asociar.js');
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

module.exports = {
  name: 'inscripcion_copa_2026',
  description: 'Inscripción exclusiva para la Copa Uruguaya 2026 (1v1).',
  options: [
    { name: 'nombre', description: 'Tu Nick en Steam / AoE2.', type: ApplicationCommandOptionType.String, required: true },
    { name: 'eloactual', description: 'Tu Elo actual en 1v1 Random Map.', type: ApplicationCommandOptionType.Number, required: true },
    { name: 'elomaximo', description: 'Tu Elo máximo alcanzado.', type: ApplicationCommandOptionType.Number, required: true },
    { name: 'link', description: 'Link de tu perfil en AoE2 Companion.', type: ApplicationCommandOptionType.String, required: true },
    { name: 'archivo', description: 'Sube tu logo o una foto de perfil.', type: ApplicationCommandOptionType.Attachment, required: false },
  ],

  async execute(interaction) {
    // 1. RESPUESTA INMEDIATA (Evita el error 10062 Unknown Interaction)
    try {
      await interaction.deferReply({ ephemeral: false });
    } catch (e) {
      console.error("Error crítico en deferReply:", e);
      return;
    }

    const { options, user, member, guild } = interaction;

    try {
      // 2. VALIDACIÓN DE LINK
      const link = options.getString('link');
      const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/players\/(\d+)$/);

      if (!match) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setLabel("Buscar Perfil").setStyle(ButtonStyle.Link).setURL("https://www.aoe2companion.com/")
        );
        return interaction.editReply({ 
          content: "❌ URL no válida. Debe ser de AoE2 Companion (ej: https://www.aoe2companion.com/players/123456)", 
          components: [row] 
        });
      }

      // 3. PROCESAMIENTO DE DATOS
      const configServidor = require('../botConfig').servidores[guild.id];
      const nombre = options.getString('nombre');
      const eloactual = options.getNumber('eloactual');
      const elomaximo = options.getNumber('elomaximo');
      const promedio = Math.round((eloactual + elomaximo) / 2);
      const archivoAdjunto = options.getAttachment('archivo');
      const idTorneo = "copa_uruguaya_2026";

      // Cargar inscritos localmente
      const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
      let inscritos = [];
      if (fs.existsSync(rutaInscritos)) {
        try {
          inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
        } catch (e) { inscritos = []; }
      }

      const datosJugador = {
        id: user.id,
        torneo: idTorneo,
        modo: "1v1",
        nombre: nombre,
        elo_actual: eloactual,
        elo_max: elomaximo,
        promedio_elo: promedio,
        perfil: link,
        logo: archivoAdjunto ? archivoAdjunto.url : null,
        fecha: new Date().toISOString()
      };

      // 4. GUARDADO LOCAL Y ASOCIACIÓN
      // asociarUsuario dispara internamente la subida de usuarios.json
      asociarUsuario(user.id, datosJugador);

      const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
      let mensajeFinal = "";

      if (index !== -1) {
        inscritos[index] = datosJugador;
        mensajeFinal = `🔄 **¡Datos actualizados!** Tu inscripción ha sido actualizada.`;
      } else {
        inscritos.push(datosJugador);
        mensajeFinal = `✅ **¡Inscripción confirmada!** Bienvenido a la Copa Uruguaya 2026.`;
      }

      fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

      // 5. SINCRONIZACIÓN GITHUB (Diferida para evitar errores de SHA)
      console.log("Programando subida a Git...");
      setTimeout(async () => {
        try {
          await guardarYSubirUsuarios1v1();
          console.log("✅ GitHub: usuarios_inscritos.json actualizado.");
        } catch (err) {
          console.error("❌ Error en subida Git diferida:", err.message);
        }
      }, 4000); // Subimos a los 4 segundos para dar tiempo a usuarios.json

      // 6. ASIGNACIÓN DE ROLES
      if (member && configServidor) {
        const roles = [];
        if (configServidor.rolInscripto) roles.push(configServidor.rolInscripto);
        if (configServidor.rolcopauruguaya2026) roles.push(configServidor.rolcopauruguaya2026);
        if (roles.length > 0) await member.roles.add(roles).catch(err => console.error("Error Roles:", err.message));
      }

      // 7. RESPUESTA FINAL
      await interaction.editReply({
        content: `${mensajeFinal}\n` +
                 `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                 `👤 **Jugador**: ${nombre}\n` +
                 `📊 **Promedio ELO**: ${promedio}\n` +
                 `✨ Roles actualizados correctamente.`
      });

    } catch (error) {
      console.error("Error en ejecución de inscripción:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Ocurrió un error procesando tu inscripción. Intenta de nuevo.');
      }
    }
  }
};
