const { obtenerEloActual } = require('../utils/elo');
const fs = require('fs');
const path = require('path');
const vinculados = require('../usuarios.json');
const { guardarYSubirUsuarios1v1 } = require('../utils/guardarInscripcionesGit.js'); // Ajusta la ruta si es necesario



module.exports = {
  name: 'inscripciones_vinculado_copa_2026',
  description: 'Inscripción rápida a la Copa Uruguaya 2026 para usuarios vinculados.',

  async execute(interaction) {
    const { user, member, guild } = interaction;
    await interaction.deferReply({ ephemeral: false });

    // 1. Verificar si el usuario ya está vinculado en la base de datos
    const profileId = vinculados[user.id];
    if (!profileId) {
      return interaction.editReply('⚠️ No estás vinculado. Por favor usa el comando `/inscripcion_copa_2026` para completar tus datos por primera vez.');
    }

    // 2. Obtener datos actualizados de la API (Elo, Nick, etc.)
    const datos = await obtenerEloActual(profileId);
    if (!datos) {
      return interaction.editReply('⚠️ No se pudo obtener tu información desde AOE2 Companion. Intenta más tarde.');
    }

    const promedio = Math.round((datos.elo + datos.elomax) / 2);
    const idTorneo = "copa_uruguaya_2026";

    // 3. Guardar en usuarios_inscritos.json (para que aparezca en el generador de torneos)
    const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
    let inscritos = [];
    if (fs.existsSync(rutaInscritos)) {
      inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
    }

// NUEVO: Subir a GitHub inmediatamente
await guardarYSubirUsuarios1v1();
    
    const datosJugador = {
      id: user.id,
      torneo: idTorneo,
      modo: "1v1",
      nombre: datos.nombre,
      elo_actual: datos.elo,
      elo_max: datos.elomax,
      promedio_elo: promedio,
      perfil: `https://www.aoe2companion.com/profile/${profileId}`,
      logo: null, // No tenemos adjunto en comando automático
      fecha: new Date().toISOString()
    };

    // Actualizar o agregar registro
    const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
    if (index !== -1) {
      inscritos[index] = datosJugador;
    } else {
      inscritos.push(datosJugador);
    }
    fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

    // 4. Asignación de Roles (Copa 2026 y Rol Inscripto)
    const configServidor = require('../botConfig').servidores[guild.id];
    try {
      if (member && configServidor) {
        if (configServidor.rolInscripto) await member.roles.add(configServidor.rolInscripto);
        if (configServidor.rolcopauruguaya2026) await member.roles.add(configServidor.rolcopauruguaya2026);
      }
    } catch (error) {
      console.error("Error al asignar roles:", error);
    }

    // 5. Mensaje final de éxito
    const mensaje = `✅ **¡Inscripto con éxito vía vinculación!**\n` +
                    `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                    `🎮 **Nick**: ${datos.nombre}\n` +
                    `📈 **ELO Actual**: ${datos.elo}\n` +
                    `📊 **Promedio**: ${promedio}\n` +
                    `✨ Tienes asignado el rol <@&${configServidor.rolcopauruguaya2026}>`;

    await interaction.editReply(mensaje);
  }
};
