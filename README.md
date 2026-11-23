# Chaveiro BS – Landing page

Site estático (HTML/CSS/JS puro, sem dependências). Tudo que muda com frequência fica em **`site.config.json`**:
telefone/WhatsApp, endereço, bairros atendidos, horários, serviços, mensagens do WhatsApp, redes sociais, avaliações e SEO.

## Comandos
- `npm run build` – gera a pasta `dist/` (é ela que vai para a hospedagem)
- `npm test` – gera e roda os testes (status de horário, links do WhatsApp, SEO, "24 horas", etc.)
- `npm run serve` – abre o site localmente

## Quando tiver domínio
Preencha `"domain"` em `site.config.json` (ex.: `"https://www.chaveirobs.com.br"`) e rode `npm run build`.
Isso ativa canonical, Open Graph com imagem, URL no Schema.org, `sitemap.xml` e `robots.txt` corretos.

## Avaliações reais
Adicione em `"reviews"`: `{ "author": "Nome", "text": "Texto do cliente" }`. A seção só aparece quando houver itens.

## Bairros atendidos
Preencha `"neighborhoodsServed": ["Bairro 1", "Bairro 2"]` – aparecem na seção "Área de atendimento".

## Estrutura
- `src/build.mjs` – gera o HTML (componentes, SEO, Schema.org, sitemap, robots)
- `src/styles.css` – estilos · `src/status.js` – "Aberto agora" pelo horário de Brasília · `src/app.js` – interações
- `src/assets/og-image.png` – imagem de compartilhamento (1200×630)
- `logo-original.png` – logotipo enviado (o site usa uma versão vetorial dele)
