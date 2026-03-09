require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, AttachmentBuilder, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const cron = require('node-cron');
const botConfig = require('./botConfig.json');
const { mostrarGuiaModal } = require('./utils/guias_interaccion.js');
require('./web.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ] 
});

client.commands = new Collection();

// Cargar comandos
const comandosPath = path.join(__dirname, 'comandos');
fs.readdirSync(comandosPath).forEach(file => {
  if (file.endsWith('.js')) {
    const cmd = require(path.join(comandosPath, file));
    if (cmd.data && cmd.execute) {
      client.commands.set(cmd.data.name, cmd);
    } else if (cmd.name && cmd.execute) {
      client.commands.set(cmd.name, cmd);
    }
  }
});

require('./registrarComandos');

module.exports = { client, botConfig };

// --- MANEJO DE INTERACCIONES ---
client.on('interactionCreate', async (interaction) => {
  
  // 1️⃣ Autocomplete
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (command?.autocomplete) await command.autocomplete(interaction);
    return;
  }

  // 2️⃣ Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      const reply = { content: '❌ Error ejecutando el comando.', ephemeral: true };
      interaction.deferred || interaction.replied ? await interaction.followUp(reply) : await interaction.reply(reply);
    }
  }

  // 3️⃣ Botones
  if (interaction.isButton()) {
    // Si es el botón de bienvenida
    if (interaction.customId === 'abrir_modal_vincular') {
      const modal = new ModalBuilder()
        .setCustomId('modal_vincular_aoe2')
        .setTitle('Vincular Cuenta AoE2');

      const urlInput = new TextInputBuilder()
        .setCustomId('aoe2_url_input')
        .setLabel("URL de tu perfil de AoE2 Companion")
        .setPlaceholder("https://www.aoe2companion.com/players/2583756566")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
      return await interaction.showModal(modal);
    }
    
    // Otros botones (Guías)
    await mostrarGuiaModal(interaction);
  }

  // 4️⃣ Envío de Modales (Procesar la vinculación)
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modal_vincular_aoe2') {
      const urlCompleta = interaction.fields.getTextInputValue('aoe2_url_input');
      const ROL_ACCESO_ID = '1377760878807613520';

      await interaction.deferReply({ ephemeral: true });

      const match = urlCompleta.match(/^https:\/\/(www\.)?aoe2companion\.com\/players\/(\d+)$/);
      if (!match) {
        return interaction.editReply({ content: "❌ URL no válida. Debe ser el link de tu perfil." });
      }

      const profileId = match[2];
      const { obtenerEloActual } = require('./utils/elo');
      const { asociarUsuario } = require('./utils/asociar');
      
      const datos = await obtenerEloActual(profileId);
      if (!datos) return interaction.editReply({ content: "❌ No se encontró el perfil." });

      asociarUsuario(interaction.user.id, {
        profileId, nombre: datos.nombre, elo: datos.elo, pais: datos.pais
      });

      try {
        const role = interaction.guild.roles.cache.get(ROL_ACCESO_ID);
        if (role) await interaction.member.roles.add(role);
      } catch (e) { console.error("Error rol:", e); }

      await interaction.editReply({ content: `✅ ¡Vinculado como **${datos.nombre}**! Acceso concedido.` });
    }
  }
});

// --- READY EVENT ---
client.on('ready', async (c) => {
  console.log(`🤖 ${c.user.username} online`);
  c.user.setActivity('Age of Empires II', { type: ActivityType.Playing });
});

// --- BIENVENIDA CON BOTÓN ---
client.on('guildMemberAdd', async member => {
  const config = require('./bienvenidaConfig.json');
  const channelId = config[member.guild.id];
  if (!channelId) return;

  try {
    const canvas = createCanvas(1028, 468);
    const ctx = canvas.getContext('2d');
    const backgroundImages = ["./img/bg.png", "./img/bg2.png"];
    const backgroundImg = await loadImage(path.resolve(backgroundImages[Math.floor(Math.random() * backgroundImages.length)]));
    
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 45px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`¡Bienvenido, ${member.user.username}!`, canvas.width / 2, 100);

    const avatar = await loadImage(member.user.displayAvatarURL({ size: 1024, extension: "png" }));
    ctx.drawImage(avatar, 800, 130, 150, 150);

    const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'welcome.png' });
    
    // Fila con el botón
    const row = new ActionRowBuilder().addComponents(
       new ButtonBuilder()
        .setLabel('1. Buscar mi Perfil')
        .setStyle(ButtonStyle.Link) // Estilo Link para salir a la web
        .setURL('https://www.aoe2companion.com/'),
      new ButtonBuilder()
        .setCustomId('abrir_modal_vincular')
        .setLabel('Vincular Perfil y Entrar')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛡️')
    );

    const channel = member.guild.channels.cache.get(channelId) || await member.guild.channels.fetch(channelId).catch(() => null);
    if (channel) {
      await channel.send({ 
        content: `¡Hola ${member}! 🏰 Bienvenido a la comunidad.🛡️ \nPara acceder a todos los canales vincula tu cuenta con el botón de abajo.`, 
        files: [attachment],
        components: [row]
      });
    }
  } catch (error) { console.error("Error bienvenida:", error); }
});

client.login(process.env.TOKEN);

























