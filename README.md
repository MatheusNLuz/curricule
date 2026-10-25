# Curricule

Aplicação Next.js 16.3 / React 19 para analisar currículos, comparar candidaturas, preparar versões de currículo, sugestões para LinkedIn e cartas de apresentação. Usa Prisma 5 com PostgreSQL e provedores de IA OpenRouter/NVIDIA NIM.

## Executar localmente

Use Node.js 24 LTS e npm. Copie `.env.example` para `.env` e configure os valores sem compartilhar chaves ou currículos.

```powershell
npm ci
npx prisma generate
# Banco NOVO e vazio:
npx prisma migrate deploy
npm run dev
```

Abra http://localhost:3000. Para um banco que já contém tabelas, siga **Banco existente** antes de executar migrations. Não use uma URL SQLite: o datasource é PostgreSQL.

Configure o login conforme [docs/neon-auth-setup.md](docs/neon-auth-setup.md). Para autenticação legada, `JWT_SECRET` precisa ser aleatório e ter pelo menos 32 caracteres. Não existe mais uma chave padrão. A autenticação Neon usa as variáveis descritas no guia.

## Vaga e LinkedIn por link

- Nos modos com vaga, escolha **Link da vaga** ou **Colar descrição**.
- No modo LinkedIn, escolha **Link do perfil**, **Enviar PDF** ou **Colar texto**.
- A leitura é feita no servidor, somente sobre páginas HTTPS públicas. O conteúdo extraído aparece para revisão e precisa de confirmação antes da análise.
- Links não são enviados à IA como se fossem conteúdo. Páginas que exigem login, bloqueiam a leitura ou dependem de JavaScript podem não fornecer texto suficiente. Nesses casos, cole o conteúdo ou envie um PDF; não há acesso a perfis privados ou sessão autenticada do LinkedIn.
- URLs internas, IPs privados, credenciais na URL, portas especiais e redirecionamentos inseguros são bloqueados. A conexão usa o endereço DNS já validado. A leitura tem limite de 2 MB, 12 segundos e três redirecionamentos.

## Conteúdo, processamento e privacidade

Rascunhos de entrada e do editor são salvos na conta. O arquivo PDF original não é armazenado: seu texto extraído é salvo, e o arquivo precisa ser selecionado novamente caso o envio ainda não tenha ocorrido. PDFs têm limites de 10 MB, 30 páginas e 60 mil caracteres extraídos.

Perguntas sugeridas pela IA não são confirmadas automaticamente. As decisões da revisão de fatos são persistidas, vinculadas às fontes e aplicadas à otimização e à carta. A proposta final passa por outra verificação de fatos. Essa verificação também usa IA e exige revisão humana; não é uma prova absoluta de veracidade.

As notas iniciais e finais são estimativas de conteúdo, calculadas com a mesma rubrica. A versão final é reavaliada sem bônus fixos. Notas não representam chance de contratação nem certificação de compatibilidade com todos os ATS. Edições manuais e restaurações removem notas finais e cartas que ficaram desatualizadas.

Etapas têm estado persistido, deduplicação por análise/tipo, cache da mesma entrada e lease de quatro minutos. O cliente consulta uma etapa já iniciada em outra aba. Não há fila externa: a hospedagem precisa sustentar requests de até 180 segundos. Se o processo morrer, o lease expira e a interface permite tentar de novo; o trabalho não continua em background por garantia. Para hospedar em runtimes com limites menores, conecte um worker durável antes de publicar.

O limite padrão é de 40 etapas de processamento/importação por usuário por dia UTC, configurável por `ANALYSIS_DAILY_LIMIT`. Falhas contam como tentativas. Excluir uma análise não reinicia a cota. Registros mínimos de uso têm limpeza após 30 dias no próximo processamento do usuário. Até 20 revisões ficam disponíveis por análise; o histórico permite renomear e excluir dados associados. O texto das respostas da IA não é registrado nos logs dos provedores; configure também retenção e acesso nos logs da hospedagem. Nenhuma política de retenção do provedor externo é alterada por este código.

## Exportação PDF

`APP_URL` é a origem confiável da aplicação (HTTPS em produção). O Chromium abre o preview com os cookies da requisição autenticada e só pode carregar essa origem. O parâmetro `export=true` controla apresentação; nunca dispensa sessão ou propriedade do currículo.

No Windows, o caminho padrão de desenvolvimento é `C:\Program Files\Google\Chrome\Application\chrome.exe`; use `CHROME_EXECUTABLE_PATH` se necessário. Em produção é usado `@sparticuz/chromium`, que requer ambiente compatível. O navegador é fechado também em falhas.

## Banco existente e migrações

As migrations foram geradas a partir do schema original do repositório, sem modificar um banco remoto. Teste em uma branch/cópia de desenvolvimento isolada. Use conexão direta para migrar e confira se o banco corresponde ao baseline antes de marcá-lo como aplicado.

Para uma instalação existente que já possua **exatamente** o schema anterior:

```powershell
# Somente após verificar a equivalência com o schema original:
npx prisma migrate resolve --applied 20261024000000_baseline
npx prisma migrate deploy
npx prisma generate
```

Para banco vazio, rode apenas `prisma migrate deploy`: o baseline cria as tabelas e a segunda migration adiciona fontes, rascunhos, revisões, tarefas e registros de uso. Faça backup e valide o upgrade numa cópia antes de aplicá-lo ao ambiente usado por pessoas reais. Não execute `db push --accept-data-loss`.

As novas rotas exigem essas migrations antes de iniciar a aplicação atualizada. Nenhuma migration remota foi aplicada automaticamente durante a implementação.

## Verificação

Administração e preparação de gateway: [guia de instalação e operação](docs/admin-and-billing.md). O painel está em `/admin`, com promoção inicial por comando de operador. A cobrança permanece desativada até existir um adaptador real configurado. A nova landing page não exibe preços nem planos.

Links e IA foram exercitados com fontes públicas reais: [resultados e limitações](docs/live-source-validation.md). OpenRouter rejeitou a credencial local com 401; a NVIDIA atendeu como fallback. Configure uma chave OpenRouter válida para recuperar a redundância.

```powershell
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
```

`npm test` executa os testes originais e `test:security`, com fixtures sintéticas e módulos de banco/autenticação/provedores simulados. Os testes de integração exercitam os handlers reais e o preview: sessão/dono, mass assignment, revisões concorrentes, PDFs falsos, limites de upload, importação autenticada e bloqueios de conteúdo. Os testes não acessam banco real nem fazem chamadas pagas. O runner de módulos simulados utiliza a opção experimental de mocks do Node 24.

Antes de publicar, valide login, migrações, retomada e exportação PDF real numa cópia do ambiente, com provedores configurados. Limitações de leitura de páginas externas devem continuar visíveis no produto.
