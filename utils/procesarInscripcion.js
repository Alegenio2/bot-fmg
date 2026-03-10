// utils/procesarInscripcion.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { asociarUsuario, obtenerProfileId } = require('./asociar.js'); // Importamos ambos aquí
const { obtenerEloActual } = require('./elo'); 
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

// AÑADIMOS archivoAdjunto como parámetro opcional
async function ejecutarInscripcion(interaction, profileId, esRapida = false, archivoAdjunto = null) {
    const { user, member, guild } = interaction;

    // 1. LÓGICA DE OBTENCIÓN DE ID
    if (esRapida) {
        // Ya no necesitamos el require aquí adentro, lo subimos al inicio del archivo
        profileId = obtenerProfileId(user.id);
        if (!profileId) throw new Error("NO_VINCULADO");
    }

    // 2. LLAMADA A LA API
    const datosApi = await obtenerEloActual(profileId);
    if (!datosApi) throw new Error("API_ERROR");

    const promedio = Math.round((datosApi.elo + datosApi.elomax) / 2);
    const idTorneo = "copa_uruguaya_2026";

    const datosJugador = {
        id: user.id,
        torneo: idTorneo,
        modo: "1v1",
        nombre: datosApi.nombre,
        elo_actual: datosApi.elo,
        elo_max: datosApi.elomax,
        promedio_elo: promedio,
        perfil: `https://www.aoe2companion.com/players/${profileId}`,
        logo: archivoAdjunto ? archivoAdjunto.url : null, // Ahora sí existe la variable
        fecha: new Date().toISOString()
    };

    // 3. GUARDADO Y ASOCIACIÓN
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

    // 4. ASIGNACIÓN DE ROLES
    try {
        // Asegúrate de que la ruta a botConfig sea correcta (../botConfig o ../botConfig.json)
        const botConfig = require('../botConfig.json'); 
        const configServidor = botConfig.servidores[guild.id];
        if (member && configServidor) {
            const rolesAAsignar = [];
            if (configServidor.rolInscripto) rolesAAsignar.push(configServidor.rolInscripto);
            if (configServidor.rolcopauruguaya2026) rolesAAsignar.push(configServidor.rolcopauruguaya2026);
            if (rolesAAsignar.length > 0) await member.roles.add(rolesAAsignar);
        }
    } catch (errRol) { console.error("Error roles:", errRol.message); }

    // 5. ENVÍO AL CANAL #INSCRIPTOS
    const canalInscriptosId = "1380280393357590578"; 
    const canalPublico = guild.channels.cache.get(canalInscriptosId) || await guild.channels.fetch(canalInscriptosId).catch(() => null);
    
    if (canalPublico) {
        const embedFicha = new EmbedBuilder()
            .setTitle(`🛡️ Jugador Inscripto: ${datosApi.nombre}`)
            .setURL(`https://www.aoe2companion.com/players/${profileId}`)
            .addFields(
                { name: "ELO Actual", value: `${datosApi.elo}`, inline: true },
                { name: "ELO Máximo", value: `${datosApi.elomax}`, inline: true },
                { name: "Promedio", value: `${promedio}`, inline: true }
            )
            // Si hay logo lo pone, si no, usa el avatar de Discord
            .setThumbnail(archivoAdjunto ? archivoAdjunto.url : user.displayAvatarURL())
            .setColor("#f1c40f")
            .setFooter({ text: "Copa Uruguaya 2026" })
            .setTimestamp();

        await canalPublico.send({ embeds: [embedFicha] });
    }

    // 6. GITHUB
    setTimeout(async () => {
        try { await guardarYSubirUsuarios1v1(); } catch (err) {}
    }, 4000);

    return { mensajeFinal, nombre: datosApi.nombre, promedio };
}

module.exports = { ejecutarInscripcion };
