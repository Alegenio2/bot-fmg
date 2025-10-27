//utils/guias_interaccion.js
const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = async function manejarGuias(interaction) {
  if (!interaction.isButton()) return;

  const guias = {
    ver_guia_coordinar: {
      titulo: '📘 Guía para Coordinar Partidas',
      pasos: '1️⃣ Usa /coordinado_equipos\n2️⃣ Selecciona torneo y equipos\n3️⃣ Indica fecha y hora\n4️⃣ El bot confirmará con un embed.'
    },
    ver_guia_recs: {
      titulo: '💾 Guía para Enviar RECs',
      pasos: '1️⃣ Abre Age → Un Jugador → Recs \n2️⃣ Comprimir los archivo .aoe2record \n3️⃣ Usar comando /resultado_equipos y completar los campos'
    },
    ver_guia_inscripcion: {
      titulo: '📝 Guía de Inscripción',
      pasos: '1️⃣ Usa /inscribirequipo\n2️⃣ Completa datos\n3️⃣ Espera confirmación del bot o admin.'
    }
  };

  const guia = guias[interaction.customId];
  if (!guia) return;

  const modal = new ModalBuilder().setCustomId(`${interaction.customId}_modal`).setTitle(guia.titulo);
  const texto = new TextInputBuilder()
    .setCustomId('texto_guia')
    .setLabel('Pasos')
    .setStyle(TextInputStyle.Paragraph)
    .setValue(guia.pasos)
    .setRequired(false);

  const fila = new ActionRowBuilder().addComponents(texto);
  modal.addComponents(fila);

  await interaction.showModal(modal);
};
