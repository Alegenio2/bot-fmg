// utils/guias_interaccion.js
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Mensajes de guía según el tipo
const guias = {
  recs: [
    "📌 **Guía de Recomendaciones:**",
    "1️⃣ Abre Age → Un Jugador → Recs.",
    "2️⃣ Comprimir los archivo .aoe2record.",
    "3️⃣ Usar comando /resultado_equipos y completar los campos."
  ],
  coordinar: [
    "📌 **Guía para Coordinar Partidos:**",
    "1️⃣ Usa `/coordinado_equipos`.",
    "2️⃣ Selecciona torneo y equipos.",
    "3️⃣ Indica fecha y hora."
  ],
  inscripcion: [
    "📌 **Guía de Inscripción:**",
    "1️⃣ Usa `/inscripcion` para inscribirte.",
    "2️⃣ Completa todos los campos obligatorios.",
    "3️⃣ Espera confirmación en el canal de inscripciones."
  ]
};

async function manejarGuias(interaction) {
  try {
    if (!interaction.isButton()) return;

    const tipo = interaction.customId.replace('ver_guia_', '');
    const mensajes = guias[tipo];

    if (!mensajes) {
      return interaction.reply({ content: "❌ Guía desconocida.", ephemeral: true });
    }

    // Mandamos los mensajes uno por uno
    for (const msg of mensajes) {
      await interaction.channel.send(msg);
    }

    // Confirmación al presionar el botón
    await interaction.reply({ content: `✅ Guía enviada: ${tipo}`, ephemeral: true });

  } catch (error) {
    console.error("❌ Error al procesar botones de guía:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Error al enviar la guía.", ephemeral: true });
    }
  }
}

module.exports = { manejarGuias };

