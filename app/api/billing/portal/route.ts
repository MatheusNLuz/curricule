import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, HttpError } from "@/lib/http-error";
import { readJsonBody } from "@/lib/request-body";
import { billingReturnUrl, getBillingProvider, safeBillingRedirect } from "@/lib/billing/provider";
export async function POST(request: Request) {
  try {
    const user = await getSessionUser(); if (!user) throw new HttpError(401, "Faça login para continuar.");
    z.object({}).strict().parse(await readJsonBody(request));
    const provider = getBillingProvider();
    const customer = await prisma.billingCustomer.findUnique({ where: { userId_provider: { userId: user.userId, provider: provider.name } } });
    if (!customer) throw new HttpError(404, "Nenhum cadastro de cobrança encontrado.");
    const result = await provider.createPortal({ customerId: customer.externalCustomerId, returnUrl: billingReturnUrl() });
    return Response.json({ url: safeBillingRedirect(result.url, provider) });
  } catch (error) { return apiError(error); }
}
