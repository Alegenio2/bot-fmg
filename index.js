require('dotenv').config();
const { Client, Attachment } = require('discord.js');
const fs = require('fs');

// Carga el token desde config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
const token = config.token;

// Crea una instancia de un cliente de Discord
const client = new Client({
    intents: ['DirectMessages',
        'DirectMessageReactions',
        'Guilds',
        'GuildMessages',
        'GuildBans',
        'GuildEmojisAndStickers',
        'GuildVoiceStates',
        'GuildWebhooks']
});

client.on('ready', (c) => {
    console.log(`${c.user.username} is online`);
})

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'resultado') {

        const options = interaction.options;

        const division = options.getString('division');
        const ronda = options.getString('ronda');
        const fecha = options.getString('fecha');
        const jugador = options.getUser('jugador');
        const puntosjugador = options.getNumber('puntosjugador');
        const otrojugador = options.getUser('otrojugador');
        const puntosotrojugador = options.getNumber('puntosotrojugador');
        const draftmapas = options.getString('draftmapas');
        const draftcivis = options.getString('draftcivis');

        // Verificar si hay archivos adjuntos en la interacción
        const archivoAdjunto = interaction.options.get('archivo');

        // Formatear el mensaje con los datos proporcionados
        let mensaje = `Copa Uruguay\n División ${division} - Grupo ${ronda} - Date ${fecha}\n ${jugador}  ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador} \n Mapas:${draftmapas} \n Civs:${draftcivis}`;

        // Verificar si hay un archivo adjunto
        if (archivoAdjunto) {
            // Si hay un archivo adjunto, agregar su nombre al mensaje
            mensaje += `\nRec: ${archivoAdjunto.attachment.url}`;
        } else {
            // Si no hay archivo adjunto, agregar un mensaje indicando que no se adjuntó ningún archivo
            mensaje += `\nNo se adjuntó ningún archivo`;
        }

        // Enviar la respuesta al canal de interacción
        await interaction.reply(mensaje);
    }

    if (interaction.commandName === 'coordinado') {
        const division = interaction.options.getString('division');
        const ronda = interaction.options.getNumber('ronda');
        const fecha = interaction.options.getString('fecha');
        const jugador = interaction.options.getUser('jugador');
        const rival = interaction.options.getUser('rival');
        const horario = interaction.options.getInteger('horario');
        let  gmt = interaction.options.getString('gmt');

        if (!gmt) {
            gmt = "GMT-3";
        }

        const fechaFormatoCorrecto = convertirFormatoFecha(fecha);

        // Obtener el día de la semana a partir de la fecha proporcionada
        const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);

        // Procesar la interacción
        const mensaje = ` FMG CUP \nEncuentro coordinado: División ${division}, Ronda ${ronda}.\nFecha: ${fecha} (${diaSemana}) ${horario} ${gmt}\n ${jugador} vs ${rival}`;

        // Enviar la respuesta al usuario
        await interaction.reply(mensaje);
    }
});


function convertirFormatoFecha(fecha) {
    const [dia, mes, anio] = fecha.split('-');
    return `${anio}-${mes}-${dia}`;
}
// Función para obtener el día de la semana a partir de una fecha en formato YYYY-MM-DD
function obtenerDiaSemana(fechaString) {
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const fecha = new Date(fechaString);
    const dia = fecha.getDay();
    return diasSemana[dia];
}


client.on('messageCreate', (mensaje) => {
    console.log(mensaje.content);
})

client.login(process.env.token);
