(function () {
  var dataEl = document.getElementById('site-data');
  var data = dataEl ? JSON.parse(dataEl.textContent) : null;

  function renderStatus() {
    if (!data || !window.ChaveiroStatus) return;
    var s = window.ChaveiroStatus.getStatus(new Date(), data.hours, data.timezone);
    document.querySelectorAll('[data-status]').forEach(function (el) {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      var t = el.querySelector('[data-status-text]');
      var d = el.querySelector('[data-status-detail]');
      if (t) t.textContent = s.text;
      if (d) d.textContent = s.detail;
      el.removeAttribute('hidden');
    });
    var today = window.ChaveiroStatus.brtParts(new Date(), data.timezone).weekday;
    document.querySelectorAll('[data-weekday]').forEach(function (row) {
      row.classList.toggle('is-today', Number(row.getAttribute('data-weekday')) === today);
    });
  }

  renderStatus();
  setInterval(renderStatus, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) renderStatus(); });

  // Botão flutuante: some enquanto houver um botão de WhatsApp, um aviso de horário ou um item do FAQ
  // visível, para nunca cobrir botões ou conteúdo importante (principalmente no celular).
  var fab = document.querySelector('.fab');
  var inlineBtns = document.querySelectorAll('main .btn-wa, main .alert, main .notice, main .faq summary');
  if (fab && 'IntersectionObserver' in window && inlineBtns.length) {
    var visible = new Set();
    var fabIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      fab.classList.toggle('is-hidden', visible.size > 0);
    }, { threshold: 0 });
    inlineBtns.forEach(function (b) { fabIo.observe(b); });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
