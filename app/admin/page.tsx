import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { billingReadiness } from "@/lib/billing/provider";
export default async function AdminPage() {
  await requireAdmin();
  const since = new Date(); since.setUTCDate(since.getUTCDate() - 7);
  const [users, suspended, analyses, failures, usage, activeAccess, lastEvent] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { status: "SUSPENDED" } }), prisma.analysis.count(),
    prisma.analysisTask.count({ where: { status: "FAILED", updatedAt: { gte: since } } }),
    prisma.analysisUsage.count({ where: { createdAt: { gte: since } } }),
    prisma.billingEntitlement.count({ where: { status: "ACTIVE", OR: [{ validUntil: null, source: "purchase" }, { validUntil: { gt: new Date() } }] } }),
    prisma.billingWebhook.findFirst({ orderBy: { processedAt: "desc" }, select: { processedAt: true } }),
  ]);
  const billing = billingReadiness();
  return <div className="space-y-10"><dl className="grid gap-x-8 gap-y-6 sm:grid-cols-3">{[["Usuários cadastrados", users], ["Contas suspensas", suspended], ["Análises criadas", analyses], ["Processamentos em 7 dias", usage], ["Etapas com falha em 7 dias", failures], ["Acessos comerciais vigentes", activeAccess]].map(([label, value]) => <div key={label} className="border-b border-border pb-5"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-4xl font-semibold tabular-nums">{value}</dd></div>)}</dl><section className="rounded-2xl bg-surface p-6"><h2 className="text-lg font-semibold">Cobrança</h2><p className="mt-3 text-sm text-muted-foreground">{billing.ready ? "Gateway configurado. Confira os eventos no provedor antes de liberar a operação comercial." : billing.enabled ? "Cobrança ativada, mas a configuração do gateway está incompleta. Novos processamentos podem ficar bloqueados." : "Cobrança desativada. O acesso segue o limite de uso do aplicativo."}</p><p className="mt-2 text-sm text-muted-foreground">Último evento recebido: {lastEvent ? lastEvent.processedAt.toLocaleString("pt-BR") : "nenhum"}.</p></section><Link href="/admin/users" className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Gerenciar usuários</Link></div>;
}
