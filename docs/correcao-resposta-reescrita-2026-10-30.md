# Recuperação da resposta de reescrita

Em 30/10/2026, a otimização iniciada às 18h16 (Brasília) perdeu a conexão HTTP às 18h18min19s, com código 499 no Nginx. O processamento continuou e terminou com sucesso às 18h19min03s. O resultado final estava salvo, mas a interface exibiu indisponibilidade porque só retomava tarefas após uma resposta explícita `409 TASK_RUNNING`.

O cliente agora consulta a tarefa após falhas de rede e respostas transitórias de intermediários (408, 499, 502, 503 ou 504 sem código de erro da aplicação). Não repete o POST nem inicia outra chamada de IA. Cada requisição recebe um UUID, repassado pelos endpoints de processamento e associado à tarefa existente. A consulta autenticada de status só permite recuperar um resultado dessa mesma requisição; um resultado antigo não pode ser apresentado como uma nova geração.

O identificador do navegador é acrescentado ao token interno, cujo prefixo continua sendo aleatório e exclusivo do servidor. Repetir um identificador de cliente não permite reutilizar o bloqueio de gravação de uma tentativa expirada. Não é necessária migration de banco. Identificadores inválidos são ignorados. A consulta continua restrita ao proprietário e sem cache.

A recuperação tem prazo máximo de cinco minutos, timeout por consulta, espera crescente após falhas e interrupção após cinco consultas consecutivas sem resposta válida. Cancelar a navegação interrompe a espera do navegador. Erros explícitos da aplicação, como rejeição factual e tempo limite da tarefa, continuam sendo apresentados. A recuperação de uma validação de fatos em andamento também preserva o envelope `{ success, truthGuard }` esperado pela interface.

Limites: uma conexão totalmente indisponível impede consultar o resultado; o histórico permanece como caminho de recuperação. Clientes antigos e respostas perdidas de cache sem o identificador correspondente não recebem automaticamente outro resultado. A correção trata a entrega da resposta e não altera a geração, a revisão factual ou os limites dos provedores de IA.

Validação: testes de perda de resposta, tarefa em andamento, falha temporária de consulta, resultado antigo, limite de tentativas, cancelamento, autenticação, rejeição real e isolamento do token interno; suíte completa, lint, TypeScript e build Linux pelo pipeline automático.
