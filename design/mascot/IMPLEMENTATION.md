# Curricule — personagem e guia

Branch: `feat/curricule-mascot-guide`.

## Direção aplicada

O primeiro C tridimensional escolhido pelo usuário é a referência. A pose de boas-vindas preserva essa imagem; cinco poses adicionais foram produzidas com image_gen a partir dela. As propostas anteriores de folha e C simplificado não são utilizadas no produto.

As fontes PNG com transparência estão em `design/mascot/poses/`. Os prompts exatos das variantes ficam em `poses/prompts.json`. `scripts/prepare-mascot-assets.mjs` prepara WebP de 640 × 660 px com alfa para a interface e disponibiliza os PNGs para download na prévia. Cada WebP tem aproximadamente 35–40 KiB; as fontes de alta resolução só são baixadas por ação explícita.

## Onde aparece

- Landing: junto à demonstração e ao convite final para começar.
- Meu espaço: recepção dispensável, com acesso à apresentação.
- Nova análise: orientação sobre objetivos, material e revisão.
- Processamento: pose correspondente à tarefa, com controle para pausar o personagem.
- Biblioteca e histórico vazios: orientação para começar ou ajustar a busca.
- Revisão de fatos: lembrete sobre a veracidade das informações.
- Editor: ajuda recolhível, separada do formulário e da prévia.
- Resultado: conclusão discreta quando existe material preparado.
- Ajuda, erro e página inexistente: orientação para recuperação.
- Menu da conta e Ajuda: reabrir a apresentação.
- `/mascot`: prévia autenticada das seis poses, fundos, movimentos, estado de processamento e download dos PNGs.

## Comportamento

A apresentação é opcional, tem seis etapas sobre controles reais e permite avançar, voltar, pular e fechar com Escape. Não envia arquivos nem inicia análises. O foco volta ao conteúdo ao fechar. O guia confirma a navegação quando há alterações não salvas ou um PDF ainda não enviado.

Preferências de visibilidade, movimento, dispensa das boas-vindas e conclusão da apresentação ficam no navegador, separadas por usuário. Não há gravação de preferências no backend nem novos eventos de telemetria. A troca de identidade reinicia o estado transitório do guia.

## Movimento e limites desta versão

Animação em 2D sobre poses renderizadas em 3D: aceno corporal de recepção, gesto de apresentação, inclinação de leitura, atenção e conclusão. A implementação usa CSS, sem adicionar biblioteca de animação. As animações comuns são finitas; o processamento permite repetição com pausa explícita. Movimento reduzido, aba oculta e personagem fora da tela suspendem o movimento.

Esta versão não contém um modelo 3D articulado, sincronização labial, narração ou um filme de apresentação final. Os PNGs transparentes e a biblioteca de poses ficam preparados para materiais e vídeos futuros. O personagem não entra no documento exportável e não altera os processamentos de análise, cobrança ou envio.

## Revisão

O trabalho fica nesta branch para refinamento antes de integrar à `master`. Capturas e registros de verificação ficam em `docs/mascot-review-2026-10-30/` no workspace local.
## Motion refinement · 2026-10-31

The live mascot now uses a shared articulated cutout rig rather than independent whole-character pose renders. See [rig/README.md](rig/README.md) for animation tracks, exact generation prompts and limits. Historical notes above describe the first implementation.

## Current: 3D performance reconstruction

The user rejected the cutout gestures. Live playback now uses the authored 3D performances described in [3d/README.md](3d/README.md), rendered to transparent clips. The cutout notes above are historical. Explain, Analyze, Think and Verify have distinct prop-led actions; thumbs-up and confetti belong to Complete. The procedural model is a visual reconstruction of the concept, with its finish open for user review.
