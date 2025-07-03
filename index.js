require('dotenv').config();
const keep_alive = require("./keep_alive.js")
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.login(process.env.TOKEN).catch(err => {
  console.error('❌ Error al iniciar sesión con el bot:', err);
});
