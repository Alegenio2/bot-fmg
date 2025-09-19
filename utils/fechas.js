function convertirFormatoFecha(fecha) {
  let separador = fecha.includes("/") ? "/" : "-";
  const partes = fecha.split(separador);
  if (partes.length !== 3) return null;

  const [diaStr, mesStr, anioStr] = partes;
  const dia = parseInt(diaStr, 10);
  const mes = parseInt(mesStr, 10) - 1;
  const anio = parseInt(anioStr, 10);

  if (isNaN(dia) || isNaN(mes) || isNaN(anio)) return null;
  if (dia < 1 || dia > 31 || mes < 0 || mes > 11 || anio < 2020 || anio > 2100) return null;

  const fechaObj = new Date(anio, mes, dia);
  if (isNaN(fechaObj.getTime())) return null;

  return fechaObj.toISOString().slice(0, 10);
}

function obtenerDiaSemana(fechaString) {
  const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const [anio, mes, dia] = fechaString.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return diasSemana[fecha.getDay()];
}

module.exports = { convertirFormatoFecha, obtenerDiaSemana };
