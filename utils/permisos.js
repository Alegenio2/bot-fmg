const { PermissionsBitField } = require('discord.js');
const botConfig = require('../botConfig.json');

/**
 * Verifica si un usuario es el owner global del bot
 * @param {string} userId
 * @returns {boolean}
 */
function esOwner(userId) {
  return userId === botConfig.ownerId;
}

/**
 * Verifica si un usuario es directivo en un servidor específico
 * @param {string} userId
 * @param {string} guildId
 * @returns {boolean}
 */
function esDirectivo(userId, guildId) {
  const server = botConfig.servidores[guildId];
  if (!server) return false;
  return userId === server.directivos;
}

/**
 * Verifica si un miembro tiene permisos de administrador
 * @param {GuildMember} member
 * @returns {boolean}
 */
function esAdministrador(member) {
  if (!member) return false;
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

/**
 * Verifica si un miembro tiene un rol específico (por ID)
 * @param {GuildMember} member
 * @param {string} rolId
 * @returns {boolean}
 */
function tieneRol(member, rolId) {
  if (!member) return false;
  return member.roles.cache.has(rolId);
}

/**
 * Verifica si un usuario puede ejecutar un comando (owner o directivo)
 * @param {string} userId
 * @param {string} guildId
 * @returns {boolean}
 */
function puedeEjecutar(userId, guildId) {
  return esOwner(userId) || esDirectivo(userId, guildId);
}

module.exports = {
  esOwner,
  esDirectivo,
  esAdministrador,
  tieneRol,
  puedeEjecutar
};
