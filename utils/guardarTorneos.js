// utils/guardarTorneos.js
const fs = require("fs").promises;
const { Liquipedia, GameVersion, Age2TournamentCategory } = require("liquipedia");

const liquipedia = new Liquipedia({
  USER_AGENT: "aldeano-oscar/1.0 (jabstv2@lo.com)"
});

async function guardarTorneosFiltrados() {
  try {
    // Traemos todos los torneos y los próximos
    const todos = await liquipedia.aoe.getAllTournaments();
    const proximos = await liquipedia.aoe.getUpcomingTournaments(GameVersion.Age2);

    const hoy = new Date();
    const inicioAnio = new Date(hoy.getFullYear(), 0, 1); // 0 = enero, 1 = primer día

    const activosOProximos = proximos.concat(todos).filter(t => {
      if (!t.start) return false;
      const start = new Date(t.start);
      const end = t.end ? new Date(t.end) : null;

      // Torneo activo o próximo
      const activoOP = start >= hoy || (end && start <= hoy && end >= hoy);

      // Torneo dentro del año actual
      const esAnioActual = start >= inicioAnio && start.getFullYear() === hoy.getFullYear();

      return activoOP || esAnioActual;
    });

    // Filtramos por Tier y Qualifier
    const filtrados = activosOProximos.filter(t => {
      // Solo TierS o TierA
      const esTier = t.tier === Age2TournamentCategory.TierS || t.tier === Age2TournamentCategory.TierA;

      // Verificamos si existe un Qualifier relacionado
      const tieneQualifier = todos.some(q =>
        q.tier === Age2TournamentCategory.Qualifiers && q.name.includes(t.name)
      );

      return esTier || tieneQualifier;
    });

    // Guardamos en JSON
    await fs.writeFile("./data/torneos.json", JSON.stringify(filtrados, null, 2));
    console.log(`✅ ${filtrados.length} torneos guardados en data/torneos.json`);
  } catch (err) {
    console.error("❌ Error guardando torneos filtrados:", err);
    throw err;
  }
}

module.exports = { guardarTorneosFiltrados };
