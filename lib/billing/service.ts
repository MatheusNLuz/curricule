import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { HttpError } from "../http-error";
import { billingEnabled, getBillingProvider, BillingEventSchema, type BillingProvider } from "./provider";

export async function requireAnalysisAccess(tx: Prisma.TransactionClient, userId: string) {
  if (!billingEnabled()) return;
  getBillingProvider();
  const provider = process.env.BILLING_PROVIDER;
  if (!provider) throw new HttpError(503, "A cobrança está em configuração. Tente novamente mais tarde.");
  const access = await tx.billingEntitlement.findFirst({ where: { userId, provider, key: "analysis", status: "ACTIVE", OR: [{ validUntil: null, source: "purchase" }, { validUntil: { gt: new Date() } }] }, select: { id: true } });
  if (!access) throw new HttpError(402, "Seu acesso precisa ser ativado na área de cobrança.", "ACCESS_REQUIRED");
}

export async function billingCustomer(provider: BillingProvider, user: { userId: string; email: string }) {
  const key = { userId: user.userId, provider: provider.name };
  const found = await prisma.billingCustomer.findUnique({ where: { userId_provider: key } });
  if (found) return found;
  const externalCustomerId = await provider.ensureCustomer({ ...user, idempotencyKey: `customer:${provider.name}:${user.userId}` });
  return prisma.billingCustomer.upsert({ where: { userId_provider: key }, create: { ...key, externalCustomerId }, update: {} });
}

export async function processBillingWebhook(provider: BillingProvider, raw: Buffer, headers: Headers) {
  const event = BillingEventSchema.parse(await provider.verifyWebhook(raw, headers));
  const payloadHash = createHash("sha256").update(raw).digest("hex");
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing:${provider.name}`}))`;
    const identity = { provider: provider.name, eventId: event.id };
    const duplicate = await tx.billingWebhook.findUnique({ where: { provider_eventId: identity } });
    if (duplicate) {
      if (duplicate.payloadHash !== payloadHash) throw new HttpError(409, "Evento já recebido com conteúdo diferente.");
      return { received: true, duplicate: true };
    }
    if (event.type === "access.updated" && event.access) {
      const access = event.access;
      const customer = await tx.billingCustomer.findUnique({ where: { provider_externalCustomerId: { provider: provider.name, externalCustomerId: access.customerId } } });
      if (!customer) throw new HttpError(409, "Cliente ainda não vinculado. Reenvie o evento.");
      const reference = { provider: provider.name, externalReference: access.reference };
      const previous = await tx.billingEntitlement.findUnique({ where: { provider_externalReference: reference } });
      if (previous && previous.userId !== customer.userId) throw new HttpError(409, "Referência vinculada a outro cliente.");
      // Delayed deliveries cannot revive revoked access. On equal timestamps, revocation wins.
      if (!previous || event.occurredAt > previous.lastEventAt || (event.occurredAt.getTime() === previous.lastEventAt.getTime() && access.status !== "ACTIVE")) {
        const data = { userId: customer.userId, key: access.key, source: access.source, status: access.status, validUntil: access.validUntil, lastEventAt: event.occurredAt };
        await tx.billingEntitlement.upsert({ where: { provider_externalReference: reference }, create: { ...reference, ...data }, update: data });
      }
    }
    await tx.billingWebhook.create({ data: { ...identity, type: event.type, payloadHash, occurredAt: event.occurredAt } });
    return { received: true, duplicate: false };
  });
}
