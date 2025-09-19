// updateTitle.js (CommonJS, funciona con node.exe directamente)
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const PREFIX = args[0] || 'Campeonato Uruguayo - Categoría B |';

const filePath = path.join(process.env.APPDATA || '', 'CaptureAge', 'persistedState_prod.json');

function safeReadJson(p) {
  try {
    const txt = fs.readFileSync(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return null;
  }
}

const data = safeReadJson(filePath);
if (!data) {
  console.log(`${PREFIX} No se pudo leer persistedState_prod.json`);
  process.exit(0);
}

const teamsArr = (data.scoreboardState && Array.isArray(data.scoreboardState.teams))
  ? data.scoreboardState.teams.map(t => t.name).filter(Boolean)
  : [];

if (teamsArr.length < 2) {
  console.log(`${PREFIX} Jugadores no detectados.`);
  process.exit(0);
}

const title = `${PREFIX} ${teamsArr[0]} vs ${teamsArr[1]} - AoE2DE`;
console.log(title);
