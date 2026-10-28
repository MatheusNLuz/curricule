import { createCanvas, loadImage } from "@napi-rs/canvas";
import { mkdirSync, readdirSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const source = ".impeccable/review";
const output = "public/screen-review/prints";
mkdirSync(output, { recursive: true });
const entries = [
  ["inicio", "Meu espaço"], ["nova", "Nova análise"], ["resultado", "Análise do currículo"],
  ["vaga", "Comparação com vaga"], ["perguntas", "Perguntas e fatos"], ["linkedin", "LinkedIn"],
  ["editor", "Editor do currículo"], ["carta", "Carta de apresentação"], ["curriculos", "Meus currículos"],
  ["historico", "Histórico"], ["acesso", "Acesso e cobrança"], ["admin", "Administração"],
  ["usuarios", "Usuários"], ["usuario", "Detalhe do usuário"], ["auditoria", "Auditoria"],
  ["entrar", "Entrar"], ["cadastro", "Criar conta"],
];
for (const file of readdirSync(source).filter(file => /^(?:mobile-)?(?:claro|escuro)-.*\.jpg$/.test(file))) copyFileSync(join(source, file), join(output, file));

// Faithful screenshot contact sheets; no generated pixels or changes inside the captures.
for (const variant of ["claro", "escuro", "mobile-claro", "mobile-escuro"]) {
  const mobile = variant.startsWith("mobile");
  const dark = variant.endsWith("escuro");
  const tileWidth = mobile ? 292 : 480;
  const tileHeight = mobile ? 672 : 356;
  const gap = 22;
  const cols = mobile ? 4 : 3;
  const width = cols * tileWidth + (cols + 1) * gap;
  const height = 95 + Math.ceil(entries.length / cols) * tileHeight + gap;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = dark ? "#101017" : "#f6f7fb"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = dark ? "#efedf8" : "#252536"; ctx.font = "600 27px Segoe UI";
  ctx.fillText(`Curricule · ${mobile ? "Mobile" : "Desktop"} · ${dark ? "Escuro" : "Claro"}`, gap, 43);
  ctx.font = "13px Segoe UI"; ctx.fillStyle = dark ? "#b7b2c9" : "#666b80";
  ctx.fillText("Prévia para aprovação · 17 telas · dados fictícios · capturas reais do navegador", gap, 69);
  for (const [index, [id, label]] of entries.entries()) {
    const image = await loadImage(join(output, `${variant}-${id}.jpg`));
    if (image.width < 300 || image.height < 600) throw new Error(`Invalid screenshot: ${variant}-${id}`);
    const x = gap + index % cols * (tileWidth + gap);
    const y = 95 + Math.floor(index / cols) * tileHeight;
    ctx.fillStyle = dark ? "#d1cae6" : "#444057"; ctx.font = "600 13px Segoe UI";
    ctx.fillText(label, x, y + 17);
    const captureHeight = Math.min(image.height, mobile ? 844 : 800);
    ctx.drawImage(image, 0, 0, image.width, captureHeight, x, y + 30, tileWidth, captureHeight * tileWidth / image.width);
  }
  writeFileSync(join(output, `visao-geral-${variant}.jpg`), canvas.toBuffer("image/jpeg", 90));
}

for (const theme of ["claro", "escuro"]) {
  const canvas = createCanvas(1840, 1320);
  const ctx = canvas.getContext("2d");
  const dark = theme === "escuro";
  ctx.fillStyle = dark ? "#101017" : "#f6f7fb"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? "#efedf8" : "#252536"; ctx.font = "600 33px Segoe UI";
  ctx.fillText(`Curricule · tema ${theme}`, 32, 49);
  ctx.font = "16px Segoe UI"; ctx.fillStyle = dark ? "#b7b2c9" : "#666b80";
  ctx.fillText("Prévia das telas internas · dados fictícios · aguardando aprovação", 32, 79);
  for (const [index, id] of ["inicio", "nova", "resultado", "editor"].entries()) {
    const label = entries.find(entry => entry[0] === id)![1];
    const image = await loadImage(join(output, `${theme}-${id}.jpg`));
    const x = 32 + index % 2 * 906;
    const y = 107 + Math.floor(index / 2) * 599;
    ctx.fillStyle = dark ? "#dfd7f4" : "#444057"; ctx.font = "600 17px Segoe UI"; ctx.fillText(label, x, y + 21);
    ctx.drawImage(image, 0, 0, image.width, Math.min(800, image.height), x, y + 35, 870, 544);
  }
  writeFileSync(join(output, `destaques-${theme}.jpg`), canvas.toBuffer("image/jpeg", 94));
}

const cards = entries.map(([id, label]) => `<article><h2>${label}</h2><a data-id="${id}" href="prints/claro-${id}.jpg" target="_blank" rel="noopener"><img loading="lazy" src="prints/claro-${id}.jpg" alt="Print de ${label} no tema claro" /></a><a class="open" href="index.html#${id}">Experimentar esta tela →</a></article>`).join("");
const gallery = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Curricule · Galeria para aprovação</title><style>*{box-sizing:border-box}body{margin:0;background:#f6f7fb;color:#252536;font:15px/1.7 'Segoe UI',sans-serif}header{padding:35px 5%;border-bottom:1px solid #e1dfec;background:white}h1{font-size:30px;margin:0;font-weight:600;letter-spacing:-.03em}p{font-size:13px;color:#666b80;margin:10px 0}nav{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 0}button,a{min-height:44px;font:inherit;font-size:13px;border-radius:8px;padding:10px 15px;border:1px solid #ddd9ed;background:white;color:#51449f;text-decoration:none;cursor:pointer}button[aria-pressed=true]{background:#5d4fd0;color:white;border-color:#5d4fd0}:focus-visible{outline:3px solid #5d4fd0;outline-offset:4px}main{display:grid;grid-template-columns:1fr;gap:28px;padding:30px 5%}article{background:white;padding:20px;border:1px solid #e1dfec;border-radius:12px;min-width:0}h2{font-size:17px;font-weight:600;margin:0 0 17px}article>a:first-of-type{display:block;padding:0;border:0;overflow:hidden;height:300px;background:#f6f7fb}article img{width:100%;height:auto;display:block}.open{display:inline-flex;align-items:center;border:0;padding-left:0;margin-top:13px}footer{padding:25px 5%;font-size:12px;color:#666b80}body[data-device=mobile] article>a:first-of-type{height:500px;text-align:center}body[data-device=mobile] img{max-width:270px;margin:auto}body[data-theme=escuro]{background:#121219;color:#f0eff8}body[data-theme=escuro] :is(header,article){background:#1c1c26;border-color:#333340}body[data-theme=escuro] p{color:#b8b5ca}@media(min-width:700px){main{grid-template-columns:1fr 1fr}}@media(min-width:1150px){main{grid-template-columns:repeat(3,1fr)}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}</style></head><body data-theme="claro" data-device="desktop"><header><h1>As próximas telas do Curricule.</h1><p>17 telas redesenhadas. Clique em um print para ver a imagem completa, ou experimente a prévia navegável.</p><nav aria-label="Filtros da galeria"><button data-theme="claro" aria-pressed="true">Tema claro</button><button data-theme="escuro" aria-pressed="false">Tema escuro</button><button data-device="desktop" aria-pressed="true">Desktop</button><button data-device="mobile" aria-pressed="false">Mobile</button><a href="index.html">Abrir prévia navegável →</a></nav></header><main>${cards}</main><footer>Dados fictícios · nenhuma alteração aplicada aos fluxos reais · nenhum commit criado · aguardando sua aprovação.</footer><script>function update(){const t=document.body.dataset.theme,d=document.body.dataset.device,p=(d==='mobile'?'mobile-':'')+t;document.querySelectorAll('a[data-id]').forEach(a=>{a.href='prints/'+p+'-'+a.dataset.id+'.jpg';const i=a.querySelector('img');i.src=a.href;i.alt='Print '+a.dataset.id+' · '+d+' · '+t});document.querySelectorAll('button[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===t)));document.querySelectorAll('button[data-device]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.device===d)))}document.querySelectorAll('button[data-theme]').forEach(b=>b.onclick=()=>{document.body.dataset.theme=b.dataset.theme;update()});document.querySelectorAll('button[data-device]').forEach(b=>b.onclick=()=>{document.body.dataset.device=b.dataset.device;update()});</script></body></html>`;
writeFileSync("public/screen-review/galeria.html", gallery);
console.info(`Gallery ready: ${entries.length} screens × 2 themes × 2 sizes; all 68 screenshots loaded and checked.`);
