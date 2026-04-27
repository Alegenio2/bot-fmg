const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { generarEstructuraCompleta } = require('../utils/bracketEngine');
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fases_finales')
        .setDescription('Genera el cuadro completo del torneo'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const pathJSON = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
            const rawData = await fs.readFile(pathJSON, 'utf-8');
            const torneoData = JSON.parse(rawData);

            // 1. Obtenemos las estadísticas (vienen como Objeto: { "Grupo A": [...] })
            const tablasRaw = await obtenerEstadisticasCopa();
            
            // Transformamos el Objeto en un Array compatible
            const gruposActualizados = Object.entries(tablasRaw).map(([nombre, jugadores]) => {
                return {
                    nombre: nombre,
                    jugadores: jugadores.map(j => {
                        // Buscamos el ID real en la configuración original del grupo
                        const grupoOriginal = torneoData.grupos.find(g => g.nombre === nombre);
                        const datosOriginales = grupoOriginal?.jugadores.find(jo => jo.nick === j.nick);

                        return {
                            id: datosOriginales ? datosOriginales.id : j.nick, // Usar ID si existe, sino nick
                            nick: j.nick,
                            puntos: j.pts || 0,
                            dif_sets: (j.sf || 0) - (j.sc || 0)
                        };
                    })
                };
            });

            if (gruposActualizados.length === 0) {
                throw new Error('No se pudieron procesar las tablas de los grupos.');
            }

            const primeros = [];
            const segundos = [];

            // Extraemos los clasificados
            gruposActualizados.forEach(g => {
                if (g.jugadores && g.jugadores.length >= 2) {
                    // El utilitario ya los devuelve ordenados por puntos
                    primeros.push({ ...g.jugadores[0], grupoOrigen: g.nombre });
                    segundos.push({ ...g.jugadores[1], grupoOrigen: g.nombre });
                }
            });

            if (primeros.length < 2) {
                throw new Error('No hay suficientes clasificados (mínimo 2 grupos terminados).');
            }

            // 2. Ordenar por mérito deportivo global (Seeds)
            const sortCriterio = (a, b) => (b.puntos - a.puntos) || (b.dif_sets - a.dif_sets);
            primeros.sort(sortCriterio);
            segundos.sort(sortCriterio);

            // 3. Generar el cuadro (Bracket)
            const cuadro = generarEstructuraCompleta(primeros, segundos);

            // 4. Guardar en el JSON
            torneoData.eliminatorias = cuadro;

            await fs.writeFile(pathJSON, JSON.stringify(torneoData, null, 2));
            
            await interaction.editReply(`✅ **Cuadro Generado Correctamente**\nSe procesaron **${gruposActualizados.length}** grupos.\nLos clasificados han sido ordenados por mérito deportivo.`);

        } catch (error) {
            console.error('Error en fases_finales:', error);
            await interaction.editReply(`❌ Error: ${error.message}`);
        }
    }
};
