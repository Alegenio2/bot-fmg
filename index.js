// index.js
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
const comandosPath = path.join(__dirname, 'comandos');
const comandoArchivos = fs.readdirSync(comandosPath).filter(file => file.endsWith('.js'));

for (const archivo of comandoArchivos) {
  const comando = require(path.join(comandosPath, archivo));
  if ('data' in comando && 'execute' in comando) {
    client.commands.set(comando.data.name, comando);
  } else {
    console.warn(`⚠️ El comando en ${archivo} no tiene las propiedades necesarias.`);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
  await registrarComandos();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const comando = client.commands.get(interaction.commandName);
  if (!comando) return;

  try {
    await comando.execute(interaction, client);
  } catch (error) {
    console.error(`❌ Error ejecutando el comando ${interaction.commandName}:`, error);
    await interaction.reply({
      content: 'Hubo un error ejecutando este comando 😢',
      ephemeral: true,
    });
  }
});

async function registrarComandos() {
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;
  const token = process.env.TOKEN;

  const rest = new REST({ version: '10' }).setToken(token);

  const comandos = client.commands.map(cmd => cmd.data.toJSON());

  console.log('📋 Iniciando registro de comandos...');
  console.log('📦 Comandos encontrados:', comandos.map(c => c.name).join(', '));

  for (const comando of comandos) {
    console.log(`\n📤 Registrando comando: ${comando.name}...`);
    try {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: [comando] }
      );
      console.log(`✅ Registrado correctamente: ${comando.name}`);
    } catch (err) {
      console.error(`❌ Error registrando ${comando.name}:`, err.rawError?.errors || err.message);
    }
  }

  console.log('\n✅ Todos los comandos procesados.');
}

client.login(process.env.TOKEN);
