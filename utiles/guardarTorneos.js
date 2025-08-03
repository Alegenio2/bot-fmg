// utiles/guardarTorneos.js
const fs = require("fs");
const { Liquipedia, GameVersion, Age2TournamentCategory } = require("liquipedia");

const liquipedia = new Liquipedia({
  USER_AGENT: "aldeano-oscar/1.0 (jabstv2@gmail.com)",
});

async function guardarTorneos() {
  try {
    const ahora = new Date();

    const estaActivo = (torneo) =>
      torneo.start && torneo.end &&
      new Date(torneo.start) <= ahora && new Date(torneo.end) >= ahora;

    const esTierValido = (torneo) =>
      torneo.tier === Age2TournamentCategory.TierS ||
      torneo.tier === Age2TournamentCategory.TierA;

    const tournaments = await liquipedia.aoe.getAllTournaments();

    const torneosAoE2 = tournaments.filter(
      (t) => t.game === GameVersion.Age2
    );

    const torneosFiltrados = torneosAoE2.filter(esTierValido);
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

