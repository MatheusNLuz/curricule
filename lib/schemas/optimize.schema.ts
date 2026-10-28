import { z } from "zod";

export const OptimizedResumeSchema = z.object({
  personalInfo: z.object({
    name: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    linkedin: z.string().optional(),
    portfolio: z.string().optional(),
  }),
  professionalSummary: z.string().default(""),
  experiences: z.array(z.object({
    company: z.string().default(""),
    title: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().default(""),
    location: z.string().optional(),
    description: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string().default(""),
    degree: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().default(""),
  })).default([]),
  skills: z.array(z.object({
    category: z.string().default(""),
    items: z.array(z.string()).default([]),
  })).default([]),
  projects: z.array(z.object({
    name: z.string().default(""), description: z.array(z.string()).default([]),
    url: z.string().default(""), startDate: z.string().default(""), endDate: z.string().default(""),
  })).optional(),
  languages: z.array(z.object({ name: z.string().default(""), proficiency: z.string().default("") })).optional(),
  certifications: z.array(z.object({
    name: z.string().default(""),
    issuer: z.string().default(""),
    date: z.string().optional(),
  })).default([])
});

export type OptimizedResume = z.infer<typeof OptimizedResumeSchema>;

export const CoverLetterSchema = z.object({
  content: z.string(),
});

export type CoverLetterGen = z.infer<typeof CoverLetterSchema>;
