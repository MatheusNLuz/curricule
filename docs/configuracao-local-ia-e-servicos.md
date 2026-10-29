# Configuração local de IA e serviços

Referência: 29/10/2026. As credenciais completas permanecem no `.env` local, ignorado pelo Git. Este documento distingue configuração explícita de valores padrão do código.

## Variáveis presentes no ambiente local

```dotenv
AI_DEFAULT_TEMPERATURE=0.0
AI_MAX_TOKENS=8000
DATABASE_URL=<conexão PostgreSQL configurada>
DIRECT_URL=<conexão direta configurada>
NVIDIA_NIM_API_KEY=<configurada>
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_NIM_MODEL=nvidia/nemotron-3-ultra-550b-a55b
OPENROUTER_API_KEY=<configurada>
OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
PORT=3000
JWT_SECRET=<configurado>
APP_URL=http://localhost:3000
DB_CONNECTION_LIMIT=3
ANALYSIS_DAILY_LIMIT=200
```

`AI_DEFAULT_TEMPERATURE` está no arquivo, mas não é lida pelo provedor atual: o código envia temperatura **0.1**. `AI_MAX_TOKENS` é um teto; cada chamada pode pedir menos tokens.

## IAs e fluxo

| Uso | Provedor/modelo |
| --- | --- |
| Primeira opção do orquestrador padrão | OpenRouter — `nvidia/nemotron-3.5-lightning:free` |
| Segunda opção e revisão entre provedores | NVIDIA NIM — `nvidia/nemotron-3-ultra-550b-a55b` |
| Primeira opção na reescrita | NVIDIA NIM — `nvidia/nemotron-3.5-lightning-30b-a3b` |

O modelo menor da reescrita usa o padrão do código, pois `NVIDIA_NIM_TRUTH_MODEL` não está definido no `.env` local. A reescrita tenta depois OpenRouter e o modelo principal NVIDIA. Etapas com revisão usam um provedor para produzir e outro para revisar; existem caminhos de recuperação quando um serviço falha. Isso não significa que todas as chamadas aconteçam simultaneamente ou que uma revisão esteja sempre disponível.

## Padrões efetivos quando não há variável no `.env`

| Configuração | Valor |
| --- | --- |
| Timeout de chamada NVIDIA | 90 segundos |
| Timeout de chamada OpenRouter | 45 segundos |
| Orçamento total por etapa | 240 segundos |
| Thinking NVIDIA | Desativado |
| Limite diário de importação | 80 tentativas |
| Concorrência de análises por processo | 2 |
| Concorrência de documentos por processo | 1 |

O tempo restante da etapa pode encurtar uma chamada. O limite de 200 no ambiente local conta etapas/tentativas, inclusive falhas; resultados idênticos recuperados do cache não iniciam nova tentativa. A renovação ocorre às 00:00 UTC, equivalentes a 21:00 de Brasília.

## Outros serviços

- PostgreSQL acessado com Prisma; conexão local configurada para o host pooled do Prisma e limite de três conexões por processo.
- Autenticação local por e-mail/senha e sessão JWT. Variáveis opcionais do Neon Auth não estão configuradas neste ambiente.
- Cobrança permanece desativada por padrão; não há gateway comercial configurado no `.env` local.
- Suporte interno funciona sem e-mail externo configurado.
- Valores de custo por milhão de tokens não estão configurados; não há estimativa local garantida de custo por modelo.

O `.env.example` contém opções de configuração e não deve ser confundido com o ambiente efetivamente carregado. Nunca copie `APP_URL=http://localhost:3000` para produção: use a origem real da implantação.
