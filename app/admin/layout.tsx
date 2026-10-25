import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { HttpError } from "@/lib/http-error";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try { await requireAdmin(); } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login?next=%2Fadmin");
    if (error instanceof HttpError && error.status === 403) notFound();
    throw error;
  }
  return <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5"><div><h1 className="font-heading text-3xl font-semibold">Administração</h1><p className="mt-2 text-sm text-muted-foreground">Contas, operação e acompanhamento de acesso.</p></div><nav aria-label="Administração" className="flex gap-4 text-sm font-semibold text-primary"><Link href="/admin">Visão geral</Link><Link href="/admin/users">Usuários</Link><Link href="/admin/audit">Auditoria</Link></nav></div>{children}</div>;
}
