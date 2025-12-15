require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, AttachmentBuilder, ActivityType } = require('discord.js');
const cron = require('node-cron');
const botConfig = require('./botConfig.json');
const { mostrarGuiaModal } = require('./utils/guias_interaccion.js');
require('./web.js');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMembers
  ] 
});

// Colección de comandos
client.commands = new Collection();

// Cargar comandos y handlers
const comandosPath = path.join(__dirname, 'comandos');
const handlersPath = path.join(__dirname, 'handlers');

fs.readdirSync(comandosPath).forEach(file => {
  if (file.endsWith('.js')) {
    const cmd = require(path.join(comandosPath, file));

    if (cmd.data && cmd.execute) {
      client.commands.set(cmd.data.name, cmd);
    } else if (cmd.name && cmd.execute) {
      client.commands.set(cmd.name, cmd);
    } else {
      console.warn(`⚠️ El comando ${file} no tiene data o execute, se omitirá.`);
    }
  }
});


// Registrar comandos
require('./registrarComandos');

// Exportar client y botConfig
module.exports = { client, botConfig };

// Manejo de interacciones
client.on('interactionCreate', async (interaction) => {
  // ✅ 1️⃣ Autocomplete handler
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error(`❌ Error en autocomplete de ${interaction.commandName}:`, err);
    }
    return; // 🚨 Importante: que no siga al execute
  }

  // ✅ 2️⃣ Slash command handler
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error en comando ${interaction.commandName}:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: '❌ Ocurrió un error ejecutando el comando.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: '❌ Ocurrió un error ejecutando el comando.',
          ephemeral: true,
        });
      }
    }
  }

  // ✅ 3️⃣ Botones de guía
  if (interaction.isButton()) {
    await mostrarGuiaModal(interaction);
    return; // Para que no siga a otros handlers
  }

});



// Ready
client.on('ready', async (c) => {
  console.log(`${c.user.username} is online`);

  // Mensaje de prueba
  const canalTestId = "1381716348996030575"; 
  const canal = await client.channels.fetch(canalTestId).catch(err => console.error("❌ Error al buscar el canal:", err));
  if (canal) canal.send("✅ El bot AldeanoOscar está conectado y activo.");

  // Cron jobs
  const { actualizarYPublicarRankingClan } = require('./utils/rankingClan.js');
  const { actualizarYPublicarRankingURU } = require('./utils/rankingUru.js');
  const { guardarTorneosFiltrados: guardarTorneos } = require('./utils/guardarTorneos');
  const { subirTorneos } = require('./git/subirTorneosGit.js');

  // Ranking Clan - Viernes 15:00
 cron.schedule('15 12 * * 1', () => {
  actualizarYPublicarRankingClan(client, '693245375615860838');
}, {
  timezone: "America/Montevideo"
});

  // Ranking URU - lunes 22:00
  cron.schedule('0 22 * * 1', () => {
    const rankingURU = require('./rankingConfig.json').rankingURU;
    for (const guildId of Object.keys(rankingURU)) {
      actualizarYPublicarRankingURU(client, guildId);
    }
  });

  // Guardado y subida torneos - diario a 01:50 UTC-3
  cron.schedule('37 15 * * 1', async () => await guardarTorneos(), { timezone: 'America/Montevideo' });
  cron.schedule('38 15 * * 1', async () => await subirTorneos(), { timezone: 'America/Montevideo' });

  // Actividad
  c.user.setActivity('Age of Empires II: Definitive Edition', { type: ActivityType.Playing });
});

// Bienvenida con Canvas
client.on('guildMemberAdd', async member => {
  const Canvas = require('canvas');
  const config = require('./bienvenidaConfig.json');

  const canvas = Canvas.createCanvas(1028, 468);
  const ctx = canvas.getContext('2d');

  const backgroundImages = ["./img/bg.png", "./img/bg2.png"];
  const selectedBackgroundImg = backgroundImages[Math.floor(Math.random() * backgroundImages.length)];

  const backgroundImg = await Canvas.loadImage(selectedBackgroundImg);
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);    

  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(`¡Bienvenido, ${member.user.username}!`, canvas.width / 2, 100);

  const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ size:1024, extension: "png" }));
  ctx.drawImage(avatar, 800, 130, 150, 150);

  const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), { name: 'welcome-image.png' });
  const channelId = config[member.guild.id];
  if (!channelId) return;
  const channel = member.guild.channels.cache.get(channelId);
  if (channel) await channel.send({ files: [attachment] });

  // Asignar rol automáticamente
  await member.roles.add('1392243967663542364').catch(console.error);  
});

client.login(process.env.TOKEN).catch(err => console.error("❌ Error al iniciar sesión con el bot:", err));














