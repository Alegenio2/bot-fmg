// comandos/resultado.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { convertirFormatoFecha } = require('../utils/fechas.js');
const { guardarLiga } = require('../utils/guardarLiga.js');
const { actualizarTablaEnCanal } = require('../utils/tablaPosiciones.js');
const { actualizarSemifinales, actualizarFinal } = require('../utils/fasesEliminatorias.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resultado')
    .setDescription('Registra el resultado de una partida.')
    .addStringOption(opt =>
      opt.setName('division')
        .setDescription('División de la liga')
        .setRequired(true)
        .addChoices(
          { name: 'a_campeon', value: 'categoria_a' },
          { name: 'b_mandoble', value: 'categoria_b' },
          { name: 'c_espada_larga', value: 'categoria_c' },
          { name: 'd_hombre_de_armas', value: 'categoria_d' },
          { name: 'e_milicia', value: 'categoria_e' },
        )
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
        .addChoices(
          { name: '0', value: 0 },
          { name: '1', value: 1 },
          { name: '2', value: 2 },
          { name: '3', value: 3 },
        )
    )
    .addUserOption(opt =>
      opt.setName('otrojugador')
        .setDescription('Segundo jugador')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('puntosotrojugador')
        .setDescription('Puntos del segundo jugador')
        .setRequired(true)
        .addChoices(
          { name: '0', value: 0 },
          { name: '1', value: 1 },
          { name: '2', value: 2 },
          { name: '3', value: 3 },
        )
    )
    .addStringOption(opt =>
      opt.setName('draftmapas')
        .setDescription('Draft de mapas')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('draftcivis')
        .setDescription('Draft de civilizaciones')
        .setRequired(false)
    )
    .addAttachmentOption(opt =>
      opt.setName('archivo')
        .setDescription('Archivo adjunto opcional')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.reply({ content: '⏳ Registrando resultado...', ephemeral: true });

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

    try {
      if (!jugador || !otrojugador) return interaction.editReply({ content: "❌ Faltan jugadores." });

      const fechaISO = convertirFormatoFecha(fecha);
      if (!fechaISO) return interaction.editReply({ content: "⚠️ Fecha inválida." });

      const letraDivision = division.split('_')[1];
      const filePath = path.join(__dirname, '..', 'ligas', `liga_${letraDivision}.json`);

      try { await fs.access(filePath); }
      catch { return interaction.editReply({ content: "⚠️ Liga no encontrada." }); }

      const ligaJSON = await fs.readFile(filePath, 'utf8');
      const liga = JSON.parse(ligaJSON);

      let partidoEncontrado = false;
      let rondaEncontrada = 'desconocida';

      // Buscar partido
      for (const jornada of liga.jornadas) {
        for (const partido of jornada.partidos) {
          if ((partido.jugador1Id === jugador.id && partido.jugador2Id === otrojugador.id) ||
              (partido.jugador1Id === otrojugador.id && partido.jugador2Id === jugador.id)) {

            partido.resultado = {
              [jugador.id]: puntosjugador,
              [otrojugador.id]: puntosotrojugador,
              draftmapas,
              draftcivis,
              rec: archivoAdjunto?.url || null,
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

      // 🔹 Guardar primero el resultado en el JSON
      await guardarLiga(liga, filePath, letraDivision, interaction);

      // 🔹 Luego actualizar semifinales y final
      await actualizarSemifinales(liga);
      await actualizarFinal(liga);

      // 🔹 Actualizar tabla de posiciones en Discord
      await actualizarTablaEnCanal(letraDivision, interaction.client, interaction.guildId);

      // ✅ Mensaje final
      const mensaje = `🏆 División ${division} - Ronda: ${rondaEncontrada} - Fecha: ${fecha}\n${jugador} ||${puntosjugador} - ${puntosotrojugador}|| ${otrojugador}\nMapas: ${draftmapas || 'No disponibles'}\nCivs: ${draftcivis || 'No disponibles'}\nArchivo: ${archivoAdjunto?.url || 'No adjunto'}`;

      await interaction.followUp({ content: mensaje, ephemeral: false });

    } catch (err) {
      console.error("❌ Error procesando resultado:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "⚠️ Ocurrió un error al procesar la liga.", ephemeral: true });
      } else {
        await interaction.reply({ content: "⚠️ Ocurrió un error al procesar la liga.", ephemeral: true });
      }
    }
  }
};