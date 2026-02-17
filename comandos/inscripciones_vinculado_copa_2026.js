const { obtenerEloActual } = require('../utils/elo');
const fs = require('fs');
const path = require('path');
const vinculados = require('../usuarios.json');
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

module.exports = {
  name: 'inscripcion_vinculado_2026', // Nombre corregido (máx 32 caracteres)
  description: 'Inscripción rápida a la Copa Uruguaya 2026 para usuarios vinculados.',

  async execute(interaction) {
    const { user, member, guild } = interaction;
    
    // 1. Avisar a Discord que estamos procesando (evita el timeout de 3 segundos)
    await interaction.deferReply({ ephemeral: false });

    try {
      // 2. Verificar vinculación previa
      const profileId = vinculados[user.id];
      if (!profileId) {
        return interaction.editReply('⚠️ No estás vinculado en mi base de datos. Por favor usa el comando `/inscripcion_copa_2026` para completar tus datos por primera vez.');
      }

      // 3. Obtener datos actualizados de la API de AoE2
      const datos = await obtenerEloActual(profileId);
      if (!datos) {
        return interaction.editReply('⚠️ No se pudo obtener tu información desde AOE2 Companion. Intenta nuevamente en unos minutos.');
      }

      const promedio = Math.round((datos.elo + datos.elomax) / 2);
      const idTorneo = "copa_uruguaya_2026";

      // 4. Preparar el guardado en usuarios_inscritos.json
      const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
      let inscritos = [];
      
      if (fs.existsSync(rutaInscritos)) {
        try {
          inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
        } catch (e) {
          inscritos = [];
        }
      }

      const datosJugador = {
        id: user.id,
        torneo: idTorneo,
        modo: "1v1",
        nombre: datos.nombre,
        elo_actual: datos.elo,
        elo_max: datos.elomax,
        promedio_elo: promedio,
        perfil: `https://www.aoe2companion.com/profile/${profileId}`,
        logo: null,
        fecha: new Date().toISOString()
      };

      // Actualizar si existe o agregar nuevo
      const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
      if (index !== -1) {
        inscritos[index] = datosJugador;
      } else {
        inscritos.push(datosJugador);
      }

      // 5. Guardar localmente (Render)
      fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

      // 6. Sincronizar con GitHub (Persistencia)
      // Lo ejecutamos con await para asegurar que se intente subir antes de confirmar al usuario
      try {
        await guardarYSubirUsuarios1v1();
      } catch (gitError) {
        console.error("Error al sincronizar con GitHub:", gitError);
        // No detenemos el comando, pero lo logueamos
      }

      // 7. Asignación de Roles
      const configServidor = require('../botConfig').servidores[guild.id];
      if (member && configServidor) {
        try {
          if (configServidor.rolInscripto) await member.roles.add(configServidor.rolInscripto);
          if (configServidor.rolcopauruguaya2026) await member.roles.add(configServidor.rolcopauruguaya2026);
        } catch (roleError) {
          console.error("Error al asignar roles:", roleError);
        }
      }

      // 8. Mensaje final de éxito
      const mensaje = `✅ **¡Inscripto con éxito vía vinculación!**\n` +
                      `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                      `🎮 **Nick**: ${datos.nombre}\n` +
                      `📈 **ELO Actual**: ${datos.elo}\n` +
                      `📊 **Promedio**: ${promedio}\n` +
                      `✨ Tienes asignado el rol <@&${configServidor?.rolcopauruguaya2026 || 'Torneo'}>`;

      await interaction.editReply(mensaje);

    } catch (error) {
      console.error("Error crítico en comando:", error);
      // Verificamos si podemos responder para no causar el error de "Interaction acknowledged"
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Ocurrió un error inesperado al procesar tu inscripción.');
      }
    }
  }
};
