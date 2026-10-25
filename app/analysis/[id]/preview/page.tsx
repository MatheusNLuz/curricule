import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { PreviewTemplate } from "@/components/preview/preview-template";

export default async function PreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ export?: string }>;
}) {
  const { id } = await params;
  const { export: isExport } = await searchParams;

  const session = await getSessionUser();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/analysis/${id}/preview`)}`);
  const analysis = await prisma.analysis.findFirst({ where: { id, userId: session.userId } });
  if (!analysis || !analysis.finalResumeJson) return notFound();

  const resume = JSON.parse(analysis.finalResumeJson);
  const isExportBool = isExport === "true";

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Remove a navegação do app durante o preview e impressão */
        [data-app-shell-nav] { display: none !important; }
        header { display: none !important; }
        body { background: white !important; }
        main { padding: 0 !important; }
      `}} />
      <div data-resume-preview>
      <PreviewTemplate
        resume={resume}
        templateId={analysis.selectedTemplate}
        isExport={isExportBool}
        language={analysis.selectedLanguage}
      />
      </div>
    </>
  );
}
