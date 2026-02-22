const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { asociarUsuario } = require('../utils/asociar.js');
const { obtenerEloActual } = require('../utils/elo'); 
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

module.exports = {
  name: 'inscripcion_copa_2026',
  description: 'Inscripción automática a la Copa 2026 usando tu ID de AoE2.',
  options: [
    { 
      name: 'id_o_link', 
      description: 'Tu ID de AoE2 (ej: 2583713) o el link de tu perfil.', 
      type: ApplicationCommandOptionType.String, 
      required: true 
    },
    { 
      name: 'archivo', 
      description: 'Sube tu logo o una foto de perfil (opcional).', 
      type: ApplicationCommandOptionType.Attachment, 
      required: false 
    },
  ],

  async execute(interaction) {
    const { options, user, member, guild } = interaction;
    const entrada = options.getString('id_o_link');
    
    // 1. VALIDACIÓN INICIAL DE FORMATO (Efímera y rápida)
    const match = entrada.match(/\d+$/); 
    const profileId = match ? match[0] : null;

    if (!profileId) {
      return interaction.reply({ 
        content: "❌ No pude encontrar un ID válido. Pon el número de ID o el link completo.", 
        ephemeral: true 
      });
    }

    // 2. AHORA SÍ, PASAMOS AL MODO PÚBLICO (porque el formato es correcto)
    try {
      await interaction.deferReply({ ephemeral: false });
    } catch (e) { return; }

    try {
      // 3. LLAMADA A LA API
      const datosApi = await obtenerEloActual(profileId);
      if (!datosApi) {
        // Si la API falla, borramos el mensaje público y enviamos un privado si es posible
        // O simplemente avisamos aquí. Discord no permite cambiar a efímero después del defer.
        return interaction.editReply(`❌ No encontré datos en la API para el ID **${profileId}**. Intenta de nuevo.`);
      }

      const promedio = Math.round((datosApi.elo + datosApi.elomax) / 2);
      const idTorneo = "copa_uruguaya_2026";
      const archivoAdjunto = options.getAttachment('archivo');

      const datosJugador = {
        id: user.id,
        torneo: idTorneo,
        modo: "1v1",
        nombre: datosApi.nombre,
        elo_actual: datosApi.elo,
        elo_max: datosApi.elomax,
        promedio_elo: promedio,
        perfil: `https://www.aoe2companion.com/players/${profileId}`,
        logo: archivoAdjunto ? archivoAdjunto.url : null,
        fecha: new Date().toISOString()
      };

      // 4. GUARDADO Y ASOCIACIÓN
      asociarUsuario(user.id, { ...datosApi, profileId });

      const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
      let inscritos = [];
      if (fs.existsSync(rutaInscritos)) {
        try {
          inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
        } catch (e) { inscritos = []; }
      }

      const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
      let mensajeFinal = index !== -1 ? `🔄 **¡Datos actualizados!**` : `✅ **¡Inscripción confirmada!**`;

      if (index !== -1) inscritos[index] = datosJugador;
      else inscritos.push(datosJugador);

      fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

      // 5. ROLES
      try {
        const configServidor = require('../botConfig').servidores[guild.id];
        if (member && configServidor) {
          const rolesAAsignar = [];
          if (configServidor.rolInscripto) rolesAAsignar.push(configServidor.rolInscripto);
          if (configServidor.rolcopauruguaya2026) rolesAAsignar.push(configServidor.rolcopauruguaya2026);
          if (rolesAAsignar.length > 0) await member.roles.add(rolesAAsignar);
        }
      } catch (errRol) { console.error("Error roles:", errRol.message); }
      
      // 6. GITHUB
      setTimeout(async () => {
        try { await guardarYSubirUsuarios1v1(); } catch (err) {}
      }, 4000);

      // 7. RESPUESTA FINAL (PÚBLICA)
      await interaction.editReply({
        content: `${mensajeFinal}\n` +
                 `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                 `👤 **Jugador**: ${datosApi.nombre}\n` +
                 `📊 **Promedio ELO**: ${promedio}\n` +
                 `✨ Roles actualizados correctamente.`
      });

    } catch (error) {
      console.error(error);
      await interaction.editReply('❌ Error al procesar la inscripción automática.');
    }
  }
};
