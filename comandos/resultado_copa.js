const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const { createWriteStream, existsSync, mkdirSync } = require('fs');
const path = require('path');
const axios = require('axios');
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");
const { publicarTablaCopa } = require('../utils/actualizarTablaCopa');

// Función para evitar el error de URL inválida
function asegurarHttps(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
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
    const j1 = interaction.options.getUser('jugador');
    const j2 = interaction.options.getUser('rival');
    const p1 = interaction.options.getInteger('puntos_j1');
    const p2 = interaction.options.getInteger('puntos_j2');
    const attachment = interaction.options.getAttachment('recs');
    
    // Validamos y formateamos los links de los usuarios
    const linkMapas = asegurarHttps(interaction.options.getString('mapas'));
    const linkCivs = asegurarHttps(interaction.options.getString('civs'));

    if (j1.id === j2.id) return interaction.reply({ content: "❌ Error: mismo jugador.", ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    const filePath = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
    const recsFolder = path.join(__dirname, '..', 'recs_descargados');

    if (!existsSync(recsFolder)) mkdirSync(recsFolder, { recursive: true });

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const torneo = JSON.parse(data);
      let partidoEncontrado = false;
      let infoExtra = { grupo: "", ronda: "" };

      for (const grupoObj of torneo.rondas_grupos) {
        for (const rondaObj of grupoObj.partidos) {
          for (const partido of rondaObj.partidos) {
            if ((partido.jugador1Id === j1.id && partido.jugador2Id === j2.id) ||
                (partido.jugador1Id === j2.id && partido.jugador2Id === j1.id)) {

              // Descarga Local (Backup)
              const nombreArchivo = `Copa26_G${grupoObj.grupo}_R${rondaObj.ronda}_${j1.username}_vs_${j2.username}_${attachment.name}`;
              const rutaLocalRec = path.join(recsFolder, nombreArchivo);
              
              try {
                const response = await axios({ method: 'GET', url: attachment.url, responseType: 'stream' });
                const writer = createWriteStream(rutaLocalRec);
                response.data.pipe(writer);
              } catch (e) { console.error("Error bajando rec:", e); }

              // Actualizar JSON
              partido.resultado = {
                [j1.id]: p1,
                [j2.id]: p2,
                mapas: linkMapas,
                civs: linkCivs,
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

      if (!partidoEncontrado) return interaction.editReply({ content: `⚠️ Partido no encontrado.` });

      await fs.writeFile(filePath, JSON.stringify(torneo, null, 2), 'utf8');
      await subirTodosLosTorneos();
// Actualizar la tabla en el canal fijo
await publicarTablaCopa(interaction.client);
      // CREACIÓN DE BOTONES CON LINKS VALIDADOS
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Descargar RECS')
          .setStyle(ButtonStyle.Link)
          .setURL(attachment.url),
        new ButtonBuilder()
          .setLabel('Mapa Draft')
          .setStyle(ButtonStyle.Link)
          .setURL(linkMapas),
        new ButtonBuilder()
          .setLabel('Civ Draft')
          .setStyle(ButtonStyle.Link)
          .setURL(linkCivs)
      );

      await interaction.editReply({ content: "✅ Resultado procesado exitosamente." });
      
// Determinamos quién ganó para poner la corona (dentro del spoiler)
      const ganador = p1 > p2 ? j1 : (p2 > p1 ? j2 : null);
      const marcador = `|| ${j1.username} ${p1} - ${p2} ${j2.username} ${ganador ? '' : '🏆'} ||`;

      await interaction.followUp({
       content: `📢 **RESULTADO REGISTRADO**\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `🏆 **Copa 2026** | **Grupo ${infoExtra.grupo}** - Ronda ${infoExtra.ronda}\n\n` +
                 `⚔️ **Duelo:** ${j1.username} **vs** ${j2.username}\n` +
                 `📊 **Resultado:** ${marcador}\n\n` +
                 `*Haz clic en el cuadro oscuro para ver quién ganó.*\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━`,
        components: [row],
        ephemeral: false
      });

    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: "❌ Error interno. Revisa que los links sean válidos." });
    }
  }
};