import { z } from "zod";
import { OptimizedResumeSchema } from "./schemas/optimize.schema.ts";
import { isSourceUrl } from "./source-input.ts";

export const MODES = ["MAKE_ATS_FRIENDLY", "COMPARE_AGAINST_JOB", "OPTIMIZE_FOR_JOB", "LINKEDIN_OPTIMIZATION", "COVER_LETTER_ONLY"] as const;
export const LOCALES = ["pt-BR", "pt-PT", "en-US", "en-GB"] as const;
export const REGIONS = ["BR", "US", "UK", "CA", "DE", "PT", "REMOTE"] as const;
export const MAX_TEXT = 60_000;
export const CreateAnalysisSchema = z.object({
  mode: z.enum(MODES),
  jobLocation: z.union([z.enum(REGIONS), z.literal("")]).optional(),
  selectedLanguage: z.enum(LOCALES).default("pt-BR"),
  professionalTarget: z.string().trim().max(120).optional(),
  clientRequestId: z.string().uuid(),
}).strict();

export const DraftSchema = z.object({
  pastedText: z.string().max(MAX_TEXT), jobDescription: z.string().max(MAX_TEXT),
  jobUrl: z.string().max(2048), profileUrl: z.string().max(2048),
  activeTab: z.enum(["pdf", "paste", "link"]), jobInput: z.enum(["text", "link"]),
  jobLocation: z.string().max(10), selectedLanguage: z.enum(LOCALES), title: z.string().max(120),
});

export const UpdateAnalysisSchema = z.object({
  applicationStatus:z.enum(["PREPARING","READY","SENT","CLOSED"]),
  professionalTarget: z.string().trim().max(120),
  originalResumeText: z.string().max(MAX_TEXT),
  parsedResumeText: z.string().max(MAX_TEXT),
  jobDescription: z.string().max(MAX_TEXT).refine(value => !isSourceUrl(value), "Leia o link antes de salvar a descrição da vaga."),
  selectedLanguage: z.enum(LOCALES),
  jobLocation: z.union([z.enum(REGIONS), z.literal("")]),
  selectedTemplate: z.enum(["basic-ats", "modern-ats", "executive-ats", "direct-ats"]),
  resumeInputType: z.enum(["PDF_UPLOAD", "PASTED_TEXT", "LINKEDIN_URL"]),
  jobUrl: z.string().url().max(2048).nullable(),
  profileUrl: z.string().url().max(2048).nullable(),
  draftJson: z.string().max(150_000).refine(value => { try { return DraftSchema.safeParse(JSON.parse(value)).success; } catch { return false; } }),
  finalResumeJson: z.string().max(150_000).refine(value => { try { return OptimizedResumeSchema.safeParse(JSON.parse(value)).success; } catch { return false; } }, "Currículo inválido."),
  editorDraftJson: z.string().max(150_000).refine(value => { try { return OptimizedResumeSchema.safeParse(JSON.parse(value)).success; } catch { return false; } }).nullable(),
  revision: z.number().int().nonnegative(),
}).partial().strict().refine(value => Object.keys(value).some(key => key !== "revision"), "Informe uma alteração.");

export function languageLabel(locale: string) {
  return ({ "pt-BR": "Português (Brasil)", "pt-PT": "Português (Portugal)", "en-US": "English (US)", "en-GB": "English (UK)" } as Record<string, string>)[locale] || "Português (Brasil)";
}
