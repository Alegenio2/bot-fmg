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
    partials:[Partials.Message, Partials.Channel,Partials.MessageReaction,Partials.GuildMember,Partials.User],
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

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user, guildId, member, channelId } = interaction;

  // Comando: actualizar_categoria
  if (commandName === 'actualizar_categoria') {
    const ownerId = botConfig.ownerId;

    // Verificar permisos: owner o permisos ManageRoles
    const esOwner = user.id === ownerId;
    const tienePermisos = member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!esOwner && !tienePermisos) {
      return interaction.reply({
        content: '⛔ Solo el owner o administradores pueden usar este comando.',
        ephemeral: true
      });
    }

    const letra = options.getString('categoria');
    const configServidor = botConfig.servidores[guildId];
    if (!configServidor) {
      return interaction.reply({ content: '❌ Configuración del servidor no encontrada.', ephemeral: true });
    }

    const rolCategoria = configServidor[`categoria${letra.toUpperCase()}`];
    if (!rolCategoria) {
      return interaction.reply({ content: `❌ No se encontró el rol para la categoría ${letra.toUpperCase()}.`, ephemeral: true });
    }

    await interaction.guild.members.fetch(); // asegurar carga miembros

    const miembrosConRol = interaction.guild.members.cache.filter(m => m.roles.cache.has(rolCategoria));
    const jugadores = miembrosConRol.map(m => ({
      id: m.id,
      nombre: m.user.username
    }));

    const carpeta = path.join(__dirname, 'categorias');
    const archivo = path.join(carpeta, `categoria_${letra}.json`);

    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

    fs.writeFileSync(archivo, JSON.stringify(jugadores, null, 2), 'utf8');

     // Subir a GitHub solo la categoría correspondiente
