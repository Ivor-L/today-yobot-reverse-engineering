import { config } from "../../config/index.js";
import { LLMManager } from "../../agent/llm/manager.js";
async function serverSearch(query, provider, traceId) {
    const llmManager = LLMManager.getInstance();
    const authToken = llmManager.getAuthToken();
    if (!authToken) {
        throw new Error("Search requires login to verify quota.");
    }
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
    };
    if (traceId) {
        headers['x-yoko-trace-id'] = traceId;
    }
    // Inject Channel ID: Priority LLMManager (Runtime) > Config (Env)
    const channelId = llmManager.getChannelId() || config.channelId;
    if (channelId) {
        headers['x-channel-id'] = channelId;
    }
    const port = process.env.PORT || 3000;
    const response = await fetch(`http://localhost:${port}/v1/tools/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            query,
            provider
        })
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Search Failed: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results;
}
// --- Tavily Implementation (Client-Side / Direct Mode for Dev, Server Mode for Prod) ---
// Note: We are switching to Server Mode by default if authToken is present
async function tavilySearch(query, traceId) {
    const llmManager = LLMManager.getInstance();
    if (llmManager.getAuthToken()) {
        return serverSearch(query, "tavily", traceId);
    }
    // Fallback to local execution if no auth (e.g. dev mode with local env keys)
    const apiKey = config.search.apiKey;
    if (!apiKey) {
        throw new Error("Search API key is missing. Please set SEARCH_API_KEY in .env or Log In.");
    }
    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: apiKey,
            query: query,
            max_results: config.search.maxResults,
        }),
    });
    if (!response.ok) {
        throw new Error(`Tavily Search API failed: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results.map((r) => `[${r.title}](${r.url})\n${r.content}`).join("\n\n");
}
// --- Volcengine Implementation ---
async function volcengineSearch(query, traceId) {
    const llmManager = LLMManager.getInstance();
    if (llmManager.getAuthToken()) {
        return serverSearch(query, "volcengine", traceId);
    }
    const apiKey = config.search.volcengine.apiKey;
    const model = config.search.volcengine.model;
    if (!apiKey || !model) {
        throw new Error("Volcengine API configuration missing. Please set VOLC_API_KEY and VOLC_MODEL in .env or Log In.");
    }
    // Use the "Responses API" (/api/v3/responses) which supports server-side RAG (Web Search)
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            input: [
                {
                    role: "system",
                    content: "你是AI搜索助手。请根据用户问题进行联网搜索，优先使用搜索到的资料，提供结构清晰、详细的回答。结尾需列出参考资料。"
                },
                {
                    role: "user",
                    content: query
                }
            ],
            thinking: { type: "disabled" },
            tools: [{
                    type: "web_search",
                    limit: 10
                }],
        })
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Volcengine API failed: ${response.status} - ${errText}`);
    }
    const data = await response.json();
    // Robustly find the message object
    let message;
    // Case 1: Responses API with output array (Volcengine specific)
    if (Array.isArray(data.output)) {
        const choiceItem = data.output.find((item) => {
            const hasChoices = item.choices;
            const hasMessage = item.message;
            const isMessage = item.role;
            return hasChoices || hasMessage || isMessage;
        });
        if (choiceItem) {
            if (choiceItem.choices)
                message = choiceItem.choices[0].message;
            else if (choiceItem.message)
                message = choiceItem.message;
            else if (choiceItem.role)
                message = choiceItem;
        }
    }
    // Case 2: Standard OpenAI Format
    else if (data.choices) {
        message = data.choices[0].message;
    }
    if (!message) {
        console.log("Volcengine Search Error: Could not parse response structure.", JSON.stringify(data, null, 2));
        return "Error: Could not parse search results from Volcengine.";
    }
    let result = "";
    // 1. Try to get direct content
    if (message.content) {
        if (typeof message.content === 'string') {
            result += message.content + "\n\n";
        }
        else if (Array.isArray(message.content)) {
            message.content.forEach((part) => {
                if (part.type === 'output_text' || part.type === 'text') {
                    result += (part.text || part.content || "") + "\n\n";
                }
            });
        }
    }
    // 2. Extract citations
    let citations = [];
    // Check choices[0].annotations
    if (data.choices && data.choices[0] && data.choices[0].annotations) {
        citations = data.choices[0].annotations;
    }
    // Check output[0].choices[0].annotations
    else if (data.output && Array.isArray(data.output)) {
        const choiceItem = data.output.find((item) => item.choices && item.choices.length > 0);
        if (choiceItem && choiceItem.choices[0].annotations) {
            citations = choiceItem.choices[0].annotations;
        }
        else {
            const messageItem = data.output.find((item) => item.role && item.annotations);
            if (messageItem) {
                citations = messageItem.annotations;
            }
        }
    }
    // If still empty, check tool_calls
    if (citations.length === 0) {
        const toolCalls = message.tool_calls;
        if (toolCalls && Array.isArray(toolCalls)) {
            for (const tool of toolCalls) {
                const webSearch = tool.web_search;
                if (webSearch && Array.isArray(webSearch.citations)) {
                    citations = webSearch.citations;
                    break;
                }
                if (webSearch && Array.isArray(webSearch.annotations)) {
                    citations = webSearch.annotations;
                    break;
                }
            }
        }
    }
    if (citations.length > 0) {
        result += "**Search Citations:**\n";
        citations.forEach((cit, idx) => {
            const title = cit.title || "Source";
            const url = cit.url || "#";
            result += `${idx + 1}. [${title}](${url})\n`;
        });
        result += "\n";
    }
    if (!result.trim()) {
        return "No search results found (Volcengine returned empty content).";
    }
    return result.trim();
}
const webSearchTool = {
    definition: {
        name: "web_search",
        description: "Search the web for real-time information.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" },
            },
            required: ["query"],
        },
        enterprise: {
            namespace: "network",
            capability: "web_search",
            sideEffect: "none",
            risk: "medium",
            reversible: true,
            idempotent: true,
            approval: "never",
            estimatedLatencyClass: "short",
            estimatedCostClass: "low",
            executionMode: "parallel",
        },
    },
    execute: async ({ query }, signal, context) => {
        try {
            // Default to volcengine if not specified
            const provider = config.search.provider || "volcengine";
            console.log(`[Search] Searching for: "${query}" via ${provider}`);
            const traceId = context?.traceId;
            if (provider === "volcengine") {
                return await volcengineSearch(query, traceId);
            }
            else {
                return await tavilySearch(query, traceId);
            }
        }
        catch (error) {
            return `Search failed: ${error.message}`;
        }
    },
};
export const searchSkill = {
    name: "search",
    description: "Web search capabilities",
    tools: [webSearchTool],
};
