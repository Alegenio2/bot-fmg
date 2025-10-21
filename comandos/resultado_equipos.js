// comandos/resultado_equipos.js
const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { convertirFormatoFecha } = require("../utils/fechas");
const { guardarTorneo } = require("../utils/guardarTorneo");
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName("resultado_equipos")
    .setDescription("Registra el resultado de un partido de equipos")
    .addStringOption((opt) =>
      opt
        .setName("torneo")
        .setDescription("Selecciona el torneo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("equipo1")
        .setDescription("Primer equipo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("puntos_equipo1")
        .setDescription("Puntos del primer equipo")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("equipo2")
        .setDescription("Segundo equipo")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("puntos_equipo2")
        .setDescription("Puntos del segundo equipo")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("fecha")
        .setDescription("Fecha del partido DD-MM-YYYY")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("draftmapas")
        .setDescription("Draft de mapas")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("draftcivis")
        .setDescription("Draft de civilizaciones")
        .setRequired(false)
    )
    .addAttachmentOption((opt) =>
      opt
        .setName("archivo")
        .setDescription("Archivo adjunto opcional")
        .setRequired(false)
    ),

 async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true); // option con nombre y valor
    const torneosPath = path.join(__dirname, '..', 'torneos');
    const files = fs.readdirSync(torneosPath).filter(f => f.endsWith('.json'));
    const torneos = files.map(f => f.replace('.json', ''));

    // Autocomplete para el nombre del torneo
    if (focusedOption.name === 'torneo') {
      const filtered = torneos.filter(t => t.toLowerCase().includes(focusedOption.value.toLowerCase()));
      await interaction.respond(filtered.map(t => ({ name: t, value: t })));
      return;
    }

    // Autocomplete para los equipos
    if (focusedOption.name === 'equipo1' || focusedOption.name === 'equipo2') {
      const torneoId = interaction.options.getString('torneo');
      if (!torneoId) {
        await interaction.respond([]);
        return;
      }

      const filePath = path.join(torneosPath, `${torneoId}.json`);
      if (!fs.existsSync(filePath)) {
        await interaction.respond([]);
        return;
      }

      const torneo = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Extraemos todos los nombres de equipos de grupos y eliminatorias
      let equipos = [];

      if (torneo.grupos) {
        torneo.grupos.forEach(g => {
          if (g.equipos) equipos.push(...g.equipos.map(eq => eq.nombre || eq));
        });
      }

      if (torneo.eliminatorias) {
        torneo.eliminatorias.forEach(fase => {
          fase.partidos.forEach(p => {
            if (p.equipo1Nombre) equipos.push(p.equipo1Nombre);
            if (p.equipo2Nombre) equipos.push(p.equipo2Nombre);
          });
        });
      }

      // Eliminamos duplicados y valores no strings
      equipos = [...new Set(equipos.filter(e => typeof e === 'string'))];

      const filtered = equipos.filter(e => e.toLowerCase().includes(focusedOption.value.toLowerCase()));
      await interaction.respond(filtered.map(e => ({ name: e, value: e })));
    }
  },


  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const torneoId = interaction.options.getString("torneo");
    const eq1 = interaction.options.getString("equipo1");
    const eq2 = interaction.options.getString("equipo2");
    const puntosEq1 = interaction.options.getInteger("puntos_equipo1");
    const puntosEq2 = interaction.options.getInteger("puntos_equipo2");
    const fecha = interaction.options.getString("fecha");
    const horario = interaction.options.getString("horario");
    const draftmapas = interaction.options.getString("draftmapas") || null;
    const draftcivis = interaction.options.getString("draftcivis") || null;
    const archivoAdjunto =
      interaction.options.getAttachment("archivo")?.url || null;

    const filePath = path.join(__dirname, "..", "torneos", `${torneoId}.json`);
    if (!fs.existsSync(filePath))
      return interaction.editReply({
        content: `⚠️ No se encontró el torneo ${torneoId}`,
        ephemeral: true,
      });

    const torneo = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const fechaISO = convertirFormatoFecha(fecha);

    if (!fechaISO)
      return interaction.editReply({
        content: "❌ Fecha inválida DD-MM-YYYY",
        ephemeral: true,
      });

    let partidoEncontrado = false;

 
  // Buscar partido en rondas de grupos
