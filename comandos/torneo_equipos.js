// comandos/torneo_equipos.js
const { ejecutarTorneoEquipos } = require('../utils/torneoEquipos.js');
const botConfig = require('../botConfig');

module.exports = {
  name: 'torneo_equipos',
  description: 'Organiza un torneo tipo liga entre equipos registrados.',
  options: [
    {
      name: 'torneo',
      description: 'Nombre del torneo o categoría (ej: uruguay_open_2v2)',
      type: 3, // String
      required: true,
    },
    {
      name: 'modo',
      description: 'Modo del torneo: 1 = todos contra todos, 2 = grupos + final',
      type: 4, // Integer
      required: false,
      choices: [
        { name: 'Todos contra todos', value: 1 },
        { name: 'Grupos + Final', value: 2 },
      ],
    },
  ],
  async execute(interaction) {
    const { options, user } = interaction;
    const torneo = options.getString('torneo');
    const modo = options.getInteger('modo') || 1;

    if (user.id !== botConfig.ownerId) {
      return interaction.reply({
        content: '❌ Solo el organizador puede usar este comando.',
        ephemeral: true,
      });
    }

    // Defer por si tarda
    if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    await ejecutarTorneoEquipos(interaction, torneo, modo);
  },
};
