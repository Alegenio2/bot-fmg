function validarYFormatearHorario(horario) {
  const regex = /^(\d{1,2})[:.](\d{2})$/;
  const match = horario.match(regex);
  if (!match) return null;

  let [_, horas, minutos] = match;
  horas = parseInt(horas, 10);
  minutos = parseInt(minutos, 10);

  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return null;

  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

module.exports = { validarYFormatearHorario };