for (const ronda of torneo.rondas_grupos || []) {
  for (const grupo of ronda.partidos || []) {
    for (const partido of grupo.partidos || []) {
      if (
        (partido.equipo1Nombre === eq1 && partido.equipo2Nombre === eq2) ||
        (partido.equipo1Nombre === eq2 && partido.equipo2Nombre === eq1)
      ) {
        partido.resultado = {
          [eq1]: puntosEq1,
          [eq2]: puntosEq2,
          fecha: fechaISO,
          draftmapas,
          draftcivis,
          archivo: archivoAdjunto,
        };
        partidoEncontrado = true;
        break;
      }
    }
    if (partidoEncontrado) break;
  }
  if (partidoEncontrado) break;
}


    // Buscar partido en eliminatorias si no se encontró en grupos
    if (!partidoEncontrado) {
      for (const fase of torneo.eliminatorias || []) {
        for (const partido of fase.partidos || []) {
          if (
            (partido.equipo1Nombre === eq1 && partido.equipo2Nombre === eq2) ||
            (partido.equipo1Nombre === eq2 && partido.equipo2Nombre === eq1)
          ) {
            partido.resultado = {
              [eq1]: puntosEq1,
              [eq2]: puntosEq2,
              fecha: fechaISO,
              draftmapas,
              draftcivis,
              archivo: archivoAdjunto,
            };
            partidoEncontrado = true;
            break;
          }
        }
        if (partidoEncontrado) break;
      }
    }

    if (!partidoEncontrado)
      return interaction.editReply({
        content: `⚠️ No se encontró el partido ${eq1} vs ${eq2} en el torneo.`,
        ephemeral: true,
      });

    await guardarTorneo(torneo, filePath, interaction);

    // Actualizamos eliminatorias automáticamente
    const {
      actualizarEliminatorias,
    } = require("../utils/actualizarEliminatorias.js");
    await actualizarEliminatorias(torneo, filePath, interaction);

  // Después de guardar los resultados y actualizar eliminatorias
// Después de guardar los resultados y actualizar eliminatorias
const { calcularTablaPosiciones } = require("../utils/calcularTablaPosiciones.js");
const { tablaTorneoEquipos } = require("../utils/tablaTorneoEquipos.js");

const tablas = calcularTablaPosiciones(torneo);
await tablaTorneoEquipos(interaction.client, torneo, tablas);
    
// Determinar color según resultado
let colorEmbed = '#0c74f5';
if (puntosEq1 > puntosEq2) colorEmbed = '#16a34a'; // verde
else if (puntosEq1 < puntosEq2) colorEmbed = '#dc2626'; // rojo

// Crear embed con estilo moderno pero manteniendo los spoilers
const embedResultado = new EmbedBuilder()
  .setTitle('🏆 Resultado de Partido')
  .setDescription(`**${eq1}** 🆚 **${eq2}**`)
  .addFields(
    {
      name: '📊 Marcador',
      value: `**${eq1}** ||${puntosEq1}|| - ||${puntosEq2}|| **${eq2}**`,
      inline: true,
    },
    { name: '📅 Fecha', value: fecha, inline: true },
    { name: '🗺️ Draft de Mapas', value: draftmapas || 'No disponibles', inline: false },
    { name: '⚔️ Draft de Civilizaciones', value: draftcivis || 'No disponibles', inline: false },
    {
      name: '📁 Archivo adjunto',
      value: archivoAdjunto ? `[Ver archivo](${archivoAdjunto})` : 'No adjunto',
      inline: false,
    }
  )
  .setColor(colorEmbed)
  .setThumbnail('https://cdn-icons-png.flaticon.com/512/149/149097.png') // reemplazalo por tu logo si querés
  .setFooter({
    text: `Registrado por ${interaction.user.username}`,
    iconURL: interaction.user.displayAvatarURL(),
  })
  .setTimestamp();

// Mostrar el resultado públicamente en el canal
await interaction.channel.send({ embeds: [embedResultado] });

// Confirmar en privado al organizador
await interaction.editReply({
  content: "✅ Resultado registrado correctamente y publicado en el canal.",
  ephemeral: true,
});


  },
};

