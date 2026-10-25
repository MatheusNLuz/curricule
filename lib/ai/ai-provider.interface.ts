export interface AiGenerateJsonParams {
  systemPrompt: string;
  userPrompt: string;
  schema?: unknown;
}

export interface AiGenerateTextParams {
  systemPrompt: string;
  userPrompt: string;
}

export interface AiProviderInterface {
  name: string;
  generateJson<T>(params: AiGenerateJsonParams): Promise<T>;
  generateText(params: AiGenerateTextParams): Promise<string>;
}
