---
name: Curricule
description: Sistema visual aplicado à autenticação e ao espaço de candidatura do Curricule.
colors:
  bg: "#f6f7fb"
  paper: "#fff"
  ink: "#252536"
  quiet: "#666b80"
  line: "#e5e6ef"
  violet: "#5d4fd0"
  tint: "#eeecfb"
  tint-ink: "#51449f"
  success: "#25745e"
  success-bg: "#edf7f2"
  amber: "#875e18"
  amber-bg: "#fcf4e6"
  blue: "#1767a6"
  blue-bg: "#edf4fb"
  field: "#fff"
  paper-ink: "#292937"
  canvas: "#eeeff5"
  dark-bg: "#121219"
  dark-paper: "#1c1c26"
  dark-ink: "#f0eff8"
  dark-quiet: "#a5a5bb"
  dark-line: "#333340"
  dark-violet: "#b3a4ff"
  dark-tint: "#2c2643"
  dark-tint-ink: "#c3b7ff"
  dark-success: "#98d5bb"
  dark-success-bg: "#20372f"
  dark-amber: "#e6c280"
  dark-amber-bg: "#3b3021"
  dark-blue: "#8fbeed"
  dark-blue-bg: "#1e3044"
  dark-field: "#181820"
  dark-canvas: "#16161f"
  dark-button-ink: "#1c162b"
typography:
  body: {fontFamily: '"Avenir Next", "Segoe UI", ui-sans-serif, system-ui, sans-serif', fontSize: "14px", lineHeight: 1.65}
  headline: {fontSize: "30px", fontWeight: 650, lineHeight: 1.2, letterSpacing: "-.025em"}
  title: {fontSize: "19px", fontWeight: 650, lineHeight: 1.2, letterSpacing: "-.025em"}
  section: {fontSize: "15px", fontWeight: 650, lineHeight: 1.2}
  label: {fontSize: "12px", fontWeight: 600}
rounded:
  button: "9px"
  field: "8px"
  status: "5px"
  sheet: "14px"
  lead: "16px"
  document: "3px"
components:
  button-primary: {backgroundColor: "{colors.violet}", textColor: "{colors.paper}", rounded: "{rounded.button}", padding: "11px 17px", height: "46px"}
  button-primary-dark: {backgroundColor: "{colors.dark-violet}", textColor: "{colors.dark-button-ink}", rounded: "{rounded.button}", padding: "11px 17px", height: "46px"}
  button-secondary: {backgroundColor: "{colors.paper}", textColor: "{colors.ink}", rounded: "{rounded.button}", padding: "11px 17px"}
  field: {backgroundColor: "{colors.field}", textColor: "{colors.ink}", rounded: "{rounded.field}", padding: "12px 13px"}
  status: {backgroundColor: "{colors.tint}", textColor: "{colors.tint-ink}", rounded: "{rounded.status}", padding: "4px 9px"}
  sheet: {backgroundColor: "{colors.paper}", rounded: "{rounded.sheet}"}
---

# Design System: Curricule

## Overview

O mundo visual aplicado organiza material, fatos, revisão e resultado em um espaço calmo de trabalho. Violeta orienta ações; folhas claras, bordas suaves e texto direto ajudam a pessoa candidata a manter o controle da própria história. O produto atende diferentes áreas profissionais.

Este registro descreve a implementação aprovada de autenticação e telas internas, fundamentada em `app/workspace.css`, `components/workspace/`, `components/app-shell/app-shell-nav.tsx` e `app/globals.css`. A direção aprovada veio de `design/screen-review/`; o código aplicado prevalece sobre a proposta. Não redefine a landing pública nem a tipografia ou o layout dos arquivos PDF exportados.

**Key Characteristics:**

- Superfícies frias, ação violeta e estados com texto explícito.
- Uma coluna móvel; navegação lateral e painéis de contexto no desktop.
- Documento branco independente do tema da interface.
- Revisão dos fatos e decisões da pessoa candidata visíveis no fluxo.

O fechamento visual teve disposição **Ship**. As quatro visões em `.impeccable/review/applied/overview-{desktop,mobile}-{light,dark}.jpg` mostram fixtures SSR de componentes reais com dados sintéticos; o login público real também foi inspecionado no desktop e no celular. Testes e build passaram na revisão de aplicação. Essa evidência não equivale a um E2E autenticado.

## Colors

### Primary

Violeta conduz ações, ícones de contexto, foco, seleção e métricas. O fundo tonal violeta relaciona uma ação ao seu contexto sem preencher toda a tela com a cor principal.

