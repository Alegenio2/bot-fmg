require('dotenv').config();
const { REST, Routes, ApplicationCommandOptionType } = require("discord.js")
const config = require('./botConfig.json');

const comandos = [
  {
    name: 'resultado',
    description: 'Registra el resultado de una partida.',
    options: [
      {
        name: 'division',
        description: 'La división en la que se jugó la partida.',
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: 'campeon',
            value: 'categoria_a',
          },
          {
            name: 'mandoble',
            value: 'categoria_b',
          },
          {
            name: 'espada_larga',
            value: 'categoria_c',
          },
          {
            name: 'hombre_de_armas',
            value: 'categoria_d',
          },
          {
            name: 'milicia',
            value: 'categoria_e',
          },
        ],
        required: true,
      },
      {
        name: 'ronda',
        description: 'La ronda en el que se jugó la partida.',
        type: ApplicationCommandOptionType.String,
        choices: [
          {
            name: 'primera',
            value: 'primera',
          },
          {
            name: 'segunda',
            value: 'segunda',
          },
          {
            name: 'tercera',
            value: 'tercera',
          },
          {
            name: 'cuarta',
            value: 'cuarta',
          },
          {
            name: 'quinta',
            value: 'quinta',
          },
          {
            name: 'sexta',
            value: 'sexta',
          },
          {
            name: 'septima',
            value: 'septima',
          },
        ],
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
            name: 'campeon',
            value: 'categoria_a',
          },
          {
            name: 'mandoble',
            value: 'categoria_b',
          },
          {
            name: 'espada_larga',
            value: 'categoria_c',
          },
          {
            name: 'hombre_de_armas',
            value: 'categoria_d',
          },
          {
            name: 'milicia',
            value: 'categoria_e',
          },
        ],
        required: true,
      },
      {
        name: 'ronda',
        description: 'La Fecha que juegas (Ej Primera)',
        type: ApplicationCommandOptionType.String,
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
        type: ApplicationCommandOptionType.String,
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
  {
  name: "re-coordinar",
  description: "Edita un encuentro coordinado existente",
  options: [
    {
      name: "id",
      description: "ID del encuentro",
      type: ApplicationCommandOptionType.Number,
      required: true
    },
    {
      name: "fecha",
      description: "Nueva fecha (ej: 20-07-2025)",
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "horario",
      description: "Nuevo horario (ej: 22:00)",
      type: ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "gmt",
      description: "Zona horaria (por defecto GMT-3)",
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ]
},
  {
    name: 'inscripciones',
    description: 'Inscripcion al Torneo.',
    options: [
      {
        name: 'nombre',
        description: 'Nick en steam.',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'eloactual',
        description: 'Elo actual',
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: 'elomaximo',
        description: 'Elo Maximo alcanzado',
        type: ApplicationCommandOptionType.Number,
        required: true,
      },
      {
        name: 'link',
        description: 'Link de aoe2insights',
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: 'archivo',
        description: 'Logo o foto.',
        type: ApplicationCommandOptionType.Attachment,
        required: false,
      },
     ],
  },
  {
    name: "inscripciones_vinculado",
    description: "Inscripción al torneo para usuarios vinculados.",
  },
  {
  name: 'vincular',
  description: 'Vincula tu cuenta de Discord con tu ID de aoe2companion.',
  options: [
    {
      name: 'aoe2id',
      description: 'Link de tu pefil de aoe2companion.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
},
{
  name: 'elos',
  description: 'Muestra el ELO actual de un jugador.',
  options: [
    {
      name: 'jugador',
      description: 'Usuario de Discord vinculado.',
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ],
},
 {
    name: 'torneoliga',
    description: 'Organiza un torneo tipo liga con los participantes de una categoría.',
    options: [
      {
        name: 'categoria',
        description: 'Categoría para crear la liga',
        type: ApplicationCommandOptionType.String,
        required: true,
      }
    ],
  },
];


const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    const servidores = Object.keys(config.servidores);

    for (const guildId of servidores) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: comandos }
      );
      console.log(`✅ Comandos registrados en guild ${guildId}`);
    }

    // Limpia los comandos globales (opcional, útil si antes los registraste)
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("🧹 Comandos globales eliminados");

     // Verificación de comandos cargados en cada servidor
    for (const guildId of servidores) {
      const comandosRegistrados = await rest.get(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
      );
      console.log(`📋 Comandos en ${guildId}:`);
      comandosRegistrados.forEach(cmd => {
        console.log(`- ${cmd.name}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
})();
