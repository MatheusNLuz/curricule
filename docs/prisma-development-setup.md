# Banco de desenvolvimento no Prisma Postgres

Configurado em 26/10/2026: projeto `curricule`, branch `dev`, banco `curricule-dev`, região `us-east-1`.

O `.env` local contém `DATABASE_URL` com pool (`pooled.db.prisma.io`, três conexões e compatibilidade PgBouncer) e `DIRECT_URL` direta (`db.prisma.io`) para migrations. Ambas exigem TLS. O datasource do Prisma 5.22 usa `directUrl`; a versão do ORM foi preservada.

`npm run dev` inicia em `http://localhost:3000`. O Neon Auth está desativado neste ambiente; cadastro e login usam o fluxo existente de e-mail/senha com JWT secreto gerado localmente. Better Auth e OAuth ainda não foram migrados. O gateway continua sem ativação.

Não versionar `.env`, backups ou credenciais. O arquivo anterior foi preservado em `scratch/prisma-platform/.env.before-dev-connection`, também ignorado pelo Git. O banco de produção não foi modificado; dados do banco anterior não foram importados.

## Migrations

Com o `.env` local configurado para o banco desejado:

```sh
npx prisma migrate deploy
npx prisma migrate status
npx prisma generate
```

Foram aplicadas as nove migrations existentes, incluindo `20261026001000_runtime_indexes`. Os scripts de homologação definem `DIRECT_URL` para o mesmo destino isolado de `DATABASE_URL`, evitando herdar a conexão direta do ambiente principal.

## Verificação

- Nove migrations aplicadas e nenhuma pendente.
- Prisma Client regenerado e schema validado.
- 123 testes automatizados aprovados.
- Cadastro, login, leitura da sessão e páginas `/dashboard`, `/history`, `/resumes`: HTTP 200 contra o banco dev real.
- Conta temporária removida ao concluir a verificação.
