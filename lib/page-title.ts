export function pageTitle(path: string): string {
  if (path === "/") return "Início";
  if (path === "/dashboard") return "Dashboard";
  if (path === "/analysis/new") return "Nova análise";
  if (path.startsWith("/analysis/")) {
    if (path.endsWith("/editor")) return "Revisão da candidatura";
    if (path.endsWith("/preview")) return "Prévia do currículo";
    return "Sua análise";
  }
  if (path === "/resumes") return "Meus currículos";
  if (path === "/history") return "Histórico";
  if (path.startsWith("/admin/users/")) return "Detalhe do usuário";
  if (path === "/admin/users") return "Usuários";
  if (path === "/admin/audit") return "Auditoria";
  if (path === "/admin/operations") return "Operação e desempenho";
  if (path === "/admin/support") return "Solicitações";
  if (path.startsWith("/admin")) return "Administração";
  if (path === "/settings/account") return "Minha conta";
  if (path.startsWith("/settings")) return "Acesso e cobrança";
  if (path === "/login") return "Entrar";
  if (path === "/register") return "Criar conta";
  if (path === "/privacy") return "Privacidade";
  if (path === "/help") return "Ajuda";
  if (path === "/mascot") return "O C em movimento";
  return "Curricule";
}