### Neutral

O fundo frio separa a página das folhas brancas. Tinta escura sustenta títulos; texto auxiliar usa quiet; linhas suaves dividem grupos. Campo e canvas têm papéis próprios. Os tokens `dark-*` são as substituições reais sob `.dark`, não uma inversão automática. O texto dos botões primários escuros usa a tinta escura específica.

### Semantic states

Verde comunica confirmação, âmbar atenção e azul contexto informativo. Cada estado combina texto e cor. Erros de autenticação continuam usando o token global `--signal`; não são confundidos com atenção âmbar.

**The White Document Rule.** A representação do currículo permanece branca nos dois temas, com a tinta de papel; a interface ao redor responde ao tema.

**The Scoped Palette Rule.** Os tokens locais são declarados em `.work-ui` e `.curricule-shell`. As regras de componentes vivem em `@layer components` com `@scope`; adaptações de integração são explicitamente prefixadas. Preserve essa fronteira para não alterar a landing ou a exportação PDF. Os tokens semânticos globais continuam atendendo componentes compartilhados.

## Typography

**Body and heading font:** a pilha Avenir Next/Segoe UI herdada de `--font-ui`. A preservação da família existente é a exceção aceita de Operate; não estabelece uma nova fonte de destaque. O token global de display existente não redefine a hierarquia deste workspace.

### Hierarchy

- **Headline:** título da página na escala base do frontmatter, chegando a (33px) em (860px) e (32px) em (1150px).
- **Title / section:** subtítulos e títulos de folha usam níveis próximos e pesos moderados; títulos de folha podem usar (15px).
- **Body:** base legível e espaçada; descrições principais ocupam até (65ch). Variações locais de texto ficam entre (9–13px).
- **Label:** ações e rótulos usam peso (600), sem criar uma segunda família. Datas e métricas usam numerais tabulares.

O título do formulário de autenticação usa (32px). A história lateral usa (39px), chegando a (44px) no desktop amplo. O currículo representado tem escala própria em Segoe UI; miniaturas não definem o tamanho de texto da interface.

## Layout

Mobile first para (320–390px): conteúdo em uma coluna, margem interna inicial de (18px), ações que podem quebrar linha e navegação inferior fixa de (74px) com safe area. A área principal e o rodapé reservam espaço para a navegação.

Em (560px), campos, listas e comparações podem ganhar colunas. Em (860px), uma sidebar fixa de (218px) substitui a navegação inferior; a área principal e o topbar acompanham seu deslocamento. Em (1150px), a sidebar passa a (238px). O conteúdo tem limite de (1320px), com padding crescendo de (30px 18px 28px) até (40px 44px 35px).

Painéis de contexto ficam ao lado do conteúdo quando há espaço. Editor e documento ficam empilhados no celular e lado a lado a partir de (860px), com prévia sticky no desktop. Grades usam `minmax(0,1fr)` para conter textos e documentos. Abas do fluxo podem rolar dentro do próprio controle.

A autenticação ocupa uma página própria, sem sidebar ou navegação inferior. No celular o formulário é o foco; a história com currículo ilustrativo aparece a partir de (860px). A grade tem limite de (1180px), com formulário entre (365–420px) conforme o viewport.

## Elevation & Depth

Predominam superfícies planas com borda de (1px), separadas por tom e espaçamento. A sombra ambiente local é `0 18px 44px #26203f0d` no claro e `0 18px 44px #0002` no escuro. O documento usa `0 10px 30px #19132a0c`. Anotações e hover de botão podem elevar pontualmente o conteúdo; painéis legados integrados e editor estruturado têm sombra removida.

## Shapes

Folhas, campos, botões e status usam os raios por função registrados no frontmatter. Avatares e marcadores de etapa são circulares. Bordas e títulos agrupam conteúdo; as páginas não dependem de sombras fortes para separar seções.

## Components

### Buttons

Primário violeta e secundário branco com borda. Altura mínima principal (46px); controles de toque usam pelo menos (44px). Hover primário ajusta brilho e sombra; secundário realça borda e texto em violeta. Foco visível local usa contorno violeta de (3px) com afastamento de (4px). Desabilitado reduz opacidade e comunica indisponibilidade pelo cursor.

### Cards / Containers

`Sheet` agrupa conteúdo com borda e título separado por divisor; padding usual de (21–27px). Listas internas usam divisores em vez de um cartão por linha. `Status` combina marcador circular, rótulo e fundo tonal; as variantes verde, âmbar e neutra mantêm a mesma forma.

