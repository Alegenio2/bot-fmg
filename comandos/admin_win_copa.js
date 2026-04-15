const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { subirTodosLosTorneos } = require("../git/guardarTorneosGit");
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin_win_copa')
    .setDescription('Registra un resultado manualmente (Admin)')
    .addUserOption(opt => opt.setName('jugador').setDescription('Ganador o J1 (Puedes pegar el ID si no está en el server)').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_j1').setDescription('Sets ganados por J1').setRequired(true))
    .addUserOption(opt => opt.setName('rival').setDescription('Perdedor o J2 (Puedes pegar el ID si no está en el server)').setRequired(true))
    .addIntegerOption(opt => opt.setName('puntos_rival').setDescription('Sets ganados por Rival').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply();

    // Extraemos los IDs de las opciones (funciona aunque el usuario se haya ido)
    const j1Id = interaction.options.get('jugador').value;
    const j2Id = interaction.options.get('rival').value;
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
          // 'grupo.partidos' en tu JSON contiene el array de rondas
          if (!grupo.partidos || !Array.isArray(grupo.partidos)) continue;

          for (const rondaObj of grupo.partidos) {
            // 'rondaObj.partidos' contiene los enfrentamientos reales
            if (!rondaObj.partidos || !Array.isArray(rondaObj.partidos)) continue;

            const p = rondaObj.partidos.find(partido => 
              (partido.jugador1Id === j1Id && partido.jugador2Id === j2Id) ||
              (partido.jugador1Id === j2Id && partido.jugador2Id === j1Id)
            );

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
          const p = data.eliminatorias[fase].find(partido => 
            (partido.jugador1Id === j1Id && partido.jugador2Id === j2Id) ||
            (partido.jugador1Id === j2Id && partido.jugador2Id === j1Id)
          );
          if (p) {
            partidoEncontrado = p;
            faseActual = fase;
            break;
          }
        }
      }

      if (!partidoEncontrado) {
        return interaction.editReply("❌ No se encontró ningún partido entre esos dos IDs en el archivo JSON.");
      }

      // 3. REGISTRAR EL RESULTADO
      partidoEncontrado.resultado = {
        [j1Id]: pts1,
        [j2Id]: pts2,
        fecha_registro: new Date().toISOString()
      };

      // 4. LÓGICA DE AVANCE AUTOMÁTICO (Solo para fases finales)
      let logAvance = "";
      if (faseActual !== 'grupos' && partidoEncontrado.va_a) {
        const ganadorId = pts1 > pts2 ? j1Id : j2Id;
        const ganadorNick = (ganadorId === partidoEncontrado.jugador1Id) 
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
      
      // Intentamos actualizar tablas y subir a Git
      await obtenerEstadisticasCopa(); 
      await subirTodosLosTorneos(); 

      const infoFase = faseActual === "grupos" ? nombreGrupo : faseActual.toUpperCase();
      await interaction.editReply(`✅ **Resultado registrado por Admin**\n🏆 Fase: ${infoFase}\n🔢 Marcador: ${pts1} - ${pts2}${logAvance}`);

    } catch (error) {
      console.error("Error en admin_win_copa:", error);
      await interaction.editReply("❌ Error al procesar el comando. Revisa la consola del bot.");
    }
  }
};
