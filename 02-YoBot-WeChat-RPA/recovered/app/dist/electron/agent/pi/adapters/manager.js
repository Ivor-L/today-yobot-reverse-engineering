import { BaseAdapter } from "./base.js";
import { KimiAdapter } from "./kimi.js";
import { DoubaoAdapter } from "./doubao.js";
import { OpenAIAdapter } from "./openai.js";
import { DeepSeekAdapter } from "./deepseek.js";
export class AdapterManager {
    adapters = [];
    fallbackAdapter;
    constructor() {
        this.fallbackAdapter = new BaseAdapter();
        this.register(new KimiAdapter());
        this.register(new DoubaoAdapter());
        this.register(new DeepSeekAdapter());
        this.register(new OpenAIAdapter());
    }
    register(adapter) {
        this.adapters.push(adapter);
    }
    getAdapter(provider, model) {
        for (const adapter of this.adapters) {
            if (adapter.matches(provider, model)) {
                return adapter;
            }
        }
        return this.fallbackAdapter;
    }
}
export const adapterManager = new AdapterManager();
