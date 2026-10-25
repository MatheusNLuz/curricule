# Curricule — logotipo

O símbolo combina um C aberto com duas linhas de conteúdo organizado, representando o currículo. O lettering leve em minúsculas foi preservado da referência aprovada e desenhado como curvas SVG: não depende de fonte instalada, download de tipografia ou pacote de ícones. A marca usa violeta `#5D4FD0` e um detalhe lavanda `#897AE4`. A versão aplicada corresponde à prévia aprovada em `design/logo-proposals/reference-lettering-01/`.

`components/brand/curricule-logo.tsx` é a fonte da versão completa e do símbolo. O lettering usa `currentColor` para acompanhar os temas claro e escuro. O componente é aplicado no cabeçalho público, na navegação da conta, na prévia do produto e no rodapé. Ícones de ações e de arquivos continuam representando suas funções.

Arquivos para uso:

- `public/brand/curricule-logo.svg`: logotipo com lettering escuro e fundo transparente.
- `public/brand/curricule-logo-light.svg`: lettering claro para fundos escuros.
- `public/brand/curricule-symbol.svg`: símbolo isolado.
- `public/brand/curricule-logo.png`: versão transparente com 1008 × 256 px.
- `public/brand/curricule-symbol.png`: símbolo com 512 × 512 px.
- `app/icon.svg`: ícone da aba do navegador.
- `app/apple-icon.png`: ícone de 180 × 180 px para a tela inicial do iOS.

Preserve as proporções e o contraste. Use o símbolo sozinho quando não houver espaço para o lettering. A versão completa tem aproximadamente 110 px de largura no cabeçalho móvel; o link mantém área de toque de pelo menos 44 px de altura.

Para reconstruir os SVGs e o favicon a partir do componente:

```powershell
node --import ./tests/register.mjs scripts/build-brand.ts
```

As exportações PNG devem ser rasterizadas novamente se o desenho mudar.
