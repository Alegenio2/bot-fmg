// comandos/inscribir.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { obtenerProfileId } = require('../utils/asociar');
const { obtenerEloActual } = require('../utils/elo');
const { asociarUsuario } = require('../utils/asociar');
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inscribir')
        .setDescription('📋 [ADMIN] Inscribe a un jugador vinculado en el torneo.')
        .addUserOption(option =>
            option
                .setName('jugador')
                .setDescription('Mencioná al jugador que querés inscribir')
                .setRequired(true)
        )
        // Solo usuarios con permiso de Administrador pueden ver y usar el comando
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const { guild } = interaction;
        const usuarioTarget = interaction.options.getUser('jugador');

        // 1. VERIFICAR QUE ESTÁ VINCULADO
        const profileId = obtenerProfileId(usuarioTarget.id);
        if (!profileId) {
            return interaction.editReply({
                content: `❌ **${usuarioTarget.username}** no está vinculado. Pedile que use el botón de vinculación primero.`
            });
        }

        // 2. OBTENER MEMBER (para asignar roles)
        let memberTarget;
        try {
            memberTarget = guild.members.cache.get(usuarioTarget.id) 
                        || await guild.members.fetch(usuarioTarget.id);
        } catch (e) {
            return interaction.editReply({ content: `❌ No se pudo encontrar al miembro en el servidor.` });
        }

        // 3. LLAMADA A LA API DE AoE2
        const datosApi = await obtenerEloActual(profileId);
        if (!datosApi) {
            return interaction.editReply({ content: `❌ No se pudieron obtener los datos de AoE2 para **${usuarioTarget.username}**.` });
        }

        const promedio = Math.round((datosApi.elo + datosApi.elomax) / 2);
        const idTorneo = "copa_uruguaya_2026";

        const datosJugador = {
            id: usuarioTarget.id,
            torneo: idTorneo,
            modo: "1v1",
            nombre: datosApi.nombre,
            elo_actual: datosApi.elo,
            elo_max: datosApi.elomax,
            promedio_elo: promedio,
            perfil: `https://www.aoe2companion.com/players/${profileId}`,
            logo: null,
            fecha: new Date().toISOString()
        };

        // 4. GUARDAR EN usuarios_inscritos.json
        asociarUsuario(usuarioTarget.id, { ...datosApi, profileId });

        const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
        let inscritos = [];
        if (fs.existsSync(rutaInscritos)) {
            try {
                inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
            } catch (e) { inscritos = []; }
        }

        const index = inscritos.findIndex(u => u.id === usuarioTarget.id && u.torneo === idTorneo);
        const esActualizacion = index !== -1;

        if (esActualizacion) inscritos[index] = datosJugador;
        else inscritos.push(datosJugador);

        fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');

        // 5. ASIGNACIÓN DE ROLES AL JUGADOR TARGET
        try {
            const botConfig = require('../botConfig.json');
            const configServidor = botConfig.servidores[guild.id];
            if (memberTarget && configServidor) {
                const rolesAAsignar = [];
                if (configServidor.rolInscripto) rolesAAsignar.push(configServidor.rolInscripto);
                if (configServidor.rolcopauruguaya2026) rolesAAsignar.push(configServidor.rolcopauruguaya2026);
                if (rolesAAsignar.length > 0) await memberTarget.roles.add(rolesAAsignar);
            }
        } catch (errRol) { console.error("Error roles:", errRol.message); }

        // 6. PUBLICAR EN CANAL #INSCRIPTOS
        const canalInscriptosId = "1473060055396913192";
        const canalPublico = guild.channels.cache.get(canalInscriptosId)
            || await guild.channels.fetch(canalInscriptosId).catch(() => null);

        if (canalPublico) {
            const mensajeCanal =
                `🛡️ **Jugador Inscripto: ${datosApi.nombre}**\n` +
                `🏆 **Torneo**: Copa Uruguaya 2026\n` +
                `📊 **ELO Actual**: ${datosApi.elo}\n` +
                `📈 **ELO Máximo**: ${datosApi.elomax}\n` +
                `💎 **Promedio**: ${promedio}\n` +
                `✨ Roles actualizados correctamente.\n` +
                `👤 **Perfil**: https://www.aoe2companion.com/players/${profileId}`;

            await canalPublico.send({ content: mensajeCanal });
        }

        // 7. SUBIR A GITHUB (con delay para no bloquear)
        setTimeout(async () => {
            try { await guardarYSubirUsuarios1v1(); } catch (err) {}
        }, 4000);

        // 8. RESPUESTA PRIVADA AL ADMIN
        const accion = esActualizacion ? '🔄 Datos actualizados' : '✅ Inscripción confirmada';
        return interaction.editReply({
            content:
                `${accion} para **${datosApi.nombre}** (${usuarioTarget.username}).\n` +
                `📊 ELO: ${datosApi.elo} | 📈 Máx: ${datosApi.elomax} | 💎 Promedio: ${promedio}\n` +
                `👤 Perfil: https://www.aoe2companion.com/players/${profileId}`
        });
    }
};
