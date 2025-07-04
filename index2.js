// keep_alive primero
require('./keep_alive.js');

// client Discord
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once('ready', () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

// Verificar TOKEN
if (!process.env.TOKEN || !process.env.TOKEN.includes('.')) {
  console.error('❌ TOKEN inválido o ausente. Verificá en Render.');
  process.exit(1);
}

// Login
client.login(process.env.TOKEN).catch(err => {
  console.error('❌ Error al conectar con Discord:', err);
});
