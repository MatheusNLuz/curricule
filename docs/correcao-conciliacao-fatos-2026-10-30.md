# Conciliação de respostas e verificação factual

Correção de 30/10/2026 para o conflito entre confirmações do candidato e lacunas antigas da comparação com a vaga.

A revisão recebia `missingMandatorySkills` da comparação anterior como conteúdo proposto do candidato. Podia confirmar uma experiência e também copiar o nome da ferramenta para `blockedClaims`. A verificação final usava busca por substring, bloqueando inclusive uma afirmação correta sobre GitHub quando a restrição era Git.

## Comportamento corrigido

- A revisão recebe respostas separadas por pergunta e confirmações explícitas. Lacunas da vaga deixam de ser apresentadas como afirmações do candidato. Sem respostas, as afirmações do próprio currículo são avaliadas.
- O contrato exige que cada bloqueio repita uma afirmação efetivamente classificada como não permitida. Um parecer que aprova os fatos e mantém bloqueios contraditórios falha no schema e passa pela recuperação limitada já existente; os bloqueios não são simplesmente apagados pelo servidor.
- Toda saída passa pela auditoria factual. As restrições, inclusive rejeições explícitas, continuam sendo enviadas e verificadas pelo significado, com escopo e qualificadores. A auditoria indisponível, vazia ou com afirmações sem comprovação impede a aprovação. A busca literal que confundia nomes de ferramentas foi removida.
- Conhecimento teórico não comprova experiência profissional. O prompt exige preservar essa distinção, e as permissões para currículo e carta são avaliadas de forma independente.
- `candidate-assertions-v2` integra o hash da revisão. Pareceres e caches anteriores precisam ser refeitos; as respostas salvas permanecem intactas. Não houve edição manual de respostas, confirmação automática de inferências ou migração de dados.
- A rejeição factual registra somente regra, contagens, destino e correlação da tarefa, sem texto do candidato ou das afirmações.

## Verificação

Regressões reproduzem o envio indevido de lacunas antigas, Git versus GitHub, conhecimento teórico versus prática, parecer contraditório, afirmações recusadas e suas paráfrases, indisponibilidade do auditor, invalidação de revisão antiga e permissões por destino.

Testes reais usam somente dados fictícios, sem contas ou banco. O auditor permitiu GitHub e a descrição limitada de conhecimento teórico, e rejeitou prática profissional inventada. A revisão pode continuar classificando a qualificação prática ausente como `missing`; isso não deve ser transformado em proibição de toda a tecnologia nem em experiência confirmada.

As tentativas de reparo, o orçamento de tarefa e a configuração de provedores/pool não foram ampliados. Não houve garantia de eliminar indisponibilidade externa ou todo julgamento incorreto de modelo. A liberação exige build Linux da master e verificação do SHA do artefato no servidor.
