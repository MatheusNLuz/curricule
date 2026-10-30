import type { ZodError, ZodType } from "zod";
import { aiFailureMetadata } from "./provider-error";
import type { AiOperation } from "./operation-context";
import { TAILORING_LIMITS } from "./resume-tailoring";
import { schemaContract } from "./schema-contract";

export function schemaRepairFields(error: ZodError, schema: ZodType, previous: unknown): string[] {
  const contract = schemaContract(schema);
  if (!previous || typeof previous !== "object" || Array.isArray(previous) || !contract.properties) return [];
  const fields = error.issues.map(issue => issue.path[0]);
  if (fields.some(field => typeof field !== "string" || !Object.hasOwn(contract.properties!, field))) return [];
  return [...new Set(fields as string[])];
}

export function fieldRepairContract(schema: ZodType, fields: string[]) {
  const contract = schemaContract(schema);
  return { ...contract, properties: Object.fromEntries(fields.map(field => [field, contract.properties![field]])), required: fields };
}

export function schemaRepairInstructions(operation: AiOperation, error: ZodError, schema: ZodType) {
  let instruction = "\nThe previous response failed the required JSON schema. Correct only the invalid fields using the original task instructions and full contract above. Validation diagnostics: " + JSON.stringify(aiFailureMetadata(error, schema)) + ". Preserve valid facts and the selected locale. Return the complete corrected response.";
  if (error.issues.some(issue => issue.code === "too_big" || issue.code === "too_small")) instruction += " Satisfy every minimum and maximum in the contract. Shorten generated labels faithfully; do not clip quotations or invent filler to reach a minimum.";
  if (error.issues.some(issue => issue.code === "invalid_value")) instruction += " Use only the exact enum values listed in the contract; translate prose, never machine enums.";
  if (operation === "job_tailoring") {
    instruction += ` For this vacancy plan every retained priority needs BOTH a real vacancy excerpt and a real candidate excerpt, each ${TAILORING_LIMITS.evidenceMin}-${TAILORING_LIMITS.evidenceMax} characters. Never leave either foundText empty. If the candidate source cannot support a requirement, remove it from priorities and consider it only among unsupportedRequirements. Deduplicate gaps and select at most ${TAILORING_LIMITS.unsupportedRequirements}: required first, then preferred, breaking ties in vacancy order. Do not include all gaps when this exceeds the limit.`;
  }
  if (error.issues.some(issue => issue.code === "custom" && issue.params?.validationCode === "RUBRIC_CRITERIA_INVALID")) instruction += " Return exactly one assessment entry for each criterion: ats, structure, clarity, impact, keywords.";
  if (error.issues.some(issue => issue.code === "custom" && issue.params?.validationCode === "POSITIVE_LEVEL_WITHOUT_EVIDENCE")) instruction += " An assessment level above zero requires a real candidate excerpt. With no evidence use level 0 and empty foundText.";
  instruction += " For evidence fields copy one continuous source excerpt without translation, paraphrase, combining or ellipsis. Never truncate a quotation to make it pass; select a shorter real excerpt and revalidate it.";
  return instruction;
}
