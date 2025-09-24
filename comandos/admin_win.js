// comandos/admin_win.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { convertirFormatoFecha } = require('../utils/fechas.js');
const { guardarLiga } = require('../utils/guardarLiga.js');
const { actualizarTablaEnCanal } = require('../utils/tablaPosiciones.js');
const { actualizarSemifinales, actualizarFinal } = require('../utils/fasesEliminatorias.js');
const botConfig = require('../botConfig.json');

const divisionesChoices = [
  { name: 'a_campeon', value: 'categoria_a' },
  { name: 'b_mandoble', value: 'categoria_b' },
  { name: 'c_espada_larga', value: 'categoria_c' },
  { name: 'd_hombre_de_armas', value: 'categoria_d' },
  { name: 'e_milicia', value: 'categoria_e' },
];

const puntosChoices = [
  { name: '0', value: 0 },
  { name: '1', value: 1 },
  { name: '2', value: 2 },
  { name: '3', value: 3 },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_win')
    .setDescription('Registrar un resultado manualmente como admin')
    .addStringOption(opt =>
      opt.setName('division')
        .setDescription('División de la liga')
        .setRequired(true)
        .addChoices(...divisionesChoices)
    )
    .addStringOption(opt =>
      opt.setName('fecha')
        .setDescription('Fecha del partido (DD/MM/AAAA)')
        .setRequired(true)
    )
    .addUserOption(opt =>
      opt.setName('jugador')
        .setDescription('Primer jugador')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('puntosjugador')
        .setDescription('Puntos del primer jugador')
        .setRequired(true)
        .addChoices(...puntosChoices)
    )
    .addUserOption(opt =>
      opt.setName('otrojugador')
        .Description('Segundo jugador')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('puntosotrojugador')
        .setDescription('Puntos del segundo jugador')
        .setRequired(true)
        .addChoices(...puntosChoices)
    ),

  async execute(interaction) {
    const directivoRoleId = botConfig.directivos;
    const member = interaction.member;

    if (!member.roles.cache.has(directivoRoleId)) {
      return interaction.reply({ content: '❌ Solo el organizador puede usar este comando.', ephemeral: true });
    }

    await interaction.reply({ content: '⏳ Registrando resultado...', ephemeral: true });

    const opts = interaction.options;
    const division = opts.getString('division');
    const fecha = opts.getString('fecha');
    const jugador = opts.getUser('jugador');
    const puntosjugador = opts.getInteger('puntosjugador');
    const otrojugador = opts.getUser('otrojugador');
    const puntosotrojugador = opts.getInteger('puntosotrojugador');

    if (!jugador || !otrojugador) return interaction.editReply({ content: "❌ Faltan datos obligatorios." });

    const fechaISO = convertirFormatoFecha(fecha);
    if (!fechaISO) return interaction.editReply({ content: "⚠️ Fecha inválida. Usa DD/MM/AAAA o DD-MM-AAAA." });

    const letraDivision = division.split('_')[1];
    const filePath = path.join(__dirname, '..', 'ligas', `liga_${letraDivision}.json`);

    try {
      await fs.access(filePath);
    } catch {
      return interaction.editReply({ content: "⚠️ Liga no encontrada." });
    }

    try {
      const ligaJSON = await fs.readFile(filePath, 'utf8');
      const liga = JSON.parse(ligaJSON);

      let partidoEncontrado = false;
      let rondaEncontrada = 'desconocida';

      for (const jornada of liga.jornadas) {
        for (const partido of jornada.partidos) {
          if ((partido.jugador1Id === jugador.id && partido.jugador2Id === otrojugador.id) ||
              (partido.jugador1Id === otrojugador.id && partido.jugador2Id === jugador.id)) {

            partido.resultado = {
              [jugador.id]: puntosjugador,
              [otrojugador.id]: puntosotrojugador,
              fecha: fechaISO,
            };

            partidoEncontrado = true;
            rondaEncontrada = jornada.ronda || 'desconocida';
            break;
          }
        }
        if (partidoEncontrado) break;
      }

      if (!partidoEncontrado) return interaction.editReply({ content: "⚠️ No se encontró el partido." });

      // 🔹 Actualizar semifinales y final en memoria
      await actualizarSemifinales(liga);
      await actualizarFinal(liga);

      // 🔹 Guardar liga y subir a GitHub
      await guardarLiga(liga, filePath, letraDivision, interaction);

      // 🔹 Actualizar tabla de posiciones en Discord
      await actualizarTablaEnCanal(letraDivision, interaction.client, interaction.guildId);

      // 🔹 Mostrar resultado públicamente
      await interaction.editReply({
        content: `🏆 División ${division} - Ronda: ${rondaEncontrada} - Fecha: ${fecha}\n${jugador} ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador}`,
        ephemeral: false
      });

    } catch (err) {
      console.error("❌ Error procesando admin_win:", err);
      await interaction.editReply({ content: "⚠️ Ocurrió un error al procesar la liga." });
    }
  }
};

