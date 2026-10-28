import test from "node:test";
import assert from "node:assert/strict";
import { answerForReview, isMalformedStructuredAnswer, readStructuredAnswer, writeStructuredAnswer } from "./question-answer.ts";

test("conditional answers retain details without presenting them when the answer is no", () => {
  const no = writeStructuredAnswer({ kind: "boolean", choice: "no", explanation: "Organizei os pedidos." });
  assert.equal(answerForReview(no), "Não.");
  const state = readStructuredAnswer(no);
  assert.equal(state?.kind === "boolean" && state.explanation, "Organizei os pedidos.");
  assert.equal(answerForReview(writeStructuredAnswer({ kind: "boolean", choice: null, explanation: "Rascunho" })), "");
  assert.match(answerForReview(writeStructuredAnswer({ kind: "boolean", choice: "yes", explanation: "Organizei os pedidos." })), /Organizei os pedidos/);
});
test("choice answers and legacy free text remain readable", () => {
  assert.equal(answerForReview(writeStructuredAnswer({ kind: "choice", selected: ["E-mail", "Chat"], other: "Telefone" })), "E-mail; Chat; Telefone");
  assert.equal(answerForReview("Resposta antiga"), "Resposta antiga");
  assert.equal(isMalformedStructuredAnswer("curricule-answer-v1:{broken"), true);
});
