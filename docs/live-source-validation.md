# Validação real de links e IA — 25/10/2026 UTC

Os testes fizeram requisições reais pelo mesmo leitor seguro de produção, sem sessão de LinkedIn, sem contornar login e sem currículo privado. A comparação de vaga utilizou um candidato fictício explicitamente identificado no prompt.

| Fonte pública | Extração observada | IA real |
| --- | --- | --- |
| [Lever / Tekton](https://jobs.lever.co/tekton/fe1dfe1c-1519-4eda-97bb-03794d65bf1b) | 3.200 caracteres de vaga | Extração estruturada e comparação passaram pela validação dos schemas |
| [Greenhouse / Apiiro](https://job-boards.greenhouse.io/apiiro/jobs/6670059003) | 3.039 caracteres de vaga | Extração estruturada e comparação passaram pela validação dos schemas |
| [LinkedIn / perfil público](https://www.linkedin.com/in/williamhgates) | 458 caracteres, com título, Sobre, experiências e formação visíveis | Análise com sugestões de título passou pelo schema; o teste final usou o texto guardado da leitura real anterior |

Foram corrigidos dois falsos negativos: títulos como “What You Will Do” não eram reconhecidos como vaga; CTAs de login faziam um perfil público ser rejeitado mesmo quando suas seções estavam disponíveis. A importação do LinkedIn agora prioriza as seções públicas e exclui modais e publicações. Isso não dá acesso ao perfil completo oculto.

OpenRouter devolveu HTTP 401 com a configuração local. O fallback NVIDIA respondeu às chamadas bem-sucedidas. A geração de LinkedIn inicialmente excedeu o limite, inclusive com 60 segundos; após reduzir a verbosidade e desativar o raciocínio prolongado do Nemotron 3, retornou em aproximadamente 27 segundos. A [documentação oficial NVIDIA](https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard) descreve o parâmetro `chat_template_kwargs.enable_thinking`. O padrão do aplicativo para essa família é geração direta, configurável por `NVIDIA_NIM_THINKING`.

Uma nova leitura do LinkedIn também sofreu `ECONNRESET`. Por isso a interface continua oferecendo texto/PDF e exige conferência do conteúdo importado. Os resultados mostram funcionamento nas fontes testadas naquele momento, sem garantir disponibilidade de qualquer URL ou qualidade factual absoluta da IA. Saída que passa por schema ainda precisa de revisão humana.

## Reproduzir

```powershell
# Rede externa e chaves de IA válidas são necessárias. Pode consumir a cota dos provedores.
node --env-file=.env --import ./tests/register.mjs scripts/smoke-live-sources.ts --ai
```

Sem `--ai`, testa somente a extração. O material de diagnóstico fica em `scratch/live`, ignorado pelo Git. `--only-linkedin --cached-public` testa a IA com o texto público preservado por uma execução anterior; o relatório marca essa origem explicitamente.

Essa verificação não incluiu sessão de usuário em banco real, migração remota, exportação autenticada de PDF ou cobrança. Esses testes exigem um ambiente isolado configurado.
