import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { apiError, HttpError } from "@/lib/http-error";
import { readJsonBody } from "@/lib/request-body";
import { billingReturnUrl, getBillingProvider, safeBillingRedirect } from "@/lib/billing/provider";
import { billingCustomer } from "@/lib/billing/service";
import { prisma } from "@/lib/db";
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(); if (!user) throw new HttpError(401, "Faça login para continuar.");
    z.object({}).strict().parse(await readJsonBody(request));
    const provider = getBillingProvider();
    const active = await prisma.billingEntitlement.findFirst({ where: { userId: user.userId, provider: provider.name, key: "analysis", status: "ACTIVE", OR: [{ validUntil: null, source: "purchase" }, { validUntil: { gt: new Date() } }] }, select: { id: true } });
    if (active) throw new HttpError(409, "Seu acesso já está ativo. Use a opção de gerenciar cobrança.");
    const offerId = process.env.BILLING_OFFER_ID; if (!offerId) throw new HttpError(503, "O acesso comercial ainda não foi configurado.");
    const customer = await billingCustomer(provider, user);
    const returnUrl = billingReturnUrl();
    const result = await provider.createCheckout({ customerId: customer.externalCustomerId, offerId, successUrl: returnUrl, cancelUrl: returnUrl, idempotencyKey: `checkout:${user.userId}:${offerId}:${Math.floor(Date.now() / 1_800_000)}` });
    return Response.json({ url: safeBillingRedirect(result.url, provider) });
  } catch (error) { return apiError(error); }
}
