// utiles/guardarTorneos.js
const fs = require("fs");
const { Liquipedia } = require("liquipedia");

const liquipedia = new Liquipedia({
  USER_AGENT: "aldeano-oscar/1.0 (jabstv2@gmail.com)",
});

async function guardarTorneos() {
  try {
    const ahora = new Date();

    const estaActivo = (torneo) =>
      new Date(torneo.start) <= ahora && new Date(torneo.end) >= ahora;

    const esTierValido = (torneo) =>
      torneo.tier === "Age_of_Empires_II/S-Tier_Tournaments" ||
      torneo.tier === "Age_of_Empires_II/A-Tier_Tournaments";

    const tournaments = await liquipedia.aoe.getUpcomingTournaments("Age of Empires II");

    // Mostrar todos los datos crudos antes de filtrar
    console.log("🔎 Datos recibidos desde Liquipedia:");
    console.dir(tournaments, { depth: null });

    const torneosFiltrados = tournaments.filter(esTierValido);
    fs.writeFileSync(
      "./data/tournaments.json",
      JSON.stringify(torneosFiltrados, null, 2)
    );

    const torneoActual = torneosFiltrados.find(estaActivo);
    if (torneoActual) {
      fs.writeFileSync(
        "./data/torneo_actual.json",
        JSON.stringify(torneoActual, null, 2)
      );
    } else {
      fs.writeFileSync(
        "./data/torneo_actual.json",
        JSON.stringify({ mensaje: "No hay torneos activos" }, null, 2)
      );
    }

    console.log("✅ Torneos guardados exitosamente");
  } catch (error) {
    console.error("❌ Error al guardar torneos:", error);
  }
}

module.exports = { guardarTorneos };

