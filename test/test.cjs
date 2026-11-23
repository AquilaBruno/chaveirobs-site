const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { getStatus } = require('../src/status.js');
const cfg = require('../site.config.json');

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };

// ---- Status de funcionamento (horário de Brasília = UTC-3) ----
// 2026-11-23 é segunda-feira
const brt = (d, h, m) => new Date(Date.UTC(2026, 10, d, h + 3, m)); // d: 23=seg ... 29=dom
const S = (d, h, m) => getStatus(brt(d, h, m), cfg.hours, cfg.timezone);

console.log('Status (TZ do processo: ' + (process.env.TZ || 'padrão') + ')');
t('seg 09:29 → fechado, abre hoje 09h30', () => { const s = S(23, 9, 29); assert(!s.open); assert(s.detail.includes('Abrimos hoje às 09h30')); });
t('seg 09:30 → aberto', () => assert(S(23, 9, 30).open));
t('seg 17:59 → aberto', () => assert(S(23, 17, 59).open));
t('seg 18:00 → fechado, volta amanhã', () => { const s = S(23, 18, 0); assert(!s.open); assert(s.detail.includes('amanhã (terça-feira) às 09h30')); });
t('qua 12:00 → aberto', () => assert(S(25, 12, 0).open));
t('sex 17:59 → aberto', () => assert(S(27, 17, 59).open));
t('sex 18:00 → fechado, volta segunda', () => { const s = S(27, 18, 0); assert(!s.open); assert(s.detail.includes('próxima segunda-feira, às 09h30')); });
t('sáb 10:00 → fechado', () => { const s = S(28, 10, 0); assert(!s.open); assert(s.detail.includes('segunda-feira')); });
t('sáb 12:00 → fechado', () => assert(!S(28, 12, 0).open));
t('dom 12:00 → fechado', () => assert(!S(29, 12, 0).open));
t('dom 23:59 → fechado', () => assert(!S(29, 23, 59).open));
t('seg 00:00 → fechado (meia-noite)', () => assert(!S(23, 0, 0).open));
t('ter 02:00 → fechado (madrugada)', () => assert(!S(24, 2, 0).open));
t('usa BRT mesmo com visitante em outro fuso (UTC 12:50 = seg 09:50 BRT)', () => assert(getStatus(new Date('2026-11-23T12:50:00Z'), cfg.hours, cfg.timezone).open));
t('sáb 23:30 BRT (UTC dom 02:30) → fechado', () => assert(!getStatus(new Date('2026-11-29T02:30:00Z'), cfg.hours, cfg.timezone).open));

