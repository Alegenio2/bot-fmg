const { EmbedBuilder } = require('discord.js');
const { obtenerEstadisticasCopa } = require('./calculoTablaCopa');

// ID del canal donde se mostrará la tabla (Cámbialo por el tuyo)
const CANAL_TABLA_ID = '1473071125541027860'; 

async function publicarTablaCopa(client) {
    try {
        const canal = await client.channels.fetch(CANAL_TABLA_ID);
        if (!canal) return console.error("No se encontró el canal de la tabla.");

        const tablas = await obtenerEstadisticasCopa();
        const embed = new EmbedBuilder()
            .setTitle('📊 POSICIONES EN VIVO - COPA URUGUAYA 2026')
            .setDescription('La tabla se actualiza automáticamente tras cada partido.')
            .setColor('#f1c40f')
            .setThumbnail('https://aua.netlify.app/img/copa_uruguaya2026.png') // Opcional: logo del torneo
            .setTimestamp();

        for (const [letra, jugadores] of Object.entries(tablas)) {
            let tablaTexto = "```md\n| Pos | Jugador           | Pts | PJ | Dif |\n|-----|-------------------|-----|----|-----|\n";
            
            jugadores.forEach((j, index) => {
                const pos = (index + 1).toString().padStart(2, ' ');
                const nick = j.nick.substring(0, 15).padEnd(17, ' ');
                const pts = j.pts.toString().padStart(3, ' ');
                const pj = j.pj.toString().padStart(2, ' ');
                const diff = (j.sf - j.sc >= 0 ? "+" : "") + (j.sf - j.sc);
                const diffStr = diff.toString().padStart(3, ' ');
                
                tablaTexto += `| ${pos}  | ${nick} | ${pts} | ${pj} | ${diffStr} |\n`;
            });

            tablaTexto += "```";
            embed.addFields({ name: `📍 GRUPO ${letra}`, value: tablaTexto });
        }

        // Buscamos si el bot ya puso un mensaje antes para editarlo, si no, borramos y ponemos uno nuevo
        const mensajes = await canal.messages.fetch({ limit: 10 });
        const mensajeAnterior = mensajes.find(m => m.author.id === client.user.id);

        if (mensajeAnterior) {
            await mensajeAnterior.edit({ embeds: [embed] });
        } else {
            await canal.send({ embeds: [embed] });
        }
        
        console.log("✅ Tabla de la Copa actualizada en el canal.");

    } catch (error) {
        console.error("Error al publicar la tabla:", error);
    }
}

module.exports = { publicarTablaCopa };