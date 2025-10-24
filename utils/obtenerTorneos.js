// utils/obtenerTorneos.js
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");

const RUTA_EQUIPOS_INSCRITOS = path.join(__dirname, "..", "equipos_inscritos.json");

let cacheEquipos = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 1000; // 10 segundos

async function cargarEquipos() {
    // Si ya tenemos el archivo en memoria y no venció el caché
    const stats = fsSync.statSync(RUTA_EQUIPOS_INSCRITOS);
    const mtime = stats.mtimeMs;

    if (cacheEquipos && cacheTimestamp === mtime) {
        return cacheEquipos;
    }

    // Si el archivo cambió, recargamos
    const data = await fs.readFile(RUTA_EQUIPOS_INSCRITOS, "utf8");
    cacheEquipos = JSON.parse(data);
    cacheTimestamp = mtime;

    return cacheEquipos;
}

/**
 * Devuelve torneos únicos en formato {name, value} para autocompletado.
 */
async function obtenerTorneosDisponibles() {
    try {
        const equipos = await cargarEquipos();
        const torneosUnicos = [...new Set(equipos.map(e => e.torneo))];
        return torneosUnicos.map(t => ({ name: t, value: t }));
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Error al leer equipos_inscritos.json para torneos:", error);
        }
        return [];
    }
}

/**
 * Devuelve los equipos inscritos de un torneo (solo nombres).
 */
async function obtenerEquiposInscritos(torneoId) {
    try {
        const equipos = await cargarEquipos();
        const equiposDelTorneo = equipos
            .filter(e => e.torneo === torneoId)
            .map(e => e.nombre);
        return [...new Set(equiposDelTorneo)];
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error("Error al leer equipos_inscritos.json para equipos:", error);
        }
        return [];
    }
}

module.exports = { obtenerTorneosDisponibles, obtenerEquiposInscritos };
