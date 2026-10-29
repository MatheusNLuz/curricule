import test from "node:test";
import assert from "node:assert/strict";
import { resumeTailoringSchema } from "../lib/ai/resume-tailoring";

const original = "Ana manteve serviços PHP.\nUsou React em interfaces web.";
const confirmed = "Utilizei Git para controle de versão.";
const job = "Manutenção de serviços PHP é obrigatória. Git obrigatório. Docker é desejável.";
const plan = { targetRole: "Desenvolvimento backend", priorities: [{ requirement: "Manutenção de serviços PHP", jobEvidence: { foundText: "Manutenção de serviços PHP" }, candidateEvidence: { foundText: "Ana manteve serviços PHP." } }], unsupportedRequirements: ["Docker"] };

test("tailoring priorities require real evidence from both vacancy and candidate", () => {
  const schema = resumeTailoringSchema(original, confirmed, job);
  assert.equal(schema.safeParse(plan).success, true);
  const fabricated = structuredClone(plan);
  fabricated.priorities[0].candidateEvidence.foundText = "Docker é desejável.";
  assert.equal(schema.safeParse(fabricated).success, false);
  const wrongVacancy = structuredClone(plan);
  wrongVacancy.priorities[0].jobEvidence.foundText = "Liderança de equipes é obrigatória.";
  assert.equal(schema.safeParse(wrongVacancy).success, false);
});

test("confirmed answers can supply evidence and PDF whitespace does not break a continuous quote", () => {
  const schema = resumeTailoringSchema(original, confirmed, job);
  const answered = structuredClone(plan);
  answered.priorities[0].requirement = "Git";
  answered.priorities[0].jobEvidence.foundText = "Git obrigatório.";
  answered.priorities[0].candidateEvidence.foundText = "Utilizei Git para controle de versão.";
  assert.equal(schema.safeParse(answered).success, true);
  const spaced = structuredClone(plan);
  spaced.priorities[0].candidateEvidence.foundText = "Ana manteve serviços PHP. Usou React";
  assert.equal(schema.safeParse(spaced).success, true);
});

