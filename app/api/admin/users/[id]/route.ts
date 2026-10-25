import { requireAdmin, updateManagedUser } from "@/lib/admin";
import { apiError } from "@/lib/http-error";
import { readJsonBody } from "@/lib/request-body";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin();
    return Response.json(await updateManagedUser(actor.id, (await params).id, await readJsonBody(request)));
  } catch (error) { return apiError(error); }
}
