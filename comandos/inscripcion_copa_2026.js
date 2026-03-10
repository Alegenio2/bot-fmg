// comandos/inscripcion_copa_2026.js
const { ejecutarInscripcion } = require('../utils/procesarInscripcion');

module.exports = {
  name: 'inscripcion_copa_2026',
  description: 'Inscripción automática a la Copa 2026 usando tu ID de AoE2.',
  options: [
    { 
      name: 'id_o_link', 
      description: 'Tu ID de AoE2 (ej: 2583713) o el link de tu perfil.', 
      type: ApplicationCommandOptionType.String, 
      required: true 
    },
    { 
      name: 'archivo', 
      description: 'Sube tu logo o una foto de perfil (opcional).', 
      type: ApplicationCommandOptionType.Attachment, 
      required: false 
    },
  ],

  async execute(interaction) {
        const entrada = interaction.options.getString('id_o_link');
        const archivo = interaction.options.getAttachment('archivo');
        const match = entrada.match(/\d+$/);
        
        if (!match) return interaction.reply({ content: "ID inválido.", ephemeral: true });

        await interaction.deferReply(); 
        
        try {
            const res = await ejecutarInscripcion(interaction, match[0], archivo);
            await interaction.editReply(`✅ Inscripción exitosa: ${res.nombre}`);
        } catch (e) {
            await interaction.editReply("❌ Error en la API.");
        }
    }
};
