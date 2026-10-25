import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { UpdateAnalysisSchema } from "@/lib/analysis-contract";
import { apiError, HttpError } from "@/lib/http-error";
import { recordRevision } from "@/lib/resume-revisions";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params; const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    const analysis = await prisma.analysis.findFirst({ where: { id, userId: session.userId }, include: { questions: true, tasks: { select: { kind: true, status: true, leaseUntil: true } } } });
    if (!analysis) throw new HttpError(404, "Análise não encontrada.");
    return NextResponse.json(analysis);
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    const { id } = await params; const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    const { revision, ...input } = UpdateAnalysisSchema.parse(await request.json());
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const current = await tx.analysis.findFirst({ where: { id, userId: session.userId } });
      if (!current) throw new HttpError(404, "Análise não encontrada.");
      if ((input.finalResumeJson || input.editorDraftJson) && revision !== current.revision) throw new HttpError(409, "O currículo mudou em outra aba. Recarregue antes de salvar.");
      const sourceChanged = ["parsedResumeText", "jobDescription", "selectedLanguage", "jobLocation"].some(key => key in input && input[key as keyof typeof input] !== current[key as keyof typeof current]);
      if (sourceChanged && current.analysisJson) throw new HttpError(409, "Esta análise já foi iniciada. Crie outra para mudar o material ou idioma.");
      if (sourceChanged && await tx.analysisTask.findFirst({ where: { analysisId: id, status: "RUNNING", leaseUntil: { gt: new Date() } } })) throw new HttpError(409, "Aguarde o processamento terminar antes de mudar o material.");
      if (input.finalResumeJson) { await recordRevision(tx, id, current.finalResumeJson, "before_manual_edit"); await recordRevision(tx, id, input.finalResumeJson, "manual"); }
      const changesContent = Object.keys(input).some(key => !["draftJson", "editorDraftJson", "professionalTarget", "selectedTemplate"].includes(key));
      return tx.analysis.update({ where: { id }, data: { ...input, ...(changesContent ? { revision: { increment: 1 } } : {}), ...(input.finalResumeJson ? { editorDraftJson: null, finalScores: null, finalAssessmentJson: null, coverLetter: null } : {}) } });
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error); }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { id } = await params; const session = await getSessionUser();
    if (!session) throw new HttpError(401, "Faça login para continuar.");
    const deleted = await prisma.analysis.deleteMany({ where: { id, userId: session.userId } });
    if (!deleted.count) throw new HttpError(404, "Análise não encontrada.");
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
