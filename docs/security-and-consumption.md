# Segurança e consumo — revisão de 28/10/2026

## Prisma

O workspace foi consultado pela API oficial: plano **Free**, sem bloqueio de uso no momento da consulta. O banco `curricule-prod`, na branch `main`, tinha **735 operações** e aproximadamente **0,000725 GiB** na consulta inicial desta revisão. É uma fotografia do uso, não uma estimativa mensal.

O Free inclui 200 mil operações mensais e 2 GB de armazenamento. A documentação informa que, ao esgotar as operações do Free, novas leituras e escritas são bloqueadas. O aplicativo não recebe tokens administrativos da plataforma nem pode contratar um plano pago: no servidor existem apenas as credenciais PostgreSQL necessárias para acessar o banco. Alterar o plano no console muda as condições de cobrança e exige reavaliar o limite de gastos do workspace.

- Pricing: https://www.prisma.io/pricing
- Bloqueio do Free: https://www.prisma.io/docs/postgres/faq
- Limites de gastos em planos pagos: https://www.prisma.io/docs/console/more/billing

Três conexões em pool limitam simultaneidade, **não** o total de operações cobradas. Uma ação do produto pode executar várias consultas SQL. Os limites existentes por usuário permanecem: 40 processamentos e 80 importações por dia; falhas contam como tentativas. Operações de IA, documentos e consultas continuam sujeitas aos limites técnicos dos respectivos provedores.

## Desperdício e abuso

- A tela de análise deixa de consultar progresso quando não há tarefa ativa. Mantém checagem inicial, retorno à aba e avisos entre abas. Falhas consecutivas param após cinco tentativas e oferecem recuperação explícita.
- O endpoint de perfil reaproveita a sessão já validada contra o banco, sem repetir a busca do usuário. Não foi adicionado cache de autorização: suspensão e remoção continuam sendo consultadas.
- Eventos opcionais de navegação foram removidos da interface e do cliente. POSTs de versões antigas são descartados sem ler sessão ou acessar o Prisma. Histórico de dados já existente não foi apagado em massa.
- Cadastro/login rejeitam JSON inválido, campos inválidos e conteúdo excessivo antes dos limites que usam o banco.
- O Nginx aplica limites antes do Node/Prisma: API por IP (3/s, burst 30), login/cadastro por IP (6/min, burst 8), autenticação global (30/min, burst 20), escritas globais (120/min, burst 40), 12 requisições de API simultâneas por IP. Rajadas excedentes recebem 429.
- O IP real só é aceito quando a conexão veio dos blocos retornados pela API oficial da Cloudflare. A configuração é validada com `nginx -t` antes de recarregar. Revalidar os blocos ao alterar o proxy.

Essas proteções reduzem desperdício e abuso; não garantem que a cota seja suficiente para qualquer volume de usuários ou ataques distribuídos. O bloqueio do plano Free é a proteção financeira do provedor.

## Servidor

- Next somente em `127.0.0.1:3000`, atrás do Nginx com HTTPS.
- SSH por chave, root e senha desativados, três tentativas por conexão e X11 desativado. O acesso `ubuntu` foi testado após a alteração.
- Fail2ban instalado e ativo para SSH: cinco falhas em dez minutos geram bloqueio de uma hora.
- IPv4 e IPv6 permitem conexões de entrada apenas para SSH/web e tráfego necessário; RPC não é liberado externamente.
- Serviço sem root, com isolamento de diretórios, heap de 256 MiB, limite de memória, reinícios limitados e concorrência de documentos/IA limitada.
- Ambiente de produção em `/etc/curricule/curricule.env`, `root:curricule`, modo 640, fora do repositório. O serviço só lê o clone de fontes.
- Logs do journal limitados a 64 MiB persistentes, 32 MiB voláteis e retenção de sete dias.
- Atualizações automáticas de segurança do Ubuntu já estavam habilitadas. A atualização geral dos pacotes detectados nesta revisão depende da autorização específica solicitada ao usuário; não foi aplicada sem resposta.
- Chromium de PDF atualizado para 153.0.0; exportações precisam ser verificadas no Linux antes da publicação.

Esta revisão não equivale a um pentest ou a garantia absoluta contra falhas futuras. As nove dependências de baixa severidade relacionadas ao `deepmerge`, já documentadas em `pre-push-validation.md`, precisam continuar sendo acompanhadas até existir correção compatível. O plano Free não substitui uma estratégia independente de backup dos dados.

## Interface

O simulador da LP vinha sendo montado por importação dinâmica ao entrar no viewport, sem um limite local de Suspense. Foi reproduzida a substituição da LP pelo loading geral da aplicação ao rolar. O simulador pequeno agora é renderizado com a página, sem chamadas de IA e sem carregamento disparado pela rolagem. Login e cadastro mantêm somente e-mail/senha; a medição opcional foi retirada também da conta e da política de privacidade.
