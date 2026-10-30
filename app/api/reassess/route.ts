import { ANALYSIS_REQUEST_HEADER } from "@/lib/analysis-request";
import { boundedJson } from "@/lib/read-bounded-body";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AnalysisOrchestrator } from "@/lib/ai/analysis-orchestrator";
import { ATS_ANALYZER_SYSTEM_PROMPT,generateAtsAnalyzerUserPrompt } from "@/lib/ai/prompts";
import { resumeAssessmentSchema } from "@/lib/schemas/analysis.schema";
import { OptimizedResumeSchema } from "@/lib/schemas/optimize.schema";
import { resumeText } from "@/lib/resume/resume-text";
import { ScoreEngine } from "@/lib/ats/score-engine";
import { runAnalysisTask,commitTask } from "@/lib/analysis-task";
import { apiError,HttpError } from "@/lib/http-error";
export const maxDuration=270;
export async function POST(request:Request){try{
  const user=await getSessionUser();if(!user)throw new HttpError(401,"Faça login para continuar.");
  const {analysisId}=z.object({analysisId:z.string().min(1)}).strict().parse(await boundedJson(request));
  const analysis=await prisma.analysis.findFirst({where:{id:analysisId,userId:user.userId}});
  if(!analysis?.finalResumeJson||analysis.mode==="LINKEDIN_OPTIMIZATION")throw new HttpError(404,"Currículo salvo não encontrado.");
  const resume=OptimizedResumeSchema.parse(JSON.parse(analysis.finalResumeJson));
  const result=await runAnalysisTask(analysisId,user.userId,"REASSESS",[analysis.revision,analysis.finalResumeJson,analysis.selectedLanguage],async()=>{
    const assessment=await new AnalysisOrchestrator().analyzeLocalized(ATS_ANALYZER_SYSTEM_PROMPT,generateAtsAnalyzerUserPrompt(resumeText(resume,analysis.selectedLanguage),analysis.professionalTarget||"General",analysis.mode,analysis.selectedLanguage),resumeAssessmentSchema(resumeText(resume,analysis.selectedLanguage)),analysis.selectedLanguage,undefined,"reassessment");
    const scores=ScoreEngine.evaluate(assessment);
    await commitTask(async tx=>{const saved=await tx.analysis.updateMany({where:{id:analysisId,userId:user.userId,revision:analysis.revision,finalResumeJson:analysis.finalResumeJson},data:{finalScores:JSON.stringify(scores),finalAssessmentJson:JSON.stringify({...assessment,scores})}});if(!saved.count)throw new HttpError(409,"O currículo mudou. Reavalie a versão mais recente.");});
    return {success:true,finalScores:scores};
  },request.headers.get(ANALYSIS_REQUEST_HEADER));return NextResponse.json(result);
}catch(error){return apiError(error,"Não foi possível reavaliar. O texto e os arquivos salvos foram preservados.");}}
