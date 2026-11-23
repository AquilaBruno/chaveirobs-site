/* Lógica do status de funcionamento (horário de Brasília). Funciona no navegador e no Node (testes). */
(function (root) {
  var WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function brtParts(date, tz) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'America/Sao_Paulo',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    var o = {};
    fmt.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    var h = parseInt(o.hour, 10);
    if (h === 24) h = 0;
    return { weekday: WEEKDAYS[o.weekday], minutes: h * 60 + parseInt(o.minute, 10) };
  }

  function toMin(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  function fmtTime(hhmm) { return hhmm.replace(':', 'h'); }

  function findDay(hours, weekday) {
    for (var i = 0; i < hours.length; i++) if (hours[i].weekday === weekday) return hours[i];
    return null;
  }

  function getStatus(date, hours, tz) {
    var now = brtParts(date, tz);
    var today = findDay(hours, now.weekday);

    if (today && today.open) {
      var o = toMin(today.open), c = toMin(today.close);
      if (now.minutes >= o && now.minutes < c) {
        return { open: true, text: 'Aberto agora', detail: 'Atendemos até às ' + fmtTime(today.close) };
      }
      if (now.minutes < o) {
        return { open: false, text: 'Fechado no momento', detail: 'Abrimos hoje às ' + fmtTime(today.open) };
      }
    }

    for (var i = 1; i <= 7; i++) {
      var d = findDay(hours, (now.weekday + i) % 7);
      if (d && d.open) {
        var name = d.label.toLowerCase();
        var fem = /feira$/.test(name);
        var detail;
        if (i === 1) detail = 'Retornamos amanhã (' + name + ') às ' + fmtTime(d.open);
        else detail = 'Retornamos ' + (fem ? 'na próxima ' : 'no próximo ') + name + ', às ' + fmtTime(d.open);
        return { open: false, text: 'Fechado no momento', detail: detail };
      }
    }
    return { open: false, text: 'Fechado no momento', detail: '' };
  }

  var api = { getStatus: getStatus, brtParts: brtParts };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChaveiroStatus = api;
})(typeof window !== 'undefined' ? window : this);
