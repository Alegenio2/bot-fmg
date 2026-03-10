const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { asociarUsuario } = require('./asociar.js');
const { obtenerEloActual } = require('./elo'); 
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

async function ejecutarInscripcion(interaction, profileId, esRapida = false) {
    const { user, member, guild } = interaction;

    // Si es inscripción rápida, profileId llega como nulo o no se usa, 
    // lo buscamos en tu archivo de usuarios.json
    if (esRapida) {
        const { obtenerProfileId } = require('./asociar.js');
        profileId = obtenerProfileId(user.id);
        if (!profileId) throw new Error("NO_VINCULADO");
    }

    
    // 1. LLAMADA A LA API
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
        logo: archivoAdjunto ? archivoAdjunto.url : null,
        fecha: new Date().toISOString()
    };

    // 2. GUARDADO Y ASOCIACIÓN
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

    // 3. ASIGNACIÓN DE ROLES (Tu lógica original)
    try {
        const botConfig = require('../botConfig');
        const configServidor = botConfig.servidores[guild.id];
        if (member && configServidor) {
            const rolesAAsignar = [];
            if (configServidor.rolInscripto) rolesAAsignar.push(configServidor.rolInscripto);
            if (configServidor.rolcopauruguaya2026) rolesAAsignar.push(configServidor.rolcopauruguaya2026);
            if (rolesAAsignar.length > 0) await member.roles.add(rolesAAsignar);
        }
    } catch (errRol) { console.error("Error roles:", errRol.message); }

    // 4. ENVÍO AL CANAL #INSCRIPTOS (La ficha pública)
    const canalInscriptosId = "1380280393357590578"; // <--- Tu canal de inscriptos
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
            .setThumbnail(archivoAdjunto ? archivoAdjunto.url : user.displayAvatarURL())
            .setColor("#f1c40f")
            .setFooter({ text: "Copa Uruguaya 2026" })
            .setTimestamp();

        await canalPublico.send({ embeds: [embedFicha] });
    }

    // 5. GITHUB
    setTimeout(async () => {
        try { await guardarYSubirUsuarios1v1(); } catch (err) {}
    }, 4000);

    // Retornamos los datos para la respuesta del comando/botón
   return { mensajeFinal, nombre: datosApi.nombre, promedio: Math.round((datosApi.elo + datosApi.elomax) / 2) };
}

module.exports = { ejecutarInscripcion };
