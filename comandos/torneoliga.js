// comandos/torneoliga.js
const { ejecutarTorneoLiga } = require('../utils/torneoLiga.js'); 
const botConfig = require('../botConfig');

module.exports = {
  name: 'torneoliga',
  description: 'Organiza un torneo tipo liga con los participantes de una categoría.',
  options: [
    {
      name: 'categoria',
      description: 'Categoría para crear la liga',
      type: 3, // ApplicationCommandOptionType.String
      required: true,
    },
    {
      name: 'modo',
      description: 'Modo del torneo: 1 = todos contra todos, 2 = grupos + final',
      type: 4, // ApplicationCommandOptionType.Integer
      required: false,
      choices: [
        { name: 'Todos contra todos', value: 1 },
        { name: 'Grupos + Final', value: 2 },
      ],
    },
  ],
  async execute(interaction) {
    const { options, user } = interaction;
    const categoria = options.getString('categoria');
    const modo = options.getInteger('modo') || 1;

    if (user.id !== botConfig.ownerId) {
      return interaction.reply({ 
        content: '❌ Solo el organizador puede usar este comando.', 
        ephemeral: true 
      });
    }

    // Defer por si tarda
    if (interaction.isRepliable() && !interaction.deferred && !interaction.replied) {
      await interaction.deferReply();
    }

    await ejecutarTorneoLiga(interaction, categoria, modo);
  }
};
