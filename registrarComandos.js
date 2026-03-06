const { REST, Routes } = require("discord.js");
const config = require("./botConfig.json");

// Exportamos una función para que index.js la controle
const registrarComandos = async (comandos) => {
    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    const servidores = Object.keys(config.servidores);

    try {
        console.log(`⏳ Iniciando registro en ${servidores.length} servidores...`);

        // Usamos Promise.all para que se registren en paralelo y no uno tras otro (más rápido)
        await Promise.all(servidores.map(guildId => 
            rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: comandos }
            ).then(() => console.log(`✅ Comandos actualizados en: ${guildId}`))
        ));

        // Solo limpia globales si realmente es necesario, si no, quita esta línea:
        // await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        
        console.log("🚀 Proceso de registro finalizado.");
    } catch (error) {
        console.error("❌ Error al registrar comandos:", error);
    }
};

module.exports = registrarComandos;

