//comandos/inscripcion_copa_2026.js
const { ApplicationCommandOptionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const fs = require('fs');
const path = require('path');
const { asociarUsuario } = require('../utils/asociar.js');
const { guardarYSubirUsuarios1v1 } = require('../git/guardarInscripcionesGit.js'); // Ajusta la ruta si es necesario

module.exports = {
  name: 'inscripcion_copa_2026', // Nombre único para el comando
  description: 'Inscripción exclusiva para la Copa Uruguaya 2026 (1v1).',
  options: [
    {
      name: 'nombre',
      description: 'Tu Nick en Steam / AoE2.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'eloactual',
      description: 'Tu Elo actual en 1v1 Random Map.',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'elomaximo',
      description: 'Tu Elo máximo alcanzado.',
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
    {
      name: 'link',
      description: 'Link de tu perfil en AoE2 Companion.',
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: 'archivo',
      description: 'Sube tu logo o una foto de perfil.',
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
  ],

  async execute(interaction) {
    const { options, user, member, guild } = interaction;
    const configServidor = require('../botConfig').servidores[guild.id];

    // 1. Validaciones iniciales
    const link = options.getString('link');
    const match = link.match(/^https:\/\/(www\.)?aoe2companion\.com\/players\/(\d+)$/);
    
    if (!match) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Buscar Perfil")
          .setStyle(ButtonStyle.Link)
          .setURL("https://www.aoe2companion.com/")
      );
      return interaction.reply({
        content: "❌ URL no válida. Debe ser de AoE2 Companion.",
        components: [row],
        ephemeral: true
      });
    }

    // 2. Procesamiento de datos
    const nombre = options.getString('nombre');
    const eloactual = options.getNumber('eloactual');
    const elomaximo = options.getNumber('elomaximo');
    const promedio = Math.round((eloactual + elomaximo) / 2);
    const archivoAdjunto = options.getAttachment('archivo');
    const aoeId = match[2];

    // Asociar cuenta (tu utilidad existente)
    asociarUsuario(user.id, aoeId);

    // 3. Guardar en usuarios_inscritos.json para el generador de torneos
    const rutaInscritos = path.join(__dirname, '..', 'usuarios_inscritos.json');
    let inscritos = [];
    if (fs.existsSync(rutaInscritos)) {
      inscritos = JSON.parse(fs.readFileSync(rutaInscritos, 'utf8'));
    }

    const datosJugador = {
      id: user.id,
      torneo: "copa_uruguaya_2026", // ID constante para este torneo
      modo: "1v1",
      nombre: nombre,
      elo_actual: eloactual,
      elo_max: elomaximo,
      promedio_elo: promedio,
      perfil: link,
      logo: archivoAdjunto ? archivoAdjunto.url : null,
      fecha: new Date().toISOString()
    };

    // Evitar duplicados o actualizar datos
    const index = inscritos.findIndex(u => u.id === user.id && u.torneo === "copa_uruguaya_2026");
    if (index !== -1) {
      inscritos[index] = datosJugador;
    } else {
      inscritos.push(datosJugador);
    }
    fs.writeFileSync(rutaInscritos, JSON.stringify(inscritos, null, 2), 'utf8');
    // NUEVO: Subir a GitHub inmediatamente
    await guardarYSubirUsuarios1v1();
    
    // 4. Asignación de Roles
    try {
      if (member && configServidor) {
        // Rol general de inscripto
        if (configServidor.rolInscripto) await member.roles.add(configServidor.rolInscripto);
        // Rol específico de la Copa 2026
        if (configServidor.rolcopauruguaya2026) await member.roles.add(configServidor.rolcopauruguaya2026);
      }
    } catch (error) {
      console.error("Error asignando roles:", error);
    }

    // 5. Confirmación
    await interaction.reply({
      content: `✅ **¡Inscripción confirmada!**\n` +
               `🏆 **Torneo**: Copa Uruguaya 2026\n` +
               `👤 **Jugador**: ${nombre}\n` +
               `📊 **Promedio ELO**: ${promedio}\n` +
               `✨ Tienes asignado el rol <@&${configServidor.rolcopauruguaya2026}>`,
      ephemeral: false
    });
  }
};
