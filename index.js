require("dotenv").config();
//const Discord = require("discord.js");
const {Client,PermissionsBitField , Attachment, ActivityType, GatewayIntentBits, AttachmentBuilder ,Partials,ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js")
const fs = require("fs");
const path = require('path');
const { type } = require("os");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
const keep_alive = require("./keep_alive.js")
const { obtenerEloActual } = require('./elo.js');
const { asociarUsuario, obtenerAoeId } = require('./asociar.js');
const cron = require('node-cron');
const { actualizarYPublicarRankingClan } = require('./rankingClan');
const { actualizarYPublicarRankingURU } = require('./rankingUru');
const botConfig = require('./botConfig.json'); // o como se llame
require('./registro-comandos.js'); // registra los comandos al iniciar
const { asignarRolesPorPromedio } = require("./utiles/asignarRoles.js");
const { sincronizarCoordinados } = require('./sincronizarCoordinados');


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

  // 📅 Tarea programada para ranking del clan - todos los días a las 00:00
  cron.schedule('0 09 * * *', () => {
    console.log('📊 Ejecutando actualización diaria de Ranking Clan...');
    actualizarYPublicarRankingClan(client, '693245375615860838');
  });

  // 📅 Tarea programada para ranking URU - todos los días a la 22:00
  cron.schedule('0 22 * * *', () => {
    console.log('📊 Ejecutando actualización diaria de Ranking URU...');
    const rankingURU = require('./rankingConfig.json').rankingURU;
    for (const guildId of Object.keys(rankingURU)) {
      actualizarYPublicarRankingURU(client, guildId);
    }
  });

  // 🎮 Establecer actividad del bot
  c.user.setActivity(`Age of Empires II: Definitive Edition`, {
    type: ActivityType.Playing,
  });
});

