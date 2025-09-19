// comandos/publicar_tabla.js
const { ApplicationCommandOptionType } = require("discord.js");
const fs = require('fs');
const path = require('path');
const botConfig = require('../botConfig');
const { calcularTablaPosiciones, generarTextoTabla } = require('../utils/tablaPosiciones.js');

module.exports = {
  name: 'publicar_tabla',
  description: 'Publica la tabla de posiciones en el canal correspondiente.',
  options: [
    {
      name: 'categoria',
      description: 'Letra de la categoría',
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: 'Campeón', value: 'a' },
        { name: 'Mandoble', value: 'b' },
        { name: 'Espada Larga', value: 'c' },
        { name: 'Hombre de Armas', value: 'd' },
        { name: 'Milicia', value: 'e' },
      ],
    },
    {
      name: 'fase',
      description: 'Mostrar solo semifinal o final (opcional)',
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: 'Semifinal', value: 'semi' },
        { name: 'Final', value: 'final' },
      ],
    },
  ],
  async execute(interaction) {
    const { options, user, guildId, client } = interaction;
    const categoria = options.getString('categoria');
    const faseElegida = options.getString('fase'); // semi, final o null

    if (user.id !== botConfig.ownerId) {
      return interaction.reply({
        content: "❌ Solo el organizador puede ejecutar este comando.",
        ephemeral: true
      });
    }

    const serverConfig = botConfig.servidores[guildId];
    if (!serverConfig) {
      return interaction.reply({
        content: "⚠️ Este servidor no está configurado en config.json",
        ephemeral: true
      });
    }

    const canalId = serverConfig[`tablaCategoria${categoria.toUpperCase()}`];
    if (!canalId) {
      return interaction.reply({
        content: `⚠️ No se encontró un canal configurado para la categoría ${categoria.toUpperCase()}`,
        ephemeral: true
      });
    }

    const filePath = path.join(__dirname, '..', 'ligas', `liga_${categoria}.json`);
    if (!fs.existsSync(filePath)) {
      return interaction.reply({
        content: `⚠️ No se encontró la liga para la categoría ${categoria}`,
        ephemeral: true
      });
    }

    const liga = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const canal = await client.channels.fetch(canalId);

    if (!serverConfig.mensajeTabla) serverConfig.mensajeTabla = {};

    // ✅ Filtrar jornadas según fase si se eligió
    const jornadasFiltradas = faseElegida
      ? liga.jornadas.filter(j => {
          const rondaStr = String(j.ronda).toLowerCase();
          if (faseElegida === 'semi') return rondaStr.includes('semi');
          if (faseElegida === 'final') return rondaStr.includes('final');
          return false;
        })
      : liga.jornadas;

    // Función auxiliar para enviar o editar mensaje
    async function enviarOEditarMensaje(texto, idGuardadoKey) {
      const mensajeId = serverConfig.mensajeTabla[idGuardadoKey];
      if (mensajeId) {
        try {
          const mensaje = await canal.messages.fetch(mensajeId);
          await mensaje.edit(texto);
          return mensaje.id;
        } catch {
          const nuevoMensaje = await canal.send(texto);
          return nuevoMensaje.id;
        }
      } else {
        const nuevoMensaje = await canal.send(texto);
        return nuevoMensaje.id;
      }
    }

    const posiciones = calcularTablaPosiciones(categoria, jornadasFiltradas); // pasar solo jornadas filtradas
    if (!posiciones || (Array.isArray(posiciones) && posiciones.length === 0)) {
      return interaction.reply({
        content: `⚠️ No se pudo calcular la tabla para la categoría ${categoria}`,
        ephemeral: true
      });
    }

    const texto = generarTextoTabla(posiciones, categoria, faseElegida);
    const mensajeTablaId = await enviarOEditarMensaje(texto, categoria + (faseElegida || ''));
    serverConfig.mensajeTabla[categoria + (faseElegida || '')] = mensajeTablaId;

    fs.writeFileSync(path.join(__dirname, '..', 'botConfig.json'), JSON.stringify(botConfig, null, 2));

    return interaction.reply({
      content: `✅ Tabla publicada para la categoría ${categoria.toUpperCase()}${faseElegida ? ` - ${faseElegida.toUpperCase()}` : ''}.`,
      ephemeral: true
    });
  }
};


