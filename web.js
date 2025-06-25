const express = require('express');
const cors = require('cors');
const { Liquipedia } = require('liquipedia');

const app = express();
const PORT = process.env.PORT || 8080;

// Habilitar CORS solo para AUA
app.use(cors({
  origin: 'https://aua.netlify.app'
}));

const liquipedia = new Liquipedia({
  USER_AGENT: 'aldeano-oscar/1.0 (jabstv2@gmail.com)'
});

app.get('/', (req, res) => {
  res.send("Estoy vivo 🤖 - Aldeano Oscar");
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const tournaments = await liquipedia.aoe.getUpcomingTournaments("Age of Empires II");
    res.json(tournaments);
  } catch (error) {
    console.error('Error al obtener torneos:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/torneo-actual', async (req, res) => {
  const ahora = new Date();
  const estaActivo = (torneo) =>
    new Date(torneo.start) <= ahora && new Date(torneo.end) >= ahora;

  const buscarTorneoEnTier = async (tier) => {
    const torneos = await liquipedia.aoe.getTournaments(tier);
    const planos = torneos.flatMap(grupo => grupo.data);
    return planos.find(estaActivo);
  };

  try {
    let torneo = await buscarTorneoEnTier('S-Tier');
    if (!torneo) {
      torneo = await buscarTorneoEnTier('A-Tier');
    }

    if (torneo) {
      res.json(torneo);
    } else {
      res.status(404).json({ mensaje: 'No hay torneos en curso' });
    }
  } catch (error) {
    console.error('Error al obtener torneo actual:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});

