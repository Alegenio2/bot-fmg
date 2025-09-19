// comandos/progreso_liga.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require("fs");
const path = require("path");
const botConfig = require("../botConfig");

module.exports = {
  name: 'progreso_liga',
  description: 'Muestra el progreso de partidos jugados en una división o en todo el torneo.',
  options: [
    {
      name: 'division',
      description: 'Selecciona una división (opcional)',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: 'a_campeon', value: 'categoria_a' },
        { name: 'b_mandoble', value: 'categoria_b' },
        { name: 'c_espada_larga', value: 'categoria_c' },
        { name: 'd_hombre_de_armas', value: 'categoria_d' },
        { name: 'e_milicia', value: 'categoria_e' },
      ],
    },
  ],

  async execute(interaction) {
    await interaction.deferReply();

    if (interaction.user.id !== botConfig.ownerId) {
      return interaction.editReply({
        content: '❌ Solo el organizador puede usar este comando.',
        ephemeral: true
      });
    }

    const divisionElegida = interaction.options.getString("division");

    const divisiones = [
      { codigo: "categoria_a", letra: "a" },
      { codigo: "categoria_b", letra: "b" },
      { codigo: "categoria_c", letra: "c" },
      { codigo: "categoria_d", letra: "d" },
      { codigo: "categoria_e", letra: "e" },
    ];

    const divisionesAProcesar = divisionElegida
      ? divisiones.filter(d => d.codigo === divisionElegida)
      : divisiones;

    let resumenFinal = divisionElegida
      ? `📊 **Progreso de la división ${divisionElegida}**\n\n`
      : `📊 **Progreso General de todas las divisiones**\n\n`;

    for (const division of divisionesAProcesar) {
      const filePath = path.join(__dirname, "..", "ligas", `liga_${division.letra}.json`);
      if (!fs.existsSync(filePath)) {
        resumenFinal += `❌ División **${division.codigo}**: No encontrada\n\n`;
        continue;
      }

      try {
        const liga = JSON.parse(fs.readFileSync(filePath, "utf8"));
        let totalPartidos = 0;
        let partidosJugados = 0;

        for (const jornada of liga.jornadas) {
          totalPartidos += jornada.partidos.length;
          partidosJugados += jornada.partidos.filter(p => p.resultado).length;
        }

        const porcentaje = totalPartidos ? Math.round((partidosJugados / totalPartidos) * 100) : 0;
        const emoji = porcentaje === 100 ? "✅" : porcentaje >= 50 ? "🟢" : porcentaje > 0 ? "🟡" : "🔴";

        resumenFinal += `${emoji} **${division.codigo}**: ${partidosJugados} / ${totalPartidos} (${porcentaje}%)\n`;

      } catch (error) {
        console.warn(`⚠️ Error en ${division.codigo}:`, error.message);
        resumenFinal += `⚠️ Error al leer **${division.codigo}**\n`;
      }
    }

    await interaction.editReply({ content: resumenFinal });
  }
};
