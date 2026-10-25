import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
export default async function AuditPage() {
  await requireAdmin();
  const entries = await prisma.adminAudit.findMany({ take: 100, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, actorId: true, targetUserId: true, action: true, details: true, createdAt: true } });
  return <section><h2 className="text-xl font-semibold">Alterações de acesso</h2><p className="my-3 text-sm text-muted-foreground">Últimos 100 registros. Identificadores permitem acompanhar responsáveis sem copiar dados pessoais para o log.</p><div className="space-y-3">{entries.map(entry => <article key={entry.id} className="rounded-xl border border-border p-4 text-xs"><p className="font-semibold">{entry.action} · {entry.createdAt.toLocaleString("pt-BR")}</p><p className="mt-2 break-all text-muted-foreground">Responsável: {entry.actorId || "Operador do banco"} · Usuário: {entry.targetUserId}</p><pre className="mt-3 overflow-auto whitespace-pre-wrap break-all">{entry.details}</pre></article>)}{!entries.length && <p className="py-8 text-sm text-muted-foreground">Nenhuma alteração administrativa registrada.</p>}</div></section>;
}