client.on('guildMemberAdd', async member => {
  const Canvas = require('canvas');
  const config = require('./bienvenidaConfig.json');

  const canvas = Canvas.createCanvas(1028, 468);
  const ctx = canvas.getContext('2d');

  const backgroundImages = ["./img/bg.png", "./img/bg2.png"];
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

  const channelId = config[member.guild.id];
  if (!channelId) return; // si no hay canal configurado, salir

  const channel = member.guild.channels.cache.get(channelId);
  if (channel) {
    await channel.send({ files: [attachment] });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, user } = interaction;
    
if (interaction.commandName === 'actualizar_categoria') {
    const ownerId = botConfig.ownerId;

    // Verificar si el usuario tiene permisos
    const esOwner = interaction.user.id === ownerId;
    const tienePermisos = interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!esOwner && !tienePermisos) {
      return interaction.reply({
        content: '⛔ Solo el owner o administradores pueden usar este comando.',
        ephemeral: true
      });
    }

    const letra = interaction.options.getString('categoria');
    const configServidor = botConfig.servidores[interaction.guildId];
    if (!configServidor) {
      return interaction.reply({ content: '❌ Configuración del servidor no encontrada.', ephemeral: true });
    }

    const rolCategoria = configServidor[`categoria${letra.toUpperCase()}`];
    if (!rolCategoria) {
      return interaction.reply({ content: `❌ No se encontró el rol para la categoría ${letra.toUpperCase()}.`, ephemeral: true });
    }

    await interaction.guild.members.fetch(); // asegura que estén todos cargados
    const miembrosConRol = interaction.guild.members.cache.filter(m => m.roles.cache.has(rolCategoria));
    const jugadores = miembrosConRol.map(m => ({
      id: m.id,
      nombre: m.user.username
    }));

    const carpeta = path.join(__dirname, 'categorias');
    const archivo = path.join(carpeta, `categoria_${letra}.json`);

    if (!fs.existsSync(carpeta)) {
      fs.mkdirSync(carpeta);
    }

    fs.writeFileSync(archivo, JSON.stringify(jugadores, null, 2), 'utf8');

// Agregá esta línea 👇 para subir a GitHub
const { guardarYSubirCategorias } = require('./guardarCategoriasGit.js');
await guardarYSubirCategorias();

await interaction.reply(`✅ Categoría **${letra.toUpperCase()}** actualizada con **${jugadores.length}** jugadores y subida a GitHub.`);
  }

    
  
if (commandName === 'vincular') {
  const guildId = interaction.guildId;
  const canalVincular = botConfig.servidores[guildId]?.canalVincular;

  if (!canalVincular || interaction.channelId !== canalVincular) {
    await interaction.reply({
      content: "⚠️ Este comando solo se puede usar en el canal de vinculación correspondiente.",
      ephemeral: true
    });
    return;
  }

  const urlCompleta = options.getString('aoe2id');
    // Regex más precisa
    const match = urlCompleta.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);


   if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );

      await interaction.reply({
        content: "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        components: [row],
        ephemeral: true
      });
      return;
    }


  const aoeId = match[2]; // extrae el número
    asociarUsuario(user.id, aoeId);

    await interaction.reply({
      content: `✅ Tu cuenta fue vinculada con AOE2 ID: ${aoeId}`,
      ephemeral: true
    });
}
  if (commandName === 'elos') {
    const jugador = options.getUser('jugador') || user;
    const aoeId = obtenerAoeId(jugador.id);
    if (!aoeId) {
      await interaction.reply(`❌ ${jugador.username} no ha vinculado su cuenta aún. Usa /vincular.`);
      return;
    }

    const datos = await obtenerEloActual(aoeId);
    if (!datos) {
      await interaction.reply("❌ No se pudo obtener el ELO.");
      return;
    }

    await interaction.reply(
      `🏆 **${datos.nombre}**\n` +
      `🌍 País: ${datos.pais}\n` +
      `🎯 ELO 1v1: ${datos.elo}\n` +
      `📈 Rank global: #${datos.rank}\n` +
      ` :scroll: ${datos.clan}\n` +
      `✅ Ganadas: ${datos.wins} | ❌ Perdidas: ${datos.losses}`
    );
  }
});


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
  if (!gmt) gmt = "GMT-3";

  const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
  const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);

  const mensaje = `📅 Copa Uruguaya\n🗂 División: ${division}, Etapa: ${ronda}\n📆 Fecha: ${fecha} (${diaSemana}) a las ${horario}-hs ${gmt}\n👥 ${jugador} vs ${rival}`;
  await interaction.reply({
  content: mensaje, // el mensaje con toda la info del encuentro
  fetchReply: true
                    });
   
  const nuevoEncuentro = {
    id: Date.now(),
    division,
    ronda,
    fecha,
    diaSemana,
    horario,
    gmt,
    jugador: {
      id: jugador.id,
      nombre: jugador.username,
    },
    rival: {
      id: rival.id,
      nombre: rival.username,
    },
    creadoPor: {
      id: interaction.user.id,
      nombre: interaction.user.username,
    },
    timestamp: new Date().toISOString()
  };

  // Respuesta con ID solo para el autor
