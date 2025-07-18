require("dotenv").config();
//const Discord = require("discord.js");
const {Client,PermissionsBitField , Attachment, ActivityType, GatewayIntentBits, AttachmentBuilder ,Partials,ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js")
const path = require('path');
const fs = require("fs");
const { type } = require("os");
const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
require('./registro-comandos.js'); // registra los comandos al iniciar
//const keep_alive = require("./keep_alive.js");
const web = require("./web.js");
const { obtenerEloActual } = require('./elo.js');
const { asociarUsuario, obtenerAoeId } = require('./asociar.js');
const cron = require('node-cron');
const { actualizarYPublicarRankingClan } = require('./rankingClan');
const { actualizarYPublicarRankingURU } = require('./rankingUru');
const botConfig = require('./botConfig.json'); // o como se llame
const { asignarRolesPorPromedio } = require("./utiles/asignarRoles.js");
const { sincronizarCoordinados } = require('./sincronizarCoordinados');
const fixtureJornada = require('./utiles/fixtureJornada.js');
const { calcularTablaPosiciones, generarTextoTabla } = require('./utiles/tablaPosiciones');
const { guardarTorneos } = require('./utiles/guardarTorneos.js');
const { subirTorneos } = require('./git/subirTorneosGit.js');
const { actualizarCategoriasDesdeRoles } = require('./utiles/actualizarCategorias.js');


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

client.on("ready", async (c) => {
  console.log(`${c.user.username} is online`);

  // ✅ MENSAJE DE TEST EN UN CANAL
  const canalTestId = "1381716348996030575"; // Reemplazalo con el canal que esté en tu servidor
  const canal = await client.channels.fetch(canalTestId).catch(err => console.error("❌ Error al buscar el canal:", err));
  if (canal) {
    canal.send("✅ El bot AldeanoOscar está conectado y activo.");
  }

// 📅 Tarea programada para ranking del clan - lunes a las 09:00
cron.schedule('0 9 * * 1', () => {
  console.log('📊 Ejecutando actualización semanal de Ranking Clan...');
  actualizarYPublicarRankingClan(client, '693245375615860838');
});

// 📅 Tarea programada para ranking URU - lunes a las 22:00
cron.schedule('00 22 * * 1', () => {
  console.log('📊 Ejecutando actualización semanal de Ranking URU...');
  const rankingURU = require('./rankingConfig.json').rankingURU;
  for (const guildId of Object.keys(rankingURU)) {
    actualizarYPublicarRankingURU(client, guildId);
  }
});


  // Torneos (una vez por día a las 01:50)
  cron.schedule('00 1 * * *', async () => {
  console.log('🎯 Ejecutando guardado de torneos');
  await guardarTorneos();
},{
  timezone: 'America/Montevideo'
});

  cron.schedule('23 1 * * *', async () => {
  console.log('📤 Subiendo torneos a GitHub...');
  await subirTorneos();
},{
  timezone: 'America/Montevideo'
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
  // 👇 Asignar rol automáticamente al unirse
  await member.roles.add('1392243967663542364').catch(console.error);  
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user, guildId, member, channelId } = interaction;

// Comando: listado_inscriptos    
const ROL_AUTORIZADO = "1377760555065933924";
if (interaction.commandName === "listar_inscriptos") {
  const tienePermiso = member.roles.cache.has(ROL_AUTORIZADO);
  if (!tienePermiso) {
    return interaction.reply({
      content: "🚫 No tenés permisos para usar este comando.",
      ephemeral: true
    });
  }

  const letras = ['a', 'b', 'c', 'd', 'e'];
  const inscriptos = [];

  for (const letra of letras) {
    const filePath = path.join(__dirname, 'ligas', `liga_${letra}.json`);
    console.log("🔍 Leyendo archivo:", filePath);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        // 🔧 Validación explícita
if (!Array.isArray(data.participantes)) {
  console.warn(`⚠️ El archivo liga_${letra}.json no tiene un array 'participantes' válido.`);
  continue; // saltea esta categoría
}  
        for (const jugador of data.participantes || []) {
          const promedio = Math.round((jugador.elo + jugador.elomax) / 2);
          inscriptos.push({
            nombre: jugador.nombre,
            promedio: promedio,
            categoria: letra.toUpperCase(),
            pais: jugador.pais || ''
          });
        }
      } catch (error) {
        console.warn(`❌ Error leyendo liga_${letra}.json:`, error.message);
      }
    }
  }

  if (inscriptos.length === 0) {
    return interaction.reply("⚠️ No se encontraron inscriptos.");
  }

  // Ordenar por promedio descendente
  inscriptos.sort((a, b) => b.promedio - a.promedio);

  // Crear CSV
  const csvHeader = "Nombre,Promedio,Categoría,País\n";
  const csvBody = inscriptos.map(j => `${j.nombre},${j.promedio},${j.categoria},${j.pais}`).join("\n");
  const csvContent = csvHeader + csvBody;

  const filePath = path.join(__dirname, 'inscriptos.csv');
  fs.writeFileSync(filePath, csvContent, 'utf8');

  const archivo = new AttachmentBuilder(filePath, { name: 'inscriptos.csv' });

  await interaction.reply({
    content: `📋 Inscriptos exportados correctamente (${inscriptos.length} jugadores):`,
    files: [archivo]
  });

  // Limpieza opcional del archivo temporal
  setTimeout(() => fs.unlinkSync(filePath), 30000); // se borra después de 30 segundos
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

  // Validación mínima
  if (!jugador || !otrojugador || puntosjugador == null || puntosotrojugador == null) {
    return await interaction.reply("❌ Faltan datos obligatorios para registrar el resultado.");
  }

  // Mostrar mensaje de resultado
  let mensaje = `Campeonato Uruguayo\n División ${division} - Etapa: ${ronda} - Fecha ${fecha}\n ${jugador}  ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador} \n Mapas: ${draftmapas} \n Civs: ${draftcivis}`;
  mensaje += archivoAdjunto?.attachment?.url
    ? `\nRec: ${archivoAdjunto.attachment.url}`
    : `\nNo se adjuntó ningún archivo`;

  await interaction.reply(mensaje); // Primer y único reply

  const letraDivision = division?.split('_')[1]; // Ej: categoria_a → a
  if (!letraDivision || letraDivision.length !== 1) {
    return await interaction.followUp("⚠️ División no válida.");
  }

  const filePath = path.join(__dirname, 'ligas', `liga_${letraDivision}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ Archivo no encontrado: ${filePath}`);
    return await interaction.followUp("⚠️ No se encontró el archivo de liga para esa división.");
  }

  try {
    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let partidoActualizado = false;

    for (const jornada of liga.jornadas) {
      for (const partido of jornada.partidos) {
        const j1 = partido.jugador1Id;
        const j2 = partido.jugador2Id;

        const esEstePartido =
          (j1 === jugador.id && j2 === otrojugador.id) ||
          (j1 === otrojugador.id && j2 === jugador.id);

        if (esEstePartido) {
          if (partido.resultado) {
            return await interaction.followUp("⚠️ Ese partido ya tiene un resultado registrado.");
          }

          const urlValida = archivoAdjunto?.attachment?.url?.startsWith("http");

          partido.resultado = {
            [jugador.id]: puntosjugador,
            [otrojugador.id]: puntosotrojugador,
            draftmapas,
            draftcivis,
            rec: urlValida ? archivoAdjunto.attachment.url : null,
            fecha: new Date().toISOString(),
          };

          partidoActualizado = true;
          break;
        }
      }
      if (partidoActualizado) break;
    }

    if (partidoActualizado) {
      await guardarLiga(liga, filePath, letraDivision, interaction);
      // ⬇️ NUEVA LÍNEA PARA ACTUALIZAR TABLA
      const { actualizarTablaEnCanal } = require('./utiles/tablaPosiciones.js');
      await actualizarTablaEnCanal(letraDivision, interaction.client, interaction.guildId);  
    } else {
      console.warn(`⚠️ No se encontró el partido entre ${jugador.id} y ${otrojugador.id}`);
      await interaction.followUp(`⚠️ No se encontró el partido entre ${jugador.username} y ${otrojugador.username} en la liga.`);
    }

  } catch (error) {
    console.error('❌ Error leyendo o procesando el archivo de liga:', error);
    await interaction.followUp("⚠️ Ocurrió un error al procesar la liga. Revisa los logs.");
  }
}
  // Comando: fixture_jornada  
 if (commandName === 'fixture_jornada') {
    return fixtureJornada.execute(interaction);
  }
    
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
// Comando: coordinado
if (commandName === 'coordinado') {
  await interaction.deferReply(); // ✅ evita error de interacción

  const division = options.getString('division'); // Ej: categoria_c
  const ronda = options.getInteger('ronda');
  const fecha = options.getString('fecha');
  const jugador = options.getUser('jugador');
  const rival = options.getUser('rival');
  const horario = options.getString('horario');
  const gmt = options.getString('gmt') || "GMT-3";

  const letraDivision = division?.split('_')[1]; // Ej: "c"
  const filePath = path.join(__dirname, 'ligas', `liga_${letraDivision}.json`);

     // Validar y formatear fecha
  const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
if (!fechaFormatoCorrecto) {
  return await interaction.editReply("❌ La fecha debe estar en formato **DD-MM-YYYY** y debe ser válida.");
}   
const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);

  // Validar y formatear horario
  const horarioFormateado = validarYFormatearHorario(horario);
  if (!horarioFormateado) {
    return await interaction.editReply("❌ Formato de horario inválido. Usá `HH:MM` o `HH.MM`, por ejemplo `19:30`.");
  }
    
  if (!fs.existsSync(filePath)) {
    return await interaction.editReply(`⚠️ No se encontró el archivo de liga para la división **${division}**.`);
  }

  try {
    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let partidoCoordinado = false;
    let partidoId = null;

    for (const jornada of liga.jornadas) {
     if (Number(jornada.ronda) !== ronda) continue;

      for (const partido of jornada.partidos) {
        const j1 = partido.jugador1Id;
        const j2 = partido.jugador2Id;

        const esEstePartido =
          (j1 === jugador.id && j2 === rival.id) ||
          (j1 === rival.id && j2 === jugador.id);

        if (esEstePartido) {
          partido.id = partido.id || Date.now(); // generar ID si no existe
          partido.fecha = fecha;
          partido.diaSemana = diaSemana;
          partido.horario = horarioFormateado;
          partido.gmt = gmt;
          partido.timestamp = new Date().toISOString();
          partido.coordinadoPor = {
            id: interaction.user.id,
            nombre: interaction.user.username
          };
          partidoCoordinado = true;
          partidoId = partido.id;
          break;
        }
      }
      if (partidoCoordinado) break;
    }

    if (partidoCoordinado) {
      // ✅ Subir a GitHub igual que en "resultado"
      await guardarLiga(liga, filePath, letraDivision, interaction);  
      await interaction.editReply({
        content: `📅 Partido coordinado en División **${division}**, Ronda **${ronda}**\n🕒 ${fecha} (${diaSemana}) a las ${horario}-hs ${gmt}\n👥 ${jugador} vs ${rival}`,
      });

      await interaction.followUp({
        content: `🆔 ID del partido (para re-coordinar): \`${partidoId}\``,
        ephemeral: true
      });

    } else {
      await interaction.editReply(`⚠️ No se encontró el partido entre **${jugador.username}** y **${rival.username}** en la ronda **${ronda}** de la liga **${division}**.`);
    }

  } catch (error) {
    console.error("❌ Error al coordinar el encuentro:", error);
    await interaction.editReply("⚠️ Ocurrió un error al intentar coordinar el partido.");
  }
}
// Comando: re-coordinar
if (commandName === 're-coordinar') {
  await interaction.deferReply(); // prevenir error InteractionNotReplied

  const categoria = options.getString('categoria'); // Ej: 'a', 'b', etc.
  const id = options.getNumber('id');
  const nuevaFecha = options.getString('fecha');
  const nuevoHorario = options.getString('horario');
  const nuevoGMT = options.getString('gmt') || "GMT-3";

    
  if (!categoria || !id || !nuevaFecha || !nuevoHorario) {
    return await interaction.editReply("❌ Faltan datos obligatorios.");
  }

  const fechaFormatoCorrecto = convertirFormatoFecha(nuevaFecha);
if (!fechaFormatoCorrecto) {
  return await interaction.editReply("❌ La fecha debe estar en formato **DD-MM-YYYY** (o DD/MM/YYYY) y ser válida.");
}
  // Validar y formatear horario
  const horarioFormateado = validarYFormatearHorario(nuevoHorario);
  if (!horarioFormateado) {
    return await interaction.editReply("❌ Formato de horario inválido. Usá `HH:MM` o `HH.MM`, por ejemplo `19:30`.");
  }    
  
  const filePath = path.join(__dirname, 'ligas', `liga_${categoria}.json`);
  if (!fs.existsSync(filePath)) {
    return await interaction.editReply(`⚠️ No se encontró la liga para la categoría **${categoria.toUpperCase()}**.`);
  }

  try {
    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let partidoModificado = null;

    for (const jornada of liga.jornadas) {
      for (const partido of jornada.partidos) {
        if (partido.id === id) {
          partido.fecha = fechaFormatoCorrecto;
          partido.horario = horarioFormateado;
          partido.gmt = nuevoGMT;
          partido.diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);
          partido.timestamp = new Date().toISOString();
          partidoModificado = partido;
          break;
        }
      }
      if (partidoModificado) break;
    }

    if (!partidoModificado) {
      return await interaction.editReply(`❌ No se encontró ningún encuentro con ID: \`${id}\` en la categoría ${categoria.toUpperCase()}`);
    }

    await guardarLiga(liga, filePath, categoria, interaction);  
   
    await interaction.editReply({
      content: `✅ Encuentro actualizado con éxito en categoría **${categoria.toUpperCase()}**:\n📅 Nueva fecha: ${nuevaFecha} (${partidoModificado.diaSemana})\n🕒 Nuevo horario: ${nuevoHorario} ${nuevoGMT}`,
    });

  } catch (error) {
    console.error("❌ Error en re-coordinar:", error);
    await interaction.editReply("⚠️ Ocurrió un error al modificar el encuentro.");
  }
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
// Comando: inscripcion_admin
if (commandName === 'inscripcion_admin') {
  // Solo permitir al admin (podés ajustar según tu config)
  if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({
      content: '⛔ No tenés permisos para usar este comando.',
      ephemeral: true
    });
  }

  const usuario = options.getUser('usuario'); // @usuario de Discord
  const nombre = options.getString('nombre');
  const eloactual = options.getNumber('eloactual');
  const elomaximo = options.getNumber('elomaximo');
  const link = options.getString('link');
  const archivoAdjunto = options.get('archivo');

  const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/profile\/(\d+)$/);
  if (!match) {
    return interaction.reply({
      content: "❌ La URL no es válida. Debe ser algo como:\n`https://www.aoe2companion.com/profile/2587873713`",
      ephemeral: true
    });
  }

  const aoeId = match[2];
  asociarUsuario(usuario.id, aoeId); // <<< Vincula al usuario elegido

  const promedio = Math.round((eloactual + elomaximo) / 2);

  let mensaje = `✅ ${usuario} fue inscripto a la Copa Uruguaya 2025 por un administrador.
🎮 **Nick Steam**: ${nombre}
📈 **ELO Actual**: ${eloactual}
📉 **ELO Máximo**: ${elomaximo}
📊 **Promedio**: ${promedio}
🔗 **Perfil**: ${link}
🔗 ✅ **Vinculado con AOE2 ID: ${aoeId}**`;

  if (archivoAdjunto) {
    mensaje += `\n🖼️ **Logo**: ${archivoAdjunto.attachment.url}`;
  }

  await interaction.reply(mensaje);

  // Si querés asignar roles también:
  const configServidor = botConfig.servidores[guildId];
  const miembroObjetivo = await interaction.guild.members.fetch(usuario.id).catch(() => null);
  if (miembroObjetivo) {
    await asignarRolesPorPromedio(miembroObjetivo, promedio, configServidor);
    await actualizarCategoriasDesdeRoles(interaction.guild);
  }
}
if (commandName === 'torneoliga') {
  const categoria = options.getString('categoria');
  const modo = options.getInteger('modo') || 1;

  if (user.id !== botConfig.ownerId) {
    return interaction.reply({ content: '❌ Solo el organizador puede usar este comando.', ephemeral: true });
  }

  // Defer por si tarda
  if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }

  const { ejecutarTorneoLiga } = require('./utiles/torneoLiga.js');
  await ejecutarTorneoLiga(interaction, categoria, modo);
}
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

  // Crear un mapa de participantes
  const mapaParticipantes = {};
  const todosLosParticipantes = liga.participantes || [];

  // Si hay grupos, agregamos todos los jugadores de cada grupo
  if (liga.grupos) {
    for (const grupo of Object.values(liga.grupos)) {
      grupo.forEach(p => {
        mapaParticipantes[p.id] = p.nombre;
      });
    }
  } else {
    todosLosParticipantes.forEach(p => {
      mapaParticipantes[p.id] = p.nombre;
    });
  }

  const encuentrosPorJornada = liga.jornadas.map((jornada, index) => {
    const encuentros = jornada.partidos.map((partido, i) => {
      const nombre1 = mapaParticipantes[partido.jugador1Id] || `Jugador ${i * 2 + 1}`;
      const nombre2 = mapaParticipantes[partido.jugador2Id] || `Jugador ${i * 2 + 2}`;

      let resultado;
      if (partido.resultado) {
        const r = partido.resultado;
        const j1 = r[partido.jugador1Id] ?? '?';
        const j2 = r[partido.jugador2Id] ?? '?';
        resultado = `✅ ${j1} - ${j2}`;
      } else if (partido.fecha && partido.horario) {
        resultado = `🗓 Coordinado: ${partido.fecha} (${partido.diaSemana}) a las ${partido.horario}hs ${partido.gmt || ''}`;
      } else {
        resultado = '🕓 Pendiente';
      }

      return `  ${i + 1}. ${nombre1} vs ${nombre2} → ${resultado}`;
    });

    const titulo = jornada.grupo
      ? `🔸 **Grupo ${jornada.grupo.toUpperCase()} - Jornada ${jornada.ronda || index + 1}**`
      : jornada.fase
      ? `🏆 **${jornada.fase}**`
      : `🔹 **Jornada ${jornada.ronda || index + 1}**`;

    return `${titulo}\n${encuentros.join('\n')}`;
  });

  const respuesta = `📋 **Encuentros de la Liga ${categoria.toUpperCase()}**\n\n${encuentrosPorJornada.join('\n\n')}`;

  return interaction.reply({ content: respuesta.slice(0, 2000), ephemeral: true });
}
// Comando: publicar_tabla
if (commandName === 'publicar_tabla') {
  const categoria = options.getString('categoria');

  if (interaction.user.id !== botConfig.ownerId) {
    return await interaction.reply({
      content: "❌ Solo el organizador puede ejecutar este comando.",
      ephemeral: true
    });
  }

  const servidorId = interaction.guildId;
  const serverConfig = botConfig.servidores[servidorId];

  if (!serverConfig) {
    return await interaction.reply({
      content: "⚠️ Este servidor no está configurado en config.json",
      ephemeral: true
    });
  }

  const canalId = serverConfig[`tablaCategoria${categoria.toUpperCase()}`];
  if (!canalId) {
    return await interaction.reply({
      content: `⚠️ No se encontró un canal configurado para la categoría ${categoria.toUpperCase()}`,
      ephemeral: true
    });
  }

  const filePath = path.join(__dirname, 'ligas', `liga_${categoria}.json`);
  if (!fs.existsSync(filePath)) {
    return await interaction.reply({
      content: `⚠️ No se encontró la liga para la categoría ${categoria}`,
      ephemeral: true
    });
  }

  const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const canal = await interaction.client.channels.fetch(canalId);

  if (!serverConfig.mensajeTabla) serverConfig.mensajeTabla = {};

  // Función auxiliar para enviar o editar mensaje
  async function enviarOEditarMensaje(texto, idGuardadoKey) {
    const mensajeId = serverConfig.mensajeTabla[idGuardadoKey];
    if (mensajeId) {
      try {
        const mensaje = await canal.messages.fetch(mensajeId);
        await mensaje.edit(texto);
        return mensaje.id;
      } catch {
        const nuevoMensaje = await canal.send(texto);
        return nuevoMensaje.id;
      }
    } else {
      const nuevoMensaje = await canal.send(texto);
      return nuevoMensaje.id;
    }
  }

  // Calcular posiciones para toda la categoría (devuelve objeto con grupos o array si sin grupos)
  const posiciones = calcularTablaPosiciones(categoria);
  if (!posiciones || (Array.isArray(posiciones) && posiciones.length === 0)) {
    return await interaction.reply({
      content: `⚠️ No se pudo calcular la tabla para la categoría ${categoria}`,
      ephemeral: true
    });
  }

  // Generar texto con todas las tablas (incluyendo grupos en un solo texto)
  const texto = generarTextoTabla(posiciones, categoria);

  // Enviar o editar mensaje único para toda la categoría
  const mensajeTablaId = await enviarOEditarMensaje(texto, categoria);
  serverConfig.mensajeTabla[categoria] = mensajeTablaId;

  // Guardar config actualizada en archivo
  fs.writeFileSync(path.join(__dirname, 'botConfig.json'), JSON.stringify(botConfig, null, 2));

  return await interaction.reply({
    content: `✅ Tabla publicada para la categoría ${categoria.toUpperCase()}.`,
    ephemeral: true
  });
}

});


