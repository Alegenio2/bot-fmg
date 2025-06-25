const express = require('express');
const { Liquipedia } = require('liquipedia');

const app = express();
const PORT = process.env.PORT || 8080;

const liquipedia = new Liquipedia({
  USER_AGENT: 'aldeano-oscar/1.0 (jabstv2@gmail.com)'
});

app.get('/', (req, res) => {
  res.send("Estoy vivo 🤖 - Aldeano Oscar");
});

// Nuevo endpoint con tier específico futuros
app.get('/api/tournaments', async (req, res) => {
  try {
    const tournaments = await liquipedia.aoe.getUpcomingTournaments("Age of Empires II");
    res.json(tournaments);
  } catch (error) {
    console.error('Error al obtener torneos:', error);
    res.status(500).json({ error: error.message });
  }
});
// Nuevo endpoint con tier específico actual
app.get('/api/torneo-actual', async (req, res) => {
  const ahora = new Date();

  const estaActivo = (torneo) =>
    new Date(torneo.start) <= ahora && new Date(torneo.end) >= ahora;

  const esTierValido = (torneo) =>
    torneo.tier === 'Age_of_Empires_II/S-Tier_Tournaments' ||
    torneo.tier === 'Age_of_Empires_II/A-Tier_Tournaments';

  try {
    const torneos = await liquipedia.aoe.getUpcomingTournaments("Age of Empires II");

    const torneoActual = torneos.find(
      (t) => estaActivo(t) && esTierValido(t)
    );

    if (torneoActual) {
      res.json(torneoActual);
    } else {
      res.status(404).json({ mensaje: 'No hay torneos en curso (S/A Tier)' });
    }
  } catch (error) {
    console.error('Error al obtener torneo actual:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});
