// Gera dist/ (HTML estático + SEO) a partir de site.config.json
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const wa = (msg) => `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(msg)}`;
const fmt = (t) => t.replace(':', 'h');
const a = cfg.address;
const fullAddress = `${a.street} – ${a.neighborhood}, ${a.city} – ${a.state}`;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.street}, ${a.neighborhood}, ${a.city} - ${a.state}`)}`;
const domain = cfg.domain ? cfg.domain.replace(/\/$/, '') : '';
const site = domain || 'https://SEU-DOMINIO.com.br';
if (!domain) console.warn('AVISO: "domain" vazio em site.config.json — canonical omitido; sitemap/robots usam domínio provisório.');

const weekdays = cfg.hours.filter((h) => h.open);
const sameHours = weekdays.every((h) => h.open === weekdays[0].open && h.close === weekdays[0].close);
const hoursShort = sameHours
  ? `segunda a sexta, das ${fmt(weekdays[0].open)} às ${fmt(weekdays[0].close)}`
  : 'consulte os horários abaixo';
const hoursCap = hoursShort.charAt(0).toUpperCase() + hoursShort.slice(1);

// ---------- ícones ----------
const paths = {
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
  car: '<path d="M4 16v-4l2-5h12l2 5v4"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13" r=".8"/><circle cx="16.5" cy="13" r=".8"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  doc: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/>',
  remote: '<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="8" r="1.5"/><path d="M10 13h4M10 17h4"/>',
  watch: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 7l1-4h4l1 4M9 17l1 4h4l1-4M12 10v2l1.5 1"/>',
  camera: '<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
};
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
${Object.entries(paths).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${v}</symbol>`).join('\n')}
<symbol id="i-wa" viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path fill="currentColor" d="M16.3 14.2c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1l-.7.9c-.1.1-.3.2-.5.1-.8-.4-1.6-.8-2.3-1.6-.5-.5-.9-1.1-1.1-1.5-.1-.2 0-.3.1-.4l.4-.5.2-.4v-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.5 1.4.6 2 .6 2.7.5.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1l-.5-.2z"/></symbol>
</defs></svg>`;
const icon = (n, cls = '') => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;

// ---------- logotipo (vetor redesenhado a partir do arquivo enviado) ----------
const logoSvg = (cls = 'logo', label = 'Logotipo Chaveiro BS') => `<svg class="${cls}" viewBox="280 194 1164 1768" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
<path fill="currentColor" d="M284 250h190v69h169V198h185v121h69V198h185v121h169v-69h189v241H284z"/>
<text x="882" y="437" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="110" letter-spacing="40" style="fill:var(--logo-cut)">CHAVEIRO</text>
<path fill="currentColor" fill-rule="evenodd" d="M284 543h552v1415l-552-354zM483 724v311l164-69V724zM483 1241v318l164 102v-489z"/>
<path fill="currentColor" d="M888 543h552v463l-198-83V724h-164v232l362 153v495l-552 354v-733l190 95v340l164-97v-287l-354-155z"/>
</svg>`;
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0a1930"/><svg x="14" y="6" width="36" height="52" viewBox="280 194 1164 1768" style="color:#f2b705"><path fill="#f2b705" d="M284 250h190v69h169V198h185v121h69V198h185v121h169v-69h189v241H284z"/><path fill="#f2b705" fill-rule="evenodd" d="M284 543h552v1415l-552-354zM483 724v311l164-69V724zM483 1241v318l164 102v-489z"/><path fill="#f2b705" d="M888 543h552v463l-198-83V724h-164v232l362 153v495l-552 354v-733l190 95v340l164-97v-287l-354-155z"/></svg></svg>`;

// ---------- componentes ----------
const waBtn = (label, msg, cls = '') => `<a class="btn btn-wa ${cls}" href="${wa(msg)}" target="_blank" rel="noopener">${icon('wa')}<span>${label}</span></a>`;
const status = (cls = '') => `<div class="status ${cls}" data-status hidden role="status" aria-live="polite"><span class="status__dot" aria-hidden="true"></span><span><span data-status-text></span> <small data-status-detail></small></span></div>`;
const sectionHead = (eyebrow, title, text, center = false) => `<div class="section-head reveal ${center ? 'center' : ''}"><span class="eyebrow">${esc(eyebrow)}</span><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}</div>`;

const serviceCard = (s) => `<article class="card reveal">
  <div class="card-icon">${icon(s.icon, 'icon')}</div>
  <h3>${esc(s.title)}</h3>
  <ul class="ticks">${s.items.map((i) => `<li>${icon('check')}<span>${esc(i)}</span></li>`).join('')}</ul>
  ${s.note ? `<p class="note">${esc(s.note)}</p>` : ''}
  ${waBtn('Consultar pelo WhatsApp', cfg.messages[s.id], 'btn-block')}
</article>`;

const why = [
  ['user', 'Atendimento direto e personalizado', 'Você fala diretamente com o chaveiro e explica o que precisa.'],
  ['key', 'Residencial, comercial e automotivo', 'Um só contato para diferentes tipos de serviço com chaves e fechaduras.'],
  ['pin', 'Localizado em Itaquaquecetuba', 'Empresa da região, com endereço em Itaquaquecetuba – SP.'],
  ['chat', 'Contato fácil pelo WhatsApp', 'Peça informações em poucos segundos, sem burocracia.'],
  ['shield', 'Qualidade e transparência', 'Condições e valores combinados antes de contratar o serviço.']
];

const steps = [
  ['Entre em contato', 'Fale conosco pelo WhatsApp e explique o que você precisa.'],
  ['Envie as informações', 'Se necessário, envie fotos da chave, da fechadura ou do veículo.'],
  ['Consulte o atendimento', 'Confirme a disponibilidade, as condições e os valores antes de contratar.']
];

const faq = [
  ['Qual é o horário de atendimento?', `Atendemos de ${hoursShort}.`],
  ['Vocês fazem socorro fora do horário comercial?', 'Realizamos alguns socorros fora do horário, conforme disponibilidade. Consulte pelo WhatsApp antes de se deslocar.'],
  ['Vocês realizam socorro de chaveiro?', 'Sim, conforme disponibilidade. Entre em contato pelo WhatsApp e explique a situação.'],
  ['Vocês trabalham com chaves automotivas?', 'Sim. Trabalhamos com serviços automotivos. Consulte a disponibilidade para o seu modelo de veículo.'],
  ['Vocês instalam fechadura digital?', 'Sim, fazemos a instalação de fechadura digital. Consulte a disponibilidade para o seu tipo de porta e fechadura.'],
  ['Vocês copiam controle de portão e trocam bateria de relógio?', 'Sim. Fazemos cópia de controle de portão automático, troca de bateria de controles e de relógios e ajuste de pulseiras de relógio. Consulte a compatibilidade do seu modelo.'],
  ['Como posso solicitar um orçamento?', 'Entre em contato pelo WhatsApp e informe qual serviço você precisa.'],
  ['Onde fica o Chaveiro BS?', `Estamos em Itaquaquecetuba – SP, na ${a.street}, ${a.neighborhood}.`]
];

const hoursRows = cfg.hours.map((h) => h.open
  ? `<tr data-weekday="${h.weekday}"><th scope="row">${esc(h.label)}</th><td>${fmt(h.open)} às ${fmt(h.close)}</td></tr>`
  : `<tr class="closed" data-weekday="${h.weekday}"><th scope="row">${esc(h.label)}</th><td>Fechado</td></tr>`).join('');

const reviewsSection = cfg.reviews.length ? `<section id="avaliacoes" class="bg-soft"><div class="container">${sectionHead('Avaliações', 'O que dizem nossos clientes', '', true)}<div class="cards">${cfg.reviews.map((r) => `<blockquote class="quote reveal"><p>${esc(r.text)}</p><cite>${esc(r.author)}</cite></blockquote>`).join('')}</div></div></section>` : '';

const socials = Object.entries(cfg.social).filter(([, v]) => v);
const socialNames = { instagram: 'Instagram', facebook: 'Facebook', googleBusiness: 'Google Meu Negócio' };

// ---------- JSON-LD (somente dados reais, sem 24h) ----------
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ld = [{
  '@context': 'https://schema.org',
  '@type': 'Locksmith',
  name: cfg.name,
  description: 'Chaveiro residencial, comercial e automotivo em Itaquaquecetuba – SP.',
  telephone: '+' + cfg.whatsappNumber,
  url: domain || undefined,
  image: domain ? `${domain}/og-image.png` : undefined,
  address: { '@type': 'PostalAddress', streetAddress: `${a.street} - ${a.neighborhood}`, addressLocality: a.city, addressRegion: a.state, addressCountry: 'BR' },
  areaServed: { '@type': 'City', name: a.city },
  openingHoursSpecification: weekdays.map((h) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: dayNames[h.weekday], opens: h.open, closes: h.close })),
  sameAs: socials.map(([, v]) => v)
}, {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(([q, ans]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: ans } }))
}];
const ldJson = JSON.stringify(ld);

