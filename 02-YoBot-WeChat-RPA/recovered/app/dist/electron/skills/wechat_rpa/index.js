import fs from 'fs/promises';
import { rpaActionRequiredMessage } from '../../shared/rpa_action_required_copy.js';
import path from 'path';
import { createHash, randomUUID } from 'crypto';
import { RPAApiClient } from './api_client.js';
import { RPA_FAILURE_MESSAGES, toUserFacingRpaError } from './errors.js';
import { RpaInitializationError } from './init_result.js';
import { RPAServiceManager } from './service_manager.js';
import { RpaSupervisorClient, waitForRpaWorkerReady, WORKER_STARTING_STALL_SECONDS, supervisorStartingSeconds, } from './supervisor_client.js';
import { LocalConfigManager } from './config_manager.js';
import { LocalDataManager } from './data_manager.js';
import { readSessionMessagesBatch } from './batch_history.js';
import { ContactSyncQueue } from './contact_sync_queue.js';
import { parseSendInterval, rateLimitWarning } from './send_interval.js';
import { SkillManualProvider } from '../utils/manual_provider.js';
import { renderWechatRpaManual } from './manual_config.js';
import { guardToolsAgainstAgenticRecursion } from '../../agent/profile/agentic_guard.js';
import { deliverRpaText } from './delivery.js';
import { normalizeUpdateConfigArguments } from './update_config_args.js';
import { assertRpaRuntimeAllowed } from './runtime_gate.js';
import { NoActiveWeChatError, describeAccount, isAccountScopedConfig, parseInstances, pickAccount, } from './account.js';
import { resolveBootstrapAgentFileLayout } from '../../core/platform/file_layout.js';
import { fireflowEntryId, fireflowPublicId, persistedAgentEntry, usesMacKeychainAgentConfig, } from './agent_config_identity.js';
const USER_DATA_PATH = resolveBootstrapAgentFileLayout({
    userDataRoot: process.env.USER_DATA_PATH?.trim() || undefined,
}).userData;
const WORKSPACE_DIR = path.join(USER_DATA_PATH, 'workspace');
const MAIN_OWNED_MACOS_RPA = () => process.env.YOKO_MACOS_RPA_MAIN_OWNED === '1';
// Main's Control health gate has a 60s overall deadline. Leave bounded time
// for exact-owner stop and durable rollback before the Agent child times out.
const MAIN_OWNED_RUNTIME_TIMEOUT_MS = 90_000;
async function requestMainOwnedMacOSRuntime(action) {
    if (!MAIN_OWNED_MACOS_RPA() || typeof process.send !== 'function') {
        throw new Error('macOS RPA 主进程生命周期桥不可用');
    }
    const requestId = randomUUID();
    return new Promise((resolve, reject) => {
        const finish = (error, result) => {
            clearTimeout(timer);
            process.off('message', onMessage);
            if (error)
                reject(error);
            else
                resolve(result);
        };
        const onMessage = (message) => {
            if (message?.type !== 'rpa:owned-runtime-request:done'
                || message.requestId !== requestId)
                return;
            finish(undefined, message.result);
        };
        const timer = setTimeout(() => finish(new Error('macOS RPA 主进程生命周期请求超时')), MAIN_OWNED_RUNTIME_TIMEOUT_MS);
        process.on('message', onMessage);
        try {
            process.send({ type: 'rpa:owned-runtime-request', requestId, action });
        }
        catch (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
        }
    });
}
/**
 * 账号级工具统一使用的 account_id 参数描述。
 *
 * 这段文字会被复制进 10+ 个工具的 schema，**每轮请求都要付一次 token**，
 * 所以只保留模型填这个字段时必须知道的三件事：是谁(发送方不是收件人)、
 * 从哪取(list_instances)、什么时候可以不填(单号)。
 *
 * 多号未指定该怎么办（问用户、不许自己挑）刻意**不**写在这里：
 * 那是错误发生后才需要的指引，已经写在 AmbiguousAccountError 的报错文案里
 * （只在真正触发时才付 token），以及技能 RULES 和 multi_account_sop 里各一份。
 * 把它复制到每个参数描述上是纯粹的重复计费。
 */
const ACCOUNT_ID_PARAM = {
    type: 'string',
    description: '执行操作的微信号(发送方,非收件人)。多号必填,取自 wechat_list_instances;单号可省略。',
};
const initializeDefinition = {
    name: 'wechat_initialize',
    description: 'Initialize RPA service and bind to WeChat. Execution logic: 1. If NOT called in this session, call it FIRST. 2. If already called, SKIP it. 3. If skipping causes other API tools to fail, call this AGAIN to recover.',
    parameters: {
        type: 'object',
        properties: {
            auto_config: {
                type: 'boolean',
                description: 'Windows only. DANGEROUS: Kills WeChat. Default FALSE. ONLY set true if previous initialize call returned "ENV_NOT_CONFIGURED".'
            }
        },
        required: []
    }
};
const sendMessageDefinition = {
    name: 'wechat_send_message',
    description: 'Send text message to a known WeChat friend/group via RPA.',
    parameters: {
        type: 'object',
        properties: {
            user: { type: 'string', description: 'Exact recipient friend/group name. Not the sender account_id.' },
            message: { type: 'string', description: 'The text content to send.' },
            account_id: ACCOUNT_ID_PARAM
        },
        required: ['user', 'message']
    },
    enterprise: {
        namespace: 'wechat_rpa',
        capability: 'send_text_message',
        sideEffect: 'external',
        risk: 'high',
        reversible: false,
        idempotent: true,
        approval: 'policy',
        executionMode: 'sequential',
    },
};
const importFriendListDefinition = {
    name: 'wechat_import_friend_list',
    description: [
        '把一份名单表格（Excel/CSV）导入 RPA 的「待添加好友」名单。用户在聊天里发来名单文件时用这个工具，不要再让他去 RPA 后台手动导。',
        '⚠️ RPA 的表头是【精确字符串匹配】：必填列必须一字不差地叫「微信号/手机号」，可选列「备注」「标签」。用户的表格基本不会正好长这样，所以【必须分两步】：',
        '  1) 先用 dry_run:true 调一次，拿到真实表头与前几行样本；',
        '  2) 自己判断哪一列是号码、哪列当备注/标签，**向用户复述并确认**，再带 column_mapping 调第二次。',
        '导入只是把人写进待添加名单，【不会】自动开始加好友——要开还得单独确认。',
    ].join('\n'),
    parameters: {
        type: 'object',
        properties: {
            file_path: {
                type: 'string',
                description: '名单文件的绝对路径。用户在聊天里发的文件会以 <attached_file path="..."/> 形式出现在上下文里，直接取那个 path。',
            },
            dry_run: {
                type: 'boolean',
                description: 'true = 只读表头和样本，不导入。第一次调用必须用 true。',
            },
            column_mapping: {
                type: 'object',
                description: '目标列名 → 用户表格里的源列名，例如 {"微信号/手机号":"手机号码","备注":"客户姓名"}。'
                    + '「微信号/手机号」必填；「备注」「标签」按需给。dry_run 时忽略此参数。',
                properties: {
                    '微信号/手机号': { type: 'string' },
                    '备注': { type: 'string' },
                    '标签': { type: 'string' },
                },
            },
        },
        required: ['file_path'],
    },
};
const sendFileDefinition = {
    name: 'wechat_send_file',
    description: 'Send file (img/video/doc) to friend/group via RPA.',
    parameters: {
        type: 'object',
        properties: {
            user: { type: 'string', description: 'The exact name (nickname or remark) of the WeChat friend or group.' },
            filePath: { type: 'string', description: 'The absolute path to the file to send.' },
            accountId: ACCOUNT_ID_PARAM
        },
        required: ['user', 'filePath']
    }
};
const sendVoiceDefinition = {
    name: 'wechat_send_voice',
    description: 'Send a REAL WeChat voice bubble (not an mp3 attachment) to a friend/group via RPA. Needs WeChat >= 4.1.9 + VB-Cable driver; on failure returns success:false → fall back to wechat_send_message. Three input modes (priority order, pass one): 1) audioPath (local mp3 path); 2) audioFilename (basename of an mp3 in the RPA voice_greetings dir); 3) text + voiceId (synthesize on the fly with a cloned voice S_xxx). For mode/voiceId selection and fallback, read manual topic "voice_send_sop".',
    parameters: {
        type: 'object',
        properties: {
            user: { type: 'string', description: 'Exact recipient friend/group name (nickname or remark). Not the sender account_id.' },
            audioPath: { type: 'string', description: 'Mode 1: absolute path to a local mp3 file. Highest priority if provided.' },
            audioFilename: { type: 'string', description: 'Mode 2: basename of an mp3 previously stored in the RPA voice_greetings directory (e.g. "abc1234.mp3").' },
            text: { type: 'string', description: 'Mode 3: text to synthesize. Requires voiceId. Backend handles synthesis + cleanup.' },
            voiceId: { type: 'string', description: 'Mode 3: cloned voice speaker id (e.g. "S_FcZmbgm32"). MUST come from wechat_list_voices — do NOT ask the user to type a raw S_xxx, and do NOT invent one. If the user has not specified which voice to use, call wechat_list_voices first, show them the displayName list, and let them pick by name.' },
            speed: { type: 'number', description: 'Optional. Mode 3 only. Speech rate 0.5~2.0, default 1.0.' },
            accountId: ACCOUNT_ID_PARAM
        },
        required: ['user']
    }
};
const listVoicesDefinition = {
    name: 'wechat_list_voices',
    description: 'List the user\'s active cloned voices. Call BEFORE wechat_send_voice when the user has not specified a voice — never ask them to type a raw S_xxx id. Returns { success, data?: [{ voiceId, displayName, language, createdAt }], count?, error?, httpStatus? }. Distinguish outcomes: success:true & count>0 → show displayNames to pick; success:true & count:0 → user has no cloned voice (add one in RPA 设置 → AI 语音配置 → 我的音色); success:false → RPA backend problem, NEVER say "you have no voices". Details in manual topic "voice_send_sop".',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const postMomentDefinition = {
    name: 'wechat_post_moment',
    description: 'Post ONE WeChat Moment immediately via RPA (text + optional images/video). '
        + '要做「一段时间的发圈计划」用 wechat_create_moment_post_task,不要循环调本工具。',
    parameters: {
        type: 'object',
        properties: {
            content: { type: 'string', description: 'The text content of the moment.' },
            files: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of absolute file paths for images or video to upload.'
            },
            account_id: ACCOUNT_ID_PARAM
        },
        required: []
    }
};
const listLocalUsersDefinition = {
    name: 'wechat_list_local_users',
    description: '列出本机**历史**微信账号(含已退出登录的)。只用于回答"这机器以前用过哪些号"或读历史号的本地配置。'
        + '⚠ 决定"哪个号执行任务"请用 wechat_list_instances。',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
// 多开排查里最缺的一块：模型此前没有任何工具能问"现在到底哪几个号在线"。
// 它只能从 wechat_initialize 的返回里碰运气,或去读 wechat_list_local_users
// (磁盘目录名,含缓存目录和已退出登录的号)。账号选错的一半原因在这里。
const listInstancesDefinition = {
    name: 'wechat_list_instances',
    description: '列出当前已登录、可执行任务的微信号(nickname + account_id)。account_id 的唯一可信来源。'
        + '用户点名"用某某号"时先调它把昵称对上 id。',
    parameters: { type: 'object', properties: {}, required: [] }
};
const getLocalConfigDefinition = {
    name: 'wechat_get_config',
    description: 'Get config (agents/reply_strategy_v2/greeting_config…). If reading RPA API configs, read manual topic "config_schema" first. '
        + 'reply_strategy_v2 按微信号存(一号一份)；agents/greeting_config/chat_history_settings 是全局的(改一次所有号生效)。',
    parameters: {
        type: 'object',
        properties: {
            config_type: {
                type: 'string',
                description: 'The type of config to fetch. e.g., "agents", "reply_strategy_v2", "greeting_config"'
            },
            account_id: ACCOUNT_ID_PARAM,
            wechatId: { type: 'string', description: '已废弃,等同 account_id。' }
        },
        required: ['config_type']
    }
};
const updateReplyStrategyDefinition = {
    name: 'wechat_update_reply_strategy',
    description: 'Update reply strategy config for a user.',
    parameters: {
        type: 'object',
        properties: {
            wechatId: { type: 'string', description: 'The WeChat ID.' },
            config: {
                type: 'string',
                description: 'The JSON string of the full ReplyStrategyConfig object.'
            }
        },
        required: ['wechatId', 'config']
    }
};
const listSessionsDefinition = {
    name: 'wechat_list_sessions',
    description: 'List the chats that have LOCAL saved history on disk (sessions recorded over time by monitor-mode AI assistants). Use it to discover the exact session names before calling wechat_get_session_messages, or when unsure which group has been recorded. Shows saved disk history only — NOT real-time/active chats.',
    parameters: {
        type: 'object',
        properties: {
            wechatId: { type: 'string', description: 'Optional. The local WeChat account id whose sessions to list. Omit it when only one account has local history (auto-resolved). If multiple accounts exist, the tool returns an error listing them so you can pass the right one.' }
        },
        required: []
    }
};
const getSessionMessagesDefinition = {
    name: 'wechat_get_session_messages',
    // 只陈述"这份数据是什么"，不替调用方推断原因。
    // 早先这里罗列过"微信没开 / 账号掉线 / 群没配监听"当作确定成因，结果 agent 直接把
    // 其中一条当结论转述给用户（"说明采集中断了"）——而它手上只有"落盘时间早于请求区间"
    // 这一个事实。成因要靠核实，不能靠描述里的枚举。
    description: 'Read the ACCUMULATED LOCAL HISTORY of one chat (friend or GROUP) from disk. THIS IS THE TOOL FOR 群聊总结 / 聊天记录回顾 / "总结一下xx群聊了啥". Reads disk only; does NOT require WeChat to be running. '
        + 'This history is captured opportunistically rather than continuously, so it may have gaps. When since is given, the result carries coverage (ok | no_messages_in_range | range_not_covered), plus coverageNotice when it is not ok — read them before drawing any conclusion about that period.',
    parameters: {
        type: 'object',
        properties: {
            sessionName: { type: 'string', description: 'The group name or friend nickname to read (exact name as shown in WeChat), or the session ID.' },
            wechatId: { type: 'string', description: 'Optional. The local WeChat account id whose history to read. Omit it when only one account has local history (auto-resolved). If multiple accounts exist, the tool returns an error listing them so you can pass the right one.' },
            since: { type: 'string', description: 'Optional time filter. Only return messages at/after this LOCAL time. Accepts "YYYY-MM-DD" (from local midnight) or "YYYY-MM-DD HH:MM". E.g. for "总结今天的群聊" pass today\'s date.' },
            limit: { type: 'integer', description: 'Optional. Return only the most recent N messages (applied AFTER the since filter) to cap tokens. Omit to return all available (up to ~100).' }
        },
        required: ['sessionName']
    }
};
const launchWechatDefinition = {
    name: 'wechat_launch',
    description: 'Start WeChat without Narrator. Use this when WeChat is not running. close_existing=true is destructive and must only be used after the user explicitly agrees that all running WeChat processes will be closed.',
    parameters: {
        type: 'object',
        properties: {
            count: { type: 'integer', description: 'Number of WeChat instances to start (1-10). Default 1.' },
            close_existing: { type: 'boolean', description: 'DANGEROUS: close all existing WeChat processes first. Default false; only true after explicit user consent.' },
        },
        required: [],
    },
};
const getSessionMessagesBatchDefinition = {
    name: 'wechat_get_session_messages_batch',
    description: 'Read one bounded LOCAL-time window from multiple saved chats in ONE tool call. Use this for recurring incremental extraction, cleanup, summaries, and workbench sync instead of listing sessions and opening every chat in separate Agent turns. Disk-only and read-only. since is mandatory. When sessionNames is omitted, the tool selects sessions captured since that window (plus sessions with unknown timestamps) rather than the first entries in the index. Results are globally capped; coverageIssues, sessionSelectionTruncated, and inactiveSessionsExcluded must be checked before drawing conclusions.',
    parameters: {
        type: 'object',
        properties: {
            wechatId: { type: 'string', description: 'Optional local WeChat account id. Omit only when a single local account can be resolved.' },
            sessionNames: { type: 'array', items: { type: 'string' }, description: 'Optional exact chat names or IDs. Omit to auto-discover chats whose saved index was updated since the requested window; pass a list when coverage for specific quiet chats is required.' },
            since: { type: 'string', description: 'Required LOCAL lower bound in "YYYY-MM-DD HH:MM" format. Full-history reads are intentionally unsupported.' },
            limitPerSession: { type: 'integer', description: 'Optional per-chat cap, default 50, range 1~200.' },
            maxTotalMessages: { type: 'integer', description: 'Optional global output cap, default 120, range 1~500. Increase only when the task explicitly needs it.' },
            projection: { type: 'string', enum: ['clean_fields', 'full'], description: 'clean_fields (default) deterministically keeps time/sender/content plus essential type flags, suitable for raw cleaned forwarding without model rewriting; full preserves all saved fields for custom Agent extraction.' }
        },
        required: ['since']
    }
};
const fetchLatestMessagesDefinition = {
    name: 'wechat_fetch_latest_messages',
    // ⚠️ 描述里刻意**不出现** "real-time / 实时" 这个词。
    // 它曾经的开头是 "Read the REAL-TIME messages..."，后面虽然写了"只有一屏约5条"，
    // 但模型向用户转述能力时抓住的是标题词——于是对外宣称成了「我能实时监控群消息」。
    // 用户据此把业务押在上面（26 个群的每日总结），发现只读到一屏时的反应是被欺骗，
    // 而不是"能力有限"。能力措辞会被原样传播给用户，必须按最坏的转述来写。
    description: 'Read ONLY the messages currently visible in one WeChat chat window (the last screenful, roughly 5 messages) by driving the WeChat UI. This is a WINDOW SNAPSHOT, not a message stream and NOT a monitor: it cannot see anything scrolled out of view, and calling it repeatedly does not accumulate history. Use it ONLY to react to what is on screen right now (e.g. reply to a message that just arrived). NEVER use it for 聊天记录回顾 / 统计一天的消息 — for those use wechat_get_session_messages. When telling the user what you can do, describe this as "读取当前聊天窗口可见的最后约5条消息".',
    parameters: {
        type: 'object',
        properties: {
            sessionName: { type: 'string', description: 'The session name (friend nickname or group name).' },
            accountId: ACCOUNT_ID_PARAM
        },
        required: ['sessionName']
    }
};
const massSendingDefinition = {
    name: 'wechat_mass_sending',
    description: 'Two-phase mass sending via RPA. FIRST call with the desired tags/targets/content/schedule and an EXPLICIT interval unit; it only returns a preview and confirmationId and sends nothing. Show that preview to the user. Only in a LATER user turn, after explicit confirmation, call again with confirmationId + confirmed=true. Content source is ONE of `text` or `greeting_group`. Do NOT loop wechat_send_message per person.',
    parameters: {
        type: 'object',
        properties: {
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of tags. All friends/groups with these tags will be targeted.'
            },
            targets: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of specific friend nicknames or group names to target.'
            },
            text: {
                type: 'string',
                description: 'Ready-made message text to send to every target. Use `{name}` as a placeholder to be replaced with each recipient\'s name (e.g. "{name}你好，..."). One of `text` / `greeting_group` is required; do not pass both.'
            },
            greeting_group: {
                type: 'string',
                description: 'The name of the pre-configured greeting/message group to use for content. One of `text` / `greeting_group` is required; do not pass both.'
            },
            schedule_time: {
                type: 'string',
                description: 'Optional execution time (YYYY-MM-DD HH:mm). If omitted, executes immediately.'
            },
            batch_size: {
                type: 'integer',
                description: 'Batch size for grouping tasks. Default is 10.'
            },
            send_interval: {
                type: 'string',
                description: 'Optional per-message delay range. If provided, the unit is REQUIRED: "3-8s", "15-18m", "15-18分钟", "1-2h". Bare ranges such as "15-18" are rejected before any RPA call. Omit to use the explicit default 3-8 seconds.'
            },
            confirmationId: {
                type: 'string',
                description: 'One-shot token returned by the preview call. Use only after the user confirms in a later turn.'
            },
            confirmed: {
                type: 'boolean',
                description: 'Set true only after the user explicitly confirms the preview in a later turn.'
            },
            account_id: ACCOUNT_ID_PARAM
        },
        required: []
    },
    enterprise: {
        namespace: 'wechat_rpa',
        capability: 'mass_send_messages',
        sideEffect: 'external',
        risk: 'critical',
        reversible: false,
        idempotent: false,
        approval: 'policy',
        executionMode: 'sequential',
    },
};
const getTaskLogsDefinition = {
    name: 'wechat_get_task_logs',
    description: 'Get historical execution logs for RPA tasks (like add_friend, mass_sending). For log file location, task types, and field schemas, YOU MUST read manual topic "task_log_schema" via wechat_rpa_read_manual first.',
    parameters: {
        type: 'object',
        properties: {
            task_type: {
                type: 'string',
                description: 'The task type (e.g. "add_friend", "mass_sending", "auto_follow", "auto_reply", "moment_interaction", "friend_request").'
            },
            limit: {
                type: 'integer',
                description: 'Max number of recent logs to return. Default 100.'
            }
        },
        required: ['task_type']
    }
};
const getTasksDefinition = {
    name: 'wechat_get_tasks',
    description: 'Get the full list of tasks currently scheduled in the RPA scheduler. For returned task format details and status enums, please read manual topic "task_schema" via wechat_rpa_read_manual.',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const diagnoseRpaDefinition = {
    name: 'wechat_diagnose_rpa',
    description: '只读诊断 RPA。优先返回 9921 Supervisor 的自愈状态；recovering/degraded 时等待而不是要求用户重启，action_required 时按 reason_code 给出对应处置（不一定是登录），failed 时再考虑人工重启。旧版无 Supervisor 时兼容原诊断。',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const restartRpaDefinition = {
    name: 'wechat_restart_rpa',
    description: '请求 RPA Supervisor 只重启 Worker 并复查恢复结果，以保留功能期望状态和恢复记录。仅在自动恢复失败且用户在后续消息明确同意时调用；旧版无 Supervisor 才回退完整重启。',
    parameters: {
        type: 'object',
        properties: {
            confirmationId: {
                type: 'string',
                description: '最近一次诊断返回的短时确认 ID'
            },
            confirmed: {
                type: 'boolean',
                description: '仅当本轮用户明确同意重启时传 true'
            }
        },
        required: ['confirmationId', 'confirmed']
    }
};
const updateRpaPluginDefinition = {
    name: 'update_rpa_plugin',
    description: '升级微信RPA插件（会重启 RPA 服务，需先征得用户同意）。只想知道版本不要调它——wechat_diagnose_rpa 是只读的，返回 plugin.running / plugin.latest / plugin.updateAvailable。排查任何"插件行为不对"的问题时都先看那三个字段。禁止用 shell 杀 service.exe 或改插件目录来升级。',
    parameters: { type: 'object', properties: {}, required: [] }
};
const updateConfigDefinition = {
    name: 'wechat_update_config',
    description: 'Update RPA service configurations via API. You MUST read manual topic "config_schema" to understand the required parameters before calling. ALWAYS use Read-Modify-Write pattern.',
    parameters: {
        type: 'object',
        properties: {
            config_type: {
                type: 'string',
                description: 'The type of config to update. e.g., "agents", "reply_strategy_v2"'
            },
            data: {
                type: 'object',
                description: 'The complete JSON object of the updated configuration. DO NOT send partial updates.'
            },
            account_id: ACCOUNT_ID_PARAM
        },
        required: ['config_type', 'data']
    }
};
const syncContactsDefinition = {
    name: 'wechat_sync_contacts',
    description: 'Re-sync contacts from live WeChat into RPA (slow, ~2 min, returns NO contact data). Use only when the user asks to refresh/sync contacts or the task is contact maintenance.',
    parameters: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['friend', 'group'],
                description: 'The type of contacts to sync. "friend" for personal contacts, "group" for group chats.'
            },
            account_id: ACCOUNT_ID_PARAM
        },
        required: ['type']
    }
};
const getContactsDefinition = {
    name: 'wechat_get_contacts',
    description: 'Get already-synced WeChat contacts for explicit lookup/export. Not required before sending to a user-provided recipient name. Returns { total, file_path, excel_script, excel_output, hint }. To generate Excel: run `uv run excel_script`.',
    parameters: {
        type: 'object',
        properties: {
            tag: {
                type: 'string',
                description: 'Optional. Filter contacts by tag name (e.g. "广告", "AI微信机器人").'
            },
            keyword: {
                type: 'string',
                description: 'Optional. Filter contacts by name keyword.'
            },
            account_id: ACCOUNT_ID_PARAM
        },
        required: []
    },
    enterprise: {
        namespace: 'wechat_rpa',
        capability: 'export_contacts_to_workspace',
        sideEffect: 'local',
        risk: 'medium',
        reversible: true,
        idempotent: false,
        approval: 'policy',
        securityEffects: ['local_file_mutation'],
        executionMode: 'sequential',
    },
};
/**
 * 群列表是独立数据源，`wechat_get_contacts` 里没有群。
 *
 * RPA 侧 `GET /api/contacts/groups` 一直都在，只是客户端从没包过它。这个工具刻意做成
 * **纯只读、不落盘、不需要审批**——`wechat_get_contacts` 之所以次次要用户确认，是因为它
 * 顺手写导出文件；查个群名单不该付这个代价（线上用户为此连问四遍）。
 */
