require("dotenv").config();
//const Discord = require("discord.js");
const {Client, Attachment, ActivityType, GatewayIntentBits, AttachmentBuilder ,Partials} = require("discord.js")
const fs = require("fs");
const { type } = require("os");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
const keep_alive = require("./keep_alive.js")
// Configura el prefijo del comando y el ID del canal de bienvenida
const prefix = "!"; // Puedes cambiar el prefijo si lo deseas
const welcomeChannelId = '1302823386552205355'; // Cambia esto por el ID de tu canal de bienvenida

// Crea una instancia de un cliente de Discord
const client = new Client({
    restTimeOffset:0,
    partials:[Partials.Message, Partials.Channel,Partials.ReactionREACTION,Partials.GuildMember,Partials.User],
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers
   ],
});

client.on("ready", (c) => {
  console.log(`${c.user.username} is online`);

  c.user.setActivity(`Age of Empire II: Definitive Edition`, {
    type: ActivityType.Playing,
  });
});

client.on('guildMemberAdd', async member => {
    
    const Canvas = require('canvas');
    const canvas = Canvas.createCanvas(1028, 468);
    const ctx = canvas.getContext('2d');
    
       // Array con las rutas de las dos imágenes de fondo
     const backgroundImages = ["./img/bg.png", "./img/bg2.png"];
    
     // Elegir aleatoriamente una de las imágenes de fondo
     const randomIndex = Math.floor(Math.random() * backgroundImages.length);
     const selectedBackgroundImg = backgroundImages[randomIndex];
 
     const backgroundImg = await Canvas.loadImage(selectedBackgroundImg);
     ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);    
    
    ctx.font = 'bold 40px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`¡Bienvenido, ${member.user.username}!`, canvas.width / 2, 100);
    const avatarURL = member.user.displayAvatarURL({ size:1024, extension: "png" });
    const avatar = await Canvas.loadImage(avatarURL);
    ctx.drawImage(avatar, 800, 130, 150, 150);
    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), { name: 'welcome-image.png' });
    const channel = member.guild.channels.cache.get(welcomeChannelId);
    if (channel) {
       //await channel.send(`¡Bienvenido, ${member}!`);
       await channel.send({files: [attachment]});
        // await member.reply({files: [attachment] })
       // channel.send(`¡Bienvenido/a, ${member}!`, attachment.attachment);
    }
});

// client.on('messageCreate', message => {
   // if (message.author.bot || !message.content.startsWith(prefix)) return;

   //  const args = message.content.slice(prefix.length).trim().split(/ +/);
   //  const command = args.shift().toLowerCase();

 //  if (command === 'test') {
 //       console.log('¡Comando !test recibido!');
        // Simula la llegada de un nuevo usuario al servidor
   //     const guild = message.guild;
   //     const member = message.member;
   //     client.emit('guildMemberAdd', member);
//   }
// });




client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "resultado") {
    const options = interaction.options;

    const division = options.getString("division");
    const ronda = options.getString("ronda");
    const fecha = options.getString("fecha");
    const jugador = options.getUser("jugador");
    const puntosjugador = options.getNumber("puntosjugador");
    const otrojugador = options.getUser("otrojugador");
    const puntosotrojugador = options.getNumber("puntosotrojugador");
    const draftmapas = options.getString("draftmapas");
    const draftcivis = options.getString("draftcivis");

    // Verificar si hay archivos adjuntos en la interacción
    const archivoAdjunto = interaction.options.get("archivo");

    // Formatear el mensaje con los datos proporcionados
    let mensaje = `Copa Uruguaya\n División ${division} - Etapa: ${ronda} - Fecha ${fecha}\n ${jugador}  ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador} \n Mapas:${draftmapas} \n Civs:${draftcivis}`;

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

  if (interaction.commandName === "coordinado") {
    const division = interaction.options.getString("division");
    const ronda = interaction.options.getString("ronda");
    const fecha = interaction.options.getString("fecha");
    const jugador = interaction.options.getUser("jugador");
    const rival = interaction.options.getUser("rival");
    const horario = interaction.options.getString("horario");
    let gmt = interaction.options.getString("gmt");

    if (!gmt) {
      gmt = "GMT-3";
    }

    const fechaFormatoCorrecto = convertirFormatoFecha(fecha);

    // Obtener el día de la semana a partir de la fecha proporcionada
    const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);

    // Procesar la interacción
    const mensaje = `Copa Uruguaya \nEncuentro coordinado: División ${division}, Etapa ${ronda}.\nFecha: ${fecha} ${horario}-hs ${gmt}\n ${jugador} vs ${rival}`;

    // Enviar la respuesta al usuario
    await interaction.reply(mensaje);
  }
  if (interaction.commandName === "inscripciones") {
    const nombre = interaction.options.getString("nombre");
    const eloactual = interaction.options.getNumber("eloactual");
    const elomaximo = interaction.options.getNumber("elomaximo");
    const link = interaction.options.getString("link");

    // Verificar si hay archivos adjuntos en la interacción
    const archivoAdjunto = interaction.options.get("archivo");

    // Procesar la interacción
    let mensaje = `Inscripto a la Copa Uruguaya 2025 \nNick Steam: ${nombre} \nElo Actual: ${eloactual}.\nElo Maximo: ${elomaximo} \nLink de perfil: ${link}`;
    if (archivoAdjunto) {
      // Si hay un archivo adjunto, agregar su nombre al mensaje
      mensaje += `\nLogo: ${archivoAdjunto.attachment.url}`;
    }

    // Enviar la respuesta al usuario
    await interaction.reply(mensaje);
  }
});

function convertirFormatoFecha(fecha) {
  let separador = "-";
  if (fecha.includes("/")) {
    separador = "/";
  }
  const [dia, mes, anio] = fecha.split(separador);
  return `${anio}-${mes}-${dia}`;
}
// Función para obtener el día de la semana a partir de una fecha en formato YYYY-MM-DD
function obtenerDiaSemana(fechaString) {
  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  // Imprime la fecha que se está utilizando
  console.log("Fecha:", fechaString);

  const fecha = new Date(fechaString);
  const dia = fecha.getDay();
  return diasSemana[dia];
}

client.on("messageCreate", (mensaje) => {
  console.log(mensaje.content);
});

client.login(process.env.TOKEN);
