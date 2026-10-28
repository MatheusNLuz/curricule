---
name: Curricule — prévia para aprovação
description: Sistema visual observado na proposta estática de 17 telas, ainda sem aprovação humana.
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
typography:
  body: {fontFamily: '"Avenir Next", "Segoe UI", sans-serif', fontSize: "14px", lineHeight: 1.65}
  headline: {fontSize: "30px", fontWeight: 650, lineHeight: 1.2, letterSpacing: "-.025em"}
  title: {fontSize: "19px", fontWeight: 650, lineHeight: 1.2}
  label: {fontSize: "12px", fontWeight: 600}
rounded:
  button: "9px"
  field: "8px"
  sheet: "14px"
  lead: "16px"
components:
  button-primary: {backgroundColor: "{colors.violet}", textColor: "{colors.paper}", rounded: "{rounded.button}", padding: "11px 17px"}
---

# Design System: Curricule — proposta de telas internas

## Overview

Registro descritivo em modo Operate: extensão da identidade aprovada do Curricule para conectar material, fatos, revisão e resultado. Clareza, confiança e controle da pessoa candidata orientam a proposta; o produto atende diferentes áreas profissionais.
Escopo: apenas `public/screen-review/index.html`, proposta isolada de 17 telas com temas claro e escuro. Aguarda aprovação humana de design antes de qualquer integração em produção; não autoriza commit, alterações de backend ou autenticação.
Fontes: `PRODUCT.md`, `design/screen-review/preview.tsx`, `preview.css` e `preview.js`. O contrato original de direção está em `scripts/build-screen-review.tsx`, emitido como primeiro comentário do corpo HTML.

## Colors

Os tokens acima registram o tema claro. Violeta identifica ações e seleção; fundos frios e bordas suaves organizam o espaço. Verde indica confirmação, âmbar pede atenção e azul identifica conteúdos específicos, sempre acompanhados por texto.
O seletor `:root[data-theme=dark]` substitui: bg `#121219`, paper `#1c1c26`, ink `#f0eff8`, quiet `#a5a5bb`, line `#333340`, violet `#b3a4ff`, tint `#2c2643`, tint-ink `#c3b7ff`, field `#181820`, canvas `#16161f`.
Estados escuros: success `#98d5bb` / success-bg `#20372f`; amber `#e6c280` / amber-bg `#3b3021`; blue `#8fbeed` / blue-bg `#1e3044`. O texto do botão primário escuro é `#1c162b`.
A folha `.resumePaper` permanece branca nos dois temas, com tinta `#292937`; é representação do documento final, independente das superfícies da interface.

## Typography

A família Avenir Next/Segoe UI é herdada da identidade existente em `app/globals.css` e da landing page aprovada. A prévia declara essa pilha explicitamente para funcionar isolada. É uma exceção apropriada de fonte do sistema em modo Operate: preservar a família estabelecida, sem substituir por uma nova fonte de destaque.
Corpo base 14px/1.65; título principal 30px/650, chegando a 33px em 860px e 32px em 1150px; subtítulos 19px/650. Há variações locais de contexto, descritas no CSS, sem uma segunda família de títulos.
Textos auxiliares usam 9–13px; descrições principais chegam a 65ch. Métricas e datas usam numerais tabulares. O currículo ilustrativo usa Segoe UI, com escala própria para simular o papel.

## Layout

Mobile first para 320–390px: uma coluna, conteúdo com 18px de margem interna, ações flexíveis e navegação inferior fixa de 74px com safe area. Rodapé reserva espaço para essa navegação.
Breakpoints reais em `min-width`: 560px amplia campos e listas; 860px introduz sidebar fixa de 218px e remove a navegação inferior; 1150px amplia sidebar para 238px e aumenta colunas e respiros.
Conteúdo limitado a 1320px; espaçamento interno cresce até 40px 44px 35px. Editor passa de campos/documento empilhados a duas colunas em 860px; painéis de contexto ficam ao lado do conteúdo quando há espaço.
A barra de revisão de 44px é ferramenta da demonstração. Controles principais usam altura de 44–46px; o seletor e o botão de tema dessa barra têm tamanhos menores próprios do protótipo.

## Elevation & Depth

Predominam superfícies planas com borda de 1px. Sombra ambiente clara `0 18px 44px #26203f0d`, escura `0 18px 44px #0002`; papel `0 10px 30px #19132a0c`. Sombras pontuais destacam anotações, toast e botão em hover, sem transformar todo bloco em cartão elevado.

## Shapes

Folhas e painéis usam raio de 14px; destaque inicial, 16px; botões, 9px; campos e navegação, 8px; status, 5px; papel, 3px. Avatares e marcadores de etapa são circulares. Bordas, espaçamento e títulos estruturam agrupamentos.

## Components

Vocabulário: `Heading`, `Action`, `Sheet`, `Field`, `Status`, `Journey`, `ResumePaper`; navegação principal, lista de ações, comparações de texto, perguntas de confirmação, editor e painéis de contexto.
Botões primários violetas e secundários com borda; campos rotulados, com fundo próprio e altura mínima de 46px. Foco visível de 3px em violeta com afastamento de 4px; seleções combinam fundo tonal, borda e estado acessível quando implementado.
Usar o logotipo Curricule aprovado de `components/brand/curricule-logo.tsx` e `public/brand/`; lettering completo na navegação e símbolo em espaços reduzidos. Ícones vêm do adaptador HugeIcons existente em `components/ui/app-icon.tsx`; o Google usa sua marca própria.
Movimento contido: transições de estado de 180ms em botões e toast, deslocamento do toast de 8px; `prefers-reduced-motion: reduce` elimina transições/animações e rolagem suave.
Comportamento local: rotas por hash, alternância de tema, seleção, pesquisa, filtros, edição demonstrativa e notificações. Cópia usa clipboard quando disponível; arquivo selecionado apenas exibe seu nome. Não há APIs, cookies, armazenamento persistente, upload, autenticação ou cobrança real.

## Do's and Don'ts

- **Faça:** preservar a identidade aprovada, testar claro/escuro e celular antes de desktop, manter confirmação de fatos e a folha branca.
- **Não faça:** interpretar exemplos de Ana Martins, empresas, notas ATS, usuários ou eventos como dados reais; todos são sintéticos. Não inventar prova social, resultados profissionais ou promessas de contratação.
- **Não faça:** tratar esta documentação como aprovação do redesign ou integrar a proposta antes da revisão humana.
- **Proveniência:** os JPGs individuais de `public/screen-review/prints/` são capturas reais de navegador, originadas em `.impeccable/review/`. As quatro folhas `visao-geral-*` são montagens fiéis dessas capturas, com títulos e redimensionamento/recorte definidos em `scripts/build-screen-review-gallery.ts`; não são imagens geradas de interfaces.
- **Reprodução:** na raiz, executar `npx tsx scripts/build-screen-review.tsx`; servir com `npm run dev` e abrir `/screen-review/index.html`. Após capturar novamente todas as variantes claro/escuro e mobile em `.impeccable/review/`, executar `npx tsx scripts/build-screen-review-gallery.ts` para copiar capturas e gerar a galeria. Esses comandos documentam a geração, sem autorizar integração em produção.
