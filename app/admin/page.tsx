import Link from "next/link";
import { PageHeading, Sheet, Status } from "@/components/workspace/workspace-ui";
import { User, ArrowRight } from "@/components/ui/app-icon";
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
  return <><PageHeading title="Uma visão clara da operação." description="Pessoas, processamentos e acesso reunidos no mesmo lugar."><Link href="/admin/users" className="button primary"><User size={17}/>Gerenciar usuários</Link></PageHeading><dl className="adminMetrics">{[["Usuários cadastrados",users,"Contas da plataforma"],["Contas suspensas",suspended,"Acesso bloqueado"],["Análises criadas",analyses,"Total registrado"],["Etapas em 7 dias",usage,"Processamentos recentes"],["Etapas com falha",failures,"Nos últimos 7 dias"],["Acessos vigentes",activeAccess,"Registros comerciais"]].map(([label,value,hint])=><div key={label}><dt>{label}</dt><dd>{value}</dd><span>{hint}</span></div>)}</dl><div className="twoColumn"><Sheet title="Acesso e pagamentos" className="padded"><Status tone={billing.ready?"green":"neutral"}>{billing.ready?"Gateway configurado":billing.enabled?"Configuração incompleta":"Cobrança desativada"}</Status><h2 className="adminCardTitle">Acompanhe a operação comercial.</h2><p className="bodyCopy">{billing.ready?"Confira os eventos no provedor antes de liberar a operação comercial.":billing.enabled?"Novos processamentos podem ficar bloqueados até a configuração do gateway ser concluída.":"O acesso segue os limites atuais do aplicativo. Nenhum pagamento é iniciado enquanto a cobrança está desativada."}</p><dl className="simpleDetails"><div><dt>Último evento recebido</dt><dd>{lastEvent?lastEvent.processedAt.toLocaleString("pt-BR"):"Nenhum recebido"}</dd></div></dl></Sheet><Sheet title="Controle e acompanhamento" className="padded"><p className="bodyCopy">Revise permissões e consulte o histórico das alterações de acesso.</p><Link href="/admin/users" className="actionRow"><User size={20}/><span><strong>Gerenciar usuários</strong></span><ArrowRight size={17}/></Link><Link href="/admin/audit" className="textLink">Ver auditoria<ArrowRight size={16}/></Link></Sheet></div></>;
}
