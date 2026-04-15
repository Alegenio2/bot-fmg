const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_win_copa')
    .setDescription('Registra un resultado manualmente (Admin)')
    .addUserOption(opt => opt.setName('jugador').setDescription('Ganador o J1').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_j1').setDescription('Sets J1').setRequired(true))
    .addUserOption(opt => opt.setName('rival').setDescription('Perdedor o J2').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_rival').setDescription('Sets Rival').setRequired(true)),

  async execute(interaction) {
    // Verificar permisos de admin si es necesario
    await interaction.deferReply();

    const j1 = interaction.options.getUser('jugador');
    const j2 = interaction.options.getUser('rival');
    const pts1 = interaction.options.getInteger('puntos_j1');
    const pts2 = interaction.options.getInteger('puntos_rival');

    try {
      const pathJSON = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
      const data = JSON.parse(await fs.readFile(pathJSON, 'utf-8'));

      let partidoEncontrado = null;
      let faseActual = null; // 'grupos' o 'eliminatorias'

      // 1. BUSCAR EN GRUPOS
      for (const grupo of data.grupos) {
        for (const ronda of grupo.partidos) { // Asumiendo estructura de rondas
            const p = ronda.partidos.find(partido => 
                (partido.jugador1Id === j1.id && partido.jugador2Id === j2.id) ||
                (partido.jugador1Id === j2.id && partido.jugador2Id === j1.id)
            );
            if (p) {
                partidoEncontrado = p;
                faseActual = 'grupos';
                break;
            }
        }
        if (partidoEncontrado) break;
      }

      // 2. BUSCAR EN ELIMINATORIAS (si no se encontró en grupos)
      if (!partidoEncontrado && data.eliminatorias) {
        for (const fase in data.eliminatorias) {
          const p = data.eliminatorias[fase].find(partido => 
            (partido.jugador1Id === j1.id && partido.jugador2Id === j2.id) ||
            (partido.jugador1Id === j2.id && partido.jugador2Id === j1.id)
          );
          if (p) {
            partidoEncontrado = p;
            faseActual = fase; // 'octavos', 'cuartos', etc.
            break;
          }
        }
      }

      if (!partidoEncontrado) {
        return interaction.editReply("❌ No se encontró un enfrentamiento entre esos dos jugadores.");
      }

      // 3. ACTUALIZAR EL RESULTADO
      partidoEncontrado.resultado = {
        [j1.id]: pts1,
        [j2.id]: pts2,
        fecha_registro: new Date().toISOString()
      };

      // 4. LÓGICA DE AVANCE (Si es eliminatoria)
      if (faseActual !== 'grupos' && partidoEncontrado.va_a) {
        const ganadorId = pts1 > pts2 ? j1.id : j2.id;
        const ganadorNick = pts1 > pts2 ? j1.username : j2.username;

        // Buscar el partido siguiente para poner al ganador
        for (const fase in data.eliminatorias) {
          const siguiente = data.eliminatorias[fase].find(p => p.partidoId === partidoEncontrado.va_a);
          if (siguiente) {
            const posicion = partidoEncontrado.posicion_en_siguiente; // 'jugador1' o 'jugador2'
            siguiente[`${posicion}Id`] = ganadorId;
            siguiente[`${posicion}Nick`] = ganadorNick;
            break;
          }
        }
      }

      // 5. GUARDAR Y RECALCULAR
      await fs.writeFile(pathJSON, JSON.stringify(data, null, 2));
      await obtenerEstadisticasCopa(); // Recalcula tablas para la web
      await subirTodosLosTorneos(); // Sube a Git

      await interaction.editReply(`✅ Resultado registrado: **${j1.username} ${pts1} - ${pts2} ${j2.username}** en ${faseActual.toUpperCase()}.`);

    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Error al procesar el admin_win.");
    }
  }
};