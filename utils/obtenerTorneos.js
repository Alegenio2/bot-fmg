// utils/obtenerTorneos.js
const fs = require("fs/promises");
const path = require("path");

const RUTA_EQUIPOS_INSCRITOS = path.join(__dirname, "..", "equipos_inscritos.json");

/**
 * Carga de forma asíncrona todos los torneos disponibles desde equipos_inscritos.json.
 * @returns {Promise<Array<{name: string, value: string}>>} Lista de torneos para el autocompletado.
 */
async function obtenerTorneosDisponibles() {
    try {
        // Lee el archivo de forma asíncrona
        const data = await fs.readFile(RUTA_EQUIPOS_INSCRITOS, "utf8");
        const equipos = JSON.parse(data);
        
        // Extraer nombres de torneos únicos
        const torneosUnicos = [...new Set(equipos.map(e => e.torneo))];
        
        // Formato requerido por Discord: [{ name: "torneo_nombre", value: "torneo_nombre" }]
        return torneosUnicos.map(t => ({ name: t, value: t }));

    } catch (error) {
        // Si el archivo no existe o hay error, retorna un array vacío.
        if (error.code !== 'ENOENT') {
            console.error("Error al leer equipos_inscritos.json para torneos:", error);
        }
        return [];
    }
}

/**
 * Carga de forma asíncrona la lista de nombres de equipos inscritos de un torneo.
 * @param {string} torneoId - El ID del torneo (ej: "uruguay_open_cup_2v2").
 * @returns {Promise<Array<string>>} Lista de nombres de equipos.
 */
async function obtenerEquiposInscritos(torneoId) {
    try {
        // Lee el archivo de forma asíncrona
        const data = await fs.readFile(RUTA_EQUIPOS_INSCRITOS, "utf8");
        const equipos = JSON.parse(data);
        
        // Filtrar y obtener nombres únicos de equipos del torneo deseado
        const equiposDelTorneo = equipos
            .filter(e => e.torneo === torneoId)
            .map(e => e.nombre);
        
        // Mapear al formato requerido por el autocomplete en el comando principal:
        // El comando 'coordinado_equipos.js' ya se encarga del mapeo final a {name, value}.
        // Aquí solo devolvemos la lista de strings.
        return [...new Set(equiposDelTorneo)];
        
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Error al leer equipos_inscritos.json para equipos:", error);
        }
        return [];
    }
}

module.exports = { obtenerTorneosDisponibles, obtenerEquiposInscritos };
