const express   = require('express');
const cors      = require('cors');
const http      = require('http');
const WebSocket = require('ws');
const fs        = require('fs');
const path      = require('path');
const fetch     = require('node-fetch');
const jwt       = require('jsonwebtoken');
const crypto    = require('crypto');

// ── Auth config (desde variables de entorno) ──────────────────────────────────
const PASS_DRAFT   = process.env.ADMIN_PASSWORD_DRAFT   || 'draft-cambiar';
const PASS_CONTROL = process.env.ADMIN_PASSWORD_CONTROL || 'control-cambiar';
const JWT_SECRET   = process.env.JWT_SECRET             || crypto.randomBytes(32).toString('hex');
const GH_TOKEN     = process.env.GH_TOKENO              || '';
const JWT_EXPIRES  = '12h';

// ── Middleware de autenticación ───────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.query.token || '';
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch(e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 8080;

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server });

// Último estado de cada canal (para enviar al reconectar)
const lastState = {
  overlay: null,
  mapa:    null,
  draft:   null,
};

wss.on('connection', (ws, req) => {
  const url   = new URL(req.url, 'http://localhost');
  const canal = url.searchParams.get('canal') || 'overlay';
  ws.canal    = canal;
  console.log(`[WS] conectado — canal: ${canal} | clientes: ${wss.clients.size}`);

  // Enviar último estado conocido al conectar
  if (lastState[canal]) {
    ws.send(JSON.stringify(lastState[canal]));
  }

  ws.on('close', () => console.log(`[WS] desconectado — canal: ${canal}`));
  ws.on('error', err => console.error('[WS] error:', err.message));
});

function broadcast(canal, data) {
  lastState[canal] = data;
  const msg = JSON.stringify(data);
  let count = 0;
  wss.clients.forEach(ws => {
    if (ws.canal === canal && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
      count++;
    }
  });
  console.log(`[WS] broadcast → canal:${canal} | ${count} clientes`);
}

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['https://aua.netlify.app', 'https://aldeanooscar.squareweb.app'] }));
app.use(express.json({ limit: '2mb' }));

// ── Auth endpoints ───────────────────────────────────────────────────────────
// Login admindraft
app.post('/auth/login/draft', (req, res) => {
  const { password } = req.body;
  if (!password || password !== PASS_DRAFT) {
    console.log('[auth] intento fallido — draft');
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = jwt.sign({ role: 'draft' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  console.log('[auth] login OK — draft');
  res.json({ token, expiresIn: JWT_EXPIRES });
});

// Login overlay control
app.post('/auth/login/control', (req, res) => {
  const { password } = req.body;
  if (!password || password !== PASS_CONTROL) {
    console.log('[auth] intento fallido — control');
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
  const token = jwt.sign({ role: 'control' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  console.log('[auth] login OK — control');
  res.json({ token, expiresIn: JWT_EXPIRES });
});

// Verify token (ambos roles)
app.get('/auth/verify', requireAuth, (req, res) => {
  res.json({ ok: true, role: req.user.role });
});

// GitHub token — solo disponible si el cliente está autenticado
app.get('/auth/gh-token', requireAuth, (req, res) => {
  if (!GH_TOKEN) return res.status(404).json({ error: 'GH_TOKEN no configurado en el servidor' });
  res.json({ token: GH_TOKEN });
});

// Servir archivos estáticos desde /public
// (la protección de páginas admin la hace el JS del cliente via checkAuth())
app.use(express.static(path.join(__dirname, 'public')));

// ── Endpoints existentes ──────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Estoy vivo 🤖 - Aldeano Oscar'));

app.get('/api/torneos', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'torneos.json');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No encontrado' });
  res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
});

app.get('/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send("Falta parámetro 'url'");
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) return res.status(response.status).send('No se pudo cargar');
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    res.status(500).send('Error al cargar la imagen');
  }
});

// ── Stats del torneo (para el dashboard AUA y el overlay_control) ─────────────
app.get('/api/stats', (req, res) => {
  const p = path.join(__dirname, 'torneos', 'stats_copa_2026.json');
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Sin stats aún' });
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

// ── Datos tabla posiciones (para overlays y dashboard AUA) ───────────────────────────────
app.get('/api/torneos/tabla_posiciones', (req, res) => {
  const filePath = path.join(__dirname, 'torneos', 'tabla_posiciones.json');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "Tabla no generada" });
  }
});

// ── Datos de un torneo específico (para overlays) ───────────────────────────────
app.get('/api/torneos/:archivo', (req, res) => {
  let archivo = req.params.archivo;
  // Sanitizar: solo permitir archivos JSON en la carpeta torneos
  if (archivo.includes('..') || archivo.includes('/') || archivo.includes('\\')) {
    return res.status(400).json({ error: 'Archivo inválido' });
  }
  // Agregar extensión si no la tiene
  if (!archivo.endsWith('.json')) {
    archivo = archivo + '.json';
  }
  const p = path.join(__dirname, 'torneos', archivo);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Torneo no encontrado' });
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

// ── Mapas (para overlay_control y overlay_maps) ───────────────────────────────
app.get('/api/mapas', (req, res) => {
  const p = path.join(__dirname, 'public', 'mapas.json');
  if (!fs.existsSync(p)) return res.status(404).json({});
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

// ── Civs por mapa (top 5 por mapa) ───────────────────────────────────────────
app.get('/api/civs-mapa', (req, res) => {
  const p = path.join(__dirname, 'public', 'civs_por_mapa.json');
  if (!fs.existsSync(p)) return res.status(404).json({});
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

// ── Overlay: estado actual (fallback si WS no conectó aún) ───────────────────
app.get('/api/overlay/:canal', (req, res) => {
  const canal = req.params.canal;
  res.json(lastState[canal] || { visible: false, ts: 0 });
});

// ── Overlay: actualizar draft (desde admindraft) ─────────────────────────────
app.post('/overlay/draft', requireAuth, (req, res) => {
  const state = { ...req.body, ts: Date.now() };
  broadcast('draft', state);
  console.log(`[overlay] draft actualizado`);
  res.json({ ok: true, ts: state.ts });
});

// ── Overlay: actualizar stats (desde overlay_control) ────────────────────────
app.post('/overlay/update', requireAuth, (req, res) => {
  const state = { ...req.body, ts: Date.now() };
  broadcast('overlay', state);
  console.log(`[overlay] update → visible:${state.visible} modo:${state.modo}`);
  res.json({ ok: true, ts: state.ts });
});

// ── Overlay: actualizar mapa (desde overlay_control) ─────────────────────────
app.post('/overlay/mapa', requireAuth, (req, res) => {
  const state = { ...req.body, ts: Date.now() };
  broadcast('mapa', state);
  console.log(`[overlay] mapa → ${state.name || 'oculto'}`);
  res.json({ ok: true, ts: state.ts });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    wsClients: wss.clients.size,
    timestamp: new Date().toISOString(),
  });
});

// ── Arrancar ──────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Oscar activo en puerto ${PORT}`);
  console.log(`   Overlays: https://aldeanooscar.squareweb.app/overlay.html`);
  console.log(`   Control:  https://aldeanooscar.squareweb.app/overlay_control.html`);
  console.log(`   Draft:    https://aldeanooscar.squareweb.app/draftoverlay.html`);
});