// ---- HTML gerado ----
const dist = path.join(__dirname, '..', 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
console.log('HTML');

t('todos os links wa.me usam o número correto', () => {
  const links = [...html.matchAll(/href="(https:\/\/wa\.me\/[^"]+)"/g)].map((m) => m[1]);
  assert(links.length >= 8, 'poucos links: ' + links.length);
  links.forEach((l) => assert(l.startsWith('https://wa.me/5511983711957?text='), l));
  console.log('      ' + links.length + ' links wa.me verificados');
});
t('mensagens automáticas decodificam corretamente', () => {
  const msgs = [...new Set([...html.matchAll(/wa\.me\/5511983711957\?text=([^"]+)"/g)].map((m) => decodeURIComponent(m[1])))];
  Object.values(cfg.messages).forEach((m) => assert(msgs.includes(m), 'faltando: ' + m));
  msgs.forEach((m) => console.log('      • ' + m));
});
t('não há "24h/24 horas" sem negação, nem expressões proibidas', () => {
  // A única menção permitida é a pergunta do FAQ ("atende 24 horas?"), sempre respondida com "Não".
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, '').replace(/O Chaveiro BS atende 24 horas\?/g, '');
  [/aberto 24/i, /atendimento 24/i, /plant[ãa]o/i, /noturn/i, /qualquer hora/i, /24\s*h/i].forEach((re) => {
    for (const m of body.matchAll(new RegExp(re.source, 'gi'))) {
      const ctx = body.slice(Math.max(0, m.index - 60), m.index + 40);
      assert(/n[ãa]o\s+(somos|atendemos|realizamos)|nosso atendimento/i.test(ctx) && !/atendimento 24|aberto 24|plant|noturn|qualquer hora/i.test(m[0]), 'menção suspeita: ' + ctx);
    }
  });
  const ldAll = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const lock = ldAll.find((x) => x['@type'] === 'Locksmith');
  assert(!/24/.test(JSON.stringify(lock).replace(/\+5511983711957/, '')), '24 no JSON-LD Locksmith');
  assert(!/24\s*h|24\/7|always/i.test(JSON.stringify(lock)), 'marcação 24h no JSON-LD');
  assert(!/24/.test(html.match(/<meta name="description" content="([^"]*)"/)[1]), '24 na meta description');
});
t('sábado e domingo aparecem como fechado', () => {
  assert(/<tr class="closed" data-weekday="6"><th scope="row">Sábado<\/th><td>Fechado/.test(html));
  assert(/<tr class="closed" data-weekday="0"><th scope="row">Domingo<\/th><td>Fechado/.test(html));
});
t('seg–sex 09h30 às 18h00', () => ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].forEach((d) => assert(html.includes(`<th scope="row">${d}</th><td>09h30 às 18h00</td>`), d)));
t('SEO: title, description, H1 único, lang', () => {
  assert(html.includes('<title>Chaveiro em Itaquaquecetuba SP | Chaveiro BS</title>'));
  assert(/<meta name="description" content="Precisa de um chaveiro em Itaquaquecetuba\?/.test(html));
  assert.strictEqual((html.match(/<h1[ >]/g) || []).length, 1);
  assert(html.includes('lang="pt-BR"'));
  assert(html.includes('property="og:title"'));
});
t('JSON-LD válido, Locksmith com dados reais', () => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const l = ld.find((x) => x['@type'] === 'Locksmith');
  assert.strictEqual(l.telephone, '+5511983711957');
  assert.strictEqual(l.address.addressLocality, 'Itaquaquecetuba');
  assert.strictEqual(l.openingHoursSpecification.length, 5);
  l.openingHoursSpecification.forEach((o) => { assert.strictEqual(o.opens, '09:30'); assert.strictEqual(o.closes, '18:00'); });
});
t('endereço presente e correto', () => assert(html.includes('Estrada Alberto Hinoto, 3310 – Jd. Odete, Itaquaquecetuba – SP')));
t('imagens/SVGs informativos têm texto alternativo', () => { assert(!/<img(?![^>]*alt=)/.test(html)); assert(/role="img" aria-label="Logotipo Chaveiro BS"/.test(html)); });
t('ids de âncora existem', () => [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]).forEach((id) => assert(html.includes(`id="${id}"`), 'âncora sem alvo: ' + id)));
t('arquivos gerados', () => ['index.html', 'app.js', 'robots.txt', 'sitemap.xml', 'favicon.svg', 'logo.svg', 'og-image.png'].forEach((f) => assert(fs.existsSync(path.join(dist, f)), f)));
t('tamanho do HTML razoável (< 60 KB)', () => assert(Buffer.byteLength(html) < 60000));

t('botão flutuante existe e a regra de não cobrir botões está no JS', () => {
  assert(html.includes('class="fab"'));
  assert(fs.readFileSync(path.join(dist, 'app.js'), 'utf8').includes("classList.toggle('is-hidden'"));
});
t('nenhuma imagem/script externo (sem bibliotecas desnecessárias)', () => {
  const ext = [...html.matchAll(/<(?:script|link|img)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('https://wa.me/'));
  assert.deepStrictEqual(ext, []);
});

console.log(`\n${passed} testes passaram.`);
