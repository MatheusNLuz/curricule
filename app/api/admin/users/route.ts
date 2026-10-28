import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { apiError } from "@/lib/http-error";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const query = new URL(request.url).searchParams;
    const q = (query.get("q") || "").trim().slice(0, 100);
    const page = Math.min(10000, Math.max(1, Number(query.get("page")) || 1));
    const where = q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (Math.floor(page) - 1) * 20, take: 20, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, _count: { select: { analyses: true } } } }),
      prisma.user.count({ where }),
    ]);
    return Response.json({ users, total, page: Math.floor(page) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