const heroArt = `<svg viewBox="0 0 420 420" role="img" aria-label="Ilustração de um cadeado" xmlns="http://www.w3.org/2000/svg">
<circle cx="210" cy="210" r="196" fill="rgba(255,255,255,.04)" stroke="rgba(242,183,5,.28)" stroke-width="2"/>
<circle cx="210" cy="210" r="150" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2" stroke-dasharray="4 10"/>
<path d="M146 176V134a64 64 0 0 1 128 0v42" fill="none" stroke="#f2b705" stroke-width="24" stroke-linecap="round"/>
<rect x="104" y="172" width="212" height="160" rx="24" fill="#f2b705"/>
<rect x="104" y="172" width="212" height="160" rx="24" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/>
<circle cx="210" cy="238" r="20" fill="#0a1930"/>
<rect x="201" y="244" width="18" height="46" rx="7" fill="#0a1930"/>
<g transform="translate(262 352) rotate(-32)" stroke="#0a1930" stroke-width="7" stroke-linejoin="round" paint-order="stroke">
<path fill="#eef3fb" fill-rule="evenodd" d="M-36 0a36 36 0 1 0 72 0a36 36 0 1 0-72 0zM-14 0a14 14 0 1 1 28 0a14 14 0 1 1-28 0z"/>
<path fill="#eef3fb" d="M30-9h138v18h-16v22h-18v-22h-16v16h-18v-16h-70z"/>
</g>
</svg>`;

