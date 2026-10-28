import assert from "node:assert/strict";
import test from "node:test";
import { formatResumeLibraryItem, isResumeAnalysisMode, makeResumePdfFilename, revisedResumeScore } from "./resume-library.ts";

test("accepts only valid scores for the reassessed version, including zero", () => {
  assert.equal(revisedResumeScore('{"overall":0}'), 0);
  assert.equal(revisedResumeScore('{"overall":85}'), 85);
  for (const value of [null, "bad", "{}", '{"overall":"90"}', '{"overall":101}', '{"overall":-1}']) {
    assert.equal(revisedResumeScore(value), null);
  }
});

test("formats an untitled generated resume with a useful label and optional vacancy context", () => {
  assert.deepEqual(
    formatResumeLibraryItem({
      professionalTarget: "   ",
      mode: "COVER_LETTER_ONLY",
      jobDescription: "  Desenvolvedor(a) full-stack   para a equipe de produto.  ",
    }),
    {
      title: "Análise sem título",
      modeLabel: "Carta de apresentação",
      jobExcerpt: "Desenvolvedor(a) full-stack para a equipe de produto.",
    },
  );
});

test("truncates long vacancy context and omits missing descriptions", () => {
  const longDescription = `${"vaga com bastante contexto ".repeat(8)}`;
  const formatted = formatResumeLibraryItem({
    professionalTarget: "Desenvolvedor",
    mode: "MAKE_ATS_FRIENDLY",
    jobDescription: longDescription,
  });

  assert.equal(formatted.jobExcerpt?.length, 132);
  assert.equal(formatted.jobExcerpt?.endsWith("…"), true);
  assert.deepEqual(formatResumeLibraryItem({ professionalTarget: "Dev", mode: "UNKNOWN_MODE", jobDescription: null }), {
    title: "Dev",
    modeLabel: "unknown mode",
    jobExcerpt: null,
  });
});

test("creates a safe, descriptive PDF download filename", () => {
  assert.equal(makeResumePdfFilename("Analista: Dados / Sênior"), "Analista Dados Sênior.pdf");
  assert.equal(makeResumePdfFilename("   "), "Curriculo Otimizado.pdf");
});

test("only treats standard resume analyses as optimized resumes", () => {
  assert.equal(isResumeAnalysisMode("OPTIMIZE_FOR_JOB"), true);
  assert.equal(isResumeAnalysisMode("LINKEDIN_OPTIMIZATION"), false);
  assert.equal(isResumeAnalysisMode("COVER_LETTER_ONLY"), false);
});
