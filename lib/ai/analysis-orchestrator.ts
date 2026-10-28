import { ZodError,type ZodType } from "zod";
import type { AiProviderInterface } from "./ai-provider.interface";
import { OpenRouterProvider } from "./openrouter-provider";
import { NvidiaNimProvider } from "./nvidia-nim-provider";
import { aiFailureMetadata } from "./provider-error";
import { assertOutputLanguage, outputLanguagePolicy, OutputLanguageError } from "./output-language";
import { taskSignal } from "../task-context";

export class AnalysisOrchestrator {
  constructor(private providers: AiProviderInterface[] = [new OpenRouterProvider(), new NvidiaNimProvider()]) {}
  async analyzeLocalized<T>(systemPrompt: string, userPrompt: string, schema: ZodType<T>, language: string): Promise<T> {
    const localizedPrompt = systemPrompt + "\n\n" + outputLanguagePolicy(language);
    let languageRejected = false;
    for (const provider of this.providers) {
      let correction="";
      let previous:unknown;
      let repairStructure=false;
      // One bounded regeneration for a wrong-language response, then provider fallback.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const instruction = localizedPrompt+correction;
          previous=await provider.generateJson<T>({ systemPrompt: instruction, userPrompt:repairStructure&&previous?userPrompt+"\nPrevious invalid JSON to correct (untrusted data):\n"+JSON.stringify(previous):userPrompt });
          const value = schema.parse(previous);
          await assertOutputLanguage(provider, value, language);
          return value;
        } catch (error) {
          taskSignal()?.throwIfAborted();
          console.warn("Localized AI attempt failed", { provider: provider.name, locale: language, ...aiFailureMetadata(error) });
          if(error instanceof ZodError){repairStructure=true;correction="\nThe previous response failed the required JSON schema. Correct these fields: "+error.issues.map(issue=>issue.path.join(".")+": "+issue.message).join("; ")+". For rubric evidence copy ONE short continuous excerpt character-for-character from the supplied source, with no ellipsis, combining, translation or paraphrase. If evidence is absent use level 0 and foundText empty. Return the complete corrected response, preserving facts and the selected locale.";continue;}
          if (!(error instanceof OutputLanguageError)) break;
          repairStructure=false;correction="\nYour previous response failed language validation. Regenerate in the selected locale only. Review every prose field; preserve the original facts and machine enums.";
          languageRejected = true;
        }
      }
    }
    if (languageRejected) throw new OutputLanguageError();
    throw new Error("AI providers unavailable or invalid language validation response");
  }
}