function convertirFormatoFecha(fecha) {
  let separador = fecha.includes("/") ? "/" : "-";
  const partes = fecha.split(separador);
  if (partes.length !== 3) return null;

  const [diaStr, mesStr, anioStr] = partes;
  const dia = parseInt(diaStr, 10);
  const mes = parseInt(mesStr, 10);
  const anio = parseInt(anioStr, 10);

  // Validar que sea fecha real
  if (isNaN(dia) || isNaN(mes) || isNaN(anio)) return null;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 2020 || anio > 2100) return null;

  // Validar que sea una fecha real con Date
  const fechaISO = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  const fechaObj = new Date(fechaISO);
  if (isNaN(fechaObj.getTime())) return null;

  return fechaISO; // en formato YYYY-MM-DD
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

//Funcion para validar el formato del horario
function validarYFormatearHorario(horario) {
  const regex = /^(\d{1,2})[:.](\d{2})$/;
  const match = horario.match(regex);

  if (!match) return null;

  let [_, horas, minutos] = match;
  horas = parseInt(horas, 10);
  minutos = parseInt(minutos, 10);

  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;

  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}


// Función auxiliar para guardar y subir
async function guardarLiga(liga, filePath, letraDivision, interaction) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(liga, null, 2), 'utf8');
    console.log(`✅ Resultado guardado en liga_${letraDivision}.json`);

    const { subirTodasLasLigas } = require('./git/guardarLigasGit');
    await subirTodasLasLigas();
  } catch (error) {
    console.warn('⚠️ No se pudo subir a GitHub:', error.message);
    await interaction.followUp("⚠️ El resultado fue guardado pero no se pudo subir a GitHub.");
  }
}


client.on("messageCreate", (mensaje) => {
  console.log(mensaje.content);
});

client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Error al iniciar sesión con el bot:", err);
});
