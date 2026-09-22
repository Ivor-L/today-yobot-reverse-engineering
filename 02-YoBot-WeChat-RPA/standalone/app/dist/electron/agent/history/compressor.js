import { BillingManager } from "../../commercial/billing.js";
import { extractTextWithImages, extractText } from "../../utils/content.js";
const DEFAULT_CONFIG = {
    maxTurns: 20,
    tokenLimit: 16000,
};
export class HistoryCompressor {
    config;
    constructor(config = DEFAULT_CONFIG) {
        this.config = config;
    }
    /**
     * Compresses the history if it exceeds limits.
     * Uses "Rolling Summary" strategy.
     */
    async compress(history, client, model, sessionId) {
        // 1. Check Triggers
        if (history.length <= this.config.maxTurns) {
            return history;
        }
        console.log(`[HistoryCompressor] History length ${history.length} exceeds limit ${this.config.maxTurns}. Compressing...`);
        // 2. Identify segments
        // We want to keep the last N messages (e.g., 10) intact.
        // And summarize the rest (Oldest -> Limit - N).
        const keepCount = Math.floor(this.config.maxTurns / 2); // Keep last 10
        const toSummarizeCount = history.length - keepCount;
        const messagesToSummarize = history.slice(0, toSummarizeCount);
        const recentMessages = history.slice(toSummarizeCount);
        // 3. Check if there is already a summary
        // If the first message is a summary system message, include it in the new summary context.
        let existingSummary = "";
        let messagesForPrompt = messagesToSummarize;
        if (messagesToSummarize.length > 0 &&
            (messagesToSummarize[0].role === 'system' && extractText(messagesToSummarize[0].content).includes("### Previous Conversation Summary"))) {
            existingSummary = extractText(messagesToSummarize[0].content);
            // Remove it from the list to be converted to chat format, we'll append it separately
            messagesForPrompt = messagesToSummarize.slice(1);
        }
        // 4. Generate Summary
        // We construct a prompt to summarize the 'messagesToSummarize'
        const conversationText = messagesForPrompt.map(m => `${(m.role || "unknown").toUpperCase()}: ${extractTextWithImages(m.content)}`).join("\n");
        const summaryPrompt = `
You are a helpful assistant. 
Update the conversation summary.

${existingSummary ? `### Existing Summary\n${existingSummary}\n` : ''}

### Recent Conversation (to be merged)
${conversationText}

---
Task:
Create a NEW, single paragraph summary that merges the "Existing Summary" (if any) with the "Recent Conversation".
Keep key facts, user goals, and pending tasks. Drop trivial chit-chat.
Keep the summary under 500 words.
`;
        try {
            const response = await client.chat.completions.create({
                model: model, // Use the same model or a cheaper one
                messages: [{ role: "system", content: summaryPrompt }],
                max_tokens: 1000,
            });
            if (response.usage) {
                BillingManager.getInstance().recordUsage(model, response.usage.prompt_tokens, response.usage.completion_tokens, sessionId);
            }
            const newSummary = response.choices[0]?.message?.content || "Summary generation failed.";
            console.log(`[HistoryCompressor] Generated summary: ${newSummary.substring(0, 50)}...`);
            // 5. Construct New History
            // [System Summary, ...Recent Messages]
            const summaryMessage = {
                id: "summary-" + Date.now(),
                role: "system",
                content: `### Previous Conversation Summary\n${newSummary}`,
                senderId: "system"
            };
            return [summaryMessage, ...recentMessages];
        }
        catch (e) {
            console.error("[HistoryCompressor] Failed to generate summary:", e);
            // Fallback: just slice (Head + Tail strategy could be applied here too, but for now just return tail)
            return recentMessages;
        }
    }
}
