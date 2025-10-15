// comandos/publicar_torneo_equipo.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../botConfig.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('publicar_torneo_equipo')
    .setDescription('Publica los grupos y eliminatorias de un torneo de equipos')
    .addStringOption(option =>
      option.setName('torneo_id')
        .setDescription('ID del torneo a publicar')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const torneosPath = path.join(__dirname, '..', 'torneos');
    const files = fs.readdirSync(torneosPath).filter(f => f.endsWith('.json'));
    const torneos = files.map(f => f.replace('.json', ''));
    const filtered = torneos.filter(t => t.toLowerCase().includes(focusedValue.toLowerCase()));
    await interaction.respond(filtered.map(t => ({ name: t, value: t })));
  },

  async execute(interaction) {
    const { options, user, guildId, client } = interaction;
    const torneoId = options.getString('torneo_id');

    if (user.id !== botConfig.ownerId) {
      return interaction.reply({ content: '❌ Solo el organizador puede ejecutar este comando.', ephemeral: true });
    }

    const serverConfig = botConfig.servidores[guildId];
    if (!serverConfig) {
      return interaction.reply({ content: '⚠️ Este servidor no está configurado en botConfig', ephemeral: true });
    }

    const canalId = serverConfig[`canalTorneo_${torneoId.replace(/^torneo_/, '')}`];
    if (!canalId) {
      return interaction.reply({ content: `⚠️ No se encontró un canal configurado para el torneo ${torneoId}`, ephemeral: true });
    }

    const canal = await client.channels.fetch(canalId);

    try {
      const filePath = path.join(__dirname, '..', 'torneos', `${torneoId}.json`);
      if (!fs.existsSync(filePath)) {
        return interaction.reply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}`, ephemeral: true });
      }

      const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // ✅ DeferReply para evitar "Unknown interaction"
      await interaction.deferReply({ ephemeral: true });

      // PUBLICAR GRUPOS (visibles para todos)
      for (const grupoObj of torneo.grupos) {
        let mensaje = `📌 **${grupoObj.nombre} - Torneo ${torneo.torneo}**\n\n`;
        const ronda = torneo.rondas_grupos.find(r => r.grupo === grupoObj.nombre.slice(-1));
        if (ronda) {
          for (const rondaPartidos of ronda.partidos) {
            for (const partido of rondaPartidos.partidos) {
              const eq1 = partido.equipo1Nombre || "Desconocido";
              const eq2 = partido.equipo2Nombre || "Desconocido";
              mensaje += `🏆 ${eq1} vs ${eq2}\n`;
            }
          }
        }
        await canal.send(mensaje);
      }

      // PUBLICAR ELIMINATORIAS (visibles para todos)
      if (torneo.eliminatorias && torneo.eliminatorias.length > 0) {
        for (const fase of torneo.eliminatorias) {
          let mensaje = `🏁 **${fase.ronda} - Torneo ${torneo.torneo}**\n\n`;
          for (const partido of fase.partidos) {
            const eq1 = partido.equipo1Nombre || "Desconocido";
            const eq2 = partido.equipo2Nombre || "Desconocido";
            mensaje += `🏆 ${eq1} vs ${eq2}\n`;
          }
          await canal.send(mensaje);
        }
      }

      // Confirmación al organizador (ephemeral)
      await interaction.editReply({ content: `✅ Torneo ${torneo.torneo} publicado correctamente.` });

    } catch (error) {
      console.error('Error al publicar torneo:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Ocurrió un error ejecutando el comando.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Ocurrió un error ejecutando el comando.', ephemeral: true });
      }
    }
  }
};
