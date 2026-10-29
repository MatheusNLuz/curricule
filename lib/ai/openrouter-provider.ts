import { ChatProvider } from "./chat-provider";
export class OpenRouterProvider extends ChatProvider {
  constructor() {
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    // These models can exhaust the output budget on reasoning without returning JSON.
    const options = /^(?:xingchen-agi\/xing4\.0-29b-a4b|nvidia\/nemotron-3(?:[.-][^:]+)*)(?::free)?$/i.test(model)
      ? { reasoning: { enabled: false } }
      : {};
    super("OpenRouter", process.env.OPENROUTER_API_KEY || "", model, "https://openrouter.ai/api/v1/chat/completions", options);
  }
}
