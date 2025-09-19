// comandos/listar_inscriptos.js
const fs = require('fs');
const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const botConfig = require('../botConfig.json');

module.exports = {
  name: 'listar_inscriptos',
  description: 'Muestra un listado de todos los inscriptos ordenados por ELO promedio y exporta CSV.',

  async execute(interaction) {
    const member = interaction.member;
    const ROL_AUTORIZADO = botConfig.directivos;

    if (!member.roles.cache.has(ROL_AUTORIZADO)) {
      return interaction.reply({
        content: '🚫 No tenés permisos para usar este comando.',
        ephemeral: true
      });
    }

    const letras = ['a', 'b', 'c', 'd', 'e'];
    const inscriptos = [];

    for (const letra of letras) {
      const filePath = path.join(__dirname, '..', 'ligas', `liga_${letra}.json`);
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          if (!Array.isArray(data.participantes)) {
            console.warn(`⚠️ El archivo liga_${letra}.json no tiene un array 'participantes' válido.`);
            continue;
          }
          for (const jugador of data.participantes) {
            const promedio = Math.round(((jugador.elo || 0) + (jugador.elomax || 0)) / 2);
            inscriptos.push({
              nombre: jugador.nombre,
              promedio,
              categoria: letra.toUpperCase(),
              pais: jugador.pais || ''
            });
          }
        } catch (error) {
          console.warn(`❌ Error leyendo liga_${letra}.json:`, error.message);
        }
      }
    }

    if (inscriptos.length === 0) {
      return interaction.reply('⚠️ No se encontraron inscriptos.');
    }

    // Ordenar por promedio descendente
    inscriptos.sort((a, b) => b.promedio - a.promedio);

    // Crear CSV
    const csvHeader = 'Nombre,Promedio,Categoría,País\n';
    const csvBody = inscriptos.map(j => `${j.nombre},${j.promedio},${j.categoria},${j.pais}`).join('\n');
    const csvContent = csvHeader + csvBody;

    const csvPath = path.join(__dirname, '..', 'inscriptos.csv');
    fs.writeFileSync(csvPath, csvContent, 'utf8');

    const archivo = new AttachmentBuilder(csvPath, { name: 'inscriptos.csv' });

    await interaction.reply({
      content: `📋 Inscriptos exportados correctamente (${inscriptos.length} jugadores):`,
      files: [archivo]
    });

    // Limpieza opcional del archivo temporal
    setTimeout(() => fs.existsSync(csvPath) && fs.unlinkSync(csvPath), 30000);
  }
};
