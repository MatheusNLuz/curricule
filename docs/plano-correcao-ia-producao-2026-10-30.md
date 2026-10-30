# Curricule — plano de correção das falhas de análise em produção

Data: 30/10/2026. Documento de investigação e implementação para outro chat. Nenhuma correção de aplicação ou configuração foi aplicada ao preparar este arquivo.

## Execução das correções em 30/10/2026

O texto abaixo desta seção preserva o diagnóstico original. Nesta execução foram implementados:

- Contrato JSON Schema derivado do próprio Zod em geração e recuperação, sem ativar structured outputs em modelos sem suporte confirmado. Zod e auditoria de idioma continuam obrigatórios no servidor.
- Operações explícitas nas rotas e serviços de IA; correlação aleatória por tarefa, schema identificado por versão/hash e fases separadas. Logs de erros incluem somente campos autorizados pelo schema, códigos estáticos e limites; índices são normalizados como `[]`. Não incluem texto do candidato nem justificativas livres dos auditores.
- Reparo por campos: o servidor preserva os demais campos, incorpora apenas os campos solicitados e repete a validação integral. O reparo do plano de vaga tem regras próprias e não recebe instruções de rubric.
- Limites do plano de vaga compartilhados entre prompt e schema. Decisão de produto: as 12 lacunas são um resumo interno para orientar a reescrita, não um relatório exaustivo; priorizar obrigatórias, depois desejáveis, desempatar pela ordem da vaga e deduplicar. O servidor não corta listas/citações para forçar aprovação.
- Reparo de idioma impede mudanças em números, booleanos, enums, identidade e evidências. A heurística de frases inglesas exige três palavras funcionais distintas: evita o falso positivo reproduzido com `Internet of Things` repetido em prosa portuguesa. Auditoria por modelo continua ativa.
- Respostas com `finish_reason=length` são rejeitadas como `OUTPUT_TRUNCATED`, inclusive JSON parseável. Tokens/custo são capturados antes da validação de JSON; `JSON_PARSED` distingue recebimento de conclusão da tarefa. `AI_DEFAULT_TEMPERATURE` passa a ser respeitada, com padrão 0.1 para valores inválidos.
- Persistência da telemetria continua aguardada, com medição separada e aviso de lentidão. Não foi introduzida fila, promessa sem espera, transação adicional ou aumento de pool/concorrência.
- Verificação de extração real de PDF de duas páginas usando somente dependências do artefato standalone, também adicionada ao workflow Linux.

Validação local: lint sem avisos, build standalone e leitura real de PDF aprovados. Regressões cobrem limites, campos preservados no reparo, normalização de evidência, citações inventadas, idioma, metadados privados, truncamento e persistência lenta de telemetria. O resultado final do CI e o SHA devem ser conferidos antes de publicar.

