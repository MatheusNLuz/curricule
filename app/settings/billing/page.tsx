import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { billingReadiness } from "@/lib/billing/provider";
import { BillingActions } from "@/components/billing/billing-actions";
export default async function BillingPage() {
  const user = await getSessionUser(); if (!user) redirect("/login?next=%2Fsettings%2Fbilling");
  const readiness = billingReadiness();
  const [customer, accesses] = await Promise.all([prisma.billingCustomer.findFirst({ where: { userId: user.userId, provider: process.env.BILLING_PROVIDER || "" }, select: { id: true } }), prisma.billingEntitlement.findMany({ where: { userId: user.userId }, take: 20, orderBy: { updatedAt: "desc" }, select: { id: true, status: true, validUntil: true } })]);
  return <div className="mx-auto max-w-3xl px-5 py-12"><h1 className="font-heading text-3xl font-semibold">Acesso e cobrança</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">{readiness.ready ? "Acompanhe a ativação do seu acesso. A confirmação pode levar alguns instantes após o pagamento." : "A cobrança ainda não está disponível. Nenhum pagamento pode ser feito por esta tela."}</p>{!readiness.enabled && <p className="mt-2 text-sm text-muted-foreground">Você pode continuar usando os recursos conforme os limites atuais da plataforma.</p>}{readiness.ready && <BillingActions hasCustomer={!!customer} />}<h2 className="mb-4 mt-10 text-lg font-semibold">Registros de acesso</h2>{accesses.length ? <ul className="divide-y divide-border">{accesses.map(access => <li key={access.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><span>{({ ACTIVE: "Ativo", REVOKED: "Revogado", EXPIRED: "Expirado", SUSPENDED: "Suspenso", PENDING: "Aguardando confirmação" } as Record<string, string>)[access.status] || access.status}</span><span className="text-muted-foreground">{access.validUntil ? `Até ${access.validUntil.toLocaleDateString("pt-BR")}` : "Sem vencimento registrado"}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Nenhum acesso comercial registrado.</p>}</div>;
}
