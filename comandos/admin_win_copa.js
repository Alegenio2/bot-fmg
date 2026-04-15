const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_win_copa')
    .setDescription('Registra un resultado manualmente (Admin)')
    .addUserOption(opt => opt.setName('jugador').setDescription('Ganador o J1 (Puedes pegar el ID)').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_j1').setDescription('Sets J1').setRequired(true))
    .addUserOption(opt => opt.setName('rival').setDescription('Perdedor o J2 (Puedes pegar el ID)').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_rival').setDescription('Sets Rival').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    // BLINDAJE: Convertimos los IDs a String y quitamos espacios para asegurar el match con el JSON
    const j1Id = String(interaction.options.get('jugador').value).trim();
    const j2Id = String(interaction.options.get('rival').value).trim();
    const pts1 = interaction.options.getInteger('puntos_j1');
    const pts2 = interaction.options.getInteger('puntos_rival');

    try {
      const pathJSON = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
      const data = JSON.parse(await fs.readFile(pathJSON, 'utf-8'));

      let partidoEncontrado = null;
      let faseActual = null;
      let nombreGrupo = "";

      // 1. BUSCAR EN GRUPOS (Estructura: grupos -> rondas -> partidos)
      if (data.grupos && Array.isArray(data.grupos)) {
        for (const grupo of data.grupos) {
          if (!grupo.partidos || !Array.isArray(grupo.partidos)) continue;

          for (const rondaObj of grupo.partidos) {
            if (!rondaObj.partidos || !Array.isArray(rondaObj.partidos)) continue;

            const p = rondaObj.partidos.find(partido => {
                const pJ1 = String(partido.jugador1Id).trim();
                const pJ2 = String(partido.jugador2Id).trim();
                return (pJ1 === j1Id && pJ2 === j2Id) || (pJ1 === j2Id && pJ2 === j1Id);
            });

            if (p) {
              partidoEncontrado = p;
              faseActual = "grupos";
              nombreGrupo = grupo.nombre;
              break;
            }
          }
          if (partidoEncontrado) break;
        }
      }

      // 2. BUSCAR EN ELIMINATORIAS (Octavos, Cuartos, etc.)
      if (!partidoEncontrado && data.eliminatorias) {
        for (const fase in data.eliminatorias) {
          const p = data.eliminatorias[fase].find(partido => {
                const pJ1 = String(partido.jugador1Id).trim();
                const pJ2 = String(partido.jugador2Id).trim();
                return (pJ1 === j1Id && pJ2 === j2Id) || (pJ1 === j2Id && pJ2 === j1Id);
          });
          if (p) {
            partidoEncontrado = p;
            faseActual = fase;
            break;
          }
        }
      }

      if (!partidoEncontrado) {
        return interaction.editReply(`❌ No se encontró el partido. IDs buscados: \`${j1Id}\` y \`${j2Id}\`. Revisa que el JSON sea el correcto.`);
      }

      // 3. REGISTRAR EL RESULTADO
      partidoEncontrado.resultado = {
        [j1Id]: pts1,
        [j2Id]: pts2,
        fecha_registro: new Date().toISOString()
      };

      // 4. LÓGICA DE AVANCE AUTOMÁTICO
      let logAvance = "";
      if (faseActual !== 'grupos' && partidoEncontrado.va_a) {
        const ganadorId = pts1 > pts2 ? j1Id : j2Id;
        const ganadorNick = (ganadorId === String(partidoEncontrado.jugador1Id).trim()) 
            ? partidoEncontrado.jugador1Nick 
            : partidoEncontrado.jugador2Nick;

        for (const fase in data.eliminatorias) {
          const siguiente = data.eliminatorias[fase].find(p => p.partidoId === partidoEncontrado.va_a);
          if (siguiente) {
            const pos = partidoEncontrado.posicion_en_siguiente; 
            siguiente[`${pos}Id`] = ganadorId;
            siguiente[`${pos}Nick`] = ganadorNick;
            logAvance = `\n➡️ **${ganadorNick}** avanzó a ${partidoEncontrado.va_a}.`;
            break;
          }
        }
      }

      // 5. GUARDAR Y SINCRONIZAR
      await fs.writeFile(pathJSON, JSON.stringify(data, null, 2));
      
      try {
          await obtenerEstadisticasCopa(); 
          await subirTodosLosTorneos(); 
      } catch (e) {
          console.error("Error al sincronizar:", e);
      }

      const infoFase = faseActual === "grupos" ? `Grupo ${nombreGrupo}` : faseActual.toUpperCase();
      await interaction.editReply(`✅ **Resultado Admin Registrado**\n🏆 Fase: ${infoFase}\n🔢 Marcador: ${pts1} - ${pts2}${logAvance}`);

    } catch (error) {
      console.error("Error crítico en admin_win_copa:", error);
      await interaction.editReply("❌ Error crítico al procesar. Revisa la consola.");
    }
  }
};
