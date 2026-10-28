import { apiError } from "@/lib/http-error";
import { readRawBody } from "@/lib/request-body";
import { getBillingProvider } from "@/lib/billing/provider";
import { processBillingWebhook } from "@/lib/billing/service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const provider = getBillingProvider();
    return Response.json(await processBillingWebhook(provider, await readRawBody(request, 512 * 1024), request.headers));
  } catch (error) { return apiError(error); }
}
