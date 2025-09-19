// comandos/coordinado.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { convertirFormatoFecha, obtenerDiaSemana } = require('../utils/fechas');
const { validarYFormatearHorario } = require('../utils/horarios');
const { guardarLiga } = require('../utils/guardarLiga.js');

const divisionesChoices = [
  { name: 'a_campeon', value: 'categoria_a' },
  { name: 'b_mandoble', value: 'categoria_b' },
  { name: 'c_espada_larga', value: 'categoria_c' },
  { name: 'd_hombre_de_armas', value: 'categoria_d' },
  { name: 'e_milicia', value: 'categoria_e' },
];

module.exports = {
  name: 'coordinado',
  description: 'Registra la fecha y horario de un encuentro',
  options: [
    { name: 'division', description: 'División en la que juegas.', type: ApplicationCommandOptionType.String, required: true, choices: divisionesChoices },
    { name: 'ronda', description: 'Número de jornada a coordinar', type: ApplicationCommandOptionType.Integer, required: true },
    { name: 'fecha', description: 'Ingrese la fecha en formato DD-MM-YYYY.', type: ApplicationCommandOptionType.String, required: true },
    { name: 'jugador', description: 'Tu nombre', type: ApplicationCommandOptionType.User, required: true },
    { name: 'rival', description: 'Nombre del rival', type: ApplicationCommandOptionType.User, required: true },
    { name: 'horario', description: 'Horario del encuentro formato 24hs', type: ApplicationCommandOptionType.String, required: true },
    { name: 'gmt', description: 'Zona horaria predeterminada (por defecto GMT-3)', type: ApplicationCommandOptionType.String, required: false },
  ],

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const { options, user } = interaction;
    const division = options.getString('division');
    const ronda = options.getInteger('ronda');
    const fecha = options.getString('fecha');
    const jugador = options.getUser('jugador');
    const rival = options.getUser('rival');
    const horario = options.getString('horario');
    const gmt = options.getString('gmt') || "GMT-3";

    const letraDivision = division?.split('_')[1];
    const filePath = path.join(__dirname, '..', 'ligas', `liga_${letraDivision}.json`);

    // Validar fecha y horario
    const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
    if (!fechaFormatoCorrecto) return await interaction.editReply({ content: "❌ Fecha inválida DD-MM-YYYY", ephemeral: true });

    const diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);
    const horarioFormateado = validarYFormatearHorario(horario);
    if (!horarioFormateado) return await interaction.editReply({ content: "❌ Formato de horario inválido (HH:MM)", ephemeral: true });

    if (!fs.existsSync(filePath)) return await interaction.editReply({ content: `⚠️ No se encontró la liga ${division}`, ephemeral: true });

    try {
      const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let partidoCoordinado = false;
      let fueRecoord = false;
      let tipoFase = "";

      for (const jornada of liga.jornadas) {
        if (Number(jornada.ronda) !== ronda) continue;

        for (const partido of jornada.partidos) {
          const j1 = partido.jugador1Id;
          const j2 = partido.jugador2Id;

          const esEstePartido =
            (j1 === jugador.id && j2 === rival.id) ||
            (j1 === rival.id && j2 === jugador.id);

          if (esEstePartido) {
            partido.id = partido.id || Date.now();
            if (partido.fecha || partido.horario) fueRecoord = true;

            partido.fecha = fecha;
            partido.diaSemana = diaSemana;
            partido.horario = horarioFormateado;
            partido.gmt = gmt;
            partido.timestamp = new Date().toISOString();
            partido.coordinadoPor = { id: user.id, nombre: user.username };
            partidoCoordinado = true;

            // Detectar tipo de fase (si existe)
            tipoFase = jornada.tipo || "";
            break;
          }
        }
        if (partidoCoordinado) break;
      }

      if (partidoCoordinado) {
        await guardarLiga(liga, filePath, letraDivision, interaction);

        const advertencia = fueRecoord ? "\n⚠️ *Este partido ya estaba coordinado anteriormente. Datos actualizados.*" : "";
        const faseMsg = tipoFase ? `\n🏆 Fase: **${tipoFase.toUpperCase()}**` : "";

        await interaction.editReply({ content: "✅ Partido coordinado correctamente.", ephemeral: true });
        await interaction.followUp({
          content: `📅 Partido coordinado en División **${division}**, Ronda **${ronda}**${faseMsg}\n🕒 ${fecha} (${diaSemana}) a las ${horarioFormateado}-hs ${gmt}\n👥 ${jugador} vs ${rival}${advertencia}`,
          ephemeral: false
        });
      } else {
        await interaction.editReply({ content: `⚠️ No se encontró el partido entre ${jugador.username} y ${rival.username} en la ronda ${ronda}.`, ephemeral: true });
      }
    } catch (error) {
      console.error("❌ Error al coordinar:", error);
      await interaction.editReply({ content: "⚠️ Ocurrió un error al intentar coordinar el partido.", ephemeral: true });
    }
  }
};
