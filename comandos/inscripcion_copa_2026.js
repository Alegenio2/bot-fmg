const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { asociarUsuario } = require('../utils/asociar.js');
const { obtenerEloActual } = require('../utils/elo'); // Importamos tu buscador de API
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
    try {
      await interaction.deferReply({ ephemeral: false });
    } catch (e) { return; }

    const { options, user, member, guild } = interaction;

    try {
      const entrada = options.getString('id_o_link');
      // Extraemos el ID si ponen el link, o nos quedamos con el número si ponen solo el ID
      const match = entrada.match(/\d+$/); 
      const profileId = match ? match[0] : null;

      if (!profileId) {
        return interaction.editReply("❌ No pude encontrar un ID válido. Pon el número de ID o el link completo.");
      }

      // 1. LLAMADA A LA API (Igual que en vincular)
      const datosApi = await obtenerEloActual(profileId);
      if (!datosApi) {
        return interaction.editReply(`❌ No encontré datos en la API para el ID **${profileId}**.`);
      }

      const promedio = Math.round((datosApi.elo + datosApi.elomax) / 2);
      const idTorneo = "copa_uruguaya_2026";
      const archivoAdjunto = options.getAttachment('archivo');

      // 2. PREPARAR DATOS PARA EL TORNEO
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

      // 3. GUARDADO LOCAL Y ASOCIACIÓN (Fusión de datos)
      // Pasamos profileId explícitamente para que asociarUsuario no lo pierda
      asociarUsuario(user.id, { ...datosApi, profileId });

      const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
      let inscritos = [];
      if (fs.existsSync(rutaInscritos)) {
        try {
          inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
        } catch (e) { inscritos = []; }
      }

      const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
      let mensajeFinal = index !== -1 
        ? `🔄 **¡Datos actualizados!**` 
        : `✅ **¡Inscripción confirmada!**`;

      if (index !== -1) inscritos[index] = datosJugador;
      else inscritos.push(datosJugador);

      fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

      // 4. ASIGNACIÓN DE ROLES (Bloque restaurado y corregido)
      try {
        const configServidor = require('../botConfig').servidores[guild.id];
        if (member && configServidor) {
          const rolesAAsignar = [];
          if (configServidor.rolInscripto) rolesAAsignar.push(configServidor.rolInscripto);
          if (configServidor.rolcopauruguaya2026) rolesAAsignar.push(configServidor.rolcopauruguaya2026);
          
          if (rolesAAsignar.length > 0) {
            await member.roles.add(rolesAAsignar);
            console.log(`Roles asignados a ${user.username}`);
          }
        }
      } catch (errRol) {
        console.error("Error asignando roles:", errRol.message);
      }
      
      // 5. SINCRONIZACIÓN GITHUB (Diferida)
      setTimeout(async () => {
        try { await guardarYSubirUsuarios1v1(); } catch (err) {}
      }, 4000);

      // 6. RESPUESTA FINAL
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
