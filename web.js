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

// Nuevo endpoint con tier específico
app.get('/api/tournaments', async (req, res) => {
  try {
    const tournaments = await liquipedia.aoe.getUpcomingTournaments("Age of Empires II");
    res.json(tournaments);
  } catch (error) {
    console.error('Error al obtener torneos:', error);
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});