await interaction.followUp({
  content: `🆔 ID de este encuentro (para poder re-coordinar): \`${nuevoEncuentro.id}\``,
  ephemeral: true
});  
    
  const filePath = path.join(__dirname, 'coordinados.json');
  try {
    const data = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
      : [];

    data.push(nuevoEncuentro);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // ✅ Subir a GitHub
    await sincronizarCoordinados();
  } catch (error) {
    console.error("❌ Error al guardar el encuentro:", error);
  }
}
if (interaction.commandName === "re-coordinar") {
  const id = interaction.options.getNumber("id");
  const nuevaFecha = interaction.options.getString("fecha");
  const nuevoHorario = interaction.options.getString("horario");
  const nuevoGMT = interaction.options.getString("gmt") || "GMT-3";

  const fechaFormatoCorrecto = convertirFormatoFecha(nuevaFecha);
  const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);  
    
  const filePath = path.join(__dirname, 'coordinados.json');
  if (!fs.existsSync(filePath)) {
    await interaction.reply({ content: "❌ No hay ningún archivo de encuentros todavía.", ephemeral: true });
    return;
  }

  let coordinados = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const index = coordinados.findIndex(encuentro => encuentro.id === id);

  if (index === -1) {
    await interaction.reply({ content: `❌ No se encontró ningún encuentro con ID: ${id}`, ephemeral: true });
    return;
  }

  // Actualizar datos
  coordinados[index].fecha = nuevaFecha;
  coordinados[index].horario = nuevoHorario;
  coordinados[index].gmt = nuevoGMT;
  coordinados[index].diaSemana = obtenerDiaSemana(convertirFormatoFecha(nuevaFecha));
  coordinados[index].timestamp = new Date().toISOString(); // registrar modificación

  // Guardar cambios
  fs.writeFileSync(filePath, JSON.stringify(coordinados, null, 2));
  await sincronizarCoordinados();

  await interaction.reply({
    content: `✅ Encuentro actualizado con éxito:\n📅 Nueva fecha: ${nuevaFecha} (${coordinados[index].diaSemana})\n🕒 Nuevo horario: ${nuevoHorario} ${nuevoGMT}`,
    ephemeral: true
  });
}
 if (interaction.commandName === "inscripciones") {
  const nombre = interaction.options.getString("nombre");
  const eloactual = interaction.options.getNumber("eloactual");
  const elomaximo = interaction.options.getNumber("elomaximo");
  const link = interaction.options.getString("link");
  const archivoAdjunto = interaction.options.get("archivo");

  // Validar el link y extraer AOE2 ID
  const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
  if (!match) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Buscar tu perfil en AoE2 Companion")
        .setStyle(ButtonStyle.Link)
        .setURL("https://www.aoe2companion.com/")
    );

    await interaction.reply({
      content: "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
      components: [row],
      ephemeral: true
    });
    return;
  }

  const aoeId = match[2];
  asociarUsuario(interaction.user.id, aoeId); // ✅ Guardar en usuarios.json y subir

  // Calcular promedio
  const promedio = Math.round((eloactual + elomaximo) / 2);

  // Construir mensaje
  let mensaje = `✅ Inscripto a la Copa Uruguaya 2025

🎮 **Nick Steam**: ${nombre}
📈 **ELO Actual**: ${eloactual}
📉 **ELO Máximo**: ${elomaximo}
📊 **Promedio**: ${promedio}
🔗 **Perfil**: ${link}`;

  if (archivoAdjunto) {
    mensaje += `\n🖼️ **Logo**: ${archivoAdjunto.attachment.url}`;
  }

  // Enviar mensaje al canal
  await interaction.reply(mensaje);

  // Asignar roles
  const guildId = interaction.guildId;
  const configServidor = botConfig.servidores[guildId];
  const member = interaction.member;

  if (member) {
    await asignarRolesPorPromedio(member, promedio, configServidor);
    await actualizarCategoriasDesdeRoles(interaction.guild); // 👈 se actualiza json + sube a GitHub  
  }
}
   if (interaction.commandName === 'inscripciones_vinculado') {
    await interaction.deferReply({ ephemeral: false });

    const vinculados = require('./usuarios.json');
    const { obtenerEloActual } = require('./elo');

    const userId = interaction.user.id;
    const profileId = vinculados[userId];
    

    if (!profileId) {
      await interaction.editReply('⚠️ No estás vinculado. Por favor usa el comando /inscripciones.');
      return;
    }

    const datos = await obtenerEloActual(profileId);

    if (!datos) {
      await interaction.editReply('⚠️ No se pudo obtener tu perfil de AOE2 Companion.');
      return;
    }
const promedio = Math.round((datos.elo + datos.elomax) / 2);
const mensaje = `✅ Inscripto a la Copa Uruguaya 2025 (vía vinculación)
🎮 **Nick Steam**: ${datos.nombre}
📈 **ELO Actual**: ${datos.elo}
📉 **ELO Máximo**: ${datos.elomax}
📊 **Promedio**: ${promedio}
🌍 **País**: ${datos.pais}
🔗 **Perfil**: https://www.aoe2companion.com/profile/${profileId}`;

await interaction.editReply(mensaje);


    const guildId = interaction.guildId;
    const configServidor = botConfig.servidores[guildId];
    const member = interaction.member;

    if (member) {
      await asignarRolesPorPromedio(member, promedio, configServidor);
      await actualizarCategoriasDesdeRoles(interaction.guild); // 👈 actualiza y sube  
    }
        
        
  }
    if (interaction.commandName === 'torneoliga') {
  const categoria = interaction.options.getString('categoria');

    if (interaction.user.id !== config.ownerId) {
    return interaction.reply({ content: '❌ Solo el organizador puede usar este comando.', ephemeral: true });
  }

  // 👇 Aquí llamás a la lógica del comando que ya preparamos
  const { ejecutarTorneoLiga } = require('./utiles/torneoLiga.js');
  await ejecutarTorneoLiga(interaction, categoria);
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
