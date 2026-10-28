# Otimização do Curricule para uma máquina pequena

Implementação preserva os recursos existentes. Não houve commit, migração no banco original ou instalação na máquina de destino.

## Mudanças

- PDF usa HTML isolado do currículo, sem navegar pela aplicação, carregar bundles, executar JavaScript ou enviar cookies ao Chromium. Prévia e exportação compartilham estilos e a mesma representação das seções. Links e texto são escapados; nenhuma requisição de rede é permitida no renderizador.
- Uma fila FIFO genérica controla tarefas pesadas. Por padrão, PDF, DOCX e leitura de PDFs compartilham uma vaga, seis posições de espera e prazo de espera de 15 segundos. Há reserva adicional no banco para proteger múltiplos processos. A vaga só é liberada depois da limpeza real do trabalho. Excesso devolve 429 com nova tentativa, preservando o material.
- A IA mantém provedores, verificações, idiomas, cache e controles de fatos. Duas tarefas podem processar por vez no processo; oito podem aguardar. O prazo total existente inclui a espera. Nenhuma conexão de banco fica presa durante chamadas ao provedor.
- Bibliotecas de documentos são carregadas sob demanda. O parser lê uma página por vez, interrompe ao exceder os limites de texto existentes e libera o worker ao concluir, falhar ou cancelar. O upload verifica novamente a propriedade e o estado da análise antes de gravar.
- Pool Prisma padrão de três conexões, com um cliente por processo. Parâmetros explícitos da URL continuam tendo precedência. Novos índices atendem últimas atualizações e tarefas ativas/expiradas.
- Histórico busca apenas metadados, indicadores de presença de conteúdo, notas e estado da última tarefa. Currículos e respostas completas de IA não viajam em todas as linhas. SQL é parametrizado; paginação e cursor são limitados à conta.
- Consultas de progresso passam de 3 para 30 segundos quando ociosas, pausam em abas ocultas, não se sobrepõem e recuam em falhas. Iniciar/finalizar uma tarefa ou voltar à aba desperta a consulta imediatamente.
- Editor prioriza digitação; prévia é adiada pelo React e memoizada. A comparação do conteúdo salvo deixa de serializar o original em cada renderização.
- Build standalone com cache em memória reduzido de 50 para 8 MiB. Dependências nativas grandes ficam externas ao bundle do servidor. O empacotamento inclui estáticos e remove somente as cópias de `.env` geradas no artefato; o `.env` original permanece intacto.

## Evidência local

Ambiente: Windows, PostgreSQL local isolado com dados fictícios e build de produção. Não é uma medição da máquina Linux de 1 GiB.

| Verificação | Resultado |
| --- | --- |
| Testes automatizados | 123 aprovados: 28 de bibliotecas e 95 de rotas, segurança, interface e recursos |
| Build / TypeScript / lint | Aprovados |
| Exportações | 32 PDFs + 32 DOCX, quatro modelos × quatro idiomas × curto/longo, também no standalone com heap Node de 256 MB |
| Tempo de PDF, três amostras | Mediana anterior 2.593 ms; otimizada 1.342 ms; redução aproximada de 48%. Benchmark pequeno, sem garantia de latência em produção |
| Histórico, 21 registros | Metadados novos: 9.345 bytes. Só os campos grandes antes carregados somavam 84.636 bytes; cerca de 89% menos em relação a esses campos |
| Três pedidos de PDF simultâneos | Todos concluíram. Na repetição aquecida, terminaram em aproximadamente 1,45 s, 2,81 s e 4,17 s; o trabalho pesado foi serializado |
| Amostragem de memória | Node observado em até 76 MiB; soma dos working sets dos processos de navegador em até 506 MiB na segunda execução. São picos amostrados separados, não necessariamente simultâneos; working sets podem contar páginas compartilhadas mais de uma vez. PostgreSQL e sistema operacional não estão incluídos |
| Regressão real por HTTP | Upload e PDF falso, duas contas isoladas, edição, conflitos, rejeição persistente, duplicação, consentimento, exportação privada, suporte, suspensão e exclusão passaram |
| Consulta de histórico | Propriedade de cada registro, paginação, cursor de outra conta e tentativa de injeção SQL conferidos no PostgreSQL real |

Os arquivos verificáveis ficam em `scratch/optimization/`: `tests.log`, `build.log`, `typecheck.log`, `lint.log`, `lint-final.log`, `baseline.json`, `optimized.json`, `runtime-pressure.json`, `history-query.json`, `http-flow.log` e `production-export-matrix.log`. A matriz detalhada e os documentos ficam em `scratch/evolution/exports/`. São artefatos locais ignorados pelo Git.

## Como executar

Use Node.js 22.14+ ou 24 LTS. Faça o build fora da máquina de 1 GiB, no mesmo sistema operacional/arquitetura do destino, pois Prisma, parser e Chromium incluem componentes nativos. Um pacote compilado no Windows não deve ser enviado diretamente para Linux.

```sh
npm ci
npx prisma generate
npm run build
# O build também prepara .next/standalone, inclui public/.next/static e remove .env do pacote.
npm start
```

`npm start` usa o standalone com heap de 256 MB e lê o `.env` da raiz se existir; variáveis já definidas no processo têm prioridade. Configure `PORT` e `HOSTNAME` por ambiente. No servidor com somente o pacote, injete os segredos no serviço e execute `NODE_OPTIONS=--max-old-space-size=256 node server.js`.

Use **um processo Node**, sem cluster/PM2 com múltiplos workers nessa capacidade. Configure HTTPS e proxy reverso, com limites de corpo e prazo de upload coerentes com o aplicativo. Não execute `next dev`, compilação ou instalação de dependências durante o atendimento.

O arquivo `deploy/low-memory.env.example` contém um perfil inicial de execução. A proteção distribuída dos documentos continua ativa, mas o dimensionamento descrito pressupõe uma única instância. Ajustes de `DOCUMENT_CONCURRENCY` e `ANALYSIS_CONCURRENCY` aumentam simultaneamente a demanda de memória.

`deploy/postgresql-low-memory.conf` é uma proposta revisável: 64 MB de shared buffers, 20 conexões totais e memória de operações limitada. **Não foi aplicado automaticamente**. `effective_cache_size` é uma estimativa para o planejador, não uma reserva; `work_mem` pode ser usado várias vezes por consulta. Mantenha backups em outro local e valide o perfil com a versão instalada antes de reiniciar o PostgreSQL.

Migração aditiva: `20261026001000_runtime_indexes`. Foi aplicada apenas no banco local isolado. O banco de destino ainda precisa receber as migrações pelo fluxo de implantação; em tabelas grandes, planeje a criação de índices em janela adequada, pois o CREATE INDEX padrão pode bloquear escritas.

## Limite da conclusão

Os recursos foram mantidos e a pressão simultânea foi reduzida. O heap de 256 MB não limita toda a memória do Node e não inclui Chromium/PostgreSQL. A validação final em 1 GiB precisa ser feita na máquina de destino, incluindo sistema operacional, swap, backups e carga esperada. Não foi feita troca do provedor de autenticação nem remoção de Google/Neon Auth nesta refatoração.

Referências: [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [cache do Next.js](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheMaxMemorySize), [PostgreSQL: consumo de recursos](https://www.postgresql.org/docs/current/runtime-config-resource.html).