const navLinks = [['#servicos', 'Serviços'], ['#socorro', 'Socorro'], ['#area', 'Onde estamos'], ['#horarios', 'Horários'], ['#faq', 'Dúvidas']];

// ---------- página ----------
const css = readFileSync(join(root, 'src/styles.css'), 'utf8').replace(/\s*\n\s*/g, '\n');
const html = `<!doctype html>
<html lang="pt-BR" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cfg.seo.title)}</title>
<meta name="description" content="${esc(cfg.seo.description)}">
<meta name="theme-color" content="#0a1930">
${domain ? `<link rel="canonical" href="${domain}/">` : '<!-- canonical: defina "domain" em site.config.json -->'}
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(cfg.seo.title)}">
<meta property="og:description" content="${esc(cfg.seo.description)}">
${domain ? `<meta property="og:url" content="${domain}/">\n<meta property="og:image" content="${domain}/og-image.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="Chaveiro BS – Itaquaquecetuba, SP">\n<meta name="twitter:image" content="${domain}/og-image.png">` : ''}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${ldJson}</script>
<style>${css}</style>
<script>document.documentElement.className='js'</script>
</head>
<body>
<a class="skip" href="#conteudo">Ir para o conteúdo</a>
${sprite}

<header class="site-header">
  <div class="container header-in">
    <a class="brand" href="#topo" aria-label="${esc(cfg.name)} – início">${logoSvg('logo', 'Logotipo Chaveiro BS')}<span>${esc(cfg.name)}</span></a>
    <nav class="nav" aria-label="Navegação principal">${navLinks.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
    ${waBtn('WhatsApp', cfg.messages.hero, 'btn-sm')}
  </div>
</header>

<main id="conteudo">
<section class="hero" id="topo">
  <div class="container hero-grid">
    <div>
      <h1>Precisou de um chaveiro em Itaquaquecetuba? <span>Conte com o Chaveiro BS!</span></h1>
      <p class="sub">Serviços de chaveiro residencial, comercial e automotivo. Atendimento com praticidade, confiança e qualidade.</p>
      <div class="hero-actions">
        ${waBtn('Falar com um chaveiro pelo WhatsApp', cfg.messages.hero, 'btn-lg')}
        <a class="btn btn-ghost btn-lg" href="#servicos">Conhecer nossos serviços</a>
      </div>
      <div class="hero-meta">
        <span class="chip">${icon('pin')}${esc(a.city)} – ${a.state}</span>
        <span class="chip">${icon('clock')}${esc(hoursCap)}</span>
      </div>
      ${status()}
    </div>
    <div class="hero-art">
      ${heroArt}
      <div class="hero-card">${icon('shield')}<div><strong>Chaveiro BS</strong>${esc(a.city)} – ${a.state}</div></div>
    </div>
  </div>
</section>

<section id="servicos" class="bg-soft">
  <div class="container">
    ${sectionHead('Nossos serviços', 'Chaves, fechaduras, controles e relógios', 'Chaves, fechaduras, controles de portão, relógios e muito mais. Escolha o serviço e consulte direto pelo WhatsApp. Quando há variação por modelo, fechadura ou tipo de chave, consulte a disponibilidade.')}
    <div class="cards">${cfg.services.map(serviceCard).join('')}</div>
  </div>
</section>

<section id="diferenciais">
  <div class="container">
    ${sectionHead('Diferenciais', 'Por que escolher o Chaveiro BS?', '', true)}
    <div class="why-grid">${why.map(([i, t, d]) => `<div class="why reveal"><div class="card-icon">${icon(i)}</div><div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}</div>
  </div>
</section>

<section id="socorro" class="dark">
  <div class="container socorro-box">
    <div class="reveal">
      <span class="eyebrow">Socorro de chaveiro</span>
      <h2>Precisando de socorro com sua chave ou fechadura?</h2>
      <p class="lead">Entre em contato com o Chaveiro BS pelo WhatsApp e consulte a disponibilidade de atendimento. Nosso horário regular é de ${esc(hoursShort)} e também realizamos alguns socorros fora do horário, conforme disponibilidade.</p>
      <div class="alert" role="note">${icon('clock')}<span>Socorros fora do horário comercial dependem de disponibilidade. Consulte antes pelo WhatsApp.</span></div>
    </div>
    <div class="socorro-cta reveal">
      ${icon('key', 'icon-big')}
      <p>Explique a situação e confirme se conseguimos atender.</p>
      ${waBtn('Solicitar atendimento pelo WhatsApp', cfg.messages.socorro, 'btn-block')}
    </div>
  </div>
</section>

<section id="como-funciona">
  <div class="container">
    ${sectionHead('Como funciona', 'Como funciona o atendimento', '', true)}
    <div class="steps">${steps.map(([t, d], i) => `<div class="step reveal"><div class="step-n">${i + 1}</div><h3>${t}</h3><p>${d}</p></div>`).join('')}</div>
  </div>
</section>

<section id="area" class="bg-soft">
  <div class="container two">
    <div class="reveal">
      <span class="eyebrow">Área de atendimento</span>
      <div class="section-head" style="margin-bottom:0"><h2>Chaveiro em Itaquaquecetuba – SP</h2></div>
      <p style="margin-top:1rem;color:var(--muted)">O Chaveiro BS está localizado em Itaquaquecetuba e atende clientes da região conforme disponibilidade. Procurando um chaveiro perto de você? Chame no WhatsApp e consulte o atendimento para o seu endereço.</p>
      <div class="addr"><div class="card-icon">${icon('pin')}</div><div><strong>Nosso endereço</strong>${esc(fullAddress)}</div></div>
      ${cfg.neighborhoodsServed.length ? `<strong>Bairros atendidos</strong><ul class="areas">${cfg.neighborhoodsServed.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
        <a class="btn btn-outline" href="${mapsUrl}" target="_blank" rel="noopener">${icon('pin')}<span>Ver no mapa</span></a>
        ${waBtn('Consultar atendimento', cfg.messages.orcamento)}
      </div>
    </div>
    <div class="panel reveal" id="horarios">
      <span class="eyebrow">Horário de funcionamento</span>
      <h2 style="font-size:1.6rem;color:var(--navy)">Horário de atendimento</h2>
      ${status('')}
      <table class="hours"><caption class="sr-only">Horário de funcionamento do Chaveiro BS</caption><tbody>${hoursRows}</tbody></table>
      <p class="notice">Este é o nosso horário regular. Alguns socorros fora do horário podem ser realizados: consulte a disponibilidade pelo WhatsApp.</p>
    </div>
  </div>
</section>

${reviewsSection}

<section id="faq">
  <div class="container">
    ${sectionHead('Perguntas frequentes', 'Tire suas dúvidas', '', true)}
    <div class="faq">${faq.map(([q, ans]) => `<details class="reveal"><summary>${esc(q)}</summary><div class="ans">${esc(ans)}</div></details>`).join('')}</div>
  </div>
</section>

<section class="final" id="contato">
  <div class="container reveal">
    <h2>Precisando de um chaveiro? Fale com o Chaveiro BS!</h2>
    <p>Entre em contato pelo WhatsApp, explique o que precisa e consulte a disponibilidade do atendimento.</p>
    ${waBtn('CHAMAR NO WHATSAPP', cfg.messages.final, 'btn-lg')}
  </div>
</section>
</main>

<footer class="site-footer">
  <div class="container">
    <div class="foot-grid">
      <div>
        <div class="foot-brand">${logoSvg('logo', 'Logotipo Chaveiro BS')}<span>${esc(cfg.name)}</span></div>
        <p>${esc(a.city)} – ${a.state}</p>
        <p>${esc(a.street)} – ${esc(a.neighborhood)}</p>
        <p style="margin-top:8px">WhatsApp: <a href="${wa(cfg.messages.hero)}" target="_blank" rel="noopener">${esc(cfg.phoneDisplay)}</a></p>
      </div>
      <div>
        <h3>Horário</h3>
        <p>${esc(hoursCap)}</p>
        <p class="foot-note">Socorros fora do horário: consulte a disponibilidade.</p>
      </div>
      <div>
        <h3>Navegue</h3>
        <ul>${navLinks.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}${socials.map(([k, v]) => `<li><a href="${esc(v)}" target="_blank" rel="noopener">${socialNames[k] || k}</a></li>`).join('')}</ul>
      </div>
    </div>
    <p class="copy">© <span data-year>${new Date().getFullYear()}</span> ${esc(cfg.name)}. Todos os direitos reservados.</p>
  </div>
</footer>

<a class="fab" href="${wa(cfg.messages.hero)}" target="_blank" rel="noopener" aria-label="Chamar no WhatsApp">${icon('wa')}<span>WhatsApp</span></a>

<script type="application/json" id="site-data">${JSON.stringify({ hours: cfg.hours, timezone: cfg.timezone })}</script>
<script src="app.js" defer></script>
</body>
</html>
`;

writeFileSync(join(dist, 'index.html'), html);
writeFileSync(join(dist, 'favicon.svg'), faviconSvg);
writeFileSync(join(dist, 'logo.svg'), logoSvg('', 'Logotipo Chaveiro BS').replace('<svg class=""', '<svg').replace('style="fill:var(--logo-cut)"', 'fill="#fff"').replace(/fill="currentColor"/g, 'fill="#1b1b1b"'));
writeFileSync(join(dist, 'app.js'), readFileSync(join(root, 'src/status.js'), 'utf8') + '\n' + readFileSync(join(root, 'src/app.js'), 'utf8') + `
(function(){
  if(!('IntersectionObserver' in window)){document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('in')});return}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.reveal').forEach(function(e){io.observe(e)});
})();
`);
if (existsSync(join(root, 'src/assets/og-image.png'))) copyFileSync(join(root, 'src/assets/og-image.png'), join(dist, 'og-image.png'));
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${site}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>\n</urlset>\n`);
console.log('Build OK →', dist);
