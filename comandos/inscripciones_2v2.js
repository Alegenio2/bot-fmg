//inscripciones_2v2.js
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inscripciones_2v2')
    .setDescription('Inscripción de equipos para torneos 2v2.')
    .addStringOption(opt =>
      opt.setName('nombre_equipo')
        .setDescription('Nombre del equipo')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('jugador2')
        .setDescription('Compañero de equipo')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('elo1')
        .setDescription('Promedio del jugador que ejecuta el comando')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('elo2')
        .setDescription('Promedio del compañero')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('categoria')
        .setDescription('Categoría en la que inscriben (ej: a o b)')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('torneo')
        .setDescription('Nombre del torneo (ej: copa_uruguaya_2v2)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const nombreEquipo = interaction.options.getString('nombre_equipo');
    const jugador1 = interaction.user;
    const jugador2 = interaction.options.getUser('jugador2');
    const elo1 = interaction.options.getInteger('elo1');
    const elo2 = interaction.options.getInteger('elo2');
    const categoria = interaction.options.getString('categoria').toLowerCase();
    const torneo = interaction.options.getString('torneo').toLowerCase();

    const promedioEquipo = Math.round((elo1 + elo2) / 2);

    // cargar los límites
    const filePath = path.join(__dirname, '..', 'elo_limites.json');
    if (!fs.existsSync(filePath)) {
      return interaction.reply('⚠️ No hay límites configurados aún. Usa `/admin_set_elo` primero.');
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const limite = data[torneo]?.[categoria];

    if (!limite) {
      return interaction.reply(`⚠️ No hay límite configurado para ${torneo} categoría ${categoria.toUpperCase()}.`);
    }

    if (promedioEquipo > limite) {
      return interaction.reply(`❌ El promedio de tu equipo (${promedioEquipo}) supera el máximo permitido (${limite}) para la categoría ${categoria.toUpperCase()}.`);
    }

    const inscripcionesFile = path.join(__dirname, '..', 'equipos_2v2.json');
    let inscripciones = [];
    if (fs.existsSync(inscripcionesFile)) {
      inscripciones = JSON.parse(fs.readFileSync(inscripcionesFile, 'utf8'));
    }

    inscripciones.push({
      nombre_equipo: nombreEquipo,
      categoria,
      promedioEquipo,
      jugadores: [
        { id: jugador1.id, nombre: jugador1.username, elo: elo1 },
        { id: jugador2.id, nombre: jugador2.username, elo: elo2 }
      ]
    });

    fs.writeFileSync(inscripcionesFile, JSON.stringify(inscripciones, null, 2));

    await interaction.reply(
      `✅ Equipo **${nombreEquipo}** inscripto en categoría **${categoria.toUpperCase()}** (${promedioEquipo} ELO promedio).`
    );
  }
};