### Inputs / Fields

Campos têm rótulo explícito, fundo próprio, borda suave, padding do frontmatter e altura mínima de (46px) no formulário principal. Textareas podem crescer verticalmente. A autenticação reutiliza esse tratamento e apresenta erro junto ao campo. Seleções combinam borda violeta e fundo tonal; foco permanece visível.

### Navigation

Biblioteca e histórico oferecem visualização completa ou compacta, selecionada por `view=compact` na URL e preservada nos filtros e na paginação. Na compacta, a biblioteca apresenta o título como acesso à prévia e oculta miniaturas; avaliação, PDF e editor ficam em uma seção expansível. O histórico reúne ações secundárias em `details` com operação por teclado. Listas paginadas oferecem controles no início e no fim, com alvos de pelo menos (44px). Um currículo já gerado abre sua prévia mesmo sem análise inicial armazenada.

Sidebar com logotipo completo aprovado, quatro destinos principais, conta e acesso à cobrança; administração depende da função real da sessão. Estado ativo usa violeta e fundo tonal com `aria-current`. No celular, os quatro destinos ficam em uma barra inferior com ícone e texto. O topbar reúne contexto, tema e conta; breadcrumbs são reduzidos no celular para caber com segurança.

### Auth, editor and results

Nos formulários de autenticação, os campos usam (16px) e rótulos (13px) no celular; a partir de (860px), preservam as escalas de desktop. O envio com erros move o foco para o primeiro campo inválido, sem apagar o conteúdo já informado. O menu da conta e os botões de PDF têm altura mínima de (44px), consistente com o botão de tema.

`AuthLayout` reúne marca, troca de tema, alternância entre acesso/cadastro, formulário e uma história lateral. O currículo de Ana Martins é rotulado como exemplo fictício. A identidade Google mantém sua marca própria.

`Journey` registra quatro etapas e a etapa atual de forma acessível. Análise apresenta pontuação real, critérios, recomendações e contexto de origem; não há previsão fictícia de melhoria. Perguntas e editor permitem conferir os fatos antes de usar as sugestões. Resultados mantêm abas, prévia do documento, carta e conteúdo de LinkedIn ligados ao fluxo existente. `ResumeDocument` valida a estrutura recebida e mostra um estado vazio quando não há documento válido; seus títulos respeitam o idioma recebido.

O logotipo vem de `components/brand/curricule-logo.tsx` e `public/brand/`; ícones passam pelo adaptador HugeIcons existente. Transições de estado são contidas (180ms); `prefers-reduced-motion: reduce` elimina transições, animações e rolagem suave dentro do escopo.

## Mascote e orientação

O personagem aprovado parte do primeiro C tridimensional em `design/mascot/poses/welcome.png`: violeta, duas linhas de currículo e expressão acolhedora. Há seis poses consistentes para receber, explicar, analisar, pensar, conferir e concluir. A interface consome WebP com transparência; as fontes PNG ficam disponíveis na prévia autenticada `/mascot` para materiais futuros.

Sua presença acompanha pontos de orientação: recepção dispensável, apresentação guiada, escolhas de análise, processamento, estados vazios, revisão de fatos, ajuda e resultado. No editor a ajuda é recolhível e fica fora do documento. O guia de seis etapas usa controles reais e não inicia processamentos. Preferências locais separam usuários e permitem ocultar o personagem e pausar seus movimentos. Animação reduzida e abas ocultas são respeitadas; as animações da interface são em 2D e não estabelecem um modelo 3D articulado.

## Do's and Don'ts

### Do:

- **Do** preservar o logotipo aprovado e a família herdada, validar claro/escuro e celular antes de desktop.
- **Do** manter estados acompanhados por texto, foco visível e controles de toque confortáveis.
- **Do** preservar a folha branca, a confirmação dos fatos e o idioma escolhido para o documento.
- **Do** usar dados reais de análise e rotular exemplos sintéticos como fictícios.

### Don't:

- **Don't** transformar notas ATS em promessa de contratação ou inventar projeções, depoimentos e resultados profissionais.
- **Don't** aplicar os tokens locais do workspace indiscriminadamente à landing pública ou ao PDF exportado.
- **Don't** tratar fixtures visuais como validação E2E autenticada ou alterar guardas de backend para facilitar uma demonstração.
- **Don't** promover a barra de revisão, seletores e rotas por hash do protótipo a componentes do produto aplicado.
