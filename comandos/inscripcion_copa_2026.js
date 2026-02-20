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
    const { options, user, member, guild } = interaction;
    const configServidor = require('../botConfig').servidores[guild.id];

    // 1. Validar Link inmediatamente (antes del defer para ser rápidos)
    const link = options.getString('link');
    const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/players\/(\d+)$/);
    
    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Buscar Perfil").setStyle(ButtonStyle.Link).setURL("https://www.aoe2companion.com/")
      );
      return interaction.reply({ content: "❌ URL no válida. Debe ser de AoE2 Companion.", components: [row], ephemeral: true });
    }

    // 2. Iniciar Defer para evitar el timeout de 3 segundos
    try {
      await interaction.deferReply({ ephemeral: false });
    } catch (e) {
      console.error("Error en deferReply:", e);
      return;
    }

    try {
      const nombre = options.getString('nombre');
      const eloactual = options.getNumber('eloactual');
      const elomaximo = options.getNumber('elomaximo');
      const promedio = Math.round((eloactual + elomaximo) / 2);
      const archivoAdjunto = options.getAttachment('archivo');
      const aoeId = match[2];

      // Asociar cuenta
      asociarUsuario(user.id, { profileId: aoeId, nombre: nombre });
      const idTorneo = "copa_uruguaya_2026";

      // 3. Guardar localmente
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

      const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
     let mensajeFinal = "";
if (index !== -1) {
    // Si existe, reemplazamos (Actualización)
    inscritos[index] = datosJugador;
    mensajeFinal = `🔄 **¡Datos actualizados!** Tu inscripción para la Copa Uruguaya 2026 ha sido actualizada con tu ELO actual.`;
} else {
    // Si no existe, agregamos (Nueva inscripción)
    inscritos.push(datosJugador);
    mensajeFinal = `✅ **¡Inscripción confirmada!** Bienvenido a la Copa Uruguaya 2026.`;
}
      fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

      // 4. Sincronizar GitHub (SIN await para no bloquear la respuesta a Discord)
      guardarYSubirUsuarios1v1().catch(err => console.error("❌ Error Git diferido:", err));
      
      // 5. Asignación de Roles
      if (member && configServidor) {
        const roles = [];
        if (configServidor.rolInscripto) roles.push(configServidor.rolInscripto);
        if (configServidor.rolcopauruguaya2026) roles.push(configServidor.rolcopauruguaya2026);
        if (roles.length > 0) await member.roles.add(roles).catch(console.error);
      }

      // 6. Confirmación (Usando editReply porque hubo defer)
      await interaction.editReply({
        content: `✅ **¡Inscripción confirmada!**\n` +
                 `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                 `👤 **Jugador**: ${nombre}\n` +
                 `📊 **Promedio ELO**: ${promedio}\n` +
                 `✨ Roles asignados correctamente.`
      });

    } catch (error) {
      console.error("Error en inscripcion_copa_2026:", error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Ocurrió un error procesando tu inscripción.');
      }
    }
  }
};
