const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js');

function aplicarRedondeo(elo) {
  return Math.round(elo / 50) * 50;
}

module.exports = {
  name: 'suplencia_general',
  description: 'Reemplaza a un jugador por un suplente con logs de verificación.',
  options: [
    { name: 'id_discord_saliente', description: 'ID de Discord del que se va.', type: ApplicationCommandOptionType.String, required: true },
    { name: 'id_discord_suplente', description: 'ID de Discord del suplente.', type: ApplicationCommandOptionType.String, required: true }
  ],

  async execute(interaction) {
    const idSaliente = interaction.options.getString('id_discord_saliente');
    const idEntrante = interaction.options.getString('id_discord_suplente');

    await interaction.deferReply();

    try {
        const rutaInscriptos = path.join(__dirname, '../usuarios_inscritos.json');
        const inscriptos = JSON.parse(fs.readFileSync(rutaInscriptos, 'utf8'));
        const datosSuplente = inscriptos.find(u => u.id === idEntrante && u.torneo === "copa_uruguaya_2026");

        if (!datosSuplente) return interaction.editReply("❌ El suplente no está inscripto.");

        const rutaTorneo = path.join(__dirname, '../data/1v1_copa_uruguaya_2026.json');
        let torneo = JSON.parse(fs.readFileSync(rutaTorneo, 'utf8'));

        const idAoe2 = datosSuplente.perfil.match(/\d+$/)?.[0];
        const eloFinal = aplicarRedondeo(datosSuplente.promedio_elo);

        console.log(`\n--- INICIANDO SUPLENCIA ---`);
        console.log(`Buscando a: ${idSaliente}`);
        console.log(`Reemplazando por: ${datosSuplente.nombre} (Elo: ${eloFinal})`);

        let cambiosGrupos = 0;
        let cambiosPartidos = 0;

        // 1. Modificación en Grupos
        torneo.grupos.forEach(g => {
            const idx = g.jugadores.findIndex(j => j.id === idSaliente);
            if (idx !== -1) {
                console.log(`[GRUPO] Modificado en ${g.nombre}: ${g.jugadores[idx].nick} -> ${datosSuplente.nombre}`);
                g.jugadores[idx] = {
                    id: datosSuplente.id,
                    nick: datosSuplente.nombre,
                    elo: eloFinal,
                    elo_real: datosSuplente.elo_actual,
                    idaoe2: idAoe2
                };
                cambiosGrupos++;
            }
        });

        // 2. Modificación en Partidos
        torneo.rondas_grupos.forEach(rg => {
            rg.partidos.forEach(r => {
                r.partidos.forEach(p => {
                    if (p.jugador1Id === idSaliente) {
                        console.log(`[PARTIDO] Ronda ${r.ronda} Grupo ${rg.grupo}: J1 ${p.jugador1Nick} -> ${datosSuplente.nombre}`);
                        p.jugador1Id = datosSuplente.id;
                        p.jugador1Nick = datosSuplente.nombre;
                        cambiosPartidos++;
                    }
                    if (p.jugador2Id === idSaliente) {
                        console.log(`[PARTIDO] Ronda ${r.ronda} Grupo ${rg.grupo}: J2 ${p.jugador2Nick} -> ${datosSuplente.nombre}`);
                        p.jugador2Id = datosSuplente.id;
                        p.jugador2Nick = datosSuplente.nombre;
                        cambiosPartidos++;
                    }
                });
            });
        });

        console.log(`--- RESUMEN: ${cambiosGrupos} grupo(s) y ${cambiosPartidos} partido(s) editados ---\n`);

        if (cambiosGrupos === 0) return interaction.editReply("⚠️ No se encontró al jugador saliente.");

        fs.writeFileSync(rutaTorneo, JSON.stringify(torneo, null, 2));
        
        setTimeout(async () => {
            await guardarYSubirUsuarios1v1();
            console.log("Git sync completado.");
        }, 3000);

        await interaction.editReply(`✅ Suplencia de **${datosSuplente.nombre}** realizada. Verifica la consola del bot.`);

    } catch (error) {
        console.error("Error crítico:", error);
        await interaction.editReply("❌ Error en el proceso.");
    }
  }
};