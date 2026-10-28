import { z } from "zod";

export const ResumeAnalysisSchema = z.object({
  rubric: z.array(z.object({
    criterion: z.enum(["ats", "structure", "clarity", "impact", "keywords"]),
    level: z.number().int().min(0).max(4),
    foundText: z.string().default(""),
    reason: z.string(),
  })).optional(),
  detectedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB", "es-ES", "unknown"]).catch("unknown"),
  recommendedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB", "es-ES"]).catch("pt-BR"),
  detectedSeniority: z.enum(["junior", "mid", "senior", "lead", "unknown"]).catch("unknown"),
  recommendedLength: z.object({
    pages: z.string().default("1"),
    reason: z.string().default(""),
  }).default({ pages: "1", reason: "" }),
  atsIssues: z.array(z.object({
    type: z.string(),
    severity: z.enum(["low", "medium", "high"]).catch("low"),
    description: z.string(),
    recommendation: z.string(),
  })).default([]),
  sensitiveDataWarnings: z.array(z.object({
    type: z.string(),
    foundText: z.string().optional(),
    recommendation: z.string(),
  })).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  skillsFound: z.array(z.string()).default([]),
  sectionsFound: z.array(z.string()).default([]),
  sectionsMissing: z.array(z.string()).default([]),
  scores: z.object({
    overall: z.number().min(0).max(100).default(0),
    ats: z.number().min(0).max(100).default(0),
    structure: z.number().min(0).max(100).default(0),
    clarity: z.number().min(0).max(100).default(0),
    keywords: z.number().min(0).max(100).default(0),
    impact: z.number().min(0).max(100).default(0),
    perceivedSeniority: z.number().min(0).max(100).default(0),
    internationalCompatibility: z.number().min(0).max(100).optional(),
  }),
});

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;
export function resumeAssessmentSchema(source:string){
  const normalized=(text:string)=>text.normalize("NFKC").replace(/\s+/g," ").trim().toLowerCase();
  return ResumeAnalysisSchema.superRefine((value,context)=>{
    const keys=["ats","structure","clarity","impact","keywords"];
    if(!value.rubric||value.rubric.length!==keys.length||keys.some(key=>value.rubric!.filter(item=>item.criterion===key).length!==1)){context.addIssue({code:"custom",message:"Return exactly one structured rubric entry per criterion."});return;}
    value.rubric.forEach((item,index)=>{if(item.foundText&&!normalized(source).includes(normalized(item.foundText)))context.addIssue({code:"custom",path:["rubric",index,"foundText"],message:"Evidence must be an exact excerpt from the candidate source."});if(item.level>0&&!item.foundText.trim())context.addIssue({code:"custom",path:["rubric",index,"foundText"],message:"Positive levels require a source excerpt."});});
  });
}

export const LinkedInAnalysisSchema = z.object({
  detectedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB", "es-ES", "unknown"]).catch("unknown"),
  recommendedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB", "es-ES"]).catch("pt-BR"),
  detectedSeniority: z.enum(["junior", "mid", "senior", "lead", "unknown"]).catch("unknown"),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  headlineSuggestions: z.array(z.string()).default([]),
  summarySuggestion: z.string().default(""),
  seoKeywords: z.array(z.string()).default([]),
  experienceTips: z.array(z.object({
    role: z.string(),
    company: z.string(),
    tips: z.array(z.string()),
    optimizedBullets: z.array(z.string()),
  })).default([]),
  atsIssues: z.array(z.object({
    type: z.string(),
    severity: z.enum(["low", "medium", "high"]).catch("low"),
    description: z.string(),
    recommendation: z.string(),
  })).default([]),
  scores: z.object({
    overall: z.number().min(0).max(100).default(0),
    headline: z.number().min(0).max(100).default(0),
    summary: z.number().min(0).max(100).default(0),
    experiences: z.number().min(0).max(100).default(0),
    seo: z.number().min(0).max(100).default(0),
  }),
});

export type LinkedInAnalysis = z.infer<typeof LinkedInAnalysisSchema>;
