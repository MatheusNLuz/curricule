import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { UserAccessForm } from "@/components/admin/user-access-form";
export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, _count: { select: { analyses: true, usage: true } }, entitlements: { take: 20, orderBy: { updatedAt: "desc" }, select: { id: true, source: true, status: true, validUntil: true } } } });
  if (!user) notFound();
  const tasks = await prisma.analysisTask.findMany({ where: { userId: id }, orderBy: { updatedAt: "desc" }, take: 15, select: { id: true, kind: true, status: true, updatedAt: true } });
  return <div className="space-y-8"><section><h2 className="text-2xl font-semibold">{user.name || "Sem nome"}</h2><p className="my-3 text-sm text-muted-foreground">{user.email} · {user._count.analyses} análises · {user._count.usage} etapas registradas</p><UserAccessForm key={`${user.role}:${user.status}`} user={user} /></section><section><h2 className="mb-4 text-lg font-semibold">Processamentos recentes</h2>{tasks.length ? <ul className="divide-y divide-border">{tasks.map(task => <li className="flex flex-wrap justify-between gap-3 py-3 text-sm" key={task.id}><span>{task.kind}</span><span>{task.status}</span><time className="text-muted-foreground">{task.updatedAt.toLocaleString("pt-BR")}</time></li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum processamento registrado.</p>}</section><section><h2 className="mb-4 text-lg font-semibold">Acessos comerciais</h2>{user.entitlements.length ? <ul>{user.entitlements.map(access => <li className="py-2 text-sm" key={access.id}>{access.source} · {access.status} · {access.validUntil ? `Validade: ${access.validUntil.toLocaleDateString("pt-BR")}` : "Sem vencimento registrado"}</li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum acesso comercial registrado.</p>}</section></div>;
}