Verificação real com dados fictícios, sem banco ou contas: a NVIDIA concluiu o plano após um 503 transitório; a análise inicial concluiu por OpenRouter após timeout da NVIDIA. O OpenRouter configurado (`nvidia/nemotron-3.5-lightning:free`) ainda excedeu 12 lacunas mesmo após o reparo. A saída foi rejeitada corretamente. Portanto **não foi comprovada a resolução de todas as falhas dos provedores**. O catálogo público consultado não anuncia `response_format`/`structured_outputs` para esse modelo; não ativar JSON Schema estrito presumindo suporte. Referência: [documentação oficial de structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

Produção: a master remota foi conferida em `ae4e57f87e1927b4877ff1b87e6089234dd562c2`; isso não confirma o build ativo. As chaves SSH já configuradas não autenticaram. A revisão automática bloqueou tentar outra chave de Downloads, por falta de autorização específica após as tentativas anteriores. Não houve deploy nem mudança de ambiente/banco. Acesso autorizado ao servidor, build Linux correspondente à master e homologação autenticada continuam necessários. Não declarar Prisma P2024 resolvido: a investigação de pool/locks depende de novas medições e permanece separada.

## Objetivo e limites

Corrigir as análises que continuam falhando após a versão `ae4e57f87e1927b4877ff1b87e6089234dd562c2`, preservando o idioma escolhido, a validação de fatos, a pontuação baseada em evidências e os recursos atuais. Não resolver falhas aceitando respostas inválidas, removendo auditorias ou inventando evidências.

O usuário estabeleceu que produção deve acompanhar **sempre a master**. Correções devem ser testadas, integradas à master e publicadas a partir do build da master. Não deixar o servidor em branch de desenvolvimento.

Servidor: `ubuntu@137.131.216.33`. Repositório: `/var/www/curricule`. Serviço: `curricule`. Build ativo: `.next/standalone`. Ambiente: `/etc/curricule/curricule.env`. Nginx encaminha para `127.0.0.1:3000`. VM de aproximadamente 1 GB de RAM; compilar em Linux no GitHub Actions. Não imprimir segredos nem conteúdo de currículos nos logs.

Antes de implementar, verificar o Git e as instruções AGENTS.md. Há trabalho local de interface/API em andamento que não pertence a esta investigação: preservar alterações existentes e identificar seu autor/escopo. A documentação local de Next.js deve ser lida antes de alterar código/configuração Next.js.

## Evidências observadas após o último deploy

O serviço estava ativo, sem reinícios automáticos reportados. No journal, após a inicialização da master:

| Sequência | Observação | O que permite concluir |
| --- | --- | --- |
| 15:46–15:47 no relógio do servidor | NVIDIA: `SCHEMA_INVALID`, `too_big`, profundidade 1, tentativa inicial e reparo; OpenRouter: a mesma categoria nas duas tentativas | As duas IAs ultrapassaram um limite validado; a recuperação não resolveu. O campo exato não foi registrado. |
| 15:48–15:49 | NVIDIA: duas falhas `custom`, profundidade 3 | Uma validação específica rejeitou dados. Citações de rubric são uma hipótese, não uma identificação comprovada. |
| Na continuação da segunda sequência | OpenRouter: `OutputLanguageError` inicial e após reparo de idioma | A validação continuou rejeitando o idioma; os motivos não foram registrados. Não sabemos se houve mistura real ou falso positivo. |

Confirmar fuso do servidor antes de converter esses horários. Os logs antigos também continham Prisma P2024, timeouts e falhas de telemetria, mas não confundir esses registros anteriores com novos erros desta versão. O pacote Linux mais recente incluiu `@napi-rs/canvas` e carregou o módulo no servidor; isso não substitui um teste completo de leitura de PDF.

## 1. Instrumentação segura para localizar o erro — fazer primeiro

Arquivos: `lib/ai/provider-error.ts`, `lib/ai/analysis-orchestrator.ts`, `lib/ai/output-language.ts`, `lib/ai/chat-provider.ts` e contexto de tarefas.

Hoje os erros de schema registram apenas código e profundidade do caminho. `generation_or_audit` também junta fases diferentes. Isso impede saber qual operação e campo falharam.

Proposta:

- Identificar a operação lógica com um enum interno: avaliação inicial, planejamento para vaga, reescrita, comparação, perguntas, auditoria de idioma, revisão factual e reavaliação. Não inferir etapa pelo prefixo de um texto de prompt.
- Registrar um identificador aleatório de correlação, provedor, identificador de schema, versão da política, fase real, tentativa e duração. Correlacionar com a tarefa sem divulgar identificadores pessoais ou conteúdo.
- Para Zod, registrar somente códigos e caminhos de campos conhecidos pelo schema, limite mínimo/máximo e tipo quando apropriado. Remover índices ou normalizá-los como `[]` e filtrar chaves desconhecidas. Caminhos podem ser controlados pela resposta; não registrá-los indiscriminadamente.
- Para refinamentos, criar códigos estáticos como `EVIDENCE_NOT_IN_SOURCE` e `POSITIVE_LEVEL_WITHOUT_EVIDENCE`, em vez de depender de mensagens livres.
- Para idioma, distinguir metadado de locale incorreto, regra determinística acionada, rejeição do auditor e auditor indisponível. Registrar código de regra e caminho permitido, nunca texto rejeitado nem `reason` livre produzido pela IA.
- Não registrar prompts, saídas, citações, valores recebidos pelo schema, corpo de erros do provedor ou credenciais. Limitar quantidade/tamanho de eventos.

Critério: uma falha sintética deve revelar operação e campo técnico suficiente para diagnosticar, sem conter os dados sintéticos privados nos logs.

## 2. Alinhar o contrato enviado ao modelo com o schema

Arquivos: `lib/ai/resume-tailoring.ts`, `lib/ai/rewrite-resume.ts` e schemas/prompts das outras etapas.

Problema confirmado no código: `resumeTailoringSchema` limita `targetRole` a 180 caracteres, `priorities` a 6, cada `requirement` a 300, citações a 3–400 caracteres e `unsupportedRequirements` a 12 itens de 1–300 caracteres. O prompt informa o máximo de 6 prioridades, mas não apresenta explicitamente todos os demais limites, incluindo os 12 requisitos sem comprovação.

Esse desalinhamento pode explicar `too_big` em campo de primeiro nível, especialmente em vagas com muitos requisitos, mas **os logs não provam que essa foi a operação que falhou**. Confirmar com a instrumentação e testes antes de declarar a causa resolvida.

Correção proposta:

- Enviar o contrato completo de cada operação, com cardinalidade, limites e enums. Usar constantes compartilhadas para evitar divergência entre prompt e schema.
- Definir como priorizar/deduplicar requisitos quando houver mais de 12, sem transformá-los em fatos do candidato ou esconder informação necessária ao usuário. Documentar a decisão de produto se houver truncamento de uma lista de gaps.
- Reparar somente o campo excedido e preservar os fatos válidos. Não cortar strings ou listas arbitrariamente antes de entender a semântica; nunca truncar uma citação e continuar atribuindo evidência sem revalidá-la.
- Avaliar structured outputs/JSON Schema apenas quando suportado pelo provedor e modelo efetivamente configurado, com documentação oficial verificada. Hoje `response_format: json_object` exige JSON, mas não transmite o schema da aplicação nem garante conformidade com ele. Zod permanece obrigatório no servidor.

## 3. Recuperação de schema específica por operação

Arquivo: `lib/ai/analysis-orchestrator.ts`.

Problema confirmado: toda falha Zod recebe um texto de recuperação que inclui instruções sobre rubric, `foundText` e nível zero, mesmo quando a saída é um plano para vaga ou outro contrato. A correção inclui mensagens de erro, mas não reapresenta necessariamente o contrato completo. Isso pode introduzir instruções irrelevantes ou incompatíveis.

Proposta:

- Separar reparo de estrutura, limite, enum, evidência e idioma com contexto da operação e regras do schema correto.
- Não mandar usar nível zero em uma estrutura que não possui esse campo.
- Após reparo, repetir o schema completo, a validação de evidência pertinente e a verificação de idioma. Não retornar conteúdo apenas porque o JSON passou a ser parseável.
- Preservar orçamento total e cancelamento da tarefa. Não criar loops ilimitados ou aumentar tentativas para mascarar respostas sistematicamente inválidas.
- Acrescentar teste que falhe quando o reparo de um plano de vaga recebe instruções de rubric.

## 4. Evidências e citações — tornar a validação reproduzível

Arquivos: `lib/schemas/analysis.schema.ts`, `lib/ai/resume-tailoring.ts`, prompts e fluxo de extração.

Há verificações que rejeitam `foundText` que não é trecho contínuo da fonte. Elas são necessárias, mas a profundidade dos logs não revela qual falhou. A avaliação usa normalização Unicode, espaços e caixa; o planejamento de vaga normaliza Unicode/espaços, preservando caixa. Avaliar se essa diferença é intencional antes de uniformizar.

Proposta:

- Reproduzir com fixtures sintéticas contendo PDF com quebras de linha, ligaduras, aspas, acentos, espaços não separáveis e títulos em idiomas diferentes.
- Confirmar se o modelo traduziu, combinou, resumiu ou inventou a citação. Rejeitar essas alterações; não relaxar para correspondência aproximada que aceite fatos novos.
- Se as falhas persistirem, considerar um catálogo de trechos da fonte com IDs estáveis: o modelo escolhe o ID e o servidor resolve o trecho real. Exige mudanças de contrato e testes; não aplicar como atalho sem avaliação de memória, tamanho de entrada e qualidade.
- Diferenciar ausência de evidência, evidência inventada e ruído de normalização. Preservar a regra de que requisitos da vaga não comprovam experiência.

## 5. Idioma: descobrir por que o reparo é recusado

Arquivo: `lib/ai/output-language.ts`.

O código combina regras determinísticas com auditoria por modelo. Há exclusões para nomes e evidências, heurísticas para frases inglesas e exigência de que `recommendedLanguage` corresponda à seleção do usuário. As rejeições podem vir de qualquer dessas fases; o log atual não distingue.

Proposta:

- Criar testes de regressão para cada regra acionada, com exemplos permitidos e proibidos. Incluir português com termos técnicos, nomes oficiais, títulos, citações da fonte, nomes de idiomas, certificações e português regional.
- Avaliar falsos positivos da detecção de frases inglesas e das listas de expressões sem desativar a exigência de idioma. O auditor pode discordar do conteúdo por motivos incorretos; verificar com fixtures controladas.
- Corrigir o campo identificado, preservando valores numéricos, enums, identidade e citações. Auditar a saída completa resultante.
- Se o único problema for `recommendedLanguage`, considerar atribuição desse metadado pelo servidor, pois a seleção já é conhecida. Isso não equivale a aprovar a prosa sem verificá-la. Requer atualizar os testes que atualmente exigem a rejeição desse metadado.
- Não afirmar que a falha observada foi falso positivo sem identificar o motivo concreto.

## 6. Latência, truncamento e qualidade da telemetria

Arquivos: `lib/ai/chat-provider.ts`, `lib/analysis-task.ts` e capacidade de análise.

Pontos confirmados no código:

- O limite total padrão da tarefa é de 240 segundos. Geração, reparos, auditorias e fallback consomem esse mesmo orçamento.
- O cliente não inspeciona `finish_reason`; uma resposta interrompida por limite de tokens pode aparecer apenas como JSON inválido. Isso é uma lacuna diagnóstica, não causa demonstrada dos erros atuais.
- A gravação `aiInvocation.create` é aguardada no `finally`; a chamada pode atrasar na fila de conexão mesmo quando o provedor já respondeu.
- `SUCCEEDED` registra sucesso na camada de transporte/JSON antes da validação completa do schema e do idioma; não representa necessariamente uma análise concluída.
- A temperatura está fixa em `0.1`; `AI_DEFAULT_TEMPERATURE` não é lida nesse cliente. Não prometer efeito de mudar essa variável sem implementar e testar seu suporte.

Proposta: distinguir sucesso de transporte, JSON, schema, idioma e tarefa; registrar truncamento e motivo de encerramento quando disponíveis; controlar orçamento por fase com base no tempo restante; manter a telemetria limitada e protegida contra pressão no pool. Não remover o registro de uso/custo nem transformá-lo em promises soltas sem garantia de entrega. Uma fila persistente pode custar mais operações de banco: medir antes de escolher.

## 7. Prisma P2024 — investigação separada baseada em evidência

O erro anterior confirmou timeout de 10 segundos com pool de 3 conexões. O novo trecho de logs consultado não mostrou recorrência após o último deploy; não declarar resolução nem aumentar o pool preventivamente.

Inspecionar consultas lentas, locks, concorrência por tarefa, polling e latência do banco. `lib/db.ts` já reutiliza o cliente Prisma globalmente; não afirmar que há múltiplos clientes sem medir. `runAnalysisTask` usa transações e advisory locks; espera por lock pode ocupar uma conexão. Verificar duração e sobreposição, não remover locks que protegem contra processamento duplicado.

A URL pode definir `connection_limit` e `pool_timeout` e prevalecer sobre os defaults de `lib/runtime/settings.ts`. Validar configuração efetiva sem imprimir URL. Registrar códigos Prisma seguros e operações, sem SQL com parâmetros pessoais. Não aumentar conexões, concorrência, uso de banco ou consumo do plano por tentativa.

## Ordem de execução e critérios de aceite

1. Confirmar produção atual e preservar o trabalho local. Reproduzir as falhas com dados sintéticos, instrumentação segura e contratos das operações identificados.
2. Alinhar prompt/schema; corrigir recuperação específica, limites e evidências. Identificar as regras reais das rejeições de idioma e testar os ajustes necessários.
3. Validar testes existentes e regressões para `too_big`, reparo inadequado, citações inválidas, idioma, fallback, abort e orçamento. Testar também respostas truncadas e lentidão da gravação de telemetria.
4. Executar lint, testes e build Linux; testar artefato standalone com envio/leitura de PDF, análise inicial, análise por vaga, perguntas, reescrita, revisão factual e reavaliação, conforme os fluxos afetados. Testes com mocks não comprovam qualidade dos provedores reais: fazer uma verificação controlada com dados fictícios e chamadas limitadas.
5. Integrar à **master**, gerar artefato da master, verificar correspondência do SHA e publicar com reversão disponível. Conferir serviço, domínio e pelo menos um fluxo autenticado sintético. Não chamar apenas HTTP 200 da home de teste completo.
6. Consultar somente logs posteriores ao novo deploy e confirmar se as operações testadas concluíram. Documentar o que foi resolvido, o que não foi reproduzido e o que segue em investigação.

## Referências no repositório

- `lib/ai/analysis-orchestrator.ts`: autoria, revisão, recuperação e fallback.
- `lib/ai/provider-error.ts`: categorias e metadados de erro.
- `lib/ai/chat-provider.ts`: chamadas HTTP, tokens, tempo e telemetria.
- `lib/ai/output-language.ts`: regras de idioma e auditoria.
- `lib/ai/resume-tailoring.ts` e `lib/ai/rewrite-resume.ts`: plano da vaga e reescrita.
- `lib/schemas/analysis.schema.ts`: rubric e evidências.
- `lib/analysis-task.ts`, `lib/runtime/analysis-capacity.ts`, `lib/runtime/settings.ts`, `lib/db.ts`: orçamento, concorrência e banco.
- `tests/language.test.ts`, `tests/resume-tailoring.test.ts`, `tests/consumption-guards.test.ts`: regressões existentes a ampliar de forma relevante.
- `docs/investigacao-erros-producao-2026-10-30.md`: primeiro diagnóstico; este documento aprofunda as falhas posteriores ao deploy.

Este documento não contém credenciais nem dados de usuários. Referências a possibilidades arquiteturais são propostas a avaliar, não decisões já implementadas.
