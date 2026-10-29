import Link from "next/link";
import { WorkspacePage } from "@/components/workspace/workspace-ui";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/http-error";
export const metadata = { title: "Administração" };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireAdmin(); } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login?next=%2Fadmin");
    if (error instanceof HttpError && error.status === 403) notFound();
    throw error;
  }
  return <WorkspacePage><nav aria-label="Administração" className="adminTabs"><Link href="/admin">Visão geral</Link><Link href="/admin/users">Usuários</Link><Link href="/admin/audit">Auditoria</Link><Link href="/admin/operations">Operação e desempenho</Link><Link href="/admin/support">Solicitações</Link></nav>{children}</WorkspacePage>;
}
