const express = require('express');
const cors = require('cors');
const { Liquipedia } = require('liquipedia');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // 👈 importante para hacer el proxy

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

// ✅ Nuevo endpoint para proxy de imágenes
app.get('/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send("Falta parámetro 'url'");
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" } // simula navegador
    });

    if (!response.ok) {
      return res.status(response.status).send("No se pudo cargar la imagen");
    }

    const contentType = response.headers.get("content-type");
    res.set("Content-Type", contentType);

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Error en proxy-image:", err);
    res.status(500).send("Error al cargar la imagen");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor web escuchando en http://localhost:${PORT}`);
});
