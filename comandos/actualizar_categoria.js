const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const botConfig = require('../botConfig.json');
const {
  guardarYSubirCatA,
  guardarYSubirCatB,
  guardarYSubirCatC,
  guardarYSubirCatD,
  guardarYSubirCatE
} = require('../git/guardarGit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('actualizar_categoria')
    .setDescription('Actualiza la categoría y sube los jugadores a GitHub')
    .addStringOption(option =>
      option
        .setName('categoria')
        .setDescription('Letra de la categoría (a, b, c, d, e)')
        .setRequired(true)
        .addChoices(
          { name: 'A', value: 'a' },
          { name: 'B', value: 'b' },
          { name: 'C', value: 'c' },
          { name: 'D', value: 'd' },
          { name: 'E', value: 'e' }
        )
    ),

  async execute(interaction) {
    const { user, member, guildId, options } = interaction;
    const ownerId = botConfig.ownerId;

    // Verificar permisos: owner o permisos ManageRoles
    const esOwner = user.id === ownerId;
    const tienePermisos = member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!esOwner && !tienePermisos) {
      return interaction.reply({
        content: '⛔ Solo el owner o administradores pueden usar este comando.',
        ephemeral: true
      });
    }

    const letra = options.getString('categoria');
    const configServidor = botConfig.servidores[guildId];
    if (!configServidor) {
      return interaction.reply({ content: '❌ Configuración del servidor no encontrada.', ephemeral: true });
    }

    const rolCategoria = configServidor[`categoria${letra.toUpperCase()}`];
    if (!rolCategoria) {
      return interaction.reply({ content: `❌ No se encontró el rol para la categoría ${letra.toUpperCase()}.`, ephemeral: true });
    }

    await interaction.guild.members.fetch(); // asegurar carga miembros
    const miembrosConRol = interaction.guild.members.cache.filter(m => m.roles.cache.has(rolCategoria));

    const jugadores = miembrosConRol.map(m => ({
      id: m.id,
      nombre: m.user.username
    }));

    const carpeta = path.join(__dirname, '..', 'categorias');
    const archivo = path.join(carpeta, `categoria_${letra}.json`);
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta);

    fs.writeFileSync(archivo, JSON.stringify(jugadores, null, 2), 'utf8');

    // Subir a GitHub según categoría
    if (letra === 'a') await guardarYSubirCatA();
    else if (letra === 'b') await guardarYSubirCatB();
    else if (letra === 'c') await guardarYSubirCatC();
    else if (letra === 'd') await guardarYSubirCatD();
    else if (letra === 'e') await guardarYSubirCatE();
    else return interaction.reply({ content: `⚠️ Subida no configurada para categoría ${letra.toUpperCase()}.`, ephemeral: true });

    return interaction.reply(`✅ Categoría **${letra.toUpperCase()}** actualizada con **${jugadores.length}** jugadores y subida a GitHub.`);
  }
};
