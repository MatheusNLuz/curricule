import { z } from "zod";

export const ResumeAnalysisSchema = z.object({
  detectedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB", "unknown"]).catch("unknown"),
  recommendedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB"]).catch("pt-BR"),
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

export const LinkedInAnalysisSchema = z.object({
  detectedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB", "unknown"]).catch("unknown"),
  recommendedLanguage: z.enum(["pt-BR", "pt-PT", "en-US", "en-GB"]).catch("pt-BR"),
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
