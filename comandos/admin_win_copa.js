const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_win_copa')
    .setDescription('Registra un resultado manualmente (Admin)')
    .addUserOption(opt => opt.setName('jugador').setDescription('Jugador 1 (Puedes pegar el ID)').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_j1').setDescription('Sets ganados por J1').setRequired(true))
    .addUserOption(opt => opt.setName('rival').setDescription('Jugador 2 (Puedes pegar el ID)').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_rival').setDescription('Sets ganados por Rival').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    // Blindaje de IDs: Siempre como String y sin espacios
    const id1 = String(interaction.options.get('jugador').value).trim();
    const id2 = String(interaction.options.get('rival').value).trim();
    const pts1 = interaction.options.getInteger('puntos_j1');
    const pts2 = interaction.options.getInteger('puntos_rival');

    try {
      const pathJSON = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
      const data = JSON.parse(await fs.readFile(pathJSON, 'utf-8'));

      let partidoEncontrado = null;
      let faseActual = null;
      let nombreGrupo = "";

      // 1. BUSCAR EN GRUPOS (Estructura CORRECTA del JSON)
      // El JSON tiene: rondas_grupos → [{ grupo: "A", partidos: [{ ronda: 1, partidos: [...] }] }]
      if (data.rondas_grupos && Array.isArray(data.rondas_grupos)) {
        for (const grupoRondas of data.rondas_grupos) {
          if (!grupoRondas.partidos) continue;

          // Iteramos sobre las rondas del grupo
          for (const rondaObj of grupoRondas.partidos) {
            if (!rondaObj.partidos) continue;

            // Buscamos en los partidos de cada ronda
            const p = rondaObj.partidos.find(partido => {
              const pJ1 = String(partido.jugador1Id).trim();
              const pJ2 = String(partido.jugador2Id).trim();
              return (pJ1 === id1 && pJ2 === id2) || (pJ1 === id2 && pJ2 === id1);
            });

            if (p) {
              partidoEncontrado = p;
              faseActual = "grupos";
              nombreGrupo = `Grupo ${grupoRondas.grupo}`;
              break;
            }
          }
          if (partidoEncontrado) break;
        }
      }

      // 2. BUSCAR EN ELIMINATORIAS (Si ya las generaste)
      if (!partidoEncontrado && data.eliminatorias) {
        for (const fase in data.eliminatorias) {
          const p = data.eliminatorias[fase].find(partido => {
            const pJ1 = String(partido.jugador1Id).trim();
            const pJ2 = String(partido.jugador2Id).trim();
            return (pJ1 === id1 && pJ2 === id2) || (pJ1 === id2 && pJ2 === id1);
          });
          if (p) {
            partidoEncontrado = p;
            faseActual = fase;
            break;
          }
        }
      }

      if (!partidoEncontrado) {
        return interaction.editReply(`❌ No se encontró el partido entre los IDs \`${id1}\` y \`${id2}\`.`);
      }

      // 3. ACTUALIZAR RESULTADO
      // Guardamos los puntos usando los IDs originales del JSON para no alterar el orden
      const pJ1_id = String(partidoEncontrado.jugador1Id).trim();
      const pJ2_id = String(partidoEncontrado.jugador2Id).trim();

      partidoEncontrado.resultado = {
        [id1]: pts1,
        [id2]: pts2,
        fecha_registro: new Date().toISOString()
      };

      // 4. LÓGICA DE AVANCE (Fases Finales)
      let logAvance = "";
      if (faseActual !== 'grupos' && partidoEncontrado.va_a) {
        const ganadorId = pts1 > pts2 ? id1 : id2;
        const ganadorNick = (ganadorId === pJ1_id) ? partidoEncontrado.jugador1Nick : partidoEncontrado.jugador2Nick;

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

      // 5. GUARDAR Y RECALCULAR
      await fs.writeFile(pathJSON, JSON.stringify(data, null, 2));
      
      try {
        await obtenerEstadisticasCopa(); 
        await subirTodosLosTorneos(); 
      } catch (e) { console.error("Error sincronización:", e); }

      const infoFase = faseActual === "grupos" ? nombreGrupo : faseActual.toUpperCase();
      await interaction.editReply(`✅ **Resultado registrado**\n🏆 ${infoFase}\n🔢 Marcador: ${pts1} - ${pts2}${logAvance}`);

    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Error al procesar el archivo JSON.");
    }
  }
};
