import axios from 'axios';
import { SkillManualProvider } from '../utils/manual_provider.js';
import { LLMManager } from '../../agent/llm/manager.js';
// 接口定义
const mainServerUrl = process.env.FIREFLOW_URL || 'https://fireflow.yokoagi.com';
const listWorkflowsDefinition = {
    name: 'workflow_list',
    description: '获取FireFlow工作流空间下所有的工作流信息（ID、名称、描述、更新时间）。',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const getKnowledgeBasesDefinition = {
    name: 'workflow_list_knowledge_bases',
    description: '获取FireFlow工作流平台下当前用户所有的知识库列表信息（包含知识库ID、名称、描述及基本的文件列表）。',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const getKnowledgeDocumentsDefinition = {
    name: 'workflow_get_knowledge_documents',
    description: '获取FireFlow工作流平台下指定知识库内的文件细节内容（返回文档分块统计和 500 字内容预览）。在需要确认知识库内容时调用。',
    parameters: {
        type: 'object',
        properties: {
            kbId: { type: 'string', description: '知识库的唯一标识符 ID' },
            docIds: { type: 'string', description: '可选。指定要查询的文件ID列表，多个ID用逗号分隔。如果不传，则查询该知识库下所有文件。' }
        },
        required: ['kbId']
    }
};
const getWorkflowTopologyDefinition = {
    name: 'workflow_get_topology',
    description: '获取FireFlow工作流平台下具体工作流的宏观拓扑结构（骨架）。只包含节点 ID、类型、名称和连线关系，不包含具体配置。在分析具体工作流时调用此接口。',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: '工作流的唯一标识符 ID' }
        },
        required: ['appId']
    }
};
const getWorkflowNodeDetailDefinition = {
    name: 'workflow_get_node_detail',
    description: '获取FireFlow工作流某一个具体节点的详细业务配置数据（如 Prompt、参数映射）。必须在已经获取拓扑结构并定位到目标节点ID后，想要深入了解该节点具体怎么配置时调用。',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: '工作流的唯一标识符 ID' },
            nodeId: { type: 'string', description: '工作流内具体节点的 ID' }
        },
        required: ['appId', 'nodeId']
    }
};
const initializeWorkflowDefinition = {
    name: 'workflow_initialize',
    description: '为新用户在 FireFlow 平台一键初始化官方模板工作流。当用户没有任何智能体/工作流时调用。成功返回 appName 和 apiKey；若 alreadyConfigured=true 则说明用户云端已有工作流，直接调用 workflow_list 获取列表并提示用户在 Fireflow 网页复制对应工作流的 API Key。',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const listOfficialWorkflowsDefinition = {
    name: 'workflow_list_official',
    description: '浏览 FireFlow 官方示例空间，获取所有官方示例工作流（ID、名称、描述、图标）。当需要从官方示例中按语义找某类工作流（如朋友圈智能评语生成）以复制到用户空间时调用。',
    parameters: {
        type: 'object',
        properties: {},
        required: []
    }
};
const copyWorkflowDefinition = {
    name: 'workflow_copy_app',
    description: '将指定工作流复制到当前用户的 FireFlow 空间，自动发布并生成 API Key，返回 { appId, appName, apiKey }。仅当用户明确要求创建/复制工作流，或按手册确认需要创建副本时调用。',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: '要复制的源工作流 ID（一般来自 workflow_list_official）' }
        },
        required: ['appId']
    }
};
const getWorkflowApiKeyDefinition = {
    name: 'workflow_get_apikey',
    description: '获取指定工作流的 API Key：若该工作流已有 API Key 则返回现有的，否则自动生成一个新的，返回 { appId, apiKey }。用于已存在于用户空间、但尚未拿到 API Key 的工作流（如通过 workflow_list 找到的现有工作流）。',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: '工作流 ID' }
        },
        required: ['appId']
    }
};
// 手册提供者（用于读取 docs 下的知识库）
const updateLlmPromptsDefinition = {
    name: 'workflow_update_llm_prompts',
    description: 'Update only data.systemPrompt/data.userPrompt on an editable FireFlow LLM node draft. Requires node detail review and explicit user confirmation. Does not publish; follow the manual for test/publish. IMPORTANT: this CANNOT change data.model. If a node fails with model_not_found (its model was decommissioned), this tool will return success while leaving the model untouched — do NOT report the problem as fixed; tell the user the model must be changed in the FireFlow UI.',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: 'FireFlow workflow app ID' },
            nodeId: { type: 'string', description: 'Target LLM node ID' },
            systemPrompt: { type: 'string', description: 'New non-empty system prompt. Pass the existing system prompt if only userPrompt is being changed.' },
            userPrompt: { type: 'string', description: 'New user prompt. Can be an empty string if the workflow intentionally relies on default {{input}} behavior.' }
        },
        required: ['appId', 'nodeId', 'systemPrompt']
    }
};
const testDraftDefinition = {
    name: 'workflow_test_draft',
    description: 'Run the current FireFlow workflow draft in test mode with a sample message or inputs. Use after prompt updates before publish. This does not publish or affect external API calls.',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: 'FireFlow workflow app ID' },
            message: { type: 'string', description: 'Optional test user message. It will be mapped to default/input/query/USER_INPUT unless inputs override them.' },
            inputs: { type: 'object', description: 'Optional structured test inputs for workflow variables.' }
        },
        required: ['appId']
    }
};
const publishWorkflowDefinition = {
    name: 'workflow_publish',
    description: 'Publish the current FireFlow workflow draft after the user reviewed a successful test result and explicitly confirmed publishing. Requires the runId returned by workflow_test_draft.',
    parameters: {
        type: 'object',
        properties: {
            appId: { type: 'string', description: 'FireFlow workflow app ID' },
            lastSuccessfulTestRunId: { type: 'string', description: 'The runId returned by the successful workflow_test_draft call for the current draft.' },
            confirm: { type: 'boolean', description: 'Must be true only after explicit user confirmation.' }
        },
        required: ['appId', 'lastSuccessfulTestRunId', 'confirm']
    }
};
const manualProvider = new SkillManualProvider('workflow');
function getWorkflowHeaders(token) {
    const headers = {
        'Authorization': `Bearer ${token}`
    };
    const channelId = LLMManager.getInstance().getChannelId();
    if (channelId) {
        headers['x-channel-id'] = channelId;
    }
    return headers;
}
// 构建工具集
const tools = [
    {
        definition: initializeWorkflowDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.post(`${url}/v1/agent/apps/initialize`, {}, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to initialize workflow: ${error.message}`;
            }
        }
    },
    {
        definition: listWorkflowsDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.get(`${url}/v1/agent/apps`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to list workflows: ${error.message}`;
            }
        }
    },
    {
        definition: listOfficialWorkflowsDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.get(`${url}/v1/apps?type=official`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to list official workflows: ${error.response?.data?.error || error.message}`;
            }
        }
    },
    {
        definition: copyWorkflowDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                if (!args.appId) {
                    return "Error: appId is required.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.post(`${url}/v1/agent/apps/copy`, { appId: args.appId }, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to copy workflow: ${error.response?.data?.error || error.message}`;
            }
        }
    },
    {
        definition: getWorkflowApiKeyDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                if (!args.appId) {
                    return "Error: appId is required.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const headers = { 'Authorization': `Bearer ${token}` };
                // 先查是否已有 API Key
                const listResp = await axios.get(`${url}/v1/apps/${args.appId}/api-tokens`, { headers });
                const tokens = (listResp.data && listResp.data.data) || [];
                if (tokens.length > 0) {
                    return JSON.stringify({ appId: args.appId, apiKey: tokens[0].token, reused: true }, null, 2);
                }
                // 没有则生成一个新的
                const createResp = await axios.post(`${url}/v1/apps/${args.appId}/api-tokens`, {}, { headers });
                return JSON.stringify({ appId: args.appId, apiKey: createResp.data && createResp.data.token, reused: false }, null, 2);
            }
            catch (error) {
                return `Failed to get workflow API key: ${error.response?.data?.error || error.message}`;
            }
        }
    },
    {
        definition: getWorkflowTopologyDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.get(`${url}/v1/agent/apps/${args.appId}/topology`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to get workflow topology: ${error.message}`;
            }
        }
    },
    {
        definition: getWorkflowNodeDetailDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.get(`${url}/v1/agent/apps/${args.appId}/nodes/${args.nodeId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to get workflow node detail: ${error.message}`;
            }
        }
    },
    {
        definition: updateLlmPromptsDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                if (!args.appId || !args.nodeId) {
                    return "Error: appId and nodeId are required.";
                }
                if (typeof args.systemPrompt !== 'string' || !args.systemPrompt.trim()) {
                    return "Error: systemPrompt is required and cannot be empty.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const body = {
                    systemPrompt: args.systemPrompt,
                    confirm: true
                };
                if (args.userPrompt !== undefined) {
                    body.userPrompt = args.userPrompt;
                }
                const response = await axios.patch(`${url}/v1/agent/apps/${args.appId}/nodes/${args.nodeId}/llm-prompts`, body, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to update workflow LLM prompts: ${error.response?.data?.error || error.message}`;
            }
        }
    },
    {
        definition: testDraftDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                if (!args.appId) {
                    return "Error: appId is required.";
                }
                if (args.inputs !== undefined && (typeof args.inputs !== 'object' || Array.isArray(args.inputs) || args.inputs === null)) {
                    return "Error: inputs must be an object.";
                }
                if ((args.message === undefined || args.message === '') && (!args.inputs || Object.keys(args.inputs).length === 0)) {
                    return "Error: message or inputs is required for draft test.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const body = {};
                if (args.message !== undefined) {
                    body.message = args.message;
                }
                if (args.inputs !== undefined) {
                    body.inputs = args.inputs;
                }
                const response = await axios.post(`${url}/v1/agent/apps/${args.appId}/test-draft`, body, {
                    headers: getWorkflowHeaders(token)
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to test workflow draft: ${error.response?.data?.error || error.message}`;
            }
        }
    },
    {
        definition: publishWorkflowDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                if (!args.appId) {
                    return "Error: appId is required.";
                }
                if (!args.lastSuccessfulTestRunId) {
                    return "Error: lastSuccessfulTestRunId is required. Run workflow_test_draft successfully before publishing.";
                }
                if (args.confirm !== true) {
                    return "Error: confirm=true is required after explicit user confirmation.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.post(`${url}/v1/agent/apps/${args.appId}/publish`, {
                    confirm: true,
                    lastSuccessfulTestRunId: args.lastSuccessfulTestRunId
                }, {
                    headers: getWorkflowHeaders(token)
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to publish workflow draft: ${error.response?.data?.error || error.message}`;
            }
        }
    },
    {
        definition: getKnowledgeBasesDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                const response = await axios.get(`${url}/v1/agent/knowledge-bases`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to list knowledge bases: ${error.message}`;
            }
        }
    },
    {
        definition: getKnowledgeDocumentsDefinition,
        execute: async (args, signal, context) => {
            try {
                const token = LLMManager.getInstance().getAuthToken();
                if (!token) {
                    return "Error: User is not authenticated. Please log in first.";
                }
                const url = mainServerUrl.replace('localhost', '127.0.0.1');
                let requestUrl = `${url}/v1/agent/knowledge-bases/${args.kbId}/documents`;
                if (args.docIds) {
                    requestUrl += `?ids=${encodeURIComponent(args.docIds)}`;
                }
                const response = await axios.get(requestUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                return JSON.stringify(response.data, null, 2);
            }
            catch (error) {
                return `Failed to get knowledge documents: ${error.message}`;
            }
        }
    },
    // 注入知识库读取工具
    manualProvider.getManualTool()
];
export const workflowSkill = {
    name: 'workflow',
    description: 'FireFlow 工作流管理技能。包含工作流列表查询、获取拓扑结构、查看节点详情以及读取操作手册的能力。当用户询问“有哪些工作流”、“怎么修改某个工作流”、“我的fireflow空间”等工作流配置问题时触发。',
    instructions: `
# Workflow 技能使用规范

## ⚠️ 能力边界：不能从零搭建工作流
本技能没有"新建空白工作流 / 新增节点 / 新增连线"的能力，只能复制官方示例工作流后在副本上做受控修改。
**严禁凭空创建一个全新工作流**——那样产出的工作流缺节点缺连线，无法运行。

当用户说"帮我做个工作流 / 搭一个销冠工作流 / 我想要一个能自动回复客户的工作流"时，
不要理解为"从零创建"，而应理解为：**根据诉求从官方示例中复制一个最匹配的工作流到用户空间，再在副本上修改。**
绝大多数客户是销售/私域销冠场景，若用户未指明品类，默认选官方销冠工作流作为复制源。

"制作工作流"流程：澄清诉求 → \`workflow_list_official\` 浏览官方示例 → 与用户确认复制源 → \`workflow_copy_app\` 复制到用户空间 → 在副本上按下面 SOP 修改 → 测试并经确认后发布。
只有当用户在自己空间已有可用工作流、仅需"修复/优化"时，才跳过复制，直接走下面的修改 SOP。
详细策略见 \`index.md\` 第 3 节"工作流创建/制作策略"。

---

当用户需要你帮忙修改、优化或理解工作流中的某个特定部分时，请严格遵循以下 SOP（标准操作流程）：

1. **查阅知识库**：首先调用 \`workflow_read_manual\` 工具，阅读 \`index.md\` 获取各节点的配置规范和排障指南。
2. **查询列表**：如果用户没有明确提供工作流 ID，调用 \`workflow_list\` 获取当前用户的工作流列表，并与用户确认需要操作的目标 Workflow ID。
3. **获取拓扑骨架**：**严禁直接猜测工作流结构！** 必须调用 \`workflow_get_topology\` 接口，获取该工作流的精简骨架（包含节点类型和连线关系）。
4. **获取单节点详情**：通过骨架理解业务流转逻辑后，根据用户需求定位到具体的节点 ID，然后调用 \`workflow_get_node_detail\` 拉取该节点的完整配置。
5. **挂载知识库(可选)**：如果用户的需求是给工作流中的大模型节点挂载知识库，或者用户想查询知识库列表：
   - 调用 \`workflow_list_knowledge_bases\` 工具查询当前用户所有的知识库列表信息（包含知识库ID、名称、描述及基本的文件列表）。
   - 如果需要进一步查看知识库内的文件细节内容以判断是否匹配用户需求，请调用 \`workflow_get_knowledge_documents\` 工具查询（此接口已做 Token 优化，仅返回文档分块统计和 500 字内容预览）。
   - 获取到目标知识库 ID 后，指导用户在模型节点中完成挂载配置。
6. **提供修改建议**：结合知识库说明和拉取到的节点详情，给出精准的修改建议。

## Controlled LLM prompt update
For LLM prompt updates, draft testing, and publishing, read manual topic \`operation_llm_prompt_update\` before acting.
    `,
    tools: tools
};
