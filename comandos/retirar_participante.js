// comandos/retirar_participante.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { guardarLiga } = require('../utils/guardarLiga.js');
const { actualizarTablaEnCanal } = require('../utils/tablaPosiciones.js');
const botConfig = require('../botConfig.json');

module.exports = {
  name: 'retirar_participante',
  description: 'Retira a un participante y da 2-0 a sus rivales en los partidos pendientes',
  options: [
    {
      name: 'division',
      description: 'División de la liga',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'Campeón', value: 'categoria_a' },
        { name: 'Mandoble', value: 'categoria_b' },
        { name: 'Espada Larga', value: 'categoria_c' },
        { name: 'Hombre de Armas', value: 'categoria_d' },
        { name: 'Milicia', value: 'categoria_e' },
      ],
    },
    {
      name: 'participante',
      description: 'Nombre del participante a retirar',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!botConfig.directivos.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ Solo la comisión puede usar este comando.' });
    }

    const division = interaction.options.getString('division');
    const participanteNombre = interaction.options.getString('participante');
    const letraDivision = division.split('_')[1];

    const filePath = path.join(__dirname, '..', 'ligas', `liga_${letraDivision}.json`);
    if (!fs.existsSync(filePath)) {
      return interaction.editReply(`⚠️ No se encontró la liga para la división ${division}.`);
    }

    try {
      const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Mapa de participantes incluyendo grupos para semis/final
      const mapaParticipantes = {};
      if (liga.participantes) {
        liga.participantes.forEach(p => mapaParticipantes[p.nombre] = p.id);
      }
      if (liga.grupos) {
        Object.values(liga.grupos).forEach(grupo => grupo.forEach(p => mapaParticipantes[p.nombre] = p.id));
      }

      const participanteId = mapaParticipantes[participanteNombre];
      if (!participanteId) {
        return interaction.editReply(`⚠️ No se encontró el participante **${participanteNombre}** en la liga.`);
      }

      let partidosActualizados = 0;

      liga.jornadas.forEach(jornada => {
        jornada.partidos.forEach(partido => {
          const j1 = partido.jugador1Id;
          const j2 = partido.jugador2Id;

          if ((j1 === participanteId || j2 === participanteId) && !partido.resultado) {
            const rivalId = j1 === participanteId ? j2 : j1;
            partido.resultado = {
              [rivalId]: 2,
              [participanteId]: 0,
              fecha: new Date().toISOString(),
            };
            partidosActualizados++;
          }
        });
      });

      if (partidosActualizados === 0) {
        return interaction.editReply(`⚠️ No hay partidos pendientes para **${participanteNombre}**.`);
      }

      await guardarLiga(liga, filePath, letraDivision, interaction);
      await actualizarTablaEnCanal(letraDivision, interaction.client, interaction.guildId);

      return interaction.editReply(`✅ Se retiró a **${participanteNombre}**. Se actualizaron ${partidosActualizados} partidos.`);
    } catch (error) {
      console.error(error);
      return interaction.editReply('❌ Ocurrió un error al procesar el retiro.');
    }
  },
};
