// comandos/fixture_jornada_equipo.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fixture_jornada_equipo')
    .setDescription('Muestra los partidos de una jornada o fase del torneo')
    .addStringOption(option =>
      option.setName('torneo')
        .setDescription('ID del torneo (por ejemplo: uruguay_open_cup_2v2)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('fase')
        .setDescription('Ej: A-1 para Grupo A Ronda 1, o Semifinal/Final')
        .setRequired(true)
    ),

  async execute(interaction) {
    const torneoId = interaction.options.getString('torneo');
    const faseInput = interaction.options.getString('fase');
    const filePath = path.join(__dirname, '..', 'torneos', `torneo_${torneoId}.json`);

    if (!fs.existsSync(filePath)) {
      return interaction.reply({
        content: `⚠️ No se encontró el torneo con ID **${torneoId}**.`,
        ephemeral: true
      });
    }

    const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let mensaje = '';
    let partidos = [];

    // --- Caso 1: fase tipo "A-1" (grupo A, ronda 1)
    const match = faseInput.match(/^([A-Z])-(\d+)$/i);
    if (match) {
      const grupo = match[1].toUpperCase();
      const rondaNum = parseInt(match[2]);

      const grupoData = torneo.rondas_grupos.find(g => g.grupo.toUpperCase() === grupo);
      if (grupoData) {
        const rondaData = grupoData.partidos.find(r => r.ronda === rondaNum);
        if (rondaData) {
          partidos = rondaData.partidos;
          mensaje += `📅 **Grupo ${grupo} - Ronda ${rondaNum} (${torneo.torneo})**\n\n`;
        }
      }
    }

    // --- Caso 2: fase eliminatoria (Semifinal, Final, etc.)
    if (partidos.length === 0 && torneo.eliminatorias) {
      const fase = torneo.eliminatorias.find(f => f.ronda.toLowerCase() === faseInput.toLowerCase());
      if (fase) {
        partidos = fase.partidos;
        mensaje += `📅 **${fase.ronda} - Torneo ${torneo.torneo}**\n\n`;
      }
    }

    if (partidos.length === 0) {
      return interaction.reply({
        content: `⚠️ No se encontró la jornada o fase **${faseInput}** en el torneo **${torneo.torneo}**.`,
        ephemeral: true
      });
    }

    // --- Construir mensaje
    for (const partido of partidos) {
      const eq1 = partido.equipo1Nombre || partido.equipo1 || "???";
      const eq2 = partido.equipo2Nombre || partido.equipo2 || "???";
      const res = partido.resultado
        ? ` ||${partido.resultado.equipo1 || '-'} - ${partido.resultado.equipo2 || '-'}||`
        : '';

      mensaje += `🏆 **${eq1}** vs **${eq2}**${res}\n`;
    }

    await interaction.reply({ content: mensaje, ephemeral: false });
  }
};

