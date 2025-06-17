require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./botConfig.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once('ready', async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  const servidores = Object.entries(config.servidores);

  for (const [guildId, configServidor] of servidores) {
    const guild = await client.guilds.fetch(guildId);
    await guild.members.fetch(); // asegura obtener todos los miembros

    const categoriaRoles = {
      a: configServidor.categoriaA,
      b: configServidor.categoriaB,
      c: configServidor.categoriaC,
      d: configServidor.categoriaD,
      e: configServidor.categoriaE
    };

    for (const [letra, roleId] of Object.entries(categoriaRoles)) {
      if (!roleId) continue;

      const miembrosConRol = guild.members.cache.filter(m => m.roles.cache.has(roleId));
      const jugadores = miembrosConRol.map(m => ({
        id: m.id,
        nombre: m.user.username
      }));

      const carpeta = path.join(__dirname, 'categorias');
      if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

      const savePath = path.join(carpeta, `categoria_${letra}.json`);
      fs.writeFileSync(savePath, JSON.stringify(jugadores, null, 2), 'utf8');
      console.log(`📂 Actualizado categoria_${letra}.json con ${jugadores.length} jugadores.`);
    }
  }

   client.destroy();
});

client.login(process.env.TOKEN);

