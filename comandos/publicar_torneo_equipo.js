// comandos/publicar_torneo_equipo.js
// comandos/publicar_torneo_equipo.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../botConfig.json');
const { calcularTablaPosiciones } = require('../utils/calcularTablaPosiciones.js');
const { tablaTorneoEquipos } = require('../utils/tablaTorneoEquipos.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('publicar_torneo_equipo')
    .setDescription('Publica los grupos, resultados y tabla del torneo')
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

    try {
      // ✅ Reconocer la interacción desde el inicio
      await interaction.deferReply({ ephemeral: true });

      // Solo el organizador
      if (user.id !== botConfig.ownerId) {
        return await interaction.editReply({ content: '❌ Solo el organizador puede ejecutar este comando.' });
      }

      const serverConfig = botConfig.servidores[guildId];
      if (!serverConfig) {
        return await interaction.editReply({ content: '⚠️ Este servidor no está configurado en botConfig' });
      }

      const canalId = serverConfig[`canalTorneo_${torneoId.replace(/^torneo_/, '')}`];
      if (!canalId) {
        return await interaction.editReply({ content: `⚠️ No se encontró un canal configurado para el torneo ${torneoId}` });
      }

      const canal = await client.channels.fetch(canalId);

      // Leer archivo JSON del torneo
      const filePath = path.join(__dirname, '..', 'torneos', `${torneoId}.json`);
      if (!fs.existsSync(filePath)) {
        return await interaction.editReply({ content: `⚠️ No se encontró el archivo del torneo ${torneoId}` });
      }

      const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // 📢 Publicar grupos con resultados
      for (const grupoObj of torneo.grupos) {
        let mensaje = `📌 **${grupoObj.nombre} - ${torneo.torneo}**\n\n`;
        const ronda = torneo.rondas_grupos.find(r => r.grupo === grupoObj.nombre.slice(-1));
        if (ronda) {
          for (const rondaPartidos of ronda.partidos) {
            for (const partido of rondaPartidos.partidos) {
              const eq1 = partido.equipo1Nombre || "Desconocido";
              const eq2 = partido.equipo2Nombre || "Desconocido";
              const res = partido.resultado
                ? ` (${partido.resultado[partido.equipo1Id]} - ${partido.resultado[partido.equipo2Id]})`
                : "";
              mensaje += `🏆 ${eq1} vs ${eq2}${res}\n`;
            }
          }
        }
        await canal.send(mensaje);
      }

      // 📊 Calcular y publicar tabla de posiciones usando IDs de equipo
      const tablas = calcularTablaPosiciones(torneo);
      await tablaTorneoEquipos(client, torneo, tablas);

      // Confirmar éxito
      await interaction.editReply({ content: `✅ Torneo ${torneo.torneo} publicado correctamente.` });

    } catch (error) {
      console.error('Error al publicar torneo:', error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: '❌ Ocurrió un error ejecutando el comando.', ephemeral: true });
        } else {
          await interaction.editReply({ content: '❌ Ocurrió un error ejecutando el comando.' });
        }
      } catch (err) {
        console.error('Error enviando mensaje de fallback:', err);
      }
    }
  }
};



