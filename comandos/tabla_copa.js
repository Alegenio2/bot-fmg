const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tabla_copa')
    .setDescription('Muestra la tabla de posiciones de la Copa Uruguaya 2026'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const tablas = await obtenerEstadisticasCopa();

      const embed = new EmbedBuilder()
        .setTitle('🏆 POSICIONES - COPA URUGUAYA 2026')
        .setColor('#0099ff')
        .setTimestamp();

      for (const [letra, jugadores] of Object.entries(tablas)) {
        let tablaTexto = "```md\n| Pos | Jugador           | Pts | PJ | Dif |\n|-----|-------------------|-----|----|-----|\n";
        
        jugadores.forEach((j, index) => {
          const pos = (index + 1).toString().padStart(2, ' ');
          const nick = j.nick.substring(0, 15).padEnd(17, ' ');
          const pts = j.pts.toString().padStart(3, ' ');
          const pj = j.pj.toString().padStart(2, ' ');
          const diff = (j.sf - j.sc).toString().padStart(3, ' ');
          
          tablaTexto += `| ${pos}  | ${nick} | ${pts} | ${pj} | ${diff} |\n`;
        });

        tablaTexto += "```";
        embed.addFields({ name: `📍 GRUPO ${letra}`, value: tablaTexto });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Error al generar la tabla. Asegúrate de que haya resultados registrados.");
    }
  }
};