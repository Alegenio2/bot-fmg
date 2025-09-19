// comandos/admin_win.js
const fs = require('fs');
const path = require('path');
const { ApplicationCommandOptionType } = require('discord.js');
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
  data: {
    name: 'admin_win',
    description: 'Registrar un resultado manualmente como admin',
    options: [
      { name: 'division', type: ApplicationCommandOptionType.String, required: true, choices: divisionesChoices },
      { name: 'fecha', type: ApplicationCommandOptionType.String, required: true },
      { name: 'jugador', type: ApplicationCommandOptionType.User, required: true },
      { name: 'puntosjugador', type: ApplicationCommandOptionType.Integer, required: true, choices: puntosChoices },
      { name: 'otrojugador', type: ApplicationCommandOptionType.User, required: true },
      { name: 'puntosotrojugador', type: ApplicationCommandOptionType.Integer, required: true, choices: puntosChoices },
      { name: 'draftmapas', type: ApplicationCommandOptionType.String, required: false },
      { name: 'draftcivis', type: ApplicationCommandOptionType.String, required: false },
      { name: 'archivo', type: ApplicationCommandOptionType.Attachment, required: false },
    ],
  },

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Verificar que el usuario sea admin
    if (!botConfig.directivos.includes(interaction.user.id)) {
      return interaction.editReply({ content: '❌ Solo los directivos pueden usar este comando.', ephemeral: true });
    }

    const opts = interaction.options;
    const division = opts.getString('division');
    const fecha = opts.getString('fecha');
    const jugador = opts.getUser('jugador');
    const puntosjugador = opts.getInteger('puntosjugador');
    const otrojugador = opts.getUser('otrojugador');
    const puntosotrojugador = opts.getInteger('puntosotrojugador');
    const draftmapas = opts.getString('draftmapas') || null;
    const draftcivis = opts.getString('draftcivis') || null;
    const archivoAdjunto = opts.getAttachment('archivo');

    if (!jugador || !otrojugador) return interaction.editReply({ content: "❌ Faltan jugadores.", ephemeral: true });

    const fechaISO = convertirFormatoFecha(fecha);
    if (!fechaISO) return interaction.editReply({ content: "⚠️ Fecha inválida.", ephemeral: true });

    const letraDivision = division.split('_')[1];
    const filePath = path.join(__dirname, '..', 'ligas', `liga_${letraDivision}.json`);
    if (!fs.existsSync(filePath)) return interaction.editReply({ content: "⚠️ Liga no encontrada.", ephemeral: true });

    try {
      let liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let partidoEncontrado = false;
      let yaTeniaResultado = false;

      // Buscar partido en cualquier ronda
      for (const jornada of liga.jornadas) {
        for (const partido of jornada.partidos) {
          if ((partido.jugador1Id === jugador.id && partido.jugador2Id === otrojugador.id) ||
              (partido.jugador1Id === otrojugador.id && partido.jugador2Id === jugador.id)) {

            if (partido.resultado) yaTeniaResultado = true;

            partido.resultado = {
              [jugador.id]: puntosjugador,
              [otrojugador.id]: puntosotrojugador,
              draftmapas,
              draftcivis,
              rec: archivoAdjunto?.url || null,
              fecha: fechaISO,
            };

            partidoEncontrado = true;
            break;
          }
        }
        if (partidoEncontrado) break;
      }

      if (!partidoEncontrado) return interaction.editReply({ content: "⚠️ No se encontró el partido.", ephemeral: true });

      // Actualizar semifinales y final
      try { actualizarSemifinales(liga); actualizarFinal(liga); }
      catch (err) { console.warn("⚠️ Error actualizando semi/final:", err.message); }

      // Guardar liga
      await guardarLiga(liga, filePath, letraDivision, interaction);

      // Actualizar tabla en canal
      try { await actualizarTablaEnCanal(letraDivision, interaction.client, interaction.guildId); }
      catch (err) { console.warn("⚠️ Error actualizando tabla:", err.message); }

      // Mensaje final público
      const mensaje = `🏆 División ${division} - Fecha: ${fecha}\n${jugador} ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador}\nMapas: ${draftmapas || 'No disponibles'}\nCivs: ${draftcivis || 'No disponibles'}\nArchivo: ${archivoAdjunto?.url || 'No adjunto'}`;

      await interaction.followUp({ content: mensaje, ephemeral: false });

      if (yaTeniaResultado) {
        console.log(`⚠️ Resultado modificado para ${jugador.username} vs ${otrojugador.username}`);
      } else {
        console.log(`✅ Resultado registrado para ${jugador.username} vs ${otrojugador.username}`);
      }

    } catch (err) {
      console.error("❌ Error procesando admin_win:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "⚠️ Ocurrió un error al procesar la liga.", ephemeral: true });
      } else {
        await interaction.reply({ content: "⚠️ Ocurrió un error al procesar la liga.", ephemeral: true });
      }
    }
  }
};
