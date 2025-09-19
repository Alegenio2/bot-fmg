// comandos/listar_encuentros.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'listar_encuentros',
  description: 'Lista los cruces de la liga de una categoría.',
  options: [
    {
      name: 'categoria',
      description: 'Letra de la categoría',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'Campeón', value: 'a' },
        { name: 'Mandoble', value: 'b' },
        { name: 'Espada Larga', value: 'c' },
        { name: 'Hombre de Armas', value: 'd' },
        { name: 'Milicia', value: 'e' },
      ],
    },
  ],

  execute(interaction) {
    const { options } = interaction;
    const categoria = options.getString('categoria');
    const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);

    if (!fs.existsSync(filePath)) {
      return interaction.reply({
        content: `⚠️ No existe una liga para la categoría **${categoria.toUpperCase()}**.`,
        ephemeral: true
      });
    }

    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const mapaParticipantes = {};
    const todosLosParticipantes = liga.participantes || [];

    if (liga.grupos) {
      for (const grupo of Object.values(liga.grupos)) {
        grupo.forEach(p => {
          mapaParticipantes[p.id] = p.nombre;
        });
      }
    } else {
      todosLosParticipantes.forEach(p => {
        mapaParticipantes[p.id] = p.nombre;
      });
    }

    const encuentrosPorJornada = liga.jornadas.map((jornada, index) => {
      const encuentros = jornada.partidos.map((partido, i) => {
        const nombre1 = mapaParticipantes[partido.jugador1Id] || `Jugador ${i * 2 + 1}`;
        const nombre2 = mapaParticipantes[partido.jugador2Id] || `Jugador ${i * 2 + 2}`;

        let resultado;
        if (partido.resultado) {
          const r = partido.resultado;
          const j1 = r[partido.jugador1Id] ?? '?';
          const j2 = r[partido.jugador2Id] ?? '?';
          resultado = `✅ ${j1} - ${j2}`;
        } else if (partido.fecha && partido.horario) {
          resultado = `🗓 Coordinado: ${partido.fecha} (${partido.diaSemana}) a las ${partido.horario}hs ${partido.gmt || ''}`;
        } else {
          resultado = '🕓 Pendiente';
        }

        return `  ${i + 1}. ${nombre1} vs ${nombre2} → ${resultado}`;
      });

      // Título de la jornada con fase, semi o final si aplica
      const titulo = jornada.fase
        ? `🏆 **${jornada.fase}**` // fase puede ser "Semi Final", "Final", etc.
        : jornada.grupo
        ? `🔸 **Grupo ${jornada.grupo.toUpperCase()} - Jornada ${jornada.ronda || index + 1}**`
        : `🔹 **Jornada ${jornada.ronda || index + 1}**`;

      return `${titulo}\n${encuentros.join('\n')}`;
    });

    const respuesta = `📋 **Encuentros de la Liga ${categoria.toUpperCase()}**\n\n${encuentrosPorJornada.join('\n\n')}`;
    return interaction.reply({ content: respuesta.slice(0, 2000), ephemeral: true });
  }
};
