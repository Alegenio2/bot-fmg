// utils/obtenerTorneos.js (Nuevo Archivo de Utilidad)
const fs = require("fs/promises");
const path = require("path");

/**
 * Carga de forma asíncrona todos los torneos disponibles desde equipos_inscritos.json
 * @returns {Promise<Array<{name: string, value: string}>>} Lista de torneos
 */
async function obtenerTorneosDisponibles() {
    const rutaEquipos = path.join(__dirname, "..", "equipos_inscritos.json");
    
    try {
        // ➡️ Usamos fs.readFile (asíncrono)
        const data = await fs.readFile(rutaEquipos, "utf8");
        const equipos = JSON.parse(data);
        
        // Extraer nombres de torneos únicos
        const torneosUnicos = [...new Set(equipos.map(e => e.torneo))];
        
        return torneosUnicos.map(t => ({ name: t, value: t }));

    } catch (error) {
        // Si el archivo no existe (ENOENT) o hay error de lectura/parseo, retorna un array vacío.
        if (error.code !== 'ENOENT') {
            console.error("Error al leer equipos_inscritos.json:", error);
        }
        return [];
    }
}

// ⚠️ NOTA IMPORTANTE: Necesitas una función similar para obtener TODOS los equipos
/**
 * Carga de forma asíncrona la lista de equipos inscritos de un torneo.
 * @param {string} torneoId - El ID del torneo.
 * @returns {Promise<Array<string>>} Lista de nombres de equipos.
 */
async function obtenerEquiposInscritos(torneoId) {
    const rutaEquipos = path.join(__dirname, "..", "equipos_inscritos.json");
    
    try {
        const data = await fs.readFile(rutaEquipos, "utf8");
        const equipos = JSON.parse(data);
        
        // ➡️ Filtrar solo los equipos del torneo deseado
        const equiposDelTorneo = equipos
            .filter(e => e.torneo === torneoId)
            .map(e => e.nombre);
        
        return [...new Set(equiposDelTorneo)]; // Retornar nombres únicos
        
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Error al leer equipos_inscritos.json para equipos:", error);
        }
        return [];
    }
}


module.exports = { obtenerTorneosDisponibles, obtenerEquiposInscritos };
