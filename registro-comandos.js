require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js")

const comandos = [
  {
    name: 'resultado',
    description: 'Registra el resultado de una partida.',
    options: [
      {
        name: 'division',
        description: 'La división en la que se jugó la partida.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'ronda',
        description: 'La ronda en el que se jugó la partida.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'fecha',
        description: 'La fecha en la que se jugó la partida.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'jugador',
        description: 'El nombre del jugador.',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'puntosjugador',
        description: 'Los puntos del jugador.',
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: 'otrojugador',
        description: 'El nombre del otro jugador.',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'puntosotrojugador',
        description: 'Los puntos del otro jugador.',
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: 'draftmapas',
        description: 'El draft de mapas utilizado.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'draftcivis',
        description: 'El draft de civilizaciones utilizado.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'partidas',
        description: 'El número de partidas jugadas.',
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: 'archivo',
        description: 'Adjunta un archivo con detalles adicionales.',
        type: ApplicationCommandOptionType.Attachment,
        required: true,
      },
    ],
  },
  {
    name: 'coordinado',
    description: 'Fecha del encuentro.',
    options: [
      {
        name: 'division',
        description: 'Division en la que juegas.',
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: 'max1700',
            value: '1700',
          },
          {
            name: 'max1600',
            value: '1600',
          },
          {
            name: 'max1500',
            value: '1500',
          },
        ],
        required: true,
      },
      {
        name: 'ronda',
        description: 'Ronda que juegas',
        type: ApplicationCommandOptionType.Number,
        choices: [
          {
            name: '1ronda',
            value: '1',
          },
          {
            name: '2ronda',
            value: '2',
          },
          {
            name: '3ronda',
            value: '3',
          },
          {
            name: 'cuartos',
            value: '3',
          },
          {
            name: 'semi',
            value: '3',
          },
        ],
        required: true,
      },
      {
        name: 'fecha',
        description: 'Ingrese la fecha en formato DD-MM-YYYY.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'jugador',
        description: 'Tu nombre ',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'rival',
        description: 'Nombre del rival',
        type: ApplicationCommandOptionType.User,
        required: true,
      },
      {
        name: 'horario',
        description: 'Horario del encuentro formato 24hs',
        type: ApplicationCommandOptionType.Integer,
        required: true,
      },
      {
        name: 'gmt',
        description: 'Zona Horaria predeterminada GMT-3',
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },
];


const rest = new REST({ version: '10' }).setToken(process.env.token);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: comandos }
    )
    console.log('Comando Registrado')
  } catch (error) {
    console.log(`Hay un error: ${error}`)
  }

})();