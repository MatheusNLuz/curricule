import type { ZodType } from "zod";
import type { AiProviderInterface } from "./ai-provider.interface";
import { OpenRouterProvider } from "./openrouter-provider";
import { NvidiaNimProvider } from "./nvidia-nim-provider";
import { aiFailureMetadata } from "./provider-error";
import { assertOutputLanguage, outputLanguagePolicy, OutputLanguageError } from "./output-language";

export class AnalysisOrchestrator {
  constructor(private providers: AiProviderInterface[] = [new OpenRouterProvider(), new NvidiaNimProvider()]) {}
  async analyzeLocalized<T>(systemPrompt: string, userPrompt: string, schema: ZodType<T>, language: string): Promise<T> {
    const localizedPrompt = systemPrompt + "\n\n" + outputLanguagePolicy(language);
    let languageRejected = false;
    for (const provider of this.providers) {
      // One bounded regeneration for a wrong-language response, then provider fallback.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const instruction = attempt === 0 ? localizedPrompt : localizedPrompt + "\nYour previous response failed language validation. Regenerate in the selected locale only. Review every prose field; preserve the original facts and machine enums.";
          const value = schema.parse(await provider.generateJson<T>({ systemPrompt: instruction, userPrompt }));
          await assertOutputLanguage(provider, value, language);
          return value;
        } catch (error) {
          console.warn("Localized AI attempt failed", { provider: provider.name, locale: language, ...aiFailureMetadata(error) });
          if (!(error instanceof OutputLanguageError)) break;
          languageRejected = true;
        }
      }
    }
    if (languageRejected) throw new OutputLanguageError();
    throw new Error("AI providers unavailable or invalid language validation response");
  }
}
