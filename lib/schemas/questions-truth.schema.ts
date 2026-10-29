import { z } from "zod";

export const SmartQuestionSchema = z.object({
  questions: z.array(z.object({
    question: z.string().default(""),
    reason: z.string().default(""),
    category: z.string().default("experience"),
    answerType: z.enum(["text", "boolean", "multiple_choice", "multiple_select"]).catch("text"),
    options: z.array(z.string()).optional(),
    suggestedAnswer: z.string().optional()
  })).default([])
});

export type SmartQuestionGen = z.infer<typeof SmartQuestionSchema>;

export const TruthGuardSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.string()),
  correctedText: z.string().optional()
});

export type TruthGuardAnalysis = z.infer<typeof TruthGuardSchema>;
