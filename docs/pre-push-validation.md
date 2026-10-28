# Validação antes do envio ao GitHub

Revisão de 27/10/2026 para consolidar as melhorias do produto, interface, administração, modelos ATS, privacidade, exportação, otimizações de memória e configuração Prisma/Ubuntu.

## Correções na revisão

- Next.js, eslint-config-next e fallback SWC alinhados em 16.4.3, com correções de segurança.
- Puppeteer Core 25.16.0, Zod 4.6.7 e patches transitivos atualizados. O adaptador legado Neon permanece desativado no ambiente atual; suas dependências Better Auth foram fixadas em 1.7.14 para corrigir os alertas críticos, sem ativar login social.
- Referência de runtime em `.nvmrc`: Node 24.22.1 LTS, igual ao servidor preparado.
- Tema inicia sem atualização síncrona de estado no efeito e mantém alternância mesmo com localStorage indisponível.
- Removido componente de prévia antigo sem referências; a rota usa os quatro modelos atuais.
- Lint exclui diretórios de build de homologação, além do build principal. Scripts de prévia sem avisos de lint.
- Credenciais locais, chaves privadas, backups e prints locais de contas ficam fora do Git. Fontes, páginas de demonstração e evidências sintéticas do produto permanecem versionadas.

## Verificações

- `npm test`: 123 testes aprovados (28 + 95).
- `npm run lint -- --max-warnings=0`: aprovado.
- `npm run build`: aprovado, incluindo TypeScript e empacotamento standalone sem `.env`.
- Teste integrado do standalone Next 16.4.3, com heap de 256 MiB e Prisma dev: cadastro, login, sessão, painel, histórico e biblioteca retornaram HTTP 200. Os quatro modelos geraram PDF e DOCX (oito arquivos com assinaturas válidas). A conta e suas análises temporárias foram removidas ao terminar.
- `git diff --cached --check`: aprovado.
- `npm ci --ignore-scripts --dry-run --no-audit --no-fund`: instalação pelo lockfile válida. Existe aviso de peer dependency em componentes legados de UI de autenticação que o produto não importa.
- Varredura dos arquivos candidatos: nenhuma correspondência com as credenciais locais conhecidas, tokens ou cabeçalhos de chave privada. Não substitui monitoramento de segredos no repositório.

## Pendência de dependência

Após os patches, `npm audit` aponta nove alertas baixos transitivos ligados a `deepmerge` (GHSA-gcqx-w48m-w2h4), trazido por shadcn e pela UI legada de autenticação. Não há alertas moderados, altos ou críticos no resultado verificado. O npm não oferece atualização compatível que resolva esse caminho; não foi aplicado `audit fix --force` nem downgrade automático para uma linha antiga de shadcn.

O envio ao GitHub não equivale à implantação da aplicação ou à homologação no servidor Linux de 1 GiB. Produção no Prisma não foi migrada nesta revisão, e OAuth/gateway continuam sem ativação.
