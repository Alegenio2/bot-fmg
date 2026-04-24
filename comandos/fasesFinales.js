const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const { generarEstructuraCompleta } = require('../utils/bracketEngine');
// Importamos tu lógica de cálculo de tabla para tener los puntos reales
const { obtenerEstadisticasCopa } = require('../utils/calculoTablaCopa');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fases_finales')
        .setDescription('Genera el cuadro completo del torneo'),

    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            // Usamos la misma ruta que resultado_copa.js para asegurar consistencia
            const pathJSON = path.join(__dirname, '..', 'torneos', '1v1_copa_uruguaya_2026.json');
            
            // Leemos y parseamos el archivo del torneo
            const rawData = await fs.readFile(pathJSON, 'utf-8');
            const torneoData = JSON.parse(rawData);

            // 1. Obtenemos las estadísticas reales (puntos, dif sets, etc)
            // Esta función devuelve los grupos con los jugadores ya ordenados por mérito
            const gruposActualizados = await obtenerEstadisticasCopa();
            
            // Validación básica de los datos obtenidos
            if (!Array.isArray(gruposActualizados)) {
                throw new Error('obtenerEstadisticasCopa no devolvió un array');
            }

            let primeros = [];
            let segundos = [];

            gruposActualizados.forEach((g, indiceGrupo) => {
                // Validamos que el grupo tenga la estructura esperada
                if (!g || typeof g !== 'object' || !Array.isArray(g.jugadores)) {
                    console.warn(`Grupo en índice ${indiceGrupo} tiene estructura inesperada:`, g);
                    return;
                }
                
                // El primero del grupo (index 0) y el segundo (index 1)
                if (g.jugadores.length >= 2) {
                    // Validamos que cada jugador tenga los campos necesarios
                    const jugador1 = g.jugadores[0];
                    const jugador2 = g.jugadores[1];
                    
                    if (jugador1 && jugador1.id && jugador1.nick !== undefined && 
                        jugador1.puntos !== undefined && jugador1.dif_sets !== undefined &&
                        jugador2 && jugador2.id && jugador2.nick !== undefined && 
                        jugador2.puntos !== undefined && jugador2.dif_sets !== undefined) {
                        
                        primeros.push({ 
                            id: jugador1.id, 
                            nick: jugador1.nick, 
                            puntos: jugador1.puntos,
                            dif_sets: jugador1.dif_sets,
                            grupoOrigen: g.nombre 
                        });
                        segundos.push({ 
                            id: jugador2.id, 
                            nick: jugador2.nick, 
                            puntos: jugador2.puntos,
                            dif_sets: jugador2.dif_sets,
                            grupoOrigen: g.nombre 
                        });
                    } else {
                        console.warn(`Uno de los jugadores en el grupo "${g.nombre}" falta datos necesarios`, {
                            jugador1,
                            jugador2
                        });
                    }
                } else if (g.jugadores.length > 0) {
                    console.warn(`Grupo "${g.nombre}" tiene menos de 2 jugadores (${g.jugadores.length}). Se omitirá para el cuadro.`);
                }
                // Si g.jugadores.length === 0, simplemente lo ignoramos (no hay warning para no llenar logs)
            });

            // Validamos que tengamos suficientes datos para generar un cuadro significativo
            if (primeros.length === 0 || segundos.length === 0) {
                throw new Error('No se pudieron obtener suficientes primeros o segundos lugares de los grupos para generar el cuadro');
            }

            // 2. Ordenar por mérito deportivo global para asignar Seeds
            // Puntos mayor es mejor, luego diferencia de sets mayor es mejor
            const sortCriterio = (a, b) => (b.puntos || 0) - (a.puntos || 0) || (b.dif_sets || 0) - (a.dif_sets || 0);
            primeros.sort(sortCriterio);
            segundos.sort(sortCriterio);

            // 3. Generar el cuadro completo usando el motor
            const cuadro = generarEstructuraCompleta(primeros, segundos);

            // 4. Guardar en la raíz del JSON
            torneoData.eliminatorias = cuadro;

            await fs.writeFile(pathJSON, JSON.stringify(torneoData, null, 2));
            
            await interaction.editReply(`✅ ¡Cuadro generado! Se han respetado los méritos deportivos y las restricciones de grupo.\n` +
                                        `Procesados ${primeros.length} grupos para generar el cuadro.`);
        } catch (error) {
            console.error('Error en el comando fases_finales:', error);
            await interaction.editReply({ 
                content: `❌ Error al generar el cuadro: ${error.message}\n` +
                         `Por favor, revisa los logs para más detalles.` 
            });
        }
    }
};