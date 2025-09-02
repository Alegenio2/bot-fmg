const express = require('express');
const cors = require('cors');
const { Liquipedia } = require('liquipedia');
const fs = require('fs');
const path = require('path');

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


// Endpoint para servir torneo_actual.json
app.get('/api/torneos', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'torneos.json');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Archivo de torneo actual no encontrado' });
  }
  const json = fs.readFileSync(filePath, 'utf-8');
  res.json(JSON.parse(json));
});

app.listen(PORT, () => {
  console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});



