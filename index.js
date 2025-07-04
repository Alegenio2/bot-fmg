//require('dotenv').config();
require("./keep_alive.js");
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

if (!process.env.TOKEN) {
  console.error("❌ No se encontró TOKEN en las variables de entorno");
  process.exit(1);
}

client.login(process.env.TOKEN).catch(err => {
  console.error("❌ Error al conectar con Discord:", err);
});