const { guardarYSubirCatA } = require('./git/guardarGit_Cat_A.js');
const { guardarYSubirCatB } = require('./git/guardarGit_Cat_B.js');
const { guardarYSubirCatC } = require('./git/guardarGit_Cat_C.js');
const { guardarYSubirCatD } = require('./git/guardarGit_Cat_D.js');
const { guardarYSubirCatE } = require('./git/guardarGit_Cat_E.js');

 if (letra === 'a') {
      await guardarYSubirCatA();
    } else if (letra === 'b') {
      await guardarYSubirCatB();
    } else if (letra === 'c') {
      await guardarYSubirCatC();
    } else if (letra === 'd') {
      await guardarYSubirCatD();
    } else if (letra === 'e'){
      await guardarYSubirCatE();
    } else {
    return interaction.reply({ content: `⚠️ Subida no configurada para categoría ${letra.toUpperCase()}.`, ephemeral: true });
  }

    return interaction.reply(`✅ Categoría **${letra.toUpperCase()}** actualizada con **${jugadores.length}** jugadores y subida a GitHub.`);
  }

  // Comando: vincular
  if (commandName === 'vincular') {
    const canalVincular = botConfig.servidores[guildId]?.canalVincular;
    if (!canalVincular || channelId !== canalVincular) {
      return interaction.reply({
        content: "⚠️ Este comando solo se puede usar en el canal de vinculación correspondiente.",
        ephemeral: true
      });
    }

    const urlCompleta = options.getString('aoe2id');
    const match = urlCompleta.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );
      return interaction.reply({
        content: "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        components: [row],
        ephemeral: true
      });
    }

    const aoeId = match[2];
    asociarUsuario(user.id, aoeId);

    return interaction.reply({
      content: `✅ Tu cuenta fue vinculada con AOE2 ID: ${aoeId}`,
      ephemeral: true
    });
  }

  // Comando: elos
  if (commandName === 'elos') {
    const jugador = options.getUser('jugador') || user;
    const aoeId = obtenerAoeId(jugador.id);

    if (!aoeId) {
      return interaction.reply(`❌ ${jugador.username} no ha vinculado su cuenta aún. Usa /vincular.`);
    }

    const datos = await obtenerEloActual(aoeId);
    if (!datos) {
      return interaction.reply("❌ No se pudo obtener el ELO.");
    }

    return interaction.reply(
      `🏆 **${datos.nombre}**\n` +
      `🌍 País: ${datos.pais}\n` +
      `🎯 ELO 1v1: ${datos.elo}\n` +
      `📈 Rank global: #${datos.rank}\n` +
      `:scroll: ${datos.clan}\n` +
      `✅ Ganadas: ${datos.wins} | ❌ Perdidas: ${datos.losses}`
    );
  }

  // Comando: resultado
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
  const archivoAdjunto = interaction.options.get("archivo");

  let mensaje = `Copa Uruguaya\n División ${division} - Etapa: ${ronda} - Fecha ${fecha}\n ${jugador}  ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador} \n Mapas:${draftmapas} \n Civs:${draftcivis}`;
  if (archivoAdjunto) {
    mensaje += `\nRec: ${archivoAdjunto.attachment.url}`;
  } else {
    mensaje += `\nNo se adjuntó ningún archivo`;
  }

  await interaction.reply(mensaje);

  // Ruta del archivo de liga
  const filePath = path.join(__dirname, 'ligas', `liga_${division}.json`);
  if (!fs.existsSync(filePath)) return;

  const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const encuentros = liga.encuentros;

  // Buscar el encuentro sin importar el orden
  const index = encuentros.findIndex(e =>
    (e.jugador1.id === jugador.id && e.jugador2.id === otrojugador.id) ||
    (e.jugador1.id === otrojugador.id && e.jugador2.id === jugador.id)
  );

  if (index !== -1) {
    encuentros[index].resultado = {
      [jugador.id]: puntosjugador,
      [otrojugador.id]: puntosotrojugador,
      draftmapas,
      draftcivis,
      rec: archivoAdjunto?.attachment.url || null,
      fecha: new Date().toISOString()
    };

    // Guardar archivo actualizado
    fs.writeFileSync(filePath, JSON.stringify(liga, null, 2), 'utf8');
    console.log(`📝 Resultado actualizado en liga_${division}.json`);

  try {
  const { subirTodasLasLigas } = require('../git/guardarLigasGit');
  await subirTodasLasLigas();
} catch (error) {
  console.warn('⚠️ No se pudo subir a GitHub:', error.message);
} 
  }
}
  // Comando: coordinado
  if (commandName === 'coordinado') {
    const division = options.getString('division');
    const ronda = options.getString('ronda');
    const fecha = options.getString('fecha');
    const jugador = options.getUser('jugador');
    const rival = options.getUser('rival');
    const horario = options.getString('horario');
    let gmt = options.getString('gmt') || "GMT-3";

    const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
    const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);

    const mensaje = `📅 Copa Uruguaya\n🗂 División: ${division}, Etapa: ${ronda}\n📆 Fecha: ${fecha} (${diaSemana}) a las ${horario}-hs ${gmt}\n👥 ${jugador} vs ${rival}`;
    await interaction.reply({ content: mensaje, fetchReply: true });

    const nuevoEncuentro = {
      id: Date.now(),
      division,
      ronda,
      fecha,
      diaSemana,
      horario,
      gmt,
      jugador: { id: jugador.id, nombre: jugador.username },
      rival: { id: rival.id, nombre: rival.username },
      creadoPor: { id: user.id, nombre: user.username },
      timestamp: new Date().toISOString()
    };

    await interaction.followUp({
      content: `🆔 ID de este encuentro (para poder re-coordinar): \`${nuevoEncuentro.id}\``,
      ephemeral: true
    });

    const filePath = path.join(__dirname, 'coordinados.json');
    try {
      const data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
      data.push(nuevoEncuentro);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

      await sincronizarCoordinados();
    } catch (error) {
      console.error("❌ Error al guardar el encuentro:", error);
    }
    return;
  }

  // Comando: re-coordinar
  if (commandName === 're-coordinar') {
    const id = options.getNumber('id');
    const nuevaFecha = options.getString('fecha');
    const nuevoHorario = options.getString('horario');
    const nuevoGMT = options.getString('gmt') || "GMT-3";

    const filePath = path.join(__dirname, 'coordinados.json');
    if (!fs.existsSync(filePath)) {
      return interaction.reply({ content: "❌ No hay ningún archivo de encuentros todavía.", ephemeral: true });
    }

    let coordinados = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const index = coordinados.findIndex(e => e.id === id);

    if (index === -1) {
      return interaction.reply({ content: `❌ No se encontró ningún encuentro con ID: ${id}`, ephemeral: true });
    }

    coordinados[index].fecha = nuevaFecha;
    coordinados[index].horario = nuevoHorario;
    coordinados[index].gmt = nuevoGMT;
    coordinados[index].diaSemana = obtenerDiaSemana(convertirFormatoFecha(nuevaFecha));
    coordinados[index].timestamp = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(coordinados, null, 2));
    await sincronizarCoordinados();

    return interaction.reply({
      content: `✅ Encuentro actualizado con éxito:\n📅 Nueva fecha: ${nuevaFecha} (${coordinados[index].diaSemana})\n🕒 Nuevo horario: ${nuevoHorario} ${nuevoGMT}`,
      ephemeral: true
    });
  }

  // Comando: inscripciones
  if (commandName === 'inscripciones') {
    const nombre = options.getString('nombre');
    const eloactual = options.getNumber('eloactual');
    const elomaximo = options.getNumber('elomaximo');
    const link = options.getString('link');
    const archivoAdjunto = options.get('archivo');

    const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar tu perfil en AoE2 Companion")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );
      return interaction.reply({
        content: "❌ La URL no es válida. Asegurate de que sea algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
        components: [row],
        ephemeral: true
      });
    }

    const aoeId = match[2];
    asociarUsuario(user.id, aoeId);

    const promedio = Math.round((eloactual + elomaximo) / 2);

    let mensaje = `✅ Inscripto a la Copa Uruguaya 2025
🎮 **Nick Steam**: ${nombre}
📈 **ELO Actual**: ${eloactual}
📉 **ELO Máximo**: ${elomaximo}
📊 **Promedio**: ${promedio}
🔗 **Perfil**: ${link}`;

    if (archivoAdjunto) {
      mensaje += `\n🖼️ **Logo**: ${archivoAdjunto.attachment.url}`;
    }

    await interaction.reply(mensaje);

    const configServidor = botConfig.servidores[guildId];
    if (member) {
      await asignarRolesPorPromedio(member, promedio, configServidor);
      await actualizarCategoriasDesdeRoles(interaction.guild);
    }
    return;
  }

  // Comando: inscripciones_vinculado
  if (commandName === 'inscripciones_vinculado') {
    await interaction.deferReply({ ephemeral: false });

    const vinculados = require('./usuarios.json');
    const { obtenerEloActual } = require('./elo');

    const userId = user.id;
    const profileId = vinculados[userId];

    if (!profileId) {
      return interaction.editReply('⚠️ No estás vinculado. Por favor usa el comando /inscripciones.');
    }

    const datos = await obtenerEloActual(profileId);
    if (!datos) {
      return interaction.editReply('⚠️ No se pudo obtener tu perfil de AOE2 Companion.');
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

    const configServidor = botConfig.servidores[guildId];
    if (member) {
      await asignarRolesPorPromedio(member, promedio, configServidor);
      await actualizarCategoriasDesdeRoles(interaction.guild);
    }
    return;
  }

  // Comando: torneoliga
  if (commandName === 'torneoliga') {
    const categoria = options.getString('categoria');

    if (user.id !== botConfig.ownerId) {
      return interaction.reply({ content: '❌ Solo el organizador puede usar este comando.', ephemeral: true });
    }

    const { ejecutarTorneoLiga } = require('./utiles/torneoLiga.js');
    await ejecutarTorneoLiga(interaction, categoria);
    return;
  }

  // Comando: listar_encuentros
  if (commandName === 'listar_encuentros') {
    const categoria = options.getString('categoria');
    const filePath = path.join(__dirname, 'ligas', `liga_${categoria}.json`);

    if (!fs.existsSync(filePath)) {
      return interaction.reply({
        content: `⚠️ No existe una liga para la categoría **${categoria.toUpperCase()}**.`,
        ephemeral: true
      });
    }

    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const usuarios = liga.participantes.reduce((acc, jugador) => {
      acc[jugador.id] = jugador.nombre;
      return acc;
    }, {});

   const encuentros = liga.encuentros.map((e, i) => {
  const nombre1 = e.jugador1.nombre || 'Jugador 1';
  const nombre2 = e.jugador2.nombre || 'Jugador 2';
  const resultado = e.resultado ? `✅ ${e.resultado}` : '🕓 Pendiente';
  return `**${i + 1}.** ${nombre1} vs ${nombre2} → ${resultado}`;
});


    const respuesta = `📋 **Encuentros de la Liga ${categoria.toUpperCase()}**\n\n${encuentros.join('\n')}`;

    return interaction.reply({ content: respuesta.slice(0, 2000), ephemeral: true });
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
