const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { convertirFormatoFecha, obtenerDiaSemana } = require('../utils/fechas');
const { validarYFormatearHorario } = require('../utils/horarios');
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");

module.exports = {
  name: 'coordinado_copa',
  description: 'Coordina un partido y calcula el hándicap automáticamente',
  options: [
    { name: 'fecha', description: 'Formato DD-MM-YYYY', type: ApplicationCommandOptionType.String, required: true },
    { name: 'jugador', description: 'Primer jugador', type: ApplicationCommandOptionType.User, required: true },
    { name: 'rival', description: 'Segundo jugador', type: ApplicationCommandOptionType.User, required: true },
    { name: 'horario', description: 'Formato 24hs (Ej: 21:00)', type: ApplicationCommandOptionType.String, required: true },
  ],

  async execute(interaction) {
    const { options, user } = interaction;
    const fecha = options.getString('fecha');
    const jugador = options.getUser('jugador');
    const rival = options.getUser('rival');
    const horario = options.getString('horario');

    // 1. Validaciones de formato
    const fechaFormatoCorrecto = convertirFormatoFecha(fecha);
    const horarioFormateado = validarYFormatearHorario(horario);

    if (!fechaFormatoCorrecto || !horarioFormateado) {
      return await interaction.reply({ content: "❌ Fecha o formato de hora incorrecto.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const rutaTorneo = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
    const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');

    if (!fs.existsSync(rutaTorneo) || !fs.existsSync(rutaInscritos)) {
      return await interaction.editReply("⚠️ No se encontró la base de datos necesaria.");
    }

    try {
      const torneo = JSON.parse(fs.readFileSync(rutaTorneo, 'utf8'));
      const inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));

      let partidoEncontrado = false;
      let grupoLetra = "";
      let nroRonda = "";

      // 2. BUSCAR PARTIDO EN EL JSON DEL TORNEO
      for (const grupoObj of torneo.rondas_grupos) {
        for (const rondaObj of grupoObj.partidos) {
          for (const partido of rondaObj.partidos) {
            if ((partido.jugador1Id === jugador.id && partido.jugador2Id === rival.id) || 
                (partido.jugador1Id === rival.id && partido.jugador2Id === jugador.id)) {
              
              partido.fecha = fecha;
              partido.horario = horarioFormateado;
              partido.diaSemana = obtenerDiaSemana(fechaFormatoCorrecto);
              partido.coordinadoPor = user.username;
              
              grupoLetra = grupoObj.grupo;
              nroRonda = rondaObj.ronda;
              partidoEncontrado = true;
              break;
            }
          }
          if (partidoEncontrado) break;
        }
        if (partidoEncontrado) break;
      }

      if (!partidoEncontrado) {
        return await interaction.editReply(`❌ No encontré un partido pendiente entre ${jugador.username} y ${rival.username}.`);
      }

      // 3. CÁLCULO DE HÁNDICAP (Lógica de duelo.js)
      const data1 = inscritos.find(u => u.id === jugador.id);
      const data2 = inscritos.find(u => u.id === rival.id);

      let msgHandicap = "⚖️ **Duelo equilibrado:** Sin hándicap.";
      
      if (data1 && data2) {
        const elo1 = data1.promedio_elo;
        const elo2 = data2.promedio_elo;
        const diferencia = Math.abs(elo1 - elo2);
        let valorHandicap = 0;

        if (diferencia >= 150) {
          if (diferencia >= 600) valorHandicap = 20;
          else if (diferencia >= 450) valorHandicap = 15;
          else if (diferencia >= 300) valorHandicap = 10;
          else if (diferencia >= 150) valorHandicap = 5;

          const favorecido = elo1 < elo2 ? data1.nombre : data2.nombre;
          msgHandicap = `⚖️ **Hándicap:** El jugador **${favorecido}** recibe un **${valorHandicap}%**.`;
        }
      }

      // 4. GUARDAR Y ANUNCIAR
      fs.writeFileSync(rutaTorneo, JSON.stringify(torneo, null, 2), 'utf8');
      try { await subirTodosLosTorneos(); } catch (e) { console.error("Error Git:", e); }

      await interaction.editReply({ content: "✅ Coordinación y hándicap registrados." });

      await interaction.followUp({
        content: `📅 **PARTIDO COORDINADO - COPA 2026**\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                 `🏆 **Grupo ${grupoLetra}** - Ronda ${nroRonda}\n` +
                 `👥 **${jugador.username}** vs **${rival.username}**\n` +
                 `🕒 **${fecha}** (${obtenerDiaSemana(fechaFormatoCorrecto)}) - **${horarioFormateado}hs**\n\n` +
                 `${msgHandicap}\n` +
                 `━━━━━━━━━━━━━━━━━━━━━━━━`,
        ephemeral: false
      });

    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Error al procesar los datos.");
    }
  }
};