const getGroupsDefinition = {
    name: 'wechat_get_groups',
    description: 'List already-synced WeChat GROUPS (chatrooms) for this account. Groups are a SEPARATE data source from wechat_get_contacts (which returns friends only) and from wechat_list_sessions (which only shows chats that have local message history). Use this before any group mass-send or group statistics task. Read-only, writes nothing. If the result looks incomplete, run wechat_sync_contacts({type:"group"}) first and call again. Returns { total, returned, truncated, groups: [{ name, tag }], account }.',
    parameters: {
        type: 'object',
        properties: {
            keyword: {
                type: 'string',
                description: 'Optional. Case-insensitive substring filter on the group name (e.g. "教育", "人力").'
            },
            limit: {
                type: 'integer',
                description: 'Optional. Max groups to return (default 200, max 1000). Use `keyword` to narrow instead of raising this.'
            },
            account_id: ACCOUNT_ID_PARAM
        },
        required: []
    },
    enterprise: {
        namespace: 'wechat_rpa',
        capability: 'read_group_list',
        // 纯读：不落盘、不发消息、不改 RPA 状态，所以 sideEffect=none + approval=never。
        // 对照 wechat_get_contacts —— 它是 local/policy，因为它顺手写导出文件和 Excel 脚本，
        // 于是"我有多少群"这种问题也要弹一次确认。查群名单不该付这个代价。
        sideEffect: 'none',
        risk: 'low',
        reversible: true,
        idempotent: true,
        approval: 'never',
        estimatedCostClass: 'free',
        executionMode: 'sequential',
    },
};
const createMomentPlanDefinition = {
    name: 'wechat_create_moment_plan',
    description: 'Step in the auto-post-moment SOP: create a moment-post PLAN folder inside the RPA material directory. Returns { success, path, name } where `path` is the absolute folder path. The Agent then builds material groups (one subfolder per moment, each with a .txt copy + image/video files) inside `path` using its own file tools. Before using this tool you MUST read manual topic "moment_post_sop".',
    parameters: {
        type: 'object',
        properties: {
            plan_name: {
                type: 'string',
                description: 'The plan name, e.g. "本周朋友圈". If the name already exists the backend appends a timestamp.'
            }
        },
        required: ['plan_name']
    },
    enterprise: {
        namespace: 'wechat_rpa',
        capability: 'create_moment_material_folder',
        sideEffect: 'local',
        risk: 'medium',
        reversible: true,
        idempotent: false,
        approval: 'policy',
        securityEffects: ['local_file_mutation'],
        executionMode: 'sequential',
    },
};
const createMomentPostTaskDefinition = {
    name: 'wechat_create_moment_post_task',
    description: 'Step in the auto-post-moment SOP: create a SCHEDULED auto-post-moment task. The task loops on schedule and publishes one material group per run. Read manual topic "moment_post_sop" first for the full field semantics and workflow.',
    parameters: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Plan name (display name of the task).' },
            execMode: { type: 'string', enum: ['fixed', 'range'], description: '"fixed": post once per day at a fixed time. "range": post multiple times spread across a time window.' },
            fixedTime: { type: 'string', description: 'Required when execMode="fixed". Time of day as "HH:MM".' },
            rangeStart: { type: 'string', description: 'Required when execMode="range". Window start as "HH:MM".' },
            rangeEnd: { type: 'string', description: 'Required when execMode="range". Window end as "HH:MM" (must be later than rangeStart).' },
            postCount: { type: 'integer', description: 'Required when execMode="range". Number of moments to post within the window.' },
            cycle: { type: 'string', enum: ['daily', 'weekly'], description: '"daily": every day. "weekly": only on selected weekDays.' },
            weekDays: {
                type: 'array',
                items: { type: 'string' },
                description: 'Required when cycle="weekly". Day codes: "1"=Mon, "2"=Tue, "3"=Wed, "4"=Thu, "5"=Fri, "6"=Sat, "0"=Sun.'
            },
            materialFolder: { type: 'string', description: 'Absolute path of the plan folder (the `path` returned by wechat_create_moment_plan) that contains the material-group subfolders.' },
            publishMode: { type: 'string', enum: ['sequence', 'random'], description: '"sequence": use groups in alphabetical order of folder name. "random": pick randomly.' },
            // 历史字段名是 account(RPA 的 MomentPostTask 读的就是这个键)。这里保留它以免
            // 破坏存量调用,同时接受 account_id,由 handler 归一——模型不该被迫记住这个例外。
            // 历史字段名，等价于 account_id，两种都收（见 handler 里的归一）。
            account: { type: 'string', description: '同 account_id(历史字段名)。发圈仅支持微信 4.0+。' },
            account_id: ACCOUNT_ID_PARAM
        },
        required: ['name', 'execMode', 'cycle', 'materialFolder', 'publishMode']
    }
};
const toggleAiMomentDefinition = {
    name: 'wechat_toggle_ai_moment',
    description: 'Start or stop the AI Moment auto like/comment task (interacting with FRIENDS’ moments). This is the launch step of the ai_moment_sop. You MUST read manual topic "ai_moment_sop" first and complete the agent-binding steps before calling this. When enabling, `interactionMode` and `agentId` are required.',
    parameters: {
        type: 'object',
        properties: {
            enabled: { type: 'boolean', description: 'true to start the AI moment task, false to stop it.' },
            interactionMode: {
                type: 'string',
                enum: ['like_only', 'comment_only', 'like_and_comment', 'like_always_and_comment'],
                description: 'Required when enabled=true. like_only: like only. comment_only: comment only. like_and_comment: comment then like (only when a comment is generated). like_always_and_comment: always like, comment when possible.'
            },
            agentId: { type: 'string', description: 'Required when enabled=true. The botId (FireFlow apiKey) of the moment-comment agent bound in RPA agents config per the SOP.' },
            commentLimit: { type: 'integer', description: 'Optional. Max friends to comment on per run. Default 100.' },
            perFriendLimit: { type: 'integer', description: 'Optional. Max comments per single friend per run. Default 2.' },
            checkInterval: { type: 'integer', description: 'Optional. Minutes to wait before the next loop. Default 120.' },
            autoLike: { type: 'boolean', description: 'Optional. Whether to auto-like. Default false.' },
            selectedTags: { type: 'array', items: { type: 'string' }, description: 'Optional. Only interact with friends carrying these tags.' },
            account_id: ACCOUNT_ID_PARAM
        },
        required: ['enabled']
    }
};
// 自动回复（AI销冠）的总开关。以前只有 Electron IPC 暴露给界面按钮，Agent 侧没有工具——
// auto_config_sop 最后一步「确认后启动」于是无工具可用，模型只能自己去 curl 本机 9922
// 并翻 ~/.yokowebot/.key 猜密钥（线上 trace 实录：空转 2.5 分钟后被用户手动打断，
// 最后还把"配置已全部就位"报成成功）。补上这个工具，那条链路才闭得上。
const toggleAiSalesDefinition = {
    name: 'wechat_toggle_ai_sales',
    description: '开启/关闭微信自动回复（AI销冠）总开关——auto_config_sop 的最后一步。开启前必须已有启用中的 AI助理（否则本工具直接拒绝，不会假开）。这是唯一的开关手段：**禁止**用 shell_exec/web_fetch 去调 127.0.0.1 上的 RPA HTTP 接口，也禁止翻找 API Key。',
    parameters: {
        type: 'object',
        properties: {
            enabled: { type: 'boolean', description: 'true=开启自动回复，false=停止。' }
        },
        required: ['enabled']
    }
};
const cancelMomentPostTaskDefinition = {
    name: 'wechat_cancel_moment_post_task',
    description: 'Cancel a scheduled auto-post-moment task by its task_id (the moment_post task id seen in wechat_get_tasks).',
    parameters: {
        type: 'object',
        properties: {
            task_id: { type: 'string', description: 'The id of the moment_post task to cancel.' }
        },
        required: ['task_id']
    }
};
// 「登记 ≠ 生效」是 RPA 配置的结构性坑：agents 列表只是候选池，真正决定用哪个智能体的是
// AI助理的 agentId（自动回复）和朋友圈评论任务的 agentId，两处各存一份裸 botId。
// 下面两个工具把这层拆开：一个只读回答"现在谁在生效"，一个带确认地改它。
const getEffectiveAgentsDefinition = {
    name: 'wechat_get_effective_agents',
    description: '读微信RPA各功能当前真正生效的智能体(AI助理/AI朋友圈)。开启自动回复或AI朋友圈前、用户说"绑了没生效"时先调。'
        + 'AI助理按微信号存,一号一份；返回的 account 就是本次读的号,转述时要带上。',
    parameters: {
        type: 'object',
        properties: { account_id: ACCOUNT_ID_PARAM },
        required: []
    }
};
const configureTransferDefinition = {
    name: 'wechat_configure_transfer',
    description: '读/写微信RPA转人工配置（触发词、通知对象、客户可见性）。无参数只读；子Agent接入自动回复前调用，并按 transfer_to_human_sop 对齐触发词。',
    parameters: {
        type: 'object',
        properties: {
            phrases: {
                type: 'array',
                items: { type: 'string' },
                description: '转人工触发词。AI回复正文出现任一即触发(子串匹配、区分大小写)。最多3个，强烈建议只留一个「转人工」。**传入即整体替换**，先读现状再决定。'
            },
            notifyWechat: { type: 'string', description: '接收转人工通知的微信昵称(常是老板本人/客服小号)。留空则只走飞书(若配过)和界面挂起。' },
            notSendToCustomer: { type: 'boolean', description: '含触发词的回复是否不发给客户。靠过滤词实现，会丢掉**整条**回复(客户什么也收不到)。默认 false。' }
        },
        required: []
    }
};
const bindAgentDefinition = {
    name: 'wechat_bind_agent',
    description: '把智能体绑到微信RPA的功能上让它真正生效。低风险配置会直接写入；若会影响正在运行的自动回复等高风险场景，不带 confirmToken 只出预览不写入，须经用户同意后下一轮带令牌重调。写入后会让 RPA 自己试拨一次,结果在返回的 verification 里——verified=false 时不许说"已生效",verified=null 表示这台机器验证不了,汇报要如实说明。详见手册 agent_binding_sop。',
    parameters: {
        type: 'object',
        properties: {
            agent: { type: 'string', description: '子Agent标识 / FireFlow apiKey / 已登记的 botId' },
            scenes: { type: 'array', items: { type: 'string', enum: ['reply', 'moment'] }, description: 'reply=AI助理(自动回复), moment=AI朋友圈; 留空仅登记' },
            displayName: { type: 'string', description: '展示名(新登记时填)' },
            staffId: { type: 'string', description: '有多个AI助理时指定换哪个' },
            chatType: { type: 'string', enum: ['single', 'group'], description: '仅"一个AI助理都没有、需要新建"时用：single=单聊(默认), group=群聊。RPA 只有这两种范围，一条助理管一种。' },
            confirmToken: { type: 'string', description: '上一轮预览返回的令牌' },
            account_id: ACCOUNT_ID_PARAM
        },
        required: ['agent']
    }
};
export class WeChatRPASkill {
    name = 'wechat-rpa';
    description = 'Control WeChat Desktop (RPA) & manage local data. Capabilities: Send msg/file/voice, Post moment, Schedule auto-post-moment plans, Mass send, Fetch real-time msgs, Manage config, Read disk history.';
    instructions = `
<skill>
<name>wechat-rpa</name>
<description>
微信桌面版 RPA 操作 + 本地数据。
- 微信端(需微信在跑)：发消息/文件/语音、发/定时发朋友圈、群发、朋友圈自动点赞评论、拉实时消息、查/取消调度任务、同步/导出联系人。
- 读盘：管理配置、读累积聊天历史、任务日志。

工具清单：
- 微信端：initialize, send_message, send_file, send_voice, list_voices, post_moment, create_moment_plan, create_moment_post_task, cancel_moment_post_task, toggle_ai_moment, toggle_ai_sales(自动回复总开关), mass_sending, fetch_latest_messages, get_tasks, diagnose_rpa, restart_rpa, sync_contacts, get_contacts, update_config。
- 读盘：list_instances(在线账号,多开必用), list_local_users(历史账号), get_config, update_reply_strategy, list_sessions, get_session_messages, get_session_messages_batch, get_task_logs。
- 生效态：get_effective_agents(谁在生效), bind_agent(换绑,低风险直写/高风险预览确认), configure_transfer(转人工触发词,不带参=只读)。

RULES:
1. 初始化：本会话没调过 wechat_initialize 就先调它；调过则跳过、直接调目标工具；目标工具失败可再调一次 initialize 重绑。绝不传 auto_config=true，除非 initialize 明确返回 "ENV_NOT_CONFIGURED"（它会杀掉微信进程）。
2. 联系人/收件：给定收件人名直接发即可，无需先同步。account_id 是发送方微信实例、不是收件人；仅在多账号时才需要。只有用户明确要"刷新/同步/导出联系人"才用 sync_contacts（慢，约2min）/ get_contacts。
2.1 **多开**：单账号无需关心，工具会自动填号。多个号在线时账号级工具必须带 account_id（只从 wechat_list_instances 取）；不带会报 AMBIGUOUS_ACCOUNT + 候选，此时**把候选念给用户让他选，绝不许自己挑**（发错号不可撤销）。作用域：toggle_ai_sales 是全账号开关（故无 account_id）；AI助理和 AI朋友圈按号；转人工词和智能体池全局。做完账号级操作汇报要带上返回的 account。细节读 multi_account_sop。
3. 读聊天记录分"落盘历史"与"当前窗口"（勿混用）：单个会话总结/回顾 → wechat_get_session_messages；周期性增量提取、清洗或多个会话汇总 → 一次调用 wechat_get_session_messages_batch（必须传 since，可选 sessionNames，禁止逐个会话拆成多轮）；只处理眼前这条 → wechat_fetch_latest_messages（**仅当前窗口约5条，不是实时流、不是监控**）。**绝不用 fetch_latest 做总结**（会漏历史）。单账号 wechatId 可省略；仅在确实不知道目标会话名且不做全量批读时先 wechat_list_sessions。
3.1 总结/统计某段时间的群聊前，先看 get_session_messages 返回的 coverage：range_not_covered = 本地数据没覆盖该区间，此时**无法判断**那段时间有没有消息，既不要用更早的消息代替，也不要替用户断定原因（微信没开、账号没登、该群没配监听、采集异常都可能，要查才知道）；no_messages_in_range = 覆盖了且确实没消息，可据此说明无内容，不发空总结。
3.2 说明能力时按事实讲：get_session_messages 读的是已落盘的历史（非连续采集，可能有缺口），fetch_latest 读的是当前窗口可见的最后几条。不要用"实时监控/实时获取群消息"这类说法。
4. 以下场景**必须先** wechat_rpa_read_manual({ topic }) 再按步骤执行（HOW 都在文档里）：
   - 用语音/发语音/克隆音色发声 → voice_send_sop
   - 一键配置，或报 "未同步群聊"/"无可用AI助理" → auto_config_sop
   - 多开微信/启动多个微信实例 → multi_instance_sop（会重启微信，需用户明确确认）
   - 本机有多个微信号在线，或用户说"发错号/配置跑到别的号上/定时任务用错微信" → multi_account_sop
   - 准备/安排/自动发朋友圈、批量备素材 → moment_post_sop（注意 post_moment 只即时发一条、是快速测试，非计划替代）
   - 开启 AI 朋友圈自动点赞评论 → ai_moment_sop
   - 搭建"群聊监控 +（定时）自动总结"闭环 → group_summary_sop
   - 转人工（配触发词、"AI 不转人工/没收到通知"、给子 Agent 写转人工话术）→ transfer_to_human_sop
   - 对接客户自己的 AI 平台/CRM/业务接口，或配置私域Agent外部 URL、Token、异步回复、只消费消息 → agentic_channel_sop（客户自定义 Base URL 只允许 platform=agentic；Coze/Dify/FireFlow 等其他平台不得套用）
   - 需读/改配置或读任务日志的字段语义 → config_schema / task_schema / task_log_schema（改配置走 Read-Modify-Write）
5. 智能体"登记了不等于在用"：agents 列表只是候选池，真正生效的是 AI助理的 agentId(自动回复) 和朋友圈评论任务的 agentId。开启自动回复/AI朋友圈前、用户说"绑了没生效"时，**先 wechat_get_effective_agents 并把结果复述给用户确认**；要换用 wechat_bind_agent。细节读 agent_binding_sop。外部私域Agent必须先按 agentic_channel_sop 用 get_config + update_config 登记完整渠道参数，再按 botId 换绑；URL/Token 不能传给 bind_agent。自定义 Base URL 只能写入 platform=agentic 的条目，其他平台保持原配置。
6. RPA 无响应时先调用 wechat_diagnose_rpa，并以 9921 Supervisor 的实时状态为准：self_recovering/supervisor_degraded 表示后台正在确认或自愈，只需稍后重试，禁止要求用户重启；action_required 只做 evidence 里按 reason_code 给出的那一种人工处置（可能是重新打开微信窗口，不一定是登录扫码）；recovery_failed 或 **recovery_stalled**（Worker 卡在启动态已超过 Supervisor 自己的判定节拍，它既不会推进状态也不会自动重启）才可询问是否手动重启——recovery_stalled 时不要让用户"再等等"。仅在用户后续消息明确同意后，才可带 confirmationId 调 wechat_restart_rpa；禁用 shell_exec/taskkill。旧版无 Supervisor 时才采用兼容诊断。
7. 开/关自动回复(AI销冠)**只用 wechat_toggle_ai_sales**。**严禁**使用请求url地址方式兜底。
8. 汇报口径按事实：只有 wechat_toggle_ai_sales 或 wechat_get_effective_agents 明确显示 running=true 才可以说"已开启"。配置写好但没跑起来时，必须说"配置已完成，但自动回复尚未开启"，不许用"已全部就位/已开启/搞定了"含混带过。
9. 群发固定两阶段：第一次 wechat_mass_sending 只拿预览，必须把发送账号、目标范围、文案来源、执行时间和工具回显的真实间隔逐项展示给用户；等待用户下一条消息明确确认后，才可带 confirmationId + confirmed=true 兑现。send_interval 只要传就必须带单位，禁止裸写 "15-18"。预览不等于已创建任务。
</description>
</skill>
`;
    tools;
    apiClient;
    serviceManager;
    supervisorClient;
    configManager;
    dataManager;
    manualProvider;
    diagnosticSamples = new Map();
    restartConfirmations = new Map();
    // 换绑会改变"谁在接待客户"，属于用户不该被绕过的决定。沿用 restart 的跨轮令牌：
    // 令牌只在预览时签发，且必须在**另一个 trace**（= 用户又说了一句话）里才能兑现，
    // 模型没法在同一轮里自己预览再自己确认。
    bindConfirmations = new Map();
    // 群发是不可撤销的批量外部副作用。预览令牌锁定整份计划，并强制跨 trace 兑现，
    // 防止模型在同一轮里自己看完回显又自己确认，也防止确认后偷换账号/文案/间隔。
    massSendingConfirmations = new Map();
    constructor() {
        this.apiClient = new RPAApiClient();
        this.serviceManager = new RPAServiceManager(this.apiClient);
        this.supervisorClient = new RpaSupervisorClient();
        this.configManager = new LocalConfigManager();
        this.dataManager = new LocalDataManager();
        this.manualProvider = new SkillManualProvider(this.name, 'wechat_rpa', {
            transformContent: renderWechatRpaManual,
        });
        this.tools = [
            this.manualProvider.getManualTool('ANY question about WeChat RPA behavior you are not certain of (group @/quote replies, where data is stored) MUST be answered from this manual — read topic "index" first, never guess or change the agent persona instead.'),
            // API Tools
            { definition: initializeDefinition, execute: this.handleInitialize.bind(this) },
            { definition: launchWechatDefinition, execute: this.handleLaunchWechat.bind(this) },
            { definition: sendMessageDefinition, execute: this.handleSendMessage.bind(this) },
            { definition: importFriendListDefinition, execute: this.handleImportFriendList.bind(this) },
            { definition: sendFileDefinition, execute: this.handleSendFile.bind(this) },
            { definition: sendVoiceDefinition, execute: this.handleSendVoice.bind(this) },
            { definition: listVoicesDefinition, execute: this.handleListVoices.bind(this) },
            { definition: postMomentDefinition, execute: this.handlePostMoment.bind(this) },
            { definition: createMomentPlanDefinition, execute: this.handleCreateMomentPlan.bind(this) },
            { definition: createMomentPostTaskDefinition, execute: this.handleCreateMomentPostTask.bind(this) },
            { definition: cancelMomentPostTaskDefinition, execute: this.handleCancelMomentPostTask.bind(this) },
            { definition: toggleAiMomentDefinition, execute: this.handleToggleAiMoment.bind(this) },
            { definition: toggleAiSalesDefinition, execute: this.handleToggleAiSales.bind(this) },
            { definition: massSendingDefinition, execute: this.handleMassSending.bind(this) },
            { definition: fetchLatestMessagesDefinition, execute: this.handleFetchLatestMessages.bind(this) },
            { definition: getTasksDefinition, execute: this.handleGetTasks.bind(this) },
            { definition: diagnoseRpaDefinition, execute: this.handleDiagnoseRpa.bind(this) },
            { definition: restartRpaDefinition, execute: this.handleRestartRpa.bind(this) },
            { definition: updateRpaPluginDefinition, execute: this.handleUpdateRpaPlugin.bind(this) },
            { definition: getTaskLogsDefinition, execute: this.handleGetTaskLogs.bind(this) },
            { definition: getLocalConfigDefinition, execute: this.handleGetConfig.bind(this) },
            {
                definition: updateConfigDefinition,
                execute: this.handleUpdateConfig.bind(this),
                // 手册与 get_config 都给 agents 数组；schema 是 object。见 update_config_args.ts。
                prepareArguments: normalizeUpdateConfigArguments,
            },
            { definition: getEffectiveAgentsDefinition, execute: this.handleGetEffectiveAgents.bind(this) },
            { definition: bindAgentDefinition, execute: this.handleBindAgent.bind(this) },
            { definition: configureTransferDefinition, execute: this.handleConfigureTransfer.bind(this) },
            { definition: syncContactsDefinition, execute: this.handleSyncContacts.bind(this) },
            { definition: getContactsDefinition, execute: this.handleGetContacts.bind(this) },
            { definition: getGroupsDefinition, execute: this.handleGetGroups.bind(this) },
            // Local Config Tools
            { definition: listInstancesDefinition, execute: this.handleListInstances.bind(this) },
            { definition: listLocalUsersDefinition, execute: this.handleListLocalUsers.bind(this) },
            { definition: updateReplyStrategyDefinition, execute: this.handleUpdateReplyStrategy.bind(this) },
            // Local Data Tools
            { definition: listSessionsDefinition, execute: this.handleListSessions.bind(this) },
            { definition: getSessionMessagesDefinition, execute: this.handleGetSessionMessages.bind(this) },
            { definition: getSessionMessagesBatchDefinition, execute: this.handleGetSessionMessagesBatch.bind(this) }
        ];
        // The released macOS Control uses the capability-filtered MVP host;
        // native voice remains unavailable there. Keep the Windows tool surface
        // unchanged, but do not advertise routes the macOS host cannot serve.
        if (process.platform === 'darwin') {
            this.tools = this.tools.filter((tool) => tool.definition.name !== 'wechat_send_voice'
                && tool.definition.name !== 'wechat_list_voices');
            this.description = this.description.replace('Send msg/file/voice', 'Send msg/file');
            this.instructions = this.instructions
                .replace('发消息/文件/语音', '发消息/文件')
                .replace('send_file, send_voice, list_voices, post_moment', 'send_file, post_moment')
                .replace('用语音/发语音/克隆音色发声 → voice_send_sop', 'macOS 暂不支持语音发送或克隆音色；明确告知用户，不调用语音工具');
        }
        // 运行时守卫(第三层防御):Agent 在为 RPA 生成回复时,不得反向调用 RPA。
        // 白名单是配置层防御,会被误配或被子会话提权绕过;本层不依赖任何前提。
        this.tools = guardToolsAgainstAgenticRecursion(this.tools);
        // Ensure cleanup
        const cleanup = () => this.stopSync();
        process.on('exit', cleanup);
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
    }
    async ensureServiceProcessRunning() {
        assertRpaRuntimeAllowed();
        if (MAIN_OWNED_MACOS_RPA()) {
            return this.apiClient.checkAuthenticatedHealth({ discover: true });
        }
        const ok = await this.serviceManager.ensureServiceRunning();
        // Only the `missing_binary` state is definitive "there is nothing to connect to"
        // (the RPA plugin was never installed). Surface it as a distinctive, actionable error
        // so callers (and the MCP humanizer) can tell the user to INSTALL the plugin instead of
        // letting a downstream fetch fail with an opaque "fetch failed" that reads like a
        // not-yet-started service. All other failure reasons (timeout/crashed/needs_admin/…)
        // keep the previous lenient behavior: return false and let the caller proceed/retry.
        if (!ok && this.serviceManager.getLastStartResult().reason === 'missing_binary') {
            // 直接抛统一话术：模型会把这句原样转达给用户。
            // 抛原始错误码会让模型自己解释错误码，措辞每次不同（线上已发生过）。
            throw new Error(RPA_FAILURE_MESSAGES.not_installed);
        }
        return ok;
    }
    /**
     * Transport-only readiness for remediation endpoints.  In particular, Supervisor
     * action_required must not prevent /api/init/multi from fixing that business state.
     * Older RPA packages without a Supervisor are supported through the same health probe.
     */
    async ensureRpaTransportReady(options = {}) {
        const started = await this.ensureServiceProcessRunning();
        const timeoutMs = Math.max(0, options.timeoutMs ?? 180_000);
        const deadline = Date.now() + timeoutMs;
        while (true) {
            if (options.signal?.aborted) {
                throw options.signal.reason instanceof Error
                    ? options.signal.reason
                    : new Error(String(options.signal.reason || 'RPA transport readiness aborted'));
            }
            if (await (MAIN_OWNED_MACOS_RPA()
                ? this.apiClient.checkAuthenticatedHealth({ discover: true })
                : this.apiClient.checkHealth({ discover: true })))
                return true;
            if (Date.now() >= deadline) {
                throw new Error(started
                    ? 'RPA 服务进程已启动，但 Worker 暂时不可访问，请稍后重试。'
                    : RPA_FAILURE_MESSAGES.not_running);
            }
            await new Promise((resolve, reject) => {
                const delay = Math.min(500, Math.max(1, deadline - Date.now()));
                const timer = setTimeout(() => {
                    options.signal?.removeEventListener('abort', onAbort);
                    resolve();
                }, delay);
                const onAbort = () => {
                    clearTimeout(timer);
                    reject(options.signal?.reason instanceof Error
                        ? options.signal.reason
                        : new Error(String(options.signal?.reason || 'RPA transport readiness aborted')));
                };
                options.signal?.addEventListener('abort', onAbort, { once: true });
            });
        }
    }
    async ensureServiceAndMonitor(options = {}) {
        const ok = await this.ensureServiceProcessRunning();
        let lastLogKey = '';
        const readiness = await waitForRpaWorkerReady({
            checkWorker: () => MAIN_OWNED_MACOS_RPA()
                ? this.apiClient.checkAuthenticatedHealth({ discover: true })
                : this.apiClient.checkHealth({ discover: true }),
            getSupervisorStatus: () => this.supervisorClient.getStatus(),
            timeoutMs: options.timeoutMs,
            signal: options.signal,
            onStatus: (status) => {
                const logKey = `${status.status}:${status.reason_code || ''}:${status.worker_generation || ''}`;
                if (logKey === lastLogKey)
                    return;
                lastLogKey = logKey;
                if (status.status === 'starting' || status.status === 'recovering' || status.status === 'degraded') {
                    console.log(`[WeChatRPASkill] Supervisor ${status.status}: ${status.reason_code || 'no_reason'} - ${status.message || ''}`);
                }
            },
        });
        if (readiness.ready)
            return true;
        // No Supervisor means an older RPA package. Preserve the old lifecycle decision made by
        // ensureServiceRunning(), but surface a stable error instead of pretending the Worker is ready.
        if (!readiness.supervisorReachable) {
            throw new Error(ok
                ? 'RPA 服务进程已启动，但 Worker 暂时不可访问，请稍后重试。'
                : RPA_FAILURE_MESSAGES.not_running);
        }
        const status = readiness.supervisorStatus;
        if (status?.status === 'action_required') {
            // 已知 reason_code 一律用本地文案，【不用】supervisorStatus.message。
            //
            // 老版本 RPA 插件对所有 reason_code 都只发那句写死的
            // 「微信需要人工登录或重新连接」（新版 supervisor_contract.py 已按码分流，
            // 但用户不一定升级了插件）。这句话会原样进模型上下文，模型据此让用户去扫码，
            // 而真实情况可能是 WECHAT_INSTANCE_NOT_FOUND ——「微信开着也登录着，
            // 照做没有任何用」。2026-09-06 的朋友圈点赞任务连续失败就是这个场景：
            // trace 里 evidence 是 ["WECHAT_INSTANCE_NOT_FOUND", "微信需要人工登录或重新连接"]，
            // 两者直接矛盾。
            //
            // 未知码才转述 message：新码随 RPA 版本增加，我们不认识时应当照搬它的原话，
            // 而不是自己编一个可能相反的结论。判定规则与界面完全同源（同一个模块）。
            // 换号登录是唯一一个 Agent 自己就能收口的 action_required：initialize 会让
            // 旧号退出托管、按当前登录的号重新初始化（RPA 侧 /api/init/multi 完成）。
            // 其余的码都只能由用户在微信客户端动手，模型不要自作主张重试。
            throw new Error(status.reason_code === 'WECHAT_ACCOUNT_MISMATCH'
                ? `${rpaActionRequiredMessage(status)}`
                    + '征得用户同意后调用 wechat_initialize 完成切换；自动回复要等用户自己重新开启，不要替他开。'
                : rpaActionRequiredMessage(status));
        }
        if (status?.status === 'failed') {
            throw new Error(status.message || 'RPA 自动恢复连续失败，已停止自动重试。');
        }
        if (readiness.reason === 'stalled') {
            // 和 wechat_diagnose_rpa 的 recovery_stalled 说同一件事：别再让用户干等。
            const seconds = supervisorStartingSeconds(status) ?? WORKER_STARTING_STALL_SECONDS;
            throw new Error(`RPA Worker 已在启动状态卡了约 ${seconds} 秒仍未就绪，超过了 Supervisor 自己的判定节拍，`
                + `说明它既不会推进状态也不会自动重启。请调 wechat_diagnose_rpa 取确认令牌，征得用户同意后重启 Worker。`);
        }
        throw new Error(status?.message || 'RPA 正在自动恢复，但在等待时间内尚未恢复完成，请稍后重试。');
    }
    async getSupervisorStatus() {
        return this.supervisorClient.getStatus();
    }
    async checkRuntime(options = {}) {
        assertRpaRuntimeAllowed();
        return this.serviceManager.checkRuntime(options);
    }
    async installPreparedUpdate(directory, version) {
        assertRpaRuntimeAllowed();
        return this.serviceManager.installPreparedUpdate(directory, version);
    }
    // Atomic restart (stop+start as one serialized op). Safe against concurrent starts.
    async restart() {
        assertRpaRuntimeAllowed();
        if (MAIN_OWNED_MACOS_RPA())
            return requestMainOwnedMacOSRuntime('restart');
        return this.serviceManager.restart();
    }
    /**
     * Runtime recovery must restart only the Worker so the Supervisor keeps its desired feature
     * state, recovery history and retry accounting. Full stop/start remains available through
     * restart() for plugin installation/update, where replacing the executable is intentional.
     */
    async restartWorker() {
        assertRpaRuntimeAllowed();
        if (MAIN_OWNED_MACOS_RPA())
            return requestMainOwnedMacOSRuntime('restart');
        const result = await this.serviceManager.runWorkerRestart(async () => {
            const requested = await this.supervisorClient.restartWorker();
            if (!requested.reachable) {
                console.warn('[WeChatRPASkill] Supervisor unavailable; falling back to full service restart for legacy RPA.');
                return { success: false, reason: 'legacy_restart_required' };
            }
            if (!requested.success) {
                return {
                    success: false,
                    reason: 'worker_restart_rejected',
                    message: requested.error || 'RPA Supervisor rejected the Worker restart request.',
                    details: requested.data,
                };
            }
            const readiness = await waitForRpaWorkerReady({
                checkWorker: () => this.serviceManager.isRuntimeIdentityReady(),
                getSupervisorStatus: () => this.supervisorClient.getStatus(),
                timeoutMs: 180_000,
            });
            return {
                success: readiness.ready,
                reason: readiness.ready ? 'worker_restarted' : 'worker_restart_failed',
                message: readiness.ready
                    ? 'RPA Worker restarted and returned to a stable state.'
                    : readiness.supervisorStatus?.message || 'RPA Worker did not return to a stable state.',
                details: {
                    eventId: requested.data?.event_id,
                    supervisor: readiness.supervisorStatus,
                },
            };
        });
        return result.reason === 'legacy_restart_required' ? this.serviceManager.restart() : result;
    }
    // Applies a new auth token; only (re)starts the service when the token actually changed.
    async applyAuthToken(token) {
        assertRpaRuntimeAllowed();
        if (MAIN_OWNED_MACOS_RPA())
            return { success: true, changed: false, owner: 'electron-main' };
        return this.serviceManager.applyAuthToken(token);
    }
    getLastServiceStartResult() {
        return this.serviceManager.getLastStartResult();
    }
    async repairServiceWithAdminApproval() {
        assertRpaRuntimeAllowed();
        return this.serviceManager.repairDefenderAndRestart();
    }
    async stop() {
        if (MAIN_OWNED_MACOS_RPA())
            return;
        await this.serviceManager.stop();
    }
    stopSync() {
        if (MAIN_OWNED_MACOS_RPA())
            return;
        this.serviceManager.stopSync();
    }
    // --- API Handlers ---
    async handleInitialize(args) {
        if (args?.auto_config && process.platform === 'darwin') {
            return {
                success: false,
                code: 'MACOS_COMPATIBILITY_CONFIGURATION_UNAVAILABLE',
                message: 'macOS 不使用 Windows 的讲述人兼容配置；请按 macOS 初始化结果的 guidance 处理。',
            };
        }
        // initialize/auto_config are remediation operations, so only require the Worker
        // transport. Supervisor action_required is precisely a reason to let them through.
        await this.ensureRpaTransportReady();
        if (args && args.auto_config) {
            return await this.apiClient.autoConfig();
        }
        // 初始化失败的归因必须统一。底层可能返回 403 LICENSE_INVALID / fetch failed /
        // 未登录等多种形态，直接抛给模型会得到每次都不一样的解释（见 errors.ts 的背景说明）。
        let result;
        try {
            result = await this.apiClient.initialize();
        }
        catch (e) {
            // ENV_NOT_CONFIGURED is an expected interactive branch, not a
            // terminal tool error. The API client still rejects every other
            // HTTP-200 business failure so its true cause is never discarded.
            if (e instanceof RpaInitializationError && e.code === 'ENV_NOT_CONFIGURED') {
                result = e.response;
            }
            else {
                throw new Error(toUserFacingRpaError(e?.message || String(e)));
            }
        }
        if (result && result.code === 'ENV_NOT_CONFIGURED') {
            if (process.platform === 'darwin') {
                return {
                    success: false,
                    code: result.code,
                    message: result.message || 'macOS 微信环境未就绪',
                    guidance: result.guidance || null,
                };
            }
            const downgrade = result.downgrade_suggestion;
            if (downgrade?.show) {
                return `[UIA Activation Failed]
The non-Narrator activation and the Narrator fallback were both unable to expose WeChat controls.
Please ask the user to download and install WeChat ${downgrade.recommended_version || '4.1.8'} from the approved link, then log in and call wechat_initialize again.
Download: ${downgrade.download_url || ''}`;
            }
            const reasonCode = result.accessibility?.instances
                ?.map((item) => item?.reason_code)
                .filter(Boolean)
                .join(', ');
            return `[Environment Not Configured]
The non-Narrator UIA activation did not succeed${reasonCode ? ` (${reasonCode})` : ''}.

Please ask the user: "Do you want to use the Narrator fallback? It will close all running WeChat windows and require login again."

If the user agrees, call this tool again with 'auto_config=true'.

If the user prefers manual configuration, provide these steps:
1. Exit current WeChat program.
2. Configure computer environment variables.
3. Start "Narrator" mode and run for 10 seconds.
4. Restart WeChat program.`;
        }
        return result;
    }
    async handleLaunchWechat(args) {
        await this.ensureRpaTransportReady();
        return this.apiClient.launchWechat({
            count: Math.max(1, Math.min(Number(args?.count || 1), 10)),
            close_existing: args?.close_existing === true,
        });
    }
    async handleSendMessage(params, signal, context) {
        await this.ensureServiceAndMonitor();
        // 先定号再算幂等坐标：坐标里带的必须是**真正发出去的那个号**，
        // 否则同一条消息在不同号上会共用一个 key，被误判成重复而漏发。
        const account = await this.resolveAccount(`向「${params.user}」发消息`, params.account_id);
        const payloadCoordinate = createHash('sha256').update(JSON.stringify({
            user: params.user,
            message: params.message,
            accountId: account.accountId,
        })).digest('hex').slice(0, 24);
        const executionCoordinate = context?.toolCallId
            ? `${context.agentRunId || context.traceId || context.sessionId}:${context.toolCallId}:${payloadCoordinate}`
            : undefined;
        const result = await deliverRpaText({
            target: params.user,
            text: params.message,
            accountId: account.accountId,
            signal,
            idempotencyKey: executionCoordinate ? `tool:wechat_send_message:${executionCoordinate}` : undefined,
            ensureService: () => this.ensureServiceAndMonitor(),
            client: this.apiClient,
        });
        const response = result.response && typeof result.response === 'object' && !Array.isArray(result.response)
            ? result.response
            : { status: true, message: result.deduplicated ? '消息已在先前调用中确认发送' : '消息发送成功' };
        return {
            ...response,
            success: true,
            account: describeAccount(account),
            deliveryId: result.deliveryId,
            deduplicated: result.deduplicated,
        };
    }
    /**
     * 导入待添加好友名单。
     *
     * 两步式（dry_run → column_mapping）不是为了严谨好看，是因为
     * RPA 的表头是精确匹配、而名单会被真的拿去逐个加好友：
     * 选错列 = 骚扰一批真实用户，且已写入的名单要去 RPA 后台才能清。
     *
     * 【不做账号解析】：待添加名单存在 RPA 本地库里，是全局的、不分微信号
     * （加好友任务运行时才决定用哪个号去加）。这里调 resolveAccount 只会
     * 平白给单账号用户增加一次追问。
     */
    async handleImportFriendList(params) {
        const { REQUIRED_HEADER, OPTIONAL_HEADERS, MAX_ROWS, inspectSheet, rewriteToRpaFormat, } = await import('./friend_list_sheet.js');
        if (!params?.file_path)
            throw new Error('缺少 file_path');
        // 第一步：只读表头，不碰 RPA 服务——用户可能只是想先看看格式对不对，
        // 没必要为此把 Worker 拉起来。
        const info = inspectSheet(params.file_path);
        if (params.dry_run || !params.column_mapping) {
            return {
                stage: 'inspect',
                headers: info.headers,
                sample: info.sample,
                row_count: info.rowCount,
                header_matches_rpa: info.matched,
                rpa_required_header: REQUIRED_HEADER,
                rpa_optional_headers: [...OPTIONAL_HEADERS],
                max_rows: MAX_ROWS,
                instruction: info.matched
                    ? `表头已符合 RPA 规范，可以直接带 column_mapping:{"${REQUIRED_HEADER}":"${REQUIRED_HEADER}"} 再调一次导入。`
                    : `表头不符合 RPA 规范。请依据上面的 headers 与 sample 判断哪一列是要添加的号码、`
                        + `哪列适合当备注/标签，**先把你的判断复述给用户并等他确认**，`
                        + `确认后再带 column_mapping 调用本工具。不要跳过确认。`,
            };
        }
        // 第二步：按映射生成规范表格再上传。
        // 临时文件放系统临时目录，不污染用户原目录。
        const os = await import('os');
        const path = await import('path');
        const fsp = await import('fs/promises');
        const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'yoko-friendlist-'));
        let outPath = '';
        try {
            const rewritten = rewriteToRpaFormat(params.file_path, params.column_mapping, tmpDir);
            outPath = rewritten.outPath;
            await this.ensureServiceAndMonitor();
            const result = await this.apiClient.importFriendList(outPath, '名单.xlsx');
            return {
                stage: 'imported',
                ...(result && typeof result === 'object' ? result : { raw: result }),
                mapped_from: params.column_mapping,
                // 被跳过的行要如实报出来：用户看到「导入 328 条」而表格里有 350 行时，
                // 第一反应是工具丢数据了。说清是号码列为空才跳过的。
                skipped_empty_rows: rewritten.skipped,
                note: '名单已写入「待添加」列表。这一步【不会】自动开始加好友，需要另行开启自动加好友任务。',
            };
        }
        finally {
            // 临时文件即用即删：里面是用户的客户名单，没有理由在磁盘上多留。
            try {
                await fsp.rm(tmpDir, { recursive: true, force: true });
            }
            catch { /* 静默 */ }
        }
    }
    async handleSendFile(params) {
        await this.ensureServiceAndMonitor();
        const account = await this.resolveAccount(`向「${params.user}」发文件`, params.accountId);
        const result = await this.apiClient.sendFile(params.user, params.filePath, account.accountId);
        return { ...(result && typeof result === 'object' ? result : { raw: result }), account: describeAccount(account) };
    }
    async handleSendVoice(params) {
        await this.ensureServiceAndMonitor();
        // Pre-validate: at least one of the three input modes must be provided
        const hasMode1 = !!params.audioPath;
        const hasMode2 = !!params.audioFilename;
        const hasMode3 = !!(params.text && params.voiceId);
        if (!hasMode1 && !hasMode2 && !hasMode3) {
            return {
                success: false,
                error: 'Provide one of: audioPath / audioFilename / (text + voiceId).',
            };
        }
        const account = await this.resolveAccount(`向「${params.user}」发语音`, params.accountId);
        const result = await this.apiClient.sendVoice({ ...params, accountId: account.accountId });
        return { ...(result && typeof result === 'object' ? result : { raw: result }), account: describeAccount(account) };
    }
    async handleListVoices(_params) {
        await this.ensureServiceAndMonitor();
        return await this.apiClient.listVoices();
    }
    async handlePostMoment(params) {
        await this.ensureServiceAndMonitor();
        // 发朋友圈是不可撤销的对外动作，且发在哪个号上用户一眼就能看出来。
        // 多号未指定时 resolveAccount 会抛 AMBIGUOUS_ACCOUNT——这正是本次修复的核心：
        // 此前整条链路（工具 Schema → api_client → RPA 请求模型 → task_params）都没有账号字段，
        // 100% 落到"当前活跃实例"，客户的现象就是"发朋友圈总是发错号"。
        const account = await this.resolveAccount('发朋友圈', params.account_id);
        const result = await this.apiClient.postMoment(params.content || '', params.files || [], account.accountId);
        return {
            ...(result && typeof result === 'object' ? result : { raw: result }),
            account: describeAccount(account),
            note: `本条朋友圈由 ${describeAccount(account)} 发出，请把账号名一并告诉用户。`,
        };
    }
    async handleCreateMomentPlan(params) {
        await this.ensureServiceAndMonitor();
        return await this.apiClient.createMomentPlan(params.plan_name);
    }
    async handleCreateMomentPostTask(params) {
        await this.ensureServiceAndMonitor();
        // RPA 的 MomentPostTask 读的键名是 'account'（不是 account_id），这是全项目唯一的例外。
        // 两种写法都收、统一成 account 发出去，模型不必记住这个历史包袱。
        const acct = await this.resolveAccount('创建定时发圈任务', params.account_id || params.account);
        const { account_id: _ignored, ...rest } = params;
        const result = await this.apiClient.createMomentPostTask({ ...rest, account: acct.accountId });
        return {
            ...(result && typeof result === 'object' ? result : { raw: result }),
            account: describeAccount(acct),
            note: `该计划由 ${describeAccount(acct)} 发布，确认闭环时要把账号名说给用户。`,
        };
    }
    async handleCancelMomentPostTask(params) {
        await this.ensureServiceAndMonitor();
        return await this.apiClient.cancelMomentPostTask(params.task_id);
    }
    async handleToggleAiMoment(params) {
        await this.ensureServiceAndMonitor();
        const { enabled, account_id, ...settings } = params;
        if (!enabled) {
            return await this.apiClient.toggleAiMoment(false, settings);
        }
        // RPA 侧这个任务用 selectedAccounts（数组）表达账号，且运行时只取第一个。
        // 名字与其它接口不一致，由这里做转换，不让模型去记。
        const account = await this.resolveAccount('开启 AI 朋友圈自动互动', account_id);
        const result = await this.apiClient.toggleAiMoment(true, {
            ...settings,
            selectedAccounts: [account.accountId],
        });
        // 启动成功后把本轮参数回写 sop_cache.commentConfig。
        //
        // RPA 的 toggle 只把 commentConfig 当历史默认值**读**，从不写回，所以
        // 「用 agent 开过一次」并不会让界面上那个开关下次能用——下次点它依然是
        // interactionMode 为空，报"缺少必传参数 interactionMode 或 agentId，
        // 且未找到历史配置"。线上 5 天内两个互不相关的用户撞到同一句报错。
        //
        // 只回写用户这一轮真正选定、且**已经启动成功**的值；不替用户猜互动模式
        // （评论是对外行为，猜错就是替他在别人朋友圈下面说话）。
        const started = !result || typeof result !== 'object' || result.success !== false;
        if (started && settings.interactionMode) {
            try {
                const U = WeChatRPASkill.unwrap;
                let cache = {};
                try {
                    cache = U(await this.apiClient.getConfig('sop_cache')) || {};
                }
                catch { /* 首次配置，按空处理 */ }
                const commentConfig = { ...(cache.commentConfig || {}) };
                for (const [key, value] of Object.entries(settings)) {
                    if (value !== undefined)
                        commentConfig[key] = value;
                }
                await this.apiClient.updateConfig('sop_cache', { ...cache, commentConfig });
            }
            catch (e) {
                // 回写失败不影响本次已经跑起来的任务，只是界面开关下次仍需带参数。
                console.warn('[WeChatRPASkill] Failed to persist moment commentConfig:', e?.message || e);
            }
        }
        return {
            ...(result && typeof result === 'object' ? result : { raw: result }),
            account: describeAccount(account),
            note: `AI 朋友圈互动运行在 ${describeAccount(account)} 上（一次只能跑一个号）。`,
        };
    }
    /**
     * 自动回复总开关。三件事是这个 handler 存在的理由，不要精简掉：
     *
     * 1. **开启前先验有没有人接客**。RPA 侧允许在没有可用 AI助理时把开关打开，结果是
     *    "开着但一句不回"——用户看到的就是"配置成功却没生效"。这里直接拒绝并给出下一步。
     * 2. **把 RPA 的启动校验失败翻译成可自愈的动作**。未同步群聊是最常见的拒绝原因，
     *    且有确定解法（只同步群聊，不碰好友——好友同步约 2 分钟，一键配置用不上）。
     * 3. **失败时明确堵死手搓兜底**。缺了这个工具时模型会去 curl 本机 9922 并翻密钥文件。
     */
    async handleToggleAiSales(params) {
        await this.ensureServiceAndMonitor();
        // ⚠ 本工具**故意不收 account_id**。自动回复在 RPA 侧是全账号能力：
        // /api/chat/multi-monitor/start 遍历所有有效实例逐个校验后 start_monitoring_all()，
        // RPA 不提供"只开其中几个号的监听"。给它加账号参数等于承诺一个不存在的能力。
        //
        // 但正因为是全账号，作用域就必须说清楚：这里以前先取"当前活跃号"，
        // 只用那一个号的 staffList 做拦截，最后汇报「自动回复已开启（利生科教）」——
        // 实际启动的是全部号。用户据此以为只开了一个号。现在改成逐号校验、逐号汇报。
        const accounts = await this.listAccounts();
        if (!accounts.length)
            throw new NoActiveWeChatError();
        const scope = accounts.map(a => describeAccount(a)).join('、');
        if (params.enabled === false) {
            await this.apiClient.toggleAiSales(false);
            return {
                success: true,
                running: false,
                accounts: accounts.map(describeAccount),
                message: `已停止自动回复。这是全局开关，${accounts.length} 个已登录微信号（${scope}）都已停止。`,
            };
        }
        // 逐号检查有没有可用助理。只看活跃号会漏判：另一个号没配助理时，RPA 会整体拒绝启动，
        // 而模型若只查了活跃号就会把这条拒绝报成莫名其妙的失败。
        const U = WeChatRPASkill.unwrap;
        let pool = [];
        try {
            const d = U(await this.apiClient.getConfig('agents'));
            pool = Array.isArray(d) ? d : (Array.isArray(d?.agents) ? d.agents : []);
        }
        catch { /* 读不到就按空池处理，下面会把所有引用判成未登记 */ }
        const nameOf = (botId) => {
            if (!botId)
                return null;
            const hit = pool.find((a) => String(a?.botId) === String(botId) || String(a?.id) === String(botId));
            return hit ? String(hit.name || hit.botId) : null;
        };
        const perAccount = [];
        for (const a of accounts) {
            let staffList = [];
            try {
                const strategy = U(await this.apiClient.getConfig('reply_strategy_v2', a.accountId)) || {};
                staffList = Array.isArray(strategy?.staffList) ? strategy.staffList : [];
            }
            catch { /* 读不到按无助理处理，宁可拦下也不要假开 */ }
            const usable = staffList
                .filter((x) => x?.enabled === true && x?.agentId && nameOf(x.agentId))
                .map((x) => `${x.name}(${x.chatType === 'group' ? '微信群' : '微信私聊'}) → ${nameOf(x.agentId)}`);
            perAccount.push({ account: describeAccount(a), usable });
        }
        const naked = perAccount.filter(x => !x.usable.length);
        if (naked.length) {
            return {
                success: false,
                error: 'NO_USABLE_ASSISTANT',
                accounts: perAccount,
                message: naked.length === perAccount.length
                    ? '没有任何微信号配好可用的 AI助理（启用中、且绑定的智能体已登记），现在开启也不会回话，已拒绝开启。'
                    : `自动回复是全账号统一生效的，因此每个已登录微信号都要配好 AI助理。`
                        + `当前缺助理的号：${naked.map(x => x.account).join('、')}。`,
                next: '按 auto_config_sop 用 wechat_bind_agent 为上述账号建好并绑定 AI助理'
                    + '（默认单聊 chatType:"single"，注意 bind 时要带对应的 account_id），再回来调本工具。'
            };
        }
        // 未同步群聊既可能以 4xx 抛出，也可能以 200 + success:false 回来，两条路都要认。
        const groupNotSynced = (probe) => /未同步群聊|群聊.{0,6}未同步|超\s*\d+\s*天未同步/.test(probe);
        const syncHint = `对报未同步的号逐个调 wechat_sync_contacts({ type: "group", account_id: "<该号的 account_id>" })`
            + `（每个号约1分钟；**只同步群聊，不要同步好友**，好友同步很慢且一键配置用不到），完成后重调本工具。`;
        let res;
        try {
            res = await this.apiClient.toggleAiSales(true);
        }
        catch (e) {
            const raw = String(e?.message || e);
            if (groupNotSynced(raw)) {
                return { success: false, error: 'GROUP_NOT_SYNCED', accounts: perAccount, message: `RPA 拒绝启动：有微信号的群聊尚未同步。${raw}`, next: syncHint };
            }
            return {
                success: false,
                error: 'START_FAILED',
                accounts: perAccount,
                message: toUserFacingRpaError(raw),
                next: '把这条错误原样转达用户并给修复建议。禁止改用 shell_exec/web_fetch 去调 RPA 的 HTTP 接口，也禁止翻找 API Key——那条路不通且不安全。'
            };
        }
        if (res && (res.success === false || res.status === 'error')) {
            const probe = JSON.stringify(res);
            if (groupNotSynced(probe)) {
                return { success: false, error: 'GROUP_NOT_SYNCED', accounts: perAccount, message: `RPA 拒绝启动：${res?.message || '有微信号的群聊尚未同步。'}`, next: syncHint };
            }
            return {
                success: false,
                error: 'START_REJECTED',
                accounts: perAccount,
                // RPA 在拒绝时会给出 blocked_accounts / message（点名是哪个号不达标）——
                // 必须原样带出来，否则用户要在几个号之间盲目排查。
                blockedAccounts: res?.blocked_accounts ?? null,
                message: res?.message || '',
                detail: res,
                next: '把 message 和 blockedAccounts 原样转达用户，不要自行绕过。',
            };
        }
        // 以 RPA 自己的开关状态为准复核一次，避免"调用返回成功但其实没跑起来"。
        let running = 'unknown';
        try {
            const features = WeChatRPASkill.unwrap(await this.apiClient.getFeaturesStatus()) || [];
            running = features.find((x) => x?.feature === 'multi_chat_monitor')?.enabled === true;
        }
        catch { /* 状态读不到就如实报 unknown，不要假定已开 */ }
        return {
            success: true,
            running,
            accounts: perAccount,
            message: running === true
                ? `自动回复已开启，覆盖 ${accounts.length} 个已登录微信号（${scope}）。`
                    + `这是全局开关，RPA 不支持只开其中部分账号——转述时要说清楚覆盖范围。`
                : `启动指令已下发，但 RPA 开关状态尚未确认为「运行中」，请调 wechat_get_effective_agents 复核后再向用户下结论——不要直接说已开启。`
        };
    }
    async handleMassSending(params, signal, context) {
        const sessionId = context?.sessionId || 'unknown';
        const subjectId = context?.userId || 'anonymous';
        const traceId = context?.traceId || '';
        const confirmationId = String(params.confirmationId || '').trim();
        // 阶段二：只兑现第一阶段锁定的计划，不接受本轮偷偷改参数。
        if (confirmationId || params.confirmed === true) {
            if (!confirmationId || params.confirmed !== true) {
                return { success: false, error: '群发必须同时提供 confirmationId 和 confirmed=true。' };
            }
            const record = this.massSendingConfirmations.get(confirmationId);
            if (!record || record.expiresAt < Date.now()) {
                this.massSendingConfirmations.delete(confirmationId);
                return { success: false, error: '群发确认已缺失或过期，请重新生成预览。' };
            }
            if (record.sessionId !== sessionId) {
                return { success: false, error: '群发确认属于另一个会话，不能跨会话使用。' };
            }
            if (record.subjectId !== subjectId) {
                return { success: false, error: '群发确认属于另一位用户，不能代替其确认。' };
            }
            if (!traceId || traceId === record.issuedTraceId) {
                return {
                    success: false,
                    error: '不能在生成群发预览的同一轮里确认执行；请先把预览展示给用户并等待下一条消息。',
                };
            }
            if (signal?.aborted) {
                throw signal.reason instanceof Error
                    ? signal.reason
                    : new Error(String(signal.reason || 'mass sending aborted'));
            }
            // 一次性令牌必须在副作用前消费；网络超时后的自动重试不能重复创建群发任务。
            this.massSendingConfirmations.delete(confirmationId);
            await this.ensureServiceAndMonitor({ signal });
            const result = await this.apiClient.massSending(record.plan.params);
            return {
                ...(result && typeof result === 'object' ? result : { raw: result }),
                account: describeAccount(record.plan.account),
                interval: {
                    resolved_seconds: record.plan.interval.wire,
                    human: record.plan.interval.human,
                },
                ...(record.plan.warning ? { warning: record.plan.warning } : {}),
                confirmed_preview: true,
                note: `已按用户确认的预览提交群发：${describeAccount(record.plan.account)}，${record.plan.interval.human}。`,
            };
        }
        // 阶段一：本分支绝不调用 massSending，只生成并锁定预览。
        const tags = Array.from(new Set((Array.isArray(params.tags) ? params.tags : [])
            .map((value) => String(value || '').trim())
            .filter(Boolean)));
        const targets = Array.from(new Set((Array.isArray(params.targets) ? params.targets : [])
            .map((value) => String(value || '').trim())
            .filter(Boolean)));
        if (tags.length === 0 && targets.length === 0) {
            return { success: false, error: '群发预览需要至少一个 tags 或 targets。' };
        }
        const text = typeof params.text === 'string' ? params.text : '';
        const greetingGroup = typeof params.greeting_group === 'string' ? params.greeting_group.trim() : '';
        if (Boolean(text.trim()) === Boolean(greetingGroup)) {
            return { success: false, error: 'text 和 greeting_group 必须二选一，且只能提供一个。' };
        }
        let interval;
        try {
            interval = parseSendInterval(params.send_interval || '3-8s');
        }
        catch (e) {
            return { success: false, error: String(e?.message || e) };
        }
        if (params.send_interval?.trim() && !interval.explicitUnit) {
            return {
                success: false,
                error: `send_interval「${params.send_interval}」没有单位，已在调用 RPA 前拦截。`
                    + `请明确写成秒/分钟/小时，例如 15-18s 或 15-18分钟；不要自行猜测。`,
                code: 'SEND_INTERVAL_UNIT_REQUIRED',
            };
        }
        if (!traceId || !context?.sessionId) {
            return { success: false, error: '当前调用缺少可验证的会话/轮次信息，不能签发群发确认。' };
        }
        if (signal?.aborted) {
            throw signal.reason instanceof Error
                ? signal.reason
                : new Error(String(signal.reason || 'mass sending aborted'));
        }
        await this.ensureServiceAndMonitor({ signal });
        // 群发一次动辄几十上百条对外消息，用错号的代价远高于多问一句；预览时就锁定账号。
        const account = await this.resolveAccount('群发消息', params.account_id);
        const hasUnresolvedTags = tags.length > 0;
        const warning = rateLimitWarning(interval, targets.length, hasUnresolvedTags);
        const token = randomUUID();
        // 清掉过期预览并设硬上限，避免长期运行进程被废弃令牌撑大。
        const now = Date.now();
        for (const [id, record] of this.massSendingConfirmations) {
            if (record.expiresAt < now)
                this.massSendingConfirmations.delete(id);
        }
        while (this.massSendingConfirmations.size >= 200) {
            const oldest = this.massSendingConfirmations.keys().next().value;
            if (!oldest)
                break;
            this.massSendingConfirmations.delete(oldest);
        }
        const rpaParams = {
            ...(tags.length > 0 ? { tags } : {}),
            ...(targets.length > 0 ? { targets } : {}),
            ...(text.trim() ? { text } : { greeting_group: greetingGroup }),
            ...(params.schedule_time ? { schedule_time: params.schedule_time } : {}),
            ...(params.batch_size !== undefined ? { batch_size: params.batch_size } : {}),
            send_interval: interval.wire,
            account_id: account.accountId,
        };
        this.massSendingConfirmations.set(token, {
            sessionId,
            subjectId,
            issuedTraceId: traceId,
            expiresAt: now + 10 * 60_000,
            plan: {
                params: rpaParams,
                account,
                interval,
                ...(warning ? { warning } : {}),
                explicitTargetCount: targets.length,
                hasUnresolvedTags,
            },
        });
        return {
            success: true,
            preview_only: true,
            task_created: false,
            requires_user_confirmation: true,
            confirmationId: token,
            expires_in_seconds: 600,
            preview: {
                account: describeAccount(account),
                target_scope: {
                    tags,
                    targets,
                    explicit_target_count: targets.length,
                    exact_total_known: !hasUnresolvedTags,
                    note: hasUnresolvedTags ? '标签将在 RPA 执行时展开，预览阶段无法确定最终去重人数。' : undefined,
                },
                content: text.trim()
                    ? { type: 'text', text }
                    : { type: 'greeting_group', greeting_group: greetingGroup },
                schedule_time: params.schedule_time || '立即执行',
                interval: {
                    requested: params.send_interval || '默认 3-8s',
                    resolved_seconds: interval.wire,
                    human: interval.human,
                },
            },
            ...(warning ? { warning } : {}),
            instruction: '这只是预览，尚未创建任何 RPA 任务。逐项展示给用户并等待下一条消息明确确认；之后只传 confirmationId + confirmed=true。',
        };
    }
    async handleUpdateRpaPlugin() {
        assertRpaRuntimeAllowed();
        const r = await this.serviceManager.updatePlugin();
        if (r.upToDate)
            return { success: true, upToDate: true, message: `RPA 插件已是最新版 ${r.currentVersion}，无需更新。` };
        if (r.updated)
            return { success: true, updated: true, message: `RPA 插件已从 ${r.fromVersion} 升级到 ${r.toVersion}。` };
        return { success: false, error: r.error || '更新失败' };
    }
    async handleGetTaskLogs(params) {
        const logs = await this.dataManager.getTaskLogs(params.task_type, params.limit);
        return {
            total_returned: logs.length,
            note: 'This tool returns the most recent logs. For full logs, read the JSONL file directly using filesystem tools.',
            logs: logs
        };
    }
    async handleFetchLatestMessages(params) {
        await this.ensureServiceAndMonitor();
        // 多号时读错号 = 读到另一个号跟同名好友的聊天，内容看着像真的，最难发现。
        const account = await this.resolveAccount(`读取「${params.sessionName}」的当前窗口消息`, params.accountId);
        const result = await this.apiClient.getChatMessages(params.sessionName, account.accountId);
        // Filter redundant fields from messages
        if (result && result.messages && Array.isArray(result.messages)) {
            result.messages = result.messages.map((msg) => {
                const { rect_info, isGroup, id, isTimeMessage, ...rest } = msg;
                return rest;
            });
        }
        return { ...(result && typeof result === 'object' ? result : { raw: result }), account: describeAccount(account) };
    }
    async handleGetTasks() {
        await this.ensureServiceAndMonitor();
        return await this.apiClient.getTasks();
    }
    async handleDiagnoseRpa(_params, _signal, context) {
        const sessionId = context?.sessionId || 'unknown';
        const traceId = context?.traceId || '';
        const now = Date.now();
        // The process-external Supervisor is authoritative for runtime recovery. Older RPA
        // packages do not expose 9921, so the existing diagnostics below remain as fallback.
        const supervisorStatus = await this.supervisorClient.getStatus();
        let reachable = false;
        let healthCheckAttempts = 0;
        // 服务不可达属于强结论，单次瞬时失败不够。失败时最多重试三次；
        // 任意一次成功即认为服务可达，避免因机器短暂卡顿误报。
        for (let attempt = 1; attempt <= 3; attempt += 1) {
            healthCheckAttempts = attempt;
            if (await this.apiClient.checkHealth({ discover: true })) {
                reachable = true;
                break;
            }
            if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        let backendStatus = null;
        let diagnosticError = null;
        if (reachable) {
            try {
                backendStatus = await this.apiClient.getBackendStatus();
            }
            catch (error) {
                diagnosticError = error?.message || String(error);
            }
        }
        const runtime = backendStatus?.runtime || {};
        const readiness = backendStatus?.payload || {};
        const backendCode = typeof backendStatus?.code === 'string'
            ? backendStatus.code
            : null;
        const permission = runtime.permission || {};
        const scheduler = runtime.scheduler || {};
        const hasRuntimeDiagnostics = !!(runtime.permission &&
            runtime.scheduler &&
            Object.prototype.hasOwnProperty.call(permission, 'current_task_id'));
        const holder = typeof permission.current_task_id === 'string'
            ? permission.current_task_id
            : null;
        const currentTaskType = typeof permission.current_task_type === 'string'
            ? permission.current_task_type
            : 'unknown';
        const queueSize = Number(permission.queue_size || 0);
        const lastProgressAge = Number(permission.last_progress_age_seconds || 0);
        const holderAge = Number(permission.holder_age_seconds || 0);
        const staleThresholdSeconds = ['add_friend', 'friend_request'].includes(currentTaskType)
            ? 10 * 60
            : 20 * 60;
        const progressFingerprint = JSON.stringify({
            stage: permission.current_stage ?? null,
            progress: permission.current_progress ?? null,
        });
        const schedulerFingerprint = JSON.stringify({
            state: scheduler.state ?? null,
            startupGuardActive: scheduler.startup_guard_active ?? null,
            reconciliationCompleted: scheduler.reconciliation_completed ?? null,
        });
        const previous = this.diagnosticSamples.get(sessionId);
        const comparableSample = !!(previous &&
            holder &&
            previous.holder === holder &&
            now - previous.sampledAt >= 60_000);
        const unchangedAcrossSamples = !!(comparableSample && previous?.progressFingerprint === progressFingerprint);
        const schedulerUnchangedAcrossSamples = !!(previous &&
            now - previous.sampledAt >= 60_000 &&
            previous.schedulerFingerprint === schedulerFingerprint);
        this.diagnosticSamples.set(sessionId, {
            sampledAt: now,
            holder,
            progressFingerprint,
            schedulerFingerprint,
        });
        let assessment = 'healthy_idle';
        const evidence = [];
        if (supervisorStatus?.status === 'starting' || supervisorStatus?.status === 'recovering') {
            // `starting` 不带时间维度，可以无限期挂着。
            //
            // RPA v1.9.10 的健康循环里有个死区：HTTP 探针和心跳**只丢了一个**时，
            // advance_liveness_failure_count 归零，于是既不把状态推进到 degraded、
            // 也不重启 Worker（restart_count 因此停在 0/3）。状态就停在 spawn 时设的
            // starting 不动了。而 SOP 又规定 self_recovering 期间禁止提重启 —— 死锁。
            //
            // Supervisor 的 snapshot 里有 worker_started_at / recovery_started_at，
            // 用它把"刚起来"和"卡在死区"分开。判不出来（旧版没这两个字段）就不判。
            const stalledSeconds = supervisorStartingSeconds(supervisorStatus, now);
            const stalled = stalledSeconds !== null && stalledSeconds >= WORKER_STARTING_STALL_SECONDS;
            assessment = stalled ? 'recovery_stalled' : 'self_recovering';
            evidence.push(`RPA Supervisor status: ${supervisorStatus.status}`);
            evidence.push(supervisorStatus.message || 'RPA Worker is recovering automatically');
            evidence.push(`restart attempts: ${supervisorStatus.restart_count || 0}/${supervisorStatus.max_restarts || 0}`);
            if (stalledSeconds !== null) {
                evidence.push(`worker has been in "${supervisorStatus.status}" for ${stalledSeconds}s`);
            }
            if (stalled) {
                evidence.push(`exceeded the ${WORKER_STARTING_STALL_SECONDS}s startup budget; the Supervisor decides by ~105s, so a Worker still parked here is in the half-alive dead zone and will neither advance nor restart on its own`);
            }
        }
        else if (supervisorStatus?.status === 'degraded') {
            assessment = 'supervisor_degraded';
            evidence.push('RPA Supervisor is confirming a degraded health signal');
            evidence.push(supervisorStatus.reason_code || 'no reason code');
            evidence.push(supervisorStatus.message || 'RPA is temporarily degraded');
        }
        else if (supervisorStatus?.status === 'action_required') {
            assessment = 'action_required';
            evidence.push(supervisorStatus.reason_code || 'WECHAT_LOGIN_REQUIRED');
            // 用本地按 reason_code 分流的文案，不用 supervisorStatus.message：
            // 老版本 RPA 插件对所有码都只发「微信需要人工登录或重新连接」。
            // 2026-09-06 的线上 trace 里 evidence 就是
            // ["WECHAT_INSTANCE_NOT_FOUND", "微信需要人工登录或重新连接"]——
            // 两条证据自相矛盾，模型只能照着后者把用户往扫码上引。
            evidence.push(rpaActionRequiredMessage(supervisorStatus));
        }
        else if (supervisorStatus?.status === 'failed') {
            assessment = 'recovery_failed';
            evidence.push(supervisorStatus.reason_code || 'RECOVERY_RETRY_EXHAUSTED');
            evidence.push(supervisorStatus.message || 'RPA automatic recovery failed');
            evidence.push(`restart attempts: ${supervisorStatus.restart_count || 0}/${supervisorStatus.max_restarts || 0}`);
        }
        else if (!reachable) {
            assessment = 'service_unreachable';
            evidence.push('RPA HTTP health check failed');
        }
        else if (['WECHAT_NOT_INITIALIZED', 'WECHAT_NOT_RUNNING'].includes(backendCode || '')) {
            assessment = backendCode === 'WECHAT_NOT_RUNNING'
                ? 'wechat_not_running'
                : 'wechat_not_initialized';
            evidence.push('RPA HTTP service is reachable');
            evidence.push(backendStatus?.message || 'No initialized WeChat instance');
        }
        else if (diagnosticError) {
            assessment = 'diagnostics_unavailable';
            evidence.push('RPA HTTP service is reachable');
            evidence.push(diagnosticError);
        }
        else if (!hasRuntimeDiagnostics) {
            assessment = 'diagnostics_unsupported';
            evidence.push('RPA HTTP service is reachable');
            evidence.push('RPA backend does not expose scheduler/permission diagnostics');
        }
        else if (scheduler.startup_guard_active && !scheduler.reconciliation_completed) {
            evidence.push('scheduler startup guard is active and reconciliation is incomplete');
            if (schedulerUnchangedAcrossSamples) {
                assessment = 'scheduler_not_reconciled';
                evidence.push('scheduler reconciliation state is unchanged across samples at least 60s apart');
            }
            else {
                assessment = 'scheduler_reconciling';
                evidence.push('one snapshot is insufficient; sample again after at least 60s');
            }
        }
        else if (holder) {
            assessment = 'busy_unverified';
            evidence.push(`permission holder: ${holder}`);
            evidence.push(`task type: ${currentTaskType}`);
            evidence.push(`queued requests: ${queueSize}`);
            evidence.push(`last progress age: ${lastProgressAge}s`);
            evidence.push(`stale threshold: ${staleThresholdSeconds}s`);
            const progressInstrumented = [
                'add_friend',
                'friend_request',
                'moment_comment',
                'mass_sending',
            ].includes(currentTaskType);
            if (progressInstrumented &&
                queueSize > 0 &&
                lastProgressAge >= staleThresholdSeconds &&
                unchangedAcrossSamples) {
                assessment = 'suspected_stalled';
                evidence.push('same holder and unchanged progress across samples at least 60s apart');
            }
            else if (lastProgressAge < staleThresholdSeconds) {
                assessment = 'busy_with_recent_progress';
            }
            else if (!progressInstrumented) {
                // 这一类没有业务进度埋点，所以"已经跑了多久"不能用来判卡死：群发、
                // 加好友这类任务正常就可能连续跑几小时，按时长升级成 suspected_stalled
                // 会把健康的长任务误杀。这里刻意不升级、不进 restartCandidate，
                // 只把事实摆全，由用户判断这个任务是否本该早已结束。
                assessment = 'busy_uninstrumented';
                evidence.push(`task type "${currentTaskType}" has no business progress instrumentation`);
                evidence.push('long-running is normal for this type; elapsed time alone cannot prove a stall');
                evidence.push(`holder age: ${holderAge}s`);
            }
            else if (!comparableSample) {
                evidence.push('one snapshot is insufficient; sample again after at least 60s');
            }
        }
        const restartCandidate = assessment === 'recovery_failed' || assessment === 'recovery_stalled' || (!supervisorStatus && [
            'service_unreachable',
            'scheduler_not_reconciled',
            'suspected_stalled',
        ].includes(assessment));
        // 版本是只读证据：以 RPA 报的运行版本为准。缺了它，模型面对「旧插件已知问题」
        // 只能靠猜——2026-09-12 线上就因此建议用户把微信降级，而修复当天早上就发布了。
        const pluginVersions = await this.serviceManager.readPluginVersions().catch(() => null);
        if (pluginVersions?.updateAvailable) {
            evidence.push(`RPA 插件有新版本：运行中 ${pluginVersions.running || pluginVersions.installed || '未知'}`
                + ` → 最新 ${pluginVersions.latest}（升级用 update_rpa_plugin，需先征得用户同意）`);
        }
        if (pluginVersions?.running && pluginVersions.installed
            && pluginVersions.running !== pluginVersions.installed) {
            evidence.push(`插件安装记录与运行版本不一致：运行中 ${pluginVersions.running}，安装记录 ${pluginVersions.installed}`);
        }
        // 诊断结论是建议，不应覆盖用户在后续轮次的明确选择。因此只要
        // trace 可验证，就签发短时 ID；recommended=false 时 Agent 不主动推荐，
        // 但用户仍可明确要求重启。
        const confirmationId = traceId ? randomUUID() : null;
        if (confirmationId && traceId) {
            this.restartConfirmations.set(confirmationId, {
                sessionId,
                issuedTraceId: traceId,
                expiresAt: now + 10 * 60_000,
            });
        }
        return {
            success: reachable,
            assessment,
            evidence,
            health_check_attempts: healthCheckAttempts,
            service: { reachable },
            supervisor: supervisorStatus ? {
                reachable: true,
                status: supervisorStatus.status,
                reason_code: supervisorStatus.reason_code ?? null,
                message: supervisorStatus.message || '',
                worker_pid: supervisorStatus.worker_pid ?? null,
                worker_generation: supervisorStatus.worker_generation ?? null,
                restart_count: supervisorStatus.restart_count ?? 0,
                max_restarts: supervisorStatus.max_restarts ?? 0,
                last_event_id: supervisorStatus.last_event_id ?? null,
            } : { reachable: false },
            plugin: pluginVersions,
            wechat: {
                state: readiness.current_state ?? null,
                instances_total: readiness.instances_total ?? null,
                instances_initialized: readiness.instances_initialized ?? null,
                next_action: readiness.next_action ?? null,
            },
            scheduler,
            permission,
            task_count: Array.isArray(backendStatus?.tasks) ? backendStatus.tasks.length : null,
            restart: {
                requires_user_confirmation: true,
                recommended: restartCandidate,
                confirmationId,
                expires_in_seconds: confirmationId && traceId ? 600 : null,
                instruction: assessment === 'recovery_stalled'
                    ? 'Worker 已超出启动预算仍未就绪，Supervisor 不会自己救它。把已卡住的时长讲给用户，并询问是否重启 Worker；等待用户下一条消息。不要让用户"再等等"。'
                    : restartCandidate
                        ? '说明证据并询问是否重启；等待用户下一条消息。'
                        : assessment === 'self_recovering' || assessment === 'supervisor_degraded'
                            ? 'RPA 正在自行检测或恢复；不要要求用户重启。稍后重试原操作并再次检查 Supervisor 状态。'
                            : assessment === 'action_required'
                                // 【不要】在这里罗列"登录/扫码"这类具体动作。只有
                                // WECHAT_LOGIN_REQUIRED 才该让用户扫码；换成
                                // WECHAT_INSTANCE_NOT_FOUND / _LOST 时该做的是"把那个微信窗口重新打开"，
                                // 让用户去扫码是纯浪费——他的微信开着也登录着。
                                // 具体该做什么已经在 evidence 的第二条里按 reason_code 给全了。
                                ? '不要重启 RPA。把 evidence 里那条按 reason_code 给出的处置说明原样转达给用户，不要自行改写成登录/扫码之类的具体动作。'
                                : assessment === 'wechat_not_initialized' || assessment === 'wechat_not_running'
                                    ? 'RPA服务可达，不能说卡死；立即调用 wechat_initialize（禁止 auto_config=true），成功后再次诊断。'
                                    : assessment === 'busy_uninstrumented'
                                        ? '不得判定卡死，也不得主动推荐重启。如实告知三件事：有任务正持有执行权、已持有多久、该类型无进度埋点所以无法区分"正常长任务"和"卡死"。再请用户确认这个任务是否本该早已结束——只有用户明确要求时才可重启。'
                                        : '不主动推荐；不得用早于本次健康检查的旧日志推翻实时结论。用户后续明确要求时可重启。',
            },
        };
    }
    async handleRestartRpa(params, _signal, context) {
        if (params.confirmed !== true) {
            return { success: false, error: 'Explicit user confirmation is required.' };
        }
        const record = this.restartConfirmations.get(params.confirmationId);
        const sessionId = context?.sessionId || 'unknown';
        const traceId = context?.traceId || '';
        if (!record || record.expiresAt < Date.now()) {
            this.restartConfirmations.delete(params.confirmationId);
            return { success: false, error: 'Restart confirmation is missing or expired. Diagnose again.' };
        }
        if (record.sessionId !== sessionId) {
            return { success: false, error: 'Restart confirmation belongs to a different session.' };
        }
        if (!traceId || traceId === record.issuedTraceId) {
            return {
                success: false,
                error: 'Restart cannot run in the diagnosis turn. Ask the user and wait for a later turn.',
            };
        }
        // One-shot token: consume before side effects so retries cannot restart twice.
        this.restartConfirmations.delete(params.confirmationId);
        const result = await this.restartWorker();
        const reachableAfterRestart = await (MAIN_OWNED_MACOS_RPA()
            ? this.apiClient.checkAuthenticatedHealth({ discover: true })
            : this.apiClient.checkHealth({ discover: true }));
        let wechatReadyAfterRestart = null;
        let nextAction = null;
        if (reachableAfterRestart) {
            try {
                const status = await this.apiClient.getBackendStatus();
                if (status?.success === true) {
                    wechatReadyAfterRestart = true;
                }
                else if (['WECHAT_NOT_INITIALIZED', 'WECHAT_NOT_RUNNING'].includes(status?.code)) {
                    wechatReadyAfterRestart = false;
                    nextAction = status?.payload?.next_action ?? null;
                }
            }
            catch {
                // Service reachability is already known; an unsupported diagnostic endpoint
                // must not be reported as a failed restart.
            }
        }
        return {
            ...result,
            reachable_after_restart: reachableAfterRestart,
            wechat_ready_after_restart: wechatReadyAfterRestart,
            next_action: nextAction,
            instruction: !reachableAfterRestart
                ? '重启后服务仍不可达，不能报告重启成功。'
                : wechatReadyAfterRestart === false
                    ? '仅RPA服务重启成功；微信未初始化，按 next_action 引导。'
                    : wechatReadyAfterRestart === true
                        ? 'RPA服务已重启，微信实例已初始化。'
                        : 'RPA服务已重启，但微信实例状态未确认；不要声称全部功能正常。',
        };
    }
    /**
     * 最近一次成功读到的在线账号列表。**只在实例列表读不出来时**用作降级依据，
     * 绝不用于正常路径的选号。
     *
     * 曾经把它做成 15 秒 TTL 的缓存来省那次查询，结果引入了本次要修的同一类 bug：
     * 用户刚登录第二个号，缓存里还是"只有一个号"，于是自动填了旧号——静默发错。
     * 而省下来的不过是一次 localhost 往返（/api/health + /api/instances/active，几毫秒），
     * 拿正确性换它是亏的。所以正常路径一律取实时值。
     */
    lastKnownAccounts = null;
    /**
     * 列出当前在线（已登录 + 已初始化 + 未退出托管）的微信号。
     *
     * 一次没拿到就尝试 initialize 再问一遍：用户刚开客户端时 RPA 可能还没绑定实例，
     * 直接报"没有微信"会把一个自愈得了的状态说成故障。
     * ⚠ initialize 是重操作（RPA 要遍历窗口做 UIA 初始化），所以只在**确实一个号都没有**时才做。
     */
    async listAccounts() {
        let accounts = parseInstances(await this.apiClient.getActiveInstances());
        if (!accounts.length) {
            try {
                await this.apiClient.initialize();
            }
            catch { /* 由下游的 NO_ACTIVE_WECHAT 兜底报错 */ }
            accounts = parseInstances(await this.apiClient.getActiveInstances());
        }
        if (accounts.length)
            this.lastKnownAccounts = accounts;
        return accounts;
    }
    /**
     * 解析一次账号级操作的目标账号。
     *
     * 三条独立的失败必须分开报,不能合并成一句"没有可用账号"：
     *  - 一个号都没有 → 让用户去登录微信（环境问题）；
     *  - 有多个号但没指定 → 让用户在候选里选一个（决策问题）；
     *  - 指定的号不在线 → 多半是拿错了账号来源（用法问题）。
     * 给错指引用户就会去做无用功。
     *
     * 这里**故意不兜底挑一个号**。挑错号 = 用错微信身份给客户发消息/发朋友圈,
     * 不可撤销；而"当前活跃实例"只反映 RPA 界面最后停在哪个号上,与用户意图无关。
     *
     * 单账号用户（绝大多数）在这条路径上感知为零：只有一个号时自动采用，不追问、不报错。
     */
    async resolveAccount(op, requested) {
        let accounts;
        try {
            accounts = await this.listAccounts();
        }
        catch (e) {
            return this.resolveAccountAfterLookupFailure(op, requested, e);
        }
        return pickAccount(op, requested, accounts);
    }
    /**
     * 连实例列表都读不出来时（RPA 接口抖动/服务刚起来）怎么办。
     *
     * 关键是**不能比修复前更容易失败**：改动前 `wechat_send_message` 压根不查实例列表，
     * 不传账号就由 RPA 自己解析活跃实例，照发不误。如果现在因为多查了一次而把发送拦下，
     * 等于为了多开场景牺牲了单账号用户的可用性。所以按确定性从高到低降级：
     */
    resolveAccountAfterLookupFailure(op, requested, cause) {
        // 1) 调用方明确指定了号 → 照用。校验不了不等于要拦下来，真传错了 RPA 会自己报错。
        if (requested) {
            const id = String(requested).trim();
            return { accountId: id, nickname: id, source: 'explicit' };
        }
        // 2) 上次读到时只有一个号 → 用它。这条只在接口**已经挂了**时才会走到，
        //    此时的选择是"用一份陈旧快照"还是"把一次本来能成功的发送直接拦下"。
        //    单账号场景本就不存在选错号的风险，拦下才是更差的结果。
        const stale = this.lastKnownAccounts;
        if (stale?.length === 1) {
            return { accountId: stale[0].accountId, nickname: stale[0].nickname, source: 'sole' };
        }
        // 3) 多号或完全没有历史 → 只能失败。但要如实说是"读不到实例列表"，
        //    不能套用 NO_ACTIVE_WECHAT 的"请先登录微信"话术——那会把用户支去做无用功。
        throw new Error(`ACCOUNT_LOOKUP_FAILED: 无法读取当前微信实例列表，因此无法确定「${op}」该用哪个号：`
            + `${cause?.message || cause}。请先用 wechat_diagnose_rpa 确认 RPA 服务状态，或让用户直接指明用哪个微信号。`);
    }
    async handleListInstances() {
        await this.ensureServiceAndMonitor();
        const accounts = await this.listAccounts();
        return {
            total: accounts.length,
            accounts: accounts.map(a => ({
                accountId: a.accountId,
                nickname: a.nickname,
                isActive: a.isActive,
            })),
            note: accounts.length > 1
                ? '本机登录了多个微信号。所有账号级操作(发消息/发圈/群发/改AI助理配置)都必须带上 account_id，'
                    + '且应由用户决定用哪个——isActive 只表示 RPA 界面最后停在哪个号，不代表用户想用它。'
                : '本机只有一个在线微信号，账号级工具可以省略 account_id。',
        };
    }
    async handleUpdateConfig(params) {
        await this.ensureServiceAndMonitor();
        // 全局配置(agents/greeting_config/chat_history_settings…)三个号共用一份，
        // 强行要求选号只会让用户困惑；账号级配置才需要定位到具体号。
        const scoped = isAccountScopedConfig(params.config_type);
        const account = scoped
            ? await this.resolveAccount(`写入配置 ${params.config_type}`, params.account_id)
            : null;
        const result = await this.apiClient.updateConfig(params.config_type, params.data, account?.accountId);
        return {
            ...(result ?? {}),
            targetAccount: account ? describeAccount(account) : null,
            scope: scoped ? 'account' : 'global',
            note: scoped
                ? `已写入账号 ${describeAccount(account)} 的配置，请把账号名复述给用户确认是不是他要配的号。`
                : `「${params.config_type}」是全局配置，本次修改对所有已登录微信号同时生效——转述时要说清楚这一点。`,
        };
    }
    // ===== 转人工配置 =====
    /**
     * 读/写转人工配置。
     *
     * 为什么值得一个专用工具，而不是让模型自己 get_config + update_config：
     * 1. **嵌套**：`chat_history_settings` 落盘结构是 `{ chat_history_settings: {...} }`，
     *    少一层或多一层都写成一个 RPA 永远读不到的文件（静默失效）。
     * 2. **同文件里还有别的设置**（autoSave/contextCount/messageMerge…），整体覆写会抹掉它们。
     * 3. **`notSendToCustomer` 不是后端字段**：RPA 界面勾选它做的事是把触发词同步进
     *    `reply_strategy_v2.commonConfig.filterWords`。只写这个布尔值等于什么都没做。
     * 4. 触发词写坏的代价很高：命中即**挂起会话**（AI 从此不再回这个客户，须人工解除），
     *    所以"稍等"这类高频口语必须挡在写入前。
     */
    async handleConfigureTransfer(params) {
        await this.ensureServiceAndMonitor();
        const U = WeChatRPASkill.unwrap;
        const rawFile = U(await this.apiClient.getConfig('chat_history_settings')) || {};
        // 文件既可能是 { chat_history_settings: {...} }（正常），也可能被写扁过；两种都认。
        const settings = (rawFile && typeof rawFile === 'object' && typeof rawFile.chat_history_settings === 'object' && rawFile.chat_history_settings)
            ? { ...rawFile.chat_history_settings }
            : { ...rawFile };
        const current = { ...(settings.transferConfig || {}) };
        const oldPhrases = Array.isArray(current.phrases) ? current.phrases.map(String) : [];
        const readOnly = params?.phrases === undefined
            && params?.notifyWechat === undefined
            && params?.notSendToCustomer === undefined;
        const describe = (cfg, phrases) => ({
            phrases,
            notifyWechat: cfg.notifyWechat || '',
            notSendToCustomer: cfg.notSendToCustomer === true,
            howItWorks: '唯一触发方式：AI回复正文里出现上面任一触发词（子串匹配）。命中后该会话被挂起（AI 不再回复该客户，需在 RPA「AI对话 → 挂起」解除，或手机端给文件传输助手发"解除挂起"），并给 notifyWechat / 飞书发通知。',
            caveat: 'agentic 子 Agent 的 action=defer 在 RPA 侧被降级为"不回复"，不会转人工，也不会通知任何人——别依赖它。'
        });
        if (readOnly) {
            return {
                success: true,
                configured: oldPhrases.length > 0,
                ...describe(current, oldPhrases),
                ...(oldPhrases.length ? {} : { warning: '还没有配置任何转人工触发词 → 当前无论 AI 回什么都不会转人工。' })
            };
        }
        const warnings = [];
        let phrases = oldPhrases;
        if (params.phrases !== undefined) {
            if (!Array.isArray(params.phrases))
                return { success: false, error: 'phrases 必须是字符串数组。' };
            const seen = new Set();
            const cleaned = [];
            for (const raw of params.phrases) {
                const p = String(raw ?? '').trim();
                if (!p)
                    continue;
                if (/\s/.test(p))
                    return { success: false, error: `触发词「${p}」含空白字符。RPA 按原样子串匹配，带空格的词几乎不可能命中，请去掉。` };
                if (p.length < 2)
                    return { success: false, error: `触发词「${p}」太短（<2 字），会被正常回复误命中并把会话挂起。` };
                if (p.length > 20)
                    return { success: false, error: `触发词「${p}」太长（>20 字），模型很难原样复述，改用「转人工」这类短词。` };
                if (seen.has(p))
                    continue;
                seen.add(p);
                cleaned.push(p);
            }
            if (!cleaned.length)
                return { success: false, error: '至少要留一个有效触发词；要彻底关闭转人工请让用户在 RPA 界面自己清空。' };
            if (cleaned.length > 3) {
                warnings.push(`RPA 界面最多显示 3 个触发词，已截断为前 3 个（丢弃：${cleaned.slice(3).join('、')}）。`);
            }
            phrases = cleaned.slice(0, 3);
            // 高频客服口语当触发词 = 一开口就把会话挂起，是最典型的"配完就废"事故。
            const RISKY = /^(稍等|等等|等一下|好的|在的|您好|你好|收到|马上|请稍候|人工|客服|同事)$/;
            for (const p of phrases) {
                if (RISKY.test(p)) {
                    warnings.push(`⚠️ 触发词「${p}」是客服高频口语，正常寒暄就会被判成转人工并挂起会话。强烈建议改成「转人工」。`);
                }
            }
        }
        const nextTransfer = { ...current, phrases };
        if (params.notifyWechat !== undefined)
            nextTransfer.notifyWechat = String(params.notifyWechat || '').trim();
        if (params.notSendToCustomer !== undefined)
            nextTransfer.notSendToCustomer = params.notSendToCustomer === true;
        if (!nextTransfer.notifyWechat) {
            warnings.push('没有配置 notifyWechat：转人工时不会有微信通知，只能靠 RPA 界面的挂起列表或飞书（若配过）发现。');
        }
        settings.transferConfig = nextTransfer;
        const saved = U(await this.apiClient.updateConfig('chat_history_settings', { chat_history_settings: settings }));
        if (saved && saved.success === false) {
            return { success: false, error: `写入转人工配置失败：${saved.error || '未知错误'}` };
        }
        // 过滤词同步：与 RPA 界面勾选「转人工话术不发送客户」的行为保持一致。
        // 必须先摘掉上一批触发词，否则改词后旧词残留在过滤词里，会静默吞掉正常回复。
        const filterNote = [];
        const wantFilter = nextTransfer.notSendToCustomer === true;
        const removals = oldPhrases.filter(p => !phrases.includes(p));
        if (wantFilter || removals.length || params.notSendToCustomer === false) {
            try {
                const strategy = U(await this.apiClient.getConfig('reply_strategy_v2')) || {};
                const commonConfig = { ...(strategy.commonConfig || {}) };
                let words = Array.isArray(commonConfig.filterWords) ? commonConfig.filterWords.map(String) : [];
                const before = words.join('\u0000');
                words = words.filter(w => !removals.includes(w) && (wantFilter || !phrases.includes(w)));
                if (wantFilter)
                    for (const p of phrases)
                        if (!words.includes(p))
                            words.push(p);
                if (words.join('\u0000') !== before) {
                    commonConfig.filterWords = words;
                    await this.apiClient.updateConfig('reply_strategy_v2', { ...strategy, commonConfig });
                    filterNote.push(wantFilter
                        ? '已把触发词同步进过滤词：命中触发词的那条回复**整条**都不会发给客户（客户端会显示挂起，但客户侧是沉默）。'
                        : '已从过滤词里移除触发词：含触发词的回复会正常发给客户。');
                }
            }
            catch (e) {
                warnings.push(`过滤词同步失败（${e?.message || e}）。notSendToCustomer 只在过滤词同步成功时才真正起作用，请在 RPA「设置 → 转人工配置」里手动勾一次。`);
            }
        }
        return {
            success: true,
            applied: [`转人工触发词：${phrases.join('、')}`, ...filterNote],
            ...describe(nextTransfer, phrases),
            warnings,
            next: '把触发词原样写进子 Agent 人设的转人工规则里（必须是"回复正文包含该词"，不是 [标记] 或 JSON），然后真机验证一次。'
        };
    }
    // ===== 生效态读取 / 智能体换绑 =====
    /** RPA 的配置接口有时裹一层 { success, data }，有时直接给业务体。 */
    static unwrap(r) {
        return (r && typeof r === 'object' && 'data' in r && 'success' in r) ? r.data : r;
    }
    /**
     * 汇总「每个功能位现在到底用的是哪个智能体」。
     *
     * 朋友圈没有读接口，真相只能从调度器里正在跑的 moment_comment 任务参数拿；任务没跑时回落到
     * `sop_cache.commentConfig`——那是 RPA 界面存的上次配置，也是下次开启时后端会取的历史默认值
     * （见 RPA api_server.toggle_auto_comment），所以它代表"下次开启会用谁"，必须标注来源区分。
     */
    async readEffectiveState(requestedAccountId) {
        const U = WeChatRPASkill.unwrap;
        const account = await this.resolveAccount('读取生效中的智能体', requestedAccountId);
        let pool = [];
        try {
            // agents 是全局池子，不带账号读（带了也是同一份）。
            const d = U(await this.apiClient.getConfig('agents'));
            pool = Array.isArray(d) ? d : (Array.isArray(d?.agents) ? d.agents : []);
        }
        catch { /* 池子读不到就按空处理，下游会把引用标成未登记 */ }
        let strategy = {};
        // reply_strategy_v2 按账号隔离：不带 accountId 读会拿到"当前活跃号"的助理列表，
        // 于是出现过"问 A 号的配置、返回 B 号的助理"（线上 trace 实录，模型连问三次都是 B 号）。
        try {
            strategy = U(await this.apiClient.getConfig('reply_strategy_v2', account.accountId)) || {};
        }
        catch { /* 同上 */ }
        const staffList = Array.isArray(strategy?.staffList) ? strategy.staffList : [];
        let features = [];
        let featuresReadable = false;
        try {
            const rawFeatures = U(await this.apiClient.getFeaturesStatus());
            if (Array.isArray(rawFeatures)) {
                features = rawFeatures;
                featuresReadable = true;
            }
            else if (Array.isArray(rawFeatures?.features)) {
                features = rawFeatures.features;
                featuresReadable = true;
            }
        }
        catch { /* 开关状态未知 */ }
        const featureOn = (f) => features.find((x) => x?.feature === f)?.enabled === true;
        let momentParams = null;
        let momentFrom = 'none';
        try {
            const list = U(await this.apiClient.getTasks())?.tasks || [];
            const p = list.find(x => x?.task_type === 'moment_comment')?.raw_params?.task_params;
            if (p) {
                momentParams = p;
                momentFrom = 'running';
            }
        }
        catch { /* 调度器读不到就退到快照 */ }
        if (!momentParams) {
            try {
                const c = U(await this.apiClient.getConfig('sop_cache'))?.commentConfig;
                if (c && (c.agentId || c.interactionMode)) {
                    momentParams = c;
                    momentFrom = 'saved';
                }
            }
            catch { /* 从未配过 */ }
        }
        const nameOf = (botId) => {
            if (!botId)
                return null;
            const hit = pool.find((a) => String(a?.botId) === String(botId) || String(a?.id) === String(botId));
            return hit ? String(hit.name || hit.botId) : null;
        };
        return { account, pool, strategy, staffList, momentParams, momentFrom, featuresReadable, featureOn, nameOf };
    }
    async handleGetEffectiveAgents(params = {}) {
        await this.ensureServiceAndMonitor();
        const s = await this.readEffectiveState(params.account_id);
        const warnings = [];
        const staff = s.staffList.map((x) => {
            const agentName = s.nameOf(x?.agentId);
            if (x?.enabled === true && !agentName) {
                warnings.push(`AI助理「${x?.name || x?.id}」绑的智能体不在智能体列表里，自动回复会失败。`);
            }
            // chatType 只有 single/group 两种真实取值。'all' 是历史遗留：RPA 群聊路由要求严格
            // 等于 'group'，'all' 只在单聊生效——照原样显示"全部"会让用户以为群里也在接客。
            const rawType = String(x?.chatType || '');
            if (x?.enabled === true && rawType === 'all') {
                warnings.push(`AI助理「${x?.name || x?.id}」的范围是遗留值 all，实际只在单聊生效，群聊不会回。要管群聊请改成 group 或另建一条群聊助理。`);
            }
            if (x?.enabled === true && !rawType) {
                warnings.push(`AI助理「${x?.name || x?.id}」没有设置回复范围（chatType），单聊群聊都不会回。`);
            }
            return {
                staffId: x?.id,
                name: x?.name,
                enabled: x?.enabled === true,
                chatType: rawType === 'all' ? 'all(遗留值，仅单聊生效)' : (rawType || '未设置(不生效)'),
                monitorOnly: x?.monitorOnly === true,
                agent: x?.agentId ? (agentName || `⚠️未登记(${x.agentId})`) : '⚠️未绑定',
                agentId: x?.agentId || null
            };
        });
        if (!staff.length)
            warnings.push('还没有任何 AI助理，自动回复即使开启也不会回话。');
        const m = s.momentParams || {};
        const momentAgent = s.nameOf(m.agentId);
        if (m.agentId && !momentAgent)
            warnings.push('AI朋友圈绑的智能体不在智能体列表里，评语会生成失败。');
        return {
            account: describeAccount(s.account),
            // autoReply.staff 是**这个号**的助理列表；running 则是 RPA 的全局监控开关
            // （自动回复对所有已登录号统一生效，RPA 不支持只开其中几个号）。
            // 两者作用域不同，混着念会让用户以为"只有这个号在自动回复"。
            autoReply: {
                running: s.featureOn('multi_chat_monitor'),
                runningScope: '全局开关：开启后所有已登录微信号一起生效，RPA 不支持只开部分账号',
                staff,
            },
            aiMoment: {
                running: s.featureOn('moment_comment'),
                // running=正在跑的任务参数(真相)；saved=上次保存、下次开启会用它；none=从未配过
                source: s.momentFrom,
                agent: m.agentId ? (momentAgent || `⚠️未登记(${m.agentId})`) : null,
                agentId: m.agentId || null,
                interactionMode: m.interactionMode || null,
                commentLimit: m.commentLimit ?? null,
                perFriendLimit: m.perFriendLimit ?? null,
                checkInterval: m.checkInterval ?? null
            },
            agentsPool: s.pool.map((a) => ({ name: a?.name, botId: a?.botId, platform: a?.platform })),
            warnings,
            note: '这是当前真正生效的配置，不是"登记过哪些智能体"。开启前复述给用户确认；要换用 wechat_bind_agent。'
        };
    }
    isPlainBindApproval(text) {
        const raw = String(text || '').trim();
        if (!raw)
            return false;
        const normalized = raw
            .toLowerCase()
            .replace(/[\s，。！？、,.!?:：；;"'`“”‘’（）()[\]{}<>《》]/g, '');
        if (!normalized)
            return false;
        if (/(取消|不要|别|不用|先不|暂不|等等|等下|稍后|只登记|仅登记|改成|换成|修改|重来|不是)/.test(normalized)) {
            return false;
        }
        return /^(确认|确定|同意|可以|可|好的|好|继续|执行|开始|没问题|行|ok|okay|yes|y|go|goahead)(吧|了|一下|执行)?$/.test(normalized)
            || /^(按这个|就这样|按上面|按预览|照这个|照上面)(来|执行|处理)?$/.test(normalized);
    }
    bindPlanScenes(plan) {
        const scenes = [];
        if (plan?.replyPlan)
            scenes.push('reply');
        if (plan?.momentPlan)
            scenes.push('moment');
        return scenes;
    }
    bindConfirmationMatches(params, scenes, plan) {
        const agentRef = String(params?.agent || '').trim();
        const entry = plan?.entry || {};
        if (!agentRef || (agentRef !== String(entry.botId || '') && agentRef !== String(entry.id || '')))
            return false;
        const accountId = String(plan?.accountId || '').trim();
        const requestedAccount = String(params?.account_id || '').trim();
        if (requestedAccount && requestedAccount !== accountId)
            return false;
        const requestedName = String(params?.displayName || '').trim();
        if (requestedName && requestedName !== String(plan?.agentName || '').trim())
            return false;
        if (params?.staffId && String(params.staffId) !== String(plan?.replyPlan?.staffId || ''))
            return false;
        if (params?.chatType && plan?.replyPlan?.mode === 'create') {
            const expectedChatType = plan.replyPlan.chatType === 'group' ? 'group' : 'single';
            if (params.chatType !== expectedChatType)
                return false;
        }
        const expectedScenes = Array.isArray(plan?.scenes) ? plan.scenes : this.bindPlanScenes(plan);
        if (!expectedScenes.length)
            return false;
        if (scenes.length) {
            const requested = [...scenes].sort().join('|');
            const expected = [...expectedScenes].sort().join('|');
            if (requested !== expected)
                return false;
        }
        return true;
    }
    takeImplicitBindConfirmation(params, scenes, context) {
        if (!this.isPlainBindApproval(context?.userText))
            return null;
        const sessionId = context?.sessionId || 'unknown';
        const traceId = context?.traceId || '';
        if (!traceId)
            return null;
        const now = Date.now();
        const matches = [];
        for (const [token, rec] of this.bindConfirmations.entries()) {
            if (rec.expiresAt < now) {
                this.bindConfirmations.delete(token);
                continue;
            }
            if (rec.sessionId !== sessionId)
                continue;
            if (rec.userId && context?.userId && rec.userId !== context.userId)
                continue;
            if (!rec.issuedTraceId || rec.issuedTraceId === traceId)
                continue;
            if (!this.bindConfirmationMatches(params, scenes, rec.plan))
                continue;
            matches.push({ token, rec });
        }
        if (!matches.length)
            return null;
        matches.sort((a, b) => b.rec.expiresAt - a.rec.expiresAt);
        this.bindConfirmations.delete(matches[0].token);
        return matches[0].rec.plan;
    }
    /** 组装换绑计划：只算不写，预览和执行共用同一份，避免"确认的和写下去的不是一回事"。 */
    async planBind(params) {
        const s = await this.readEffectiveState(params.account_id);
        const agentRef = params.agent;
        let existing = s.pool.find((a) => String(a?.botId) === agentRef || String(a?.id) === agentRef);
        const confirmation = {
            required: false,
            impact: params.scenes.length ? 'saved_config' : 'register_only',
            reasons: [],
        };
        const requireConfirmation = (impact, reason) => {
            confirmation.required = true;
            confirmation.impact = impact;
            if (!confirmation.reasons.includes(reason))
                confirmation.reasons.push(reason);
        };
        // 子 Agent（本机 AGENT.md）与 FireFlow apiKey 的登记结构不同：前者要带回调本机的 apiUrl。
        let isSubAgent = false;
        if (!existing && /^[A-Za-z0-9_-]+$/.test(agentRef)) {
            try {
                await fs.access(path.join(WORKSPACE_DIR, 'agents', agentRef, 'AGENT.md'));
                isSubAgent = true;
            }
            catch { /* 不是本机子 Agent，按 FireFlow apiKey 处理 */ }
        }
        const usesMacKeychainConfig = usesMacKeychainAgentConfig(process.platform);
        if (!existing && !isSubAgent && usesMacKeychainConfig) {
            const publicId = fireflowPublicId(agentRef);
            existing = s.pool.find((a) => String(a?.platform || '').toLowerCase() === 'fireflow'
                && (String(a?.botId) === publicId || String(a?.id) === publicId));
        }
        const displayName = String(params.displayName || '').trim() || existing?.name
            || (isSubAgent ? `${agentRef}(Agent)` : `FireFlow智能体`);
        const entry = existing
            ? { ...existing, name: displayName }
            : isSubAgent
                ? { id: agentRef, name: displayName, botId: agentRef, platform: 'agentic', apiUrl: `http://127.0.0.1:${process.env.PORT || '3000'}`, apiToken: '' }
                : {
                    id: fireflowEntryId(agentRef, process.platform),
                    name: displayName,
                    botId: agentRef,
                    platform: 'fireflow',
                };
        const changes = [];
        if (!existing)
            changes.push(`把「${displayName}」登记进智能体列表`);
        // --- reply ---
        let replyPlan = null;
        if (params.scenes.includes('reply')) {
            const candidates = s.staffList.filter((x) => x?.monitorOnly !== true);
            const autoReplyRunning = s.featureOn('multi_chat_monitor');
            let target = null;
            if (params.staffId) {
                target = s.staffList.find((x) => String(x?.id) === String(params.staffId));
                if (!target) {
                    return { error: `没有 id 为 ${params.staffId} 的 AI助理。可选：${s.staffList.map((x) => `${x?.id}(${x?.name})`).join('、') || '无'}` };
                }
            }
            else if (candidates.length > 1) {
                return {
                    error: '有多个 AI助理，让用户指明换哪一个，再带 staffId 重调。',
                    staffOptions: candidates.map((x) => ({ staffId: x?.id, name: x?.name, chatType: x?.chatType, agent: s.nameOf(x?.agentId) || x?.agentId }))
                };
            }
            else {
                target = candidates[0] || null;
            }
            if (target) {
                const before = s.nameOf(target.agentId) || target.agentId || '未绑定';
                const sameAgent = String(target.agentId || '') === String(entry.botId || '');
                const activeReplyBehaviorChange = !sameAgent || !existing;
                const assistantCanReply = target.enabled === true && target.monitorOnly !== true;
                replyPlan = {
                    mode: 'rebind',
                    staffId: target.id,
                    staffName: target.name,
                    targetEnabled: target.enabled === true,
                    monitorOnly: target.monitorOnly === true,
                    autoReplyRunning,
                    autoReplyStatusKnown: s.featuresReadable,
                    sameAgent,
                    activeReplyBehaviorChange,
                };
                changes.push(`AI助理「${target.name}」的智能体：${before} → ${displayName}${target.enabled === true ? '' : '（该助理是停用状态，换完仍需启用）'}`);
                if (activeReplyBehaviorChange && assistantCanReply && autoReplyRunning) {
                    requireConfirmation('active_reply_change', sameAgent
                        ? `自动回复正在运行，AI助理「${target.name}」启用中；补登记缺失的智能体可能立即恢复客户接待。`
                        : `自动回复正在运行，AI助理「${target.name}」启用中，换绑会立即改变客户接待智能体。`);
                }
                else if (activeReplyBehaviorChange && assistantCanReply && !s.featuresReadable) {
                    requireConfirmation('unknown_reply_state', `无法读取自动回复开关状态，且 AI助理「${target.name}」启用中；为避免误改正在接待客户的智能体，需要用户确认。`);
                }
                else if (activeReplyBehaviorChange) {
                    confirmation.impact = 'inactive_reply_config';
                }
            }
            else {
                // RPA 的回复范围只有单聊/群聊两种，一条助理管一种（群聊路由要求 chatType 严格等于
                // 'group'，历史遗留的 'all' 只在单聊生效）。没指定就按最常见的单聊建。
                const chatType = params.chatType === 'group' ? 'group' : 'single';
                replyPlan = { mode: 'create', staffName: `${displayName} 助理`, chatType, targetEnabled: true, autoReplyRunning, autoReplyStatusKnown: s.featuresReadable };
                changes.push(`新建 AI助理「${displayName} 助理」（${chatType === 'group' ? '群聊' : '单聊'}）并绑到它`
                    + (params.chatType ? '' : '；如果要管的是群聊，告诉我，我带 chatType:"group" 重来'));
                if (autoReplyRunning) {
                    requireConfirmation('active_reply_change', `自动回复正在运行，新建启用的 AI助理「${displayName} 助理」可能立即开始接待客户。`);
                }
                else if (!s.featuresReadable) {
                    requireConfirmation('unknown_reply_state', `无法读取自动回复开关状态，新建的 AI助理会默认启用；为避免误触发客户接待，需要用户确认。`);
                }
                else {
                    confirmation.impact = 'inactive_reply_config';
                }
            }
        }
        // --- moment ---
        // 只改配置，不去动正在跑的任务：朋友圈任务参数是调度器里的活对象，改配置动不了它，
        // 而擅自 toggle 重启会中断用户正在跑的一轮。如实提示，让用户自己决定要不要重开。
        const momentPlan = params.scenes.includes('moment');
        if (momentPlan) {
            const before = s.momentParams?.agentId
                ? (s.nameOf(s.momentParams.agentId) || s.momentParams.agentId) : '未配置';
            // 这里只写 agentId。互动模式必须由用户选（评论是对外行为），所以如果历史里
            // 也没有，就明说——否则用户回头去点界面开关会撞上"缺少必传参数 interactionMode"。
            const hasMode = !!s.momentParams?.interactionMode;
            changes.push(`AI朋友圈的智能体：${before} → ${displayName}`
                + (s.featureOn('moment_comment') ? '（任务正在跑，需关掉再开才会换成它）' : '（下次开启时生效）')
                + (hasMode ? '' : '；⚠️ 还没有互动模式，开启时必须用 wechat_toggle_ai_moment 指定 interactionMode，直接点界面开关会报"缺少必传参数"'));
        }
        return {
            account: describeAccount(s.account),
            // 兑现阶段要按**预览时锁定的那个号**重新读现场并写回。不能到时候再解析一次：
            // 用户在确认的这一轮里可能在 RPA 界面上切了活跃实例，那样就会写到另一个号上。
            accountId: s.account.accountId,
            agentName: displayName, alreadyRegistered: !!existing,
            entry, pool: s.pool, replyPlan, momentPlan, scenes: params.scenes, changes, confirmation
        };
    }
    async handleBindAgent(params, _signal, context) {
        await this.ensureServiceAndMonitor();
        const sessionId = context?.sessionId || 'unknown';
        const traceId = context?.traceId || '';
        const agentRef = String(params?.agent || '').trim();
        if (!agentRef)
            return { success: false, error: '缺少 agent（子Agent标识 / FireFlow apiKey / 已登记的 botId）。' };
        const scenes = Array.from(new Set((params?.scenes || []).map(String)))
            .filter(x => x === 'reply' || x === 'moment');
        // 兑现阶段：令牌必须来自上一轮预览，且必须换了一个 trace（= 用户又开了口）才作数。
        let plan;
        let implicitConfirmation = false;
        if (params?.confirmToken) {
            const rec = this.bindConfirmations.get(params.confirmToken);
            if (!rec || rec.expiresAt < Date.now()) {
                this.bindConfirmations.delete(params.confirmToken);
                return { success: false, error: '换绑确认已失效，请重新预览。' };
            }
            if (rec.sessionId !== sessionId)
                return { success: false, error: '该确认属于另一个会话。' };
            if (!traceId || traceId === rec.issuedTraceId) {
                return { success: false, error: '不能在预览的同一轮里就写入。先把变更讲给用户，等用户回话同意后再调。' };
            }
            this.bindConfirmations.delete(params.confirmToken); // 一次性，防重放
            plan = rec.plan;
        }
        else {
            const implicitPlan = this.takeImplicitBindConfirmation(params, scenes, context);
            if (implicitPlan) {
                plan = implicitPlan;
                implicitConfirmation = true;
            }
            else {
                plan = await this.planBind({ agent: agentRef, scenes, displayName: params?.displayName, staffId: params?.staffId, chatType: params?.chatType, account_id: params?.account_id });
                if (plan?.error)
                    return { success: false, ...plan };
                // 只登记不接管，谁都不会被换掉，没必要打扰用户。
                if (!scenes.length) {
                    if (plan.alreadyRegistered) {
                        return { success: true, applied: [`「${plan.agentName}」已在智能体列表中，无需重复登记。`] };
                    }
                    await this.apiClient.updateConfig('agents', [...plan.pool, plan.entry]);
                    return { success: true, applied: [`已把「${plan.agentName}」登记进智能体列表（尚未接管任何功能）。`] };
                }
                if (plan.confirmation?.required === true) {
                    // 没有 traceId 就没法判断"是不是换了一轮"，也就没法保证用户真的点过头。
                    // 与其无声地放行，不如让这次换绑走人工路径。
                    if (!traceId) {
                        return {
                            success: false,
                            error: '当前上下文缺少 traceId，无法做跨轮确认，本工具拒绝写入。',
                            changes: plan.changes,
                            confirmation: plan.confirmation,
                            fallback: '把 changes 讲给用户，得到同意后改用 wechat_get_config + wechat_update_config 按 config_schema 手动改。'
                        };
                    }
                    const confirmToken = randomUUID();
                    this.bindConfirmations.set(confirmToken, { sessionId, userId: context?.userId, issuedTraceId: traceId, expiresAt: Date.now() + 10 * 60_000, plan });
                    return {
                        success: true,
                        preview: true,
                        account: plan.account,
                        changes: plan.changes,
                        confirmation: plan.confirmation,
                        confirmToken,
                        expires_in_seconds: 600,
                        instruction: '尚未写入任何配置。把 changes 和 confirmation.reasons 逐条讲给用户，等用户下一条消息明确同意后，再带 confirmToken 调一次本工具。'
                    };
                }
            }
        }
        // --- 执行 ---
        // 计划是上一轮算的，这里重新读一遍现场再改：确认期间用户可能在 RPA 界面上动过配置，
        // 拿旧快照整体覆写会把那些改动悄悄抹掉。
        const live = await this.readEffectiveState(plan.accountId);
        const applied = [];
        let effectiveEntry = plan.entry;
        const plannedId = String(plan.entry?.botId || plan.entry?.id || '');
        const usesMacKeychainConfig = usesMacKeychainAgentConfig(process.platform);
        const persistedId = usesMacKeychainConfig
            && String(plan.entry?.platform || '').toLowerCase() === 'fireflow'
            ? fireflowPublicId(plannedId)
            : plannedId;
        const persisted = live.pool.find((a) => String(a?.botId) === persistedId || String(a?.id) === persistedId);
        if (persisted) {
            effectiveEntry = persisted;
        }
        else {
            const response = await this.apiClient.updateConfig('agents', [...live.pool, plan.entry]);
            effectiveEntry = usesMacKeychainConfig
                ? persistedAgentEntry(response, plan.entry, process.platform)
                : plan.entry;
            applied.push(`已登记智能体「${plan.agentName}」。`);
        }
        if (plan.replyPlan) {
            const strategy = { ...(live.strategy || {}) };
            const staffList = Array.isArray(strategy.staffList) ? [...strategy.staffList] : [];
            if (plan.replyPlan.mode === 'rebind') {
                const i = staffList.findIndex((x) => String(x?.id) === String(plan.replyPlan.staffId));
                if (i < 0)
                    return { success: false, error: 'AI助理在确认期间被改动了，请重新预览。' };
                staffList[i] = { ...staffList[i], agentId: effectiveEntry.botId };
                applied.push(`AI助理「${plan.replyPlan.staffName}」已改用「${plan.agentName}」。`);
            }
            else {
                // 字段与 config_schema/auto_config_sop 的默认助理保持一致（单聊、不限标签关键词）。
                // ⚠️ 不要写 chatType:'all'：RPA 群聊路由只认严格等于 'group' 的助理
                // （get_agent_id_by_tags / has_group_ai_staff），'all' 是遗留值，群里永远不回。
                const chatType = plan.replyPlan.chatType === 'group' ? 'group' : 'single';
                staffList.push({
                    id: String(Date.now()),
                    name: plan.replyPlan.staffName,
                    enabled: true,
                    agentId: effectiveEntry.botId,
                    chatType,
                    selectedTags: [],
                    keywords: []
                });
                applied.push(`已新建 AI助理「${plan.replyPlan.staffName}」（${chatType === 'group' ? '群聊' : '单聊'}）并绑到「${plan.agentName}」。`);
            }
            strategy.staffList = staffList;
            // 必须带 accountId：reply_strategy_v2 按账号目录落盘，不带就写进"活跃号"，
            // 于是出现"给 A 号绑的助理跑到 B 号上"。
            await this.apiClient.updateConfig('reply_strategy_v2', strategy, plan.accountId);
        }
        if (plan.momentPlan) {
            // 朋友圈没有"当前配置"接口，sop_cache.commentConfig 就是下次开启时后端取的历史默认值
            // （见 RPA api_server.toggle_auto_comment），也是 RPA 界面存配置的地方。只改它。
            const U = WeChatRPASkill.unwrap;
            let cache = {};
            try {
                cache = U(await this.apiClient.getConfig('sop_cache')) || {};
            }
            catch { /* 首次配置，按空处理 */ }
            const commentConfig = { ...(cache.commentConfig || {}), agentId: effectiveEntry.botId };
            await this.apiClient.updateConfig('sop_cache', { ...cache, commentConfig });
            applied.push(live.featureOn('moment_comment')
                ? `AI朋友圈的智能体已改为「${plan.agentName}」，但任务正在跑，需关掉再开才会换成它。`
                : `AI朋友圈下次开启时会用「${plan.agentName}」。`);
        }
        // 写完不等于能用。让 RPA 自己试拨一次刚绑上的智能体——线上出过"绑定 success、
        // 一条都不回"整整三天，就是因为这里写完就返回，没人验证过 RPA 到底调不调得通。
        //
        // 只有 agentic 会真的去探（免费的 GET /v1/capabilities）；fireflow/coze/dify 的
        // 测试接口会真发一轮对话花用户的钱，所以跳过并如实回 verified:null。细节见 testAgent。
        //
        // 结果只用于如实汇报：绝不因为验证失败就回滚已经写好的配置（那会留下半套状态），
        // 也绝不因为验证不了就当作成功。
        const probe = await this.apiClient.testAgent(String(effectiveEntry.botId), String(effectiveEntry.platform));
        const verification = {
            verified: probe.verified,
            message: probe.message,
            instruction: probe.verified === true
                ? '连通性已验证，可以照常汇报"已生效"。'
                : probe.verified === false
                    ? '配置已写入，但 RPA 试拨这个智能体失败——**不要**告诉用户已经能用。把 message 原文讲给用户，并说明在修好之前自动回复不会有响应。'
                    : '配置已写入，但这台机器上无法验证连通性。汇报时要说清"已配置，但没能验证是否真的能回复"，不要说"已生效"。',
        };
        return { success: true, account: plan.account, applied, verification, ...(implicitConfirmation ? { implicitConfirmation: true } : {}) };
    }
    /** 通讯录同步的串行队列。RPA 侧锁是进程级全局，并发调用必然 409。 */
    contactSyncQueue = new ContactSyncQueue();
    async handleSyncContacts(params, signal) {
        await this.ensureServiceAndMonitor({ signal });
        const account = await this.resolveAccount(`同步${params.type === 'group' ? '群聊' : '好友'}`, params.account_id);
        // RPA 的同步锁是进程级全局（同一个 UIA worker），多号并发必然 409。
        // 在工具层排队 + 对 409 退避重试，模型可以照 SOP 逐账号并行调用。
        // 不把 signal 传给底层 fetch：RPA 明确 shield 了已经开始的原生 UIA 同步，断开 HTTP
        // 也停不掉它。队列会让调用方立即停止等待，但继续占住队头直到 RPA 真正释放锁；
        // 尚未开始的排队项则会被 signal 拦住，绝不会在 stop 后补跑。
        const result = await this.contactSyncQueue.run(() => this.apiClient.syncContacts(params.type, account.accountId), { signal });
        return { ...(result && typeof result === 'object' ? result : { raw: result }), account: describeAccount(account) };
    }
    /**
     * 群列表。刻意不落盘、不生成 Excel 脚本——那是 `handleGetContacts` 需要审批的原因，
     * 而"我有多少群"这种问题不该每次都弹确认。
     */
    async handleGetGroups(params) {
        await this.ensureServiceAndMonitor();
        const account = await this.resolveAccount('查询群聊', params.account_id);
        const raw = await this.apiClient.getGroups({
            keyword: params.keyword,
            account_id: account.accountId,
        });
        // RPA 返回 { success, groups: [{ name, tag, type }] }；老版本可能直接返回数组。
        const all = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.groups) ? raw.groups : [];
        const total = all.length;
        const requested = Number(params.limit);
        const limit = Number.isFinite(requested) && requested > 0
            ? Math.min(Math.floor(requested), 1000)
            : 200;
        const groups = all.slice(0, limit).map((g) => (g?.tag ? { name: g.name, tag: g.tag } : { name: g?.name }));
        return {
            total,
            returned: groups.length,
            truncated: total > groups.length,
            groups,
            account: describeAccount(account),
            // total=0 有两种可能：真没群，或者压根没同步过。别让模型二选一地猜。
            hint: total === 0
                ? '没有已同步的群。先调用 wechat_sync_contacts({type:"group"}) 同步，再调本工具。'
                : (total > groups.length
                    ? `共 ${total} 个群，本次只返回前 ${groups.length} 个。用 keyword 收窄，不要盲目调大 limit。`
                    : undefined),
        };
    }
    async handleGetContacts(params) {
        await this.ensureServiceAndMonitor();
        const account = await this.resolveAccount('查询联系人', params.account_id);
        const contacts = await this.apiClient.getContacts({ ...params, account_id: account.accountId });
        const total = Array.isArray(contacts) ? contacts.length : 0;
        // Always write to file + pre-generate an Excel script regardless of contact count.
        // This prevents the agent from ever needing to embed contact data in a python -c argument,
        // which breaks on Windows due to Chinese characters and multiline shell escaping.
        await fs.mkdir(WORKSPACE_DIR, { recursive: true });
        const ts = Date.now();
        const jsonPath = path.join(WORKSPACE_DIR, `wechat_contacts_${ts}.json`);
        const scriptPath = path.join(WORKSPACE_DIR, `gen_excel_${ts}.py`);
        const excelPath = path.join(WORKSPACE_DIR, `wechat_contacts_${ts}.xlsx`);
        await fs.writeFile(jsonPath, JSON.stringify(contacts, null, 2), 'utf-8');
        // PEP 723 inline metadata: uv auto-installs pandas + openpyxl if missing.
        // Chinese column names stored as \u escapes — no UTF-8 bytes on the command line.
        const pyScript = [
            '# /// script',
            '# requires-python = ">=3.8"',
            '# dependencies = ["pandas", "openpyxl"]',
            '# ///',
            '# -*- coding: utf-8 -*-',
            'import json',
            'import pandas as pd',
            '',
            `json_path = r'${jsonPath}'`,
            `excel_path = r'${excelPath}'`,
            '',
            'with open(json_path, encoding="utf-8") as f:',
            '    data = json.load(f)',
            '',
            'df = pd.DataFrame(data)',
            'if "tags" in df.columns:',
            '    df["tags"] = df["tags"].apply(lambda x: ", ".join(x) if isinstance(x, list) else (x or ""))',
            '',
            'col_map = {"name": "\\u6635\\u79f0", "wxid": "\\u5fae\\u4fe1\\u53f7", "tags": "\\u6807\\u7b7e", "is_new": "\\u662f\\u5426\\u65b0\\u597d\\u53cb"}',
            'df = df.rename(columns={k: v for k, v in col_map.items() if k in df.columns})',
            '',
            'df.to_excel(excel_path, index=False, engine="openpyxl")',
            'print(f"OK: {len(df)} contacts -> {excel_path}")',
        ].join('\n');
        await fs.writeFile(scriptPath, pyScript, 'utf-8');
        const hint = total === 0
            ? 'No synced contacts found. Ask for the exact recipient name; sync only if the user asks to refresh contacts.'
            : `Run \`uv run "${scriptPath}"\` with shell_exec to generate the Excel file at "${excelPath}". Use uv run (NOT python, NOT python -c) so missing dependencies are auto-installed.`;
        return {
            total,
            file_path: jsonPath,
            excel_script: scriptPath,
            excel_output: excelPath,
            hint,
        };
    }
    // --- Local Config Handlers ---
    async handleListLocalUsers() {
        const users = await this.configManager.listLocalWeChatUsers();
        return {
            users,
            note: '这是本机**历史**微信账号（含已退出登录的）。要决定"用哪个号执行任务"，'
                + '请改调 wechat_list_instances——那才是当前在线、可执行的账号。',
        };
    }
    async handleGetConfig(params) {
        const requested = params.account_id || params.wechatId;
        const scoped = isAccountScopedConfig(params.config_type);
        try {
            // First try API if service is running
            await this.ensureServiceAndMonitor();
            // 账号级配置必须定位到具体号再读，否则读到的是"活跃号"的配置，而后面的
            // Read-Modify-Write 会把它写回另一个号 —— 线上"问 A 号返回 B 号"就是这么来的。
            // 全局配置（agents 等）三个号共用，不必逼用户选号。
            const account = scoped ? await this.resolveAccount(`读取配置 ${params.config_type}`, requested) : null;
            const data = await this.apiClient.getConfig(params.config_type, account?.accountId);
            return {
                ...(data && typeof data === 'object' && !Array.isArray(data) ? data : { data }),
                sourceAccount: account ? describeAccount(account) : null,
                scope: scoped ? 'account' : 'global',
            };
        }
        catch (e) {
            // 账号未就绪/未选定是硬前置条件，不能被本地降级读掩盖成"读到了一份配置"。
            const code = e?.code || '';
            if (code === 'NO_ACTIVE_WECHAT' || code === 'AMBIGUOUS_ACCOUNT' || code === 'UNKNOWN_ACCOUNT')
                throw e;
            if (typeof e?.message === 'string' && e.message.startsWith('NO_ACTIVE_WECHAT'))
                throw e;
            // Fallback to local config if API fails or service is not running
            console.log('[RPA Skill] API config failed, falling back to local file read', e);
            if (params.config_type === 'agents') {
                return await this.configManager.getAgentsConfig(requested);
            }
            else if (params.config_type === 'reply_strategy_v2' || params.config_type === 'reply_strategy') {
                if (!requested)
                    throw new Error('account_id is required to read reply_strategy locally');
                return await this.configManager.getReplyStrategy(requested);
            }
            else if (params.config_type === 'greeting_config' || params.config_type === 'greeting_group') {
                return await this.configManager.getGreetingConfig(requested);
            }
            throw new Error(`Unsupported config type: ${params.config_type}`);
        }
    }
    async handleUpdateReplyStrategy(params) {
        let configObj;
        try {
            configObj = JSON.parse(params.config);
        }
        catch (e) {
            throw new Error('Invalid JSON format for config');
        }
        await this.configManager.updateReplyStrategy(params.wechatId, configObj);
        return { success: true, message: 'Reply strategy updated' };
    }
    // --- Local Data Handlers ---
    async handleListSessions(params) {
        const wechatId = await this.dataManager.resolveWeChatId(params.wechatId);
        const sessions = await this.dataManager.listSessions(wechatId);
        return { wechatId, sessions };
    }
    async handleGetSessionMessages(params) {
        const wechatId = await this.dataManager.resolveWeChatId(params.wechatId);
        const result = await this.dataManager.getSessionMessages(wechatId, params.sessionName, {
            since: params.since,
            limit: params.limit
        });
        if (!result.found) {
            return {
                found: false,
                wechatId,
                message: `未找到会话「${params.sessionName}」的本地历史文件。请确认群名准确，且该群已被“仅监控”助手记录过；可先用 wechat_list_sessions 查看已记录的会话列表。`
            };
        }
        return { wechatId, ...result };
    }
    async handleGetSessionMessagesBatch(params) {
        return readSessionMessagesBatch(this.dataManager, params);
    }
}
