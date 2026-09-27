# Neon Auth — configuração local

O Curriculy usa o Neon Auth para as credenciais e mantém apenas o vínculo local necessário para associar análises ao usuário.

1. Copie `.env.example` para `.env` e preencha `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (mínimo de 32 caracteres) e `DATABASE_URL`.
2. Sincronize o schema Prisma com o banco configurado:

   ```bash
   npx prisma db push
   ```

   Em ambientes de produção, prefira gerar e aplicar uma migration versionada conforme o fluxo de deploy do banco.
3. Inicie a aplicação e valide `/login`, `/register`, `/api/auth/me` e o logout.

Sem as variáveis Neon Auth, o ambiente de desenvolvimento continua navegável para revisão da UI. Em produção, as rotas protegidas respondem com erro de configuração até que o Neon Auth esteja configurado.
