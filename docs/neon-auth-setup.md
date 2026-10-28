# Neon Auth — configuração local

O Curricule usa o Neon Auth para as credenciais e mantém apenas o vínculo local necessário para associar análises ao usuário.

1. Copie `.env.example` para `.env` e preencha `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (mínimo de 32 caracteres) e `DATABASE_URL`.
2. Aplique as migrations versionadas em uma cópia isolada antes do ambiente usado por pessoas reais. Para banco vazio:

   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

   Para banco existente, siga o procedimento de baseline do README; não marque o baseline sem verificar que o schema é equivalente. As tabelas do admin e de cobrança também são necessárias para esta versão.
3. Inicie a aplicação e valide `/login`, `/register`, `/api/auth/me` e o logout.

Sem as variáveis Neon Auth, o aplicativo utiliza a autenticação legada; ela exige banco configurado e `JWT_SECRET` aleatório com pelo menos 32 caracteres. A página pública pode ser revisada sem sessão, mas os recursos da conta exigem autenticação válida.
