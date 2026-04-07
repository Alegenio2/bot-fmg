const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const { createWriteStream, existsSync, mkdirSync } = require('fs');
const path = require('path');
const axios = require('axios');
const { subirTodosLosTorneos }        = require("../git/guardarTorneosGit");
const { publicarTablaCopa }           = require('../utils/actualizarTablaCopa');
const { obtenerUsuario }              = require('../utils/asociar');
const { buscarEstadisticasEncuentro } = require('../utils/aoe2stats');
const { acumularStats }               = require('../utils/statsEngine');
const { publicarStatsEncuentro }      = require('../utils/publicarStatsEncuentro');

function asegurarHttps(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `https://${url}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resultado_copa')
    .setDescription('Registra el resultado y permite descargar los RECS')
    .addUserOption(opt => opt.setName('jugador').setDescription('Primer jugador').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_j1').setDescription('Sets J1').setRequired(true))
    .addUserOption(opt => opt.setName('rival').setDescription('Segundo jugador').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_j2').setDescription('Sets J2').setRequired(true))
    .addStringOption(opt => opt.setName('mapas').setDescription('Link Draft Mapas').setRequired(true))
    .addStringOption(opt => opt.setName('civs').setDescription('Link Draft Civs').setRequired(true))
    .addAttachmentOption(opt => opt.setName('recs').setDescription('Archivo con las grabaciones').setRequired(true)),

  async execute(interaction) {
    const j1         = interaction.options.getUser('jugador');
    const j2         = interaction.options.getUser('rival');
    const p1         = interaction.options.getInteger('puntos_j1');
    const p2         = interaction.options.getInteger('puntos_j2');
    const attachment = interaction.options.getAttachment('recs');
    const linkMapas  = asegurarHttps(interaction.options.getString('mapas'));
    const linkCivs   = asegurarHttps(interaction.options.getString('civs'));

    if (j1.id === j2.id) return interaction.reply({ content: "❌ Error: mismo jugador.", ephemeral: true });

    await interaction.deferReply({ ephemeral: false });

    const filePath   = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
    const recsFolder = path.join(__dirname, '..', 'recs_descargados');
    if (!existsSync(recsFolder)) mkdirSync(recsFolder, { recursive: true });

    try {
      const data   = await fs.readFile(filePath, 'utf8');
      const torneo = JSON.parse(data);
      let partidoEncontrado = false;
      let infoExtra = { grupo: "", ronda: "" };

      for (const grupoObj of torneo.rondas_grupos) {
        for (const rondaObj of grupoObj.partidos) {
          for (const partido of rondaObj.partidos) {
            if (
              (partido.jugador1Id === j1.id && partido.jugador2Id === j2.id) ||
              (partido.jugador1Id === j2.id && partido.jugador2Id === j1.id)
            ) {
              partido.resultado = {
                [j1.id]: p1,
                [j2.id]: p2,
                mapas: linkMapas,
                civs:  linkCivs,
                recs_url: attachment.url,
                fecha_registro: new Date().toISOString()
              };
              partidoEncontrado = true;
              infoExtra = { grupo: grupoObj.grupo, ronda: rondaObj.ronda };
              break;
            }
          }
          if (partidoEncontrado) break;
        }
        if (partidoEncontrado) break;
      }

      if (!partidoEncontrado) return interaction.editReply({ content: `⚠️ Partido no encontrado en el torneo.` });

      await fs.writeFile(filePath, JSON.stringify(torneo, null, 2), 'utf8');

      const datosJ1  = obtenerUsuario(j1.id);
      const datosJ2  = obtenerUsuario(j2.id);
      const nombreJ1 = datosJ1 ? datosJ1.nombre : j1.username;
      const nombreJ2 = datosJ2 ? datosJ2.nombre : j2.username;
      const marcador = `|| ${nombreJ1} ${p1} - ${p2} ${nombreJ2} ||`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Descargar RECS').setStyle(ButtonStyle.Link).setURL(attachment.url),
        new ButtonBuilder().setLabel('Mapa Draft').setStyle(ButtonStyle.Link).setURL(linkMapas),
        new ButtonBuilder().setLabel('Civ Draft').setStyle(ButtonStyle.Link).setURL(linkCivs)
      );

      await interaction.editReply({
        content: `📢 **RESULTADO REGISTRADO**\n` +
             `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
             `🏆 **Copa 2026** | **Grupo ${infoExtra.grupo}** - Ronda ${infoExtra.ronda}\n\n` +
             `⚔️ **Duelo:** ${nombreJ1} **vs** ${nombreJ2}\n` +
             `📊 **Resultado:** ${marcador}\n\n` +
              `*Haz clic en el cuadro oscuro para ver quién ganó.*`,
        components: [row]
      });

      // ── Tareas en segundo plano ───────────────────────────────────────────
      (async () => {
        try {

          // 1. Descargar REC
          const nombreArchivo = `Copa26_G${infoExtra.grupo}_R${infoExtra.ronda}_${j1.username}_vs_${j2.username}_${attachment.name}`;
          const rutaLocalRec  = path.join(recsFolder, nombreArchivo);
          const resp = await axios({ method: 'GET', url: attachment.url, responseType: 'stream' });
          resp.data.pipe(createWriteStream(rutaLocalRec));

          // 2. Buscar partidas en aoe2companion
          const totalPartidas = p1 + p2;
          console.log(`🔍 Buscando ${totalPartidas} partidas: ${nombreJ1} vs ${nombreJ2}`);

          const encuentro = await buscarEstadisticasEncuentro(torneo, j1.id, j2.id, totalPartidas);

          if (encuentro) {
            // 3. Acumular en stats_copa_2026.json
            acumularStats(encuentro, infoExtra.grupo, infoExtra.ronda);
            console.log(`✅ stats_copa_2026.json actualizado`);
          } else {
            console.warn(`⚠️ No se encontraron partidas en aoe2companion`);
          }

          // 4. Subir todo a GitHub (incluye stats_copa_2026.json)
          await subirTodosLosTorneos();

        // 5. Publicar tabla de posiciones 
// SE COMENTA PARA EVITAR SPOILERS EN DISCORD
// await publicarTablaCopa(interaction.client);

// 6. Publicar embed con civs y mapas
// SE COMENTA PARA EVITAR SPOILERS EN DISCORD
/* if (encuentro) {
  await publicarStatsEncuentro(
    interaction.client,
    encuentro,
    p1, p2,
    infoExtra.grupo,
    infoExtra.ronda
  );
} 
*/

console.log(`✅ Resultado de ${infoExtra.grupo} procesado silenciosamente.`);

        } catch (err) {
          console.error("❌ Error en tareas de fondo:", err);
        }
      })();

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ Error interno al registrar el resultado." });
    }
  }
};





