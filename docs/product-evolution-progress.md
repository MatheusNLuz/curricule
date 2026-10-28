# Evolução aprovada do Curricule — implementação e homologação

Escopo: seleção anexada em 25/10/2026, dois novos modelos aprovados e melhorias de produto, qualidade, privacidade e operação. Nenhum commit foi criado. Cobrança permanece desativada, sem gateway, preços ou planos novos.

## Entregas

- Quatro modelos ATS de uma coluna: Básico, Moderno, Executivo e Direto. Um contrato de conteúdo compartilhado entre prévia, texto, PDF e DOCX, incluindo projetos e idiomas opcionais. Nenhum modelo representa certificação universal de compatibilidade com todos os ATS.
- Editor de contato, resumo, experiências, formação, competências, certificações, projetos e idiomas, com adição, remoção, reordenação, desfazer, rascunho e conflito de versão. Falhas iniciais têm recuperação e nova tentativa.
- Currículo salvo separado da pontuação: editar mantém os downloads disponíveis, identifica a avaliação antiga e permite reavaliar sem reescrever o texto.
- Pontuação ponderada por cinco critérios estruturados, níveis e evidências verificadas contra a fonte. Sem bônus por palavras ou deduções duplicadas. Evidência inválida é recusada; a IA dispõe de uma tentativa limitada para corrigir a estrutura.
- Política dos quatro idiomas em todos os fluxos, auditoria de idioma, regeneração limitada e preservação do conteúdo anterior quando a verificação falha.
- Revisão por trecho: origem textual, confirmação, edição e rejeição. Confirmações e rejeições ficam persistidas separadamente; rejeições também entram na verificação de paráfrases. As decisões concorrentes são protegidas por versão e token.
- Leitura de links públicos com URL efetivamente lida, data, título, empresa quando disponível em metadados, requisitos, responsabilidades e avisos de incompletude. Conteúdo é apresentado para revisão. Bloqueios de login, JavaScript e endereços privados têm alternativa por texto/PDF.
- Guia inicial, retomada pelo histórico, duplicação de material para outra candidatura e status manual. A duplicação não altera a candidatura original nem copia sua vaga ou pontuação.
- Tempo total de tarefa, cancelamento compartilhado, limite de concorrência, proteção contra gravações tardias, estado de falha/retomada e cache. Limites técnicos de importação separados de processamento, com janela UTC explícita.
- Conta com exportação paginada de dados, consentimento opcional e exclusão de materiais/desativação. Identidade externa e backups são tratados separadamente e a pendência é apresentada. Ajuda gera solicitações reais no painel.
- Corpos e origens das requisições protegidos, limitação de autenticação, isolamento por conta, permissões consultadas no banco e sessão revogada ao suspender/excluir.
- Administração com motivo de suspensão, auditoria filtrável, contexto de falhas por usuário, suporte e operação com tokens, custo informado/estimado quando configurado, duração, falhas e rejeições de idioma. Alertas são no painel; manutenção de retenção é manual e auditável.
- Métricas e Web Vitals somente com permissão, sem texto de formulários ou currículos. Funil usa a mesma coorte de contas e registros de materiais/exportações. Simulador abaixo da dobra carrega sob demanda. Controle de movimento reduzido preservado.

## Validação executada

| Área | Evidência |
| --- | --- |
| Automatizados | 113 testes aprovados: 28 testes de bibliotecas + 85 de segurança, rotas, idiomas e interface |
| Tipos e produção | TypeScript sem erros e build Next.js de produção concluído |
| Lint | Arquivos alterados/novos verificados; relatório sem erros ou avisos |
| Documentos | 32 combinações: quatro modelos × quatro idiomas × curto/longo. 32 PDFs e 32 DOCX reais gerados pelo endpoint autenticado. Texto, ordem, contato, seções, páginas sem vazio e estrutura DOCX conferidos. Páginas PDF renderizadas e inspecionadas visualmente |
| Contas | Login normal com duas contas fictícias; leitura, edição, exclusão, tarefas, revisão, duplicação, prévia e exportação de outra conta bloqueadas |
| Conta e administração | Upload real de PDF, falso PDF recusado, conflito de versão, rejeição persistente, candidaturas independentes, consentimento, exportação privada, suporte, motivo obrigatório, suspensão/restauração e exclusão local testados por HTTP real |
| IA real | Análise estruturada e cache em pt-BR, pt-PT, en-US e en-GB. Perguntas → respostas → fatos → otimização → edição → reavaliação em pt-BR. Reavaliação preservou exatamente o JSON do texto salvo. Comparação de vaga, carta verificada e análise/sugestões de LinkedIn por texto também passaram |
| Fonte real | Vaga pública Greenhouse/JustMarkets lida pelo endpoint; requisitos e responsabilidades conferidos. Endereço privado recusado. Empresa ficou ausente quando não existia metadado confiável |
| Navegador | Login normal, guia, formulário em 320 e 390 px, troca de idioma, campos de 16 px, editor/salvamento e troca de modelo. Temas claro/escuro; ausência de rolagem horizontal nos formulários/editor. Simulador lazy conferido no build de produção |
| Desempenho local | Eventos reais do build de produção chegaram após corrigir o proxy público da telemetria. Amostras locais, sem throttling: LCP 1,34–2,09 s; FCP 1,70 s; TTFB 1,12 s; CLS 0,141. Isso não é p75 de campo nem comprovação de desempenho publicado. CLS precisa de acompanhamento em dispositivos/rede reais |

