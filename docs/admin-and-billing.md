# Administração e preparação de cobrança

O painel fica em `/admin`, com visão geral, busca paginada de usuários, detalhes operacionais, suspensão/reativação, troca de permissão e auditoria. Os detalhes mostram contagens e estados de processamento; não mostram textos de currículos ou respostas da IA. A consulta administrativa exige sessão válida e `role=ADMIN`/`status=ACTIVE` no banco em cada requisição. O token não autoriza a função sozinho. A suspensão também é consultada na autenticação comum, incluindo sessões legadas.

## Instalação e primeiro administrador

1. Valide as migrations numa cópia isolada do banco. Siga o procedimento de baseline do README para instalações existentes. A migration `20261024002000_commercial_access` acrescenta os campos de acesso e tabelas administrativas/comerciais. Nenhuma migration foi aplicada ao banco remoto durante esta implementação.
2. Cadastre a conta pelo fluxo normal.
3. Obtenha o `User.id` da conta desejada no banco. Um operador com acesso ao banco executa:

```powershell
node --env-file=.env --import ./tests/register.mjs scripts/promote-admin.ts --user-id ID_DA_CONTA
```

Esse comando promove somente uma conta existente e ativa e registra `ADMIN_BOOTSTRAPPED`. Não existe senha padrão, e-mail mágico, variável pública ou endpoint de cadastro de administrador. Depois disso, administradores podem promover outras contas pelo painel. A interface pede confirmação antes de alterar acesso. O servidor impede a remoção do próprio acesso e serializa alterações para preservar um administrador ativo. Operadores do banco continuam capazes de alterar dados diretamente; restrinja essas credenciais.

## Estado atual da cobrança

`BILLING_ENABLED=false` é o padrão. Os limites normais de uso continuam valendo. A página `/settings/billing` explica a indisponibilidade, sem preços nem planos. Checkout, portal e webhook retornam indisponibilidade quando não há um adaptador registrado. Não há integração fictícia, processamento de cartão ou pagamento real ativo.

O código é independente da escolha entre compra avulsa e assinatura. `BillingCustomer` vincula a conta ao cliente do provedor; `BillingEntitlement` representa o acesso; `BillingWebhook` deduplica eventos verificados sem armazenar o corpo bruto ou dados de cartão. O acesso de assinatura ativa exige vencimento. Novas etapas de IA consultam o acesso quando a cobrança está habilitada; resultados já concluídos continuam consultáveis.

## Ao escolher o gateway

Implemente `BillingProvider` em `lib/billing/provider.ts`, registre a implementação no mapa `providers` e configure `BILLING_PROVIDER` com o mesmo nome estável. O adaptador deve:

- Criar/reutilizar clientes com idempotência e gerar checkout com o identificador de oferta vindo de `BILLING_OFFER_ID` no servidor. Nunca aceitar preço, usuário ou URL de retorno enviados pelo cliente.
- Abrir o portal somente para o cliente vinculado à sessão. Definir `redirectHosts` com os hosts HTTPS exatos do gateway.
- Verificar assinatura, timestamp e proteção contra replay segundo o SDK oficial, usando os bytes originais recebidos. Rejeitar assinaturas inválidas com `HttpError(400, ...)` antes de interpretar o evento. Guardar segredo/chave somente no servidor, em variáveis próprias do adaptador.
- Normalizar eventos para `BillingEventSchema`. Para `access.updated`, usar referências e datas autoritativas do gateway; mapear pagamentos confirmados, assinaturas vigentes, estornos, cancelamentos, falhas e disputas conforme a política comercial escolhida. Eventos sem relação com acesso devem virar `ignored`.
- Usar uma expiração para assinaturas. Cancelamento ao fim do período deve preservar o acesso somente até a data paga; estornos/disputas devem seguir a política definida no adaptador. Não liberar acesso por mera criação de checkout, status pendente ou retorno do navegador.

Configure o callback público para `POST /api/billing/webhook`. Esse único endpoint não exige sessão de usuário, mas exige validação do gateway. Limite do corpo: 512 KB. A transação processa eventos duplicados uma única vez e impede que eventos antigos reativem acessos revogados. Eventos com cliente ainda não vinculado retornam erro para permitir reenvio. O adaptador deve preservar os IDs originais e tratar retries e reconciliação com a API do provedor.

Teste o adaptador no sandbox oficial: assinatura inválida/expirada, duplicidade, eventos fora de ordem, compra confirmada, renovação, expiração, cancelamento, disputa, estorno, cliente desconhecido, indisponibilidade e reenvio. Confirme também os limites de execução da hospedagem. Só então configure a oferta e altere `BILLING_ENABLED=true`. A implementação atual não inclui um job de reconciliação específico de provedor; ele depende da API escolhida e faz parte da integração final.

## Verificação entregue

`tests/commercial.test.ts` exercita os controles administrativos, handler PATCH, rejeição de parâmetros de preço/retorno, bloqueio de gateway ausente, hosts de redirecionamento, assinatura antes da gravação, clientes vinculados, deduplicação, ordem de eventos e vencimento obrigatório. Usa banco e gateway simulados; não comprova entrega de eventos de um provedor real nem migração de PostgreSQL remoto.
