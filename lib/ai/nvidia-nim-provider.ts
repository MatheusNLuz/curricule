import { ChatProvider } from "./chat-provider";
export class NvidiaNimProvider extends ChatProvider {
  constructor() {
    const base = process.env.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
    const model = process.env.NVIDIA_NIM_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";
    const options = /^nvidia\/nemotron-3[-.]/.test(model) ? { chat_template_kwargs: { enable_thinking: process.env.NVIDIA_NIM_THINKING === "true" } } : {};
    super("NVIDIA NIM", process.env.NVIDIA_NIM_API_KEY || "", model, base.endsWith("/chat/completions") ? base : base.replace(/\/$/, "") + "/chat/completions", options);
  }
}
