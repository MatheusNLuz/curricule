import { ChatProvider } from "./chat-provider";
export class OpenRouterProvider extends ChatProvider {
  constructor() { super("OpenRouter", process.env.OPENROUTER_API_KEY || "", process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini", "https://openrouter.ai/api/v1/chat/completions"); }
}
