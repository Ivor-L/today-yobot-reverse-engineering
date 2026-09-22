/**
 * Agentic Provider Protocol (APP) — 厂商中立的 AI 服务契约。
 *
 * YokoAgent 只是它的第一个实现。代理商 / openclaw 只要实现
 * `GET /v1/capabilities` + `POST /v1/chat`(SSE) 即可作为 provider 被 RPA 接入,
 * 无需知道 YokoAgent 的任何内部概念。
 *
 * 设计约束:
 *   1. 子 Agent 会话上下文与主 Agent SessionManager/memory 完全隔离
 *   2. provider 可以维护轻量会话历史，但不得假设调用方 messages 完整或前缀稳定
 *   3. 收到 1 条消息也必须能工作；调用方 history 只作为会话同步输入
 */
export const APP_PROTOCOL_VERSION = "1";
export class AgenticError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "AgenticError";
    }
}
