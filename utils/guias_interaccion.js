// utils/mostrarGuiasModal.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

// Mensajes de guía según tipo
const guias = {
  recs: `📌 Guía de Recomendaciones:\n
1️⃣ Abre Age → Un Jugador → Recs
2️⃣ Comprimir los archivos .aoe2record
3️⃣ Usar comando /resultado_equipos y completar los campos
`,
  coordinar: `📌 Guía para Coordinar Partidos:\n
1️⃣ Usa /coordinado_equipos
2️⃣ Selecciona torneo y equipos
3️⃣ Indica fecha y hora
`,
  inscripcion: `📌 Guía de Inscripción:\n
1️⃣ Usa /inscripcion para inscribirte
2️⃣ Completa todos los campos obligatorios
3️⃣ Espera confirmación en el canal de inscripciones
`
};

async function mostrarGuiaModal(interaction) {
  try {
    if (!interaction.isButton()) return;

    // Sacamos el tipo del customId: "ver_guia_coordinar" → "coordinar"
    const tipo = interaction.customId.split('_')[2];
    const textoGuia = guias[tipo];

    if (!textoGuia) {
      return interaction.reply({ content: "❌ Guía desconocida.", ephemeral: true });
    }

    // Creamos el modal
    const modal = new ModalBuilder()
      .setCustomId(`modal_guia_${tipo}`)
      .setTitle(`Guía: ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);

    const input = new TextInputBuilder()
      .setCustomId('contenido_guia')
      .setLabel('Pasos a seguir')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(textoGuia)
      .setRequired(false);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);

  } catch (error) {
    console.error("❌ Error mostrando modal de guía:", error);
    if (!interaction.replied) {
      await interaction.reply({ content: "❌ Error al mostrar la guía.", ephemeral: true });
    }
  }
}

module.exports = { mostrarGuia };