Os testes encontraram e corrigiram a restrição antiga que impedia o status DELETED, a invalidação da revisão após rejeitar fatos, a coleta pública bloqueada pelo proxy e evidências concatenadas indevidamente pela IA. Respostas não verificadas continuam sem substituir o conteúdo salvo. Houve um timeout transitório e rejeição de idioma nos ensaios de IA; a repetição passou, sem relaxar as verificações.

A segunda execução da matriz atingiu o limite horário de documentos na primeira conta. O bloqueio 429 foi preservado; as cinco combinações restantes passaram com a segunda conta fictícia. O relatório consolidado contém as 32 combinações.

## Evidências locais

Arquivos de dados e logs de teste ficam ignorados pelo Git em `scratch/evolution/`:

- `all-tests.log`, `build.log`, `typecheck.log`, `lint.log`.
- `exports/report.json`, PDFs, DOCX e PNGs das páginas.
- `product-flow.log`, `product-flow-report.json`.
- `ai-flow.log`, `ai-flow-remaining.log`, `ai-flow-finish.log` (execuções e retomadas, inclusive falhas anteriores; os quatro idiomas aprovados estão distribuídos entre esses logs).
- `additional-flows.log`, `additional-flows-report.json`.
- `source-import-report.json`, `local-production-vitals.json`.

Capturas de navegador em `.impeccable/review/evolution-applied/`. Não incluem dados reais do usuário.

## Ambiente e dependências externas

O Neon original recusou conexão por cota excedida. Nenhum dado, plano, chave ou variável do `.env` original foi alterado. As migrações foram aplicadas somente no schema isolado `curricule_review_*` do PostgreSQL local em `127.0.0.1:55432`, sem cópia de dados reais. Autenticação local normal por senha; nenhum bypass foi adicionado.

O OpenRouter configurado retorna HTTP 401. O fallback NVIDIA NIM foi usado com sucesso. A credencial do OpenRouter precisa ser corrigida pelo responsável antes de depender desse provedor.

Migrações aditivas novas: `20261025000000_product_evolution`, `20261025001000_review_provenance`, `20261025002000_persistent_rejections`, `20261025003000_persistent_confirmations`, `20261026000000_deleted_account_status`. Depois de restaurar a capacidade do Neon, aplicar com o fluxo habitual de homologação/backup e `prisma migrate deploy`; depois gerar o cliente e validar o login Neon. Não houve migração no banco original nesta tarefa.

Contato externo `SUPPORT_EMAIL` permanece configurável e vazio até receber um endereço real. Ajuda interna funciona sem esse endereço. Tarifas opcionais para estimativas de custo devem corresponder ao modelo utilizado; valores ausentes são exibidos como desconhecidos.

A exclusão da identidade real no Neon, políticas finais de retenção/backups dos provedores, revisão jurídica, agendamento de manutenção e notificações externas dependem de configuração operacional. Não foram simulados como concluídos. Validação em aparelho físico, produção publicada e integração de gateway não foram executadas.

## Como abrir e repetir

- Aplicativo original/HTMLs: `http://localhost:3000`. A conexão de dados original continua sujeita à cota do Neon.
- Aplicativo isolado: `http://localhost:3002`. Usar apenas dados fictícios neste ambiente.
- Produção local de homologação: `http://localhost:3003`.
- Contas fictícias `resume-a@example.test`, `resume-b@example.test`, `admin-review@example.test`; senha local de teste `Curricule-Teste-2026!`. São contas apenas no banco isolado.
- Iniciar PostgreSQL: `node scripts/local-validation-db.mjs`.
- Migrações locais: `node --env-file=.env scripts/validation-env.mjs migrate`.
- Servidor isolado: `node --env-file=.env scripts/validation-env.mjs serve`.
- Testes: `npm test`; `npx tsc --noEmit`; `npm run build`.
- Matriz: `npm run test:exports`. `-- --resume` retoma o relatório com a segunda conta; os limites reais não são desativados.
- Jornada: `node --env-file=.env --env-file=scratch/evolution/validation.env --import ./tests/register.mjs scripts/validate-product-flow.ts`.
- Fluxos adicionais: comando equivalente com `scripts/validate-additional-flows.ts`.

Os scripts de escrita verificam que o banco é local e isolado. O arquivo ignorado `scratch/evolution/validation.env` contém a configuração local; nunca publicar esse arquivo.
