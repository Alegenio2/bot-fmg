// utils/fixtureJornada.js
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

function generarEmbedJornada(jornada, participantesMap, categoria) {
  let titulo = `📅 Jornada ${jornada.ronda}`;

  // Fase especial: Semifinal o Final
  if (jornada.fase) {
    titulo = `🏆 ${jornada.fase}`;
  } else if (jornada.grupo) {
    titulo += ` - Grupo ${jornada.grupo}`;
  }

  titulo += ` - Categoría ${categoria.toUpperCase()}`;

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setColor('#facc15')
    .setDescription(
      jornada.partidos.map(p => {
        const j1 = participantesMap[p.jugador1Id];
        const j2 = participantesMap[p.jugador2Id];

        const link1 = j1?.profileId
          ? `[${j1.nombre}](https://www.aoe2companion.com/profile/${j1.profileId})`
          : j1?.nombre || 'Jugador desconocido';

        const link2 = j2?.profileId
          ? `[${j2.nombre}](https://www.aoe2companion.com/profile/${j2.profileId})`
          : j2?.nombre || 'Jugador desconocido';

        let marcador = '';
        if (p.resultado) {
          marcador = ` ||${p.resultado[p.jugador1Id]} - ${p.resultado[p.jugador2Id]}||`;
        }

        let tipoPartido = '';
        if (p.semifinal) tipoPartido = ' - 🏆 Semifinal';
        else if (p.final) tipoPartido = ' - 🏆 Final';

        return `• ${link1} vs ${link2}${marcador}${tipoPartido}`;
      }).join('\n') || 'No hay partidos en esta jornada.'
    );

  return embed;
}

module.exports = {
  name: 'fixture_jornada',
  async execute(interaction) {
    const categoria = interaction.options.getString('categoria');
    const nroJornada = interaction.options.getInteger('jornada');

    const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
    if (!fs.existsSync(filePath)) {
      return await interaction.reply({
        content: `⚠️ No se encontró la liga de categoría **${categoria}**.`,
        ephemeral: true
      });
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const participantesMap = Object.fromEntries(
      data.participantes.map(p => [p.id, p])
    );

    const jornadas = data.jornadas?.filter(j => j.ronda === nroJornada);
    if (!jornadas || jornadas.length === 0) {
      return await interaction.reply({
        content: `⚠️ No existe la jornada **${nroJornada}** en la categoría **${categoria.toUpperCase()}**.`,
        ephemeral: true
      });
    }

    const embeds = jornadas.map(j =>
      generarEmbedJornada(j, participantesMap, categoria)
    );

    await interaction.reply({ embeds });
  }
};
