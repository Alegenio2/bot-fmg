const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test-bienvenida')
    .setDescription('Prueba la generación de la imagen de bienvenida con Canvas'),

  async execute(interaction) {
    // Respondemos rápido para evitar el timeout de 3 segundos de Discord
    await interaction.deferReply();

    try {
      const canvas = createCanvas(1028, 468);
      const ctx = canvas.getContext('2d');

      // Rutas de imágenes (ajusta según tu estructura en Square Cloud)
      const backgroundImages = ["./img/bg.png", "./img/bg2.png"];
      const selectedPath = path.resolve(backgroundImages[Math.floor(Math.random() * backgroundImages.length)]);

      // 1. Cargar fondo
      const backgroundImg = await loadImage(selectedPath);
      ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

      // 2. Texto de bienvenida
      ctx.font = 'bold 50px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(`¡Bienvenido, ${interaction.user.username}!`, canvas.width / 2, 100);

      // 3. Cargar y dibujar avatar
      const avatarURL = interaction.user.displayAvatarURL({ size: 1024, extension: "png" });
      const avatar = await loadImage(avatarURL);
      
      // Dibujamos un círculo para el avatar (opcional, para que quede mejor)
      ctx.save();
      ctx.beginPath();
      ctx.arc(875, 205, 75, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, 800, 130, 150, 150);
      ctx.restore();

      // 4. Generar attachment
      const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'test-welcome.png' });

      await interaction.editReply({
        content: `✅ Prueba de canvas exitosa para **${interaction.user.tag}**`,
        files: [attachment]
      });

    } catch (error) {
      console.error("❌ Error en el comando de test:", error);
      await interaction.editReply({ 
        content: `❌ Error al generar la imagen. Revisa los logs en Square Cloud.\nDetalle: \`${error.message}\`` 
      });
    }
  }
};
