import { BaseAdapter } from "./base.js";
export class OpenAIAdapter extends BaseAdapter {
    id = "openai";
    matches(provider, model) {
        return provider.toLowerCase() === "openai" || model.toLowerCase().includes("gpt");
    }
}
