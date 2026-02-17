const { obtenerEloActual } = require('../utils/elo');
const fs = require('fs');
const path = require('path');
const vinculados = require('../usuarios.json');
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

module.exports = {
    name: 'inscripcion_vinc_copa', // Nombre corto para evitar errores de longitud
    description: 'Inscripción rápida a la Copa 2026 para vinculados.',

    async execute(interaction) {
        const { user, member, guild } = interaction;

        // Intentamos el deferReply de inmediato. 
        // Si falla aquí por "Unknown interaction", el catch del index.js no podrá responder, 
        // pero con este bloque evitamos que el bot se detenga.
        try {
            await interaction.deferReply({ ephemeral: false });
        } catch (e) {
            console.error("Error al iniciar deferReply (posible timeout):", e);
            return; 
        }

        try {
            // 1. Obtener el ID de AoE usando tu utilidad (evita errores de objeto vs id)
            const profileId = obtenerProfileId(user.id);

            if (!profileId) {
                return interaction.editReply('⚠️ No estás vinculado. Por favor usa el comando de inscripción manual primero.');
            }

            // 2. Obtener datos de la API
            const datos = await obtenerEloActual(profileId);
            if (!datos) {
                return interaction.editReply(`⚠️ No pude obtener datos para el ID: **${profileId}**. Intenta más tarde.`);
            }

            const promedio = Math.round((datos.elo + datos.elomax) / 2);
            const idTorneo = "copa_uruguaya_2026";

            // 3. Manejo del archivo local
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
                nombre: datos.nombre,
                elo_actual: datos.elo,
                elo_max: datos.elomax,
                promedio_elo: promedio,
                perfil: `https://www.aoe2companion.com/profile/${profileId}`,
                logo: null,
                fecha: new Date().toISOString()
            };

            const index = inscritos.findIndex(u => u.id === user.id && u.torneo === idTorneo);
            if (index !== -1) inscritos[index] = datosJugador;
            else inscritos.push(datosJugador);

            fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

            // 4. GitHub (Sin esperar a que termine para responder rápido a Discord)
            guardarYSubirUsuarios1v1().catch(err => console.error("Error Git:", err));

            // 5. Roles
            const configServidor = require('../botConfig').servidores[guild.id];
            if (member && configServidor) {
                const rolesAsignar = [];
                if (configServidor.rolInscripto) rolesAsignar.push(configServidor.rolInscripto);
                if (configServidor.rolcopauruguaya2026) rolesAsignar.push(configServidor.rolcopauruguaya2026);
                
                if (rolesAsignar.length > 0) {
                    await member.roles.add(rolesAsignar).catch(e => console.error("Error Roles:", e));
                }
            }

            // 6. Confirmación final
            await interaction.editReply({
                content: `✅ **¡Inscripto con éxito!**\n` +
                         `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                         `🎮 **Nick**: ${datos.nombre}\n` +
                         `📊 **Promedio**: ${promedio}\n` +
                         `✨ Rol asignado correctamente.`
            });

        } catch (error) {
            console.error("Error en ejecución de inscripción:", error);
            // Solo intentamos editar si la interacción sigue viva
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('❌ Ocurrió un error al procesar tu solicitud. Intenta de nuevo.');
            }
        }
    }
};
  }
};
