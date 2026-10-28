# Idioma dos resultados de IA

Todas as gerações usam `AnalysisOrchestrator.analyzeLocalized` com o `selectedLanguage` persistido na análise: pt-BR, pt-PT, en-US ou en-GB. Não existe mais uma chamada pública sem idioma e sem validação de saída.

A política do servidor prevalece sobre idioma do currículo, vaga, histórico e país de destino. Aplica-se às avaliações, comparação, perguntas e sugestões de resposta, revisão factual, currículo, perfil do LinkedIn, reavaliação e carta. Chaves e enums permanecem estáveis; nomes próprios, contatos, datas, termos técnicos e evidência literal em `foundText` são preservados. `detectedLanguage` descreve a fonte; `recommendedLanguage` deve ser o idioma escolhido.

Cada geração passa pelo schema, por verificações regionais de prosa e por uma chamada separada de auditoria de idioma. O inglês britânico usa a convenção editorial `-ise/-ised`. Respostas reprovadas por idioma são descartadas e geradas novamente uma vez por provedor, com fallback. Verificação indisponível ou inválida bloqueia a resposta. Falhas de idioma retornam 422 com `OUTPUT_LANGUAGE_MISMATCH`; conteúdo anterior não é substituído. A verificação semântica utiliza IA e não constitui prova matemática de ausência de qualquer palavra estrangeira.

O cache inclui a versão da política e o idioma nas entradas das etapas de geração. Resultados anteriores à política não são reutilizados na regeneração. Perguntas antigas são traduzidas uma vez por conjunto de IDs/idioma, preservando IDs, respostas e confirmações. Outros documentos salvos não são reescritos automaticamente: devem ser gerados novamente. Edições manuais do usuário não são traduzidas.

Validação local: `npm test`, `npm run build`. Validação real sem banco, apenas com dados fictícios:

```powershell
node --env-file=.env --import ./tests/register.mjs scripts/smoke-language.ts
```

O smoke gera os quatro idiomas usando os provedores configurados e depois testa a rejeição de misturas e variantes incorretas no NVIDIA NIM. Pode consumir créditos. A auditoria acrescenta uma chamada por geração aprovada; tentativas rejeitadas podem aumentar a latência.
