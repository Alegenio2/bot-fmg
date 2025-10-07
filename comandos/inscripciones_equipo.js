//comandos/inscripciones_equipo.js
const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');
const { asignarRolesPorPromedioEquipo } = require('../utils/asignarRoles.js');


const torneosChoices = [
  { name: 'Campeonato_Uruguayo', value: 'campeonato_uruguayo' },
  { name: 'Copa_Uruguay', value: 'copa_uruguay' },
  { name: 'Uruguay_Open_Cup_2v2', value: 'uruguay_open_cup_2v2' },
  { name: 'Uruguay_Open_Cup_3v3', value: 'uruguay_open_cup_3v3' },
  { name: 'Uruguay_Open_Cup_4v4', value: 'uruguay_open_cup_4v4' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inscripciones_equipo')
    .setDescription('Inscripción de equipos para torneos 2v2, 3v3 o 4v4.')
    .addStringOption(opt =>
      opt.setName('nombre_equipo')
        .setDescription('Nombre del equipo')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('torneo')
        .setDescription('Nombre del torneo')
        .setRequired(true)
         .addChoices(...torneosChoices)             
    )
    .addStringOption(opt =>
      opt.setName('categoria')
        .setDescription('Categoría (a, b, c...)')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('elo1')
        .setDescription('ELO promedio del jugador que ejecuta el comando')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('jugador2')
        .setDescription('Segundo jugador del equipo')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('elo2')
        .setDescription('ELO promedio del segundo jugador')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('jugador3')
        .setDescription('Tercer jugador (solo en 3v3 o 4v4)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('elo3')
        .setDescription('ELO promedio del tercer jugador')
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('jugador4')
        .setDescription('Cuarto jugador (solo en 4v4)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('elo4')
        .setDescription('ELO promedio del cuarto jugador')
        .setRequired(false)
    ),

  async execute(interaction) {
    const { guild, member } = interaction;
    const nombreEquipo = interaction.options.getString('nombre_equipo');
    const torneo = interaction.options.getString('torneo').toLowerCase();
    const categoria = interaction.options.getString('categoria').toLowerCase();

    // Jugadores
    const jugadores = [member];
    const elos = [interaction.options.getInteger('elo1')];

    const jugador2 = interaction.options.getUser('jugador2');
    const elo2 = interaction.options.getInteger('elo2');
    jugadores.push(await guild.members.fetch(jugador2.id));
    elos.push(elo2);

    const jugador3 = interaction.options.getUser('jugador3');
    const jugador4 = interaction.options.getUser('jugador4');
    if (jugador3) {
      const elo3 = interaction.options.getInteger('elo3');
      jugadores.push(await guild.members.fetch(jugador3.id));
      elos.push(elo3);
    }
    if (jugador4) {
      const elo4 = interaction.options.getInteger('elo4');
      jugadores.push(await guild.members.fetch(jugador4.id));
      elos.push(elo4);
    }

    // Calcular promedio del equipo
    const promedioEquipo = Math.round(elos.reduce((a, b) => a + b, 0) / elos.length);

    // Verificar límites
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
      return interaction.reply(`❌ El promedio del equipo (${promedioEquipo}) supera el máximo permitido (${limite}) para ${categoria.toUpperCase()}.`);
    }

    // Guardar inscripción
    const inscripcionesFile = path.join(__dirname, '..', `equipos_${torneo}.json`);
    let inscripciones = [];
    if (fs.existsSync(inscripcionesFile)) {
      inscripciones = JSON.parse(fs.readFileSync(inscripcionesFile, 'utf8'));
    }

    inscripciones.push({
      nombre_equipo: nombreEquipo,
      torneo,
      categoria,
      promedioEquipo,
      jugadores: jugadores.map((j, i) => ({
        id: j.id,
        nombre: j.user.username,
        elo: elos[i],
      })),
    });

    fs.writeFileSync(inscripcionesFile, JSON.stringify(inscripciones, null, 2), 'utf8');

    await interaction.reply(
      `✅ Equipo **${nombreEquipo}** inscripto en **${torneo}** categoría **${categoria.toUpperCase()}**.\n📊 Promedio del equipo: **${promedioEquipo}**`
    );

    // Asignar roles automáticamente a todos los jugadores del equipo
    const configServidor = require('../botConfig').servidores[guild.id];
    const { asignarRolesPorPromedioEquipo } = require('../utils/asignarRoles.js');
    await asignarRolesPorPromedioEquipo(jugadores, promedioEquipo, configServidor, torneo);
  }
};
