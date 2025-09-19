require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const config = require("./botConfig.json");

console.log("🚀 Ejecutando registro de comandos...");
console.log("📦 Token:", process.env.TOKEN?.slice(0, 5) + "...");
console.log("🆔 Client ID:", process.env.CLIENT_ID);

// Cargar todos los comandos desde /comandos
const comandos = [];
const comandosPath = path.join(__dirname, "comandos");
const files = fs.readdirSync(comandosPath).filter((file) => file.endsWith(".js"));

for (const file of files) {
  const comando = require(path.join(comandosPath, file));

  if (comando.data && typeof comando.data.toJSON === "function") {
    // Comando moderno con SlashCommandBuilder
    comandos.push(comando.data.toJSON());
  } else if (comando.name && comando.description) {
    // Comando antiguo con name, description, options
    comandos.push({
      name: comando.name,
      description: comando.description,
      options: comando.options || []
    });
  } else {
    console.warn(`⚠️ El comando ${file} no tiene data ni name/description y se omitirá.`);
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    const servidores = Object.keys(config.servidores);

    for (const guildId of servidores) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: comandos }
      );
      console.log(`✅ Comandos registrados en guild ${guildId}`);
    }

    // Limpia los comandos globales (opcional)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("🧹 Comandos globales eliminados");

    // Verificación de comandos cargados en cada servidor
    for (const guildId of servidores) {
      const comandosRegistrados = await rest.get(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
      );
      console.log(`📋 Comandos en ${guildId}:`);
      comandosRegistrados.forEach((cmd) => {
        console.log(`- ${cmd.name}`);
      });
    }
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
})();
