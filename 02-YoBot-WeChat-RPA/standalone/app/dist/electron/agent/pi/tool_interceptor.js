/**
 * 工具调用拦截器 v2
 *
 * ## 核心理念：适配模型的"命名幻觉"
 *
 * 不同模型有不同的命名习惯和"偏见"：
 * - Kimi: 倾向连字符 (kebab-case)，可能将 `official_image_gen` 识别为 `official-image-gen`
 * - Doubao: 严格遵循下划线 (snake_case)
 * - GPT-4: 基于训练数据，可能混用
 * - 未来模型: 可能有新的命名偏好（如驼峰、全小写等）
 *
 * ## 设计原则
 *
 * 1. **单一注册**: 每个工具只注册一次，避免token浪费
 * 2. **运行时适配**: 在工具调用时进行名称规范化匹配
 * 3. **可扩展**: 易于添加新的命名规则
 * 4. **透明性**: 对Pi Agent Core完全透明
 * 5. **性能优先**: 使用Map进行O(1)查找
 *
 * ## 实现方案
 *
 * 采用"工具名称规范化"策略：
 * - 注册时：建立【规范化名称 -> 工具对象】映射表
 * - 查找时：拦截find方法，使用规范化名称进行匹配
 *
 * 规范化规则（可扩展）：
 * 1. 小写化
 * 2. 连字符、下划线统一为分隔符
 * 3. 移除所有分隔符（极端情况）
 *
 * ## 性能分析
 *
 * - 构建映射表: O(n * m)，n=工具数量，m=平均变体数量
 * - 查找时间: O(1) - Map查找
 * - 空间开销: O(n * m) - 存储所有变体
 *
 * 对于100个工具，每个工具5个变体，总共500个映射项，内存占用可忽略。
 */
/**
 * 预定义的规范化策略
 */
const NORMALIZATION_STRATEGIES = [
    {
        name: "exact",
        normalize: (name) => name,
        enabled: true
    },
    {
        name: "lowercase",
        normalize: (name) => name.toLowerCase(),
        enabled: true
    },
    {
        name: "hyphen_to_underscore",
        normalize: (name) => name.toLowerCase().replace(/-/g, '_'),
        enabled: true
    },
    {
        name: "underscore_to_hyphen",
        normalize: (name) => name.toLowerCase().replace(/_/g, '-'),
        enabled: true
    },
    {
        name: "remove_all_separators",
        normalize: (name) => name.toLowerCase().replace(/[-_]/g, ''),
        enabled: true
    },
    // 未来可扩展：驼峰式、全大写等
    // {
    //   name: "camelCase",
    //   normalize: (name) => name.replace(/[-_](.)/g, (_, c) => c.toUpperCase()),
    //   enabled: false
    // }
];
/**
 * 工具查找映射表
 *
 * 存储从规范化名称到原始工具的映射
 */
class ToolLookupMap {
    map = new Map();
    stats = {
        totalTools: 0,
        totalVariants: 0,
        collisions: 0
    };
    constructor(tools) {
        this.buildMap(tools);
    }
    /**
     * 构建映射表
     */
    buildMap(tools) {
        console.log(`[ToolLookup] Building lookup map for ${tools.length} tools...`);
        for (const tool of tools) {
            // 生成所有可能的规范化名称
            const variants = this.generateVariants(tool.name);
            for (const variant of variants) {
                // 检查冲突
                if (this.map.has(variant) && this.map.get(variant) !== tool) {
                    const existing = this.map.get(variant);
                    console.warn(`[ToolLookup] ⚠️  Name collision: "${variant}" maps to both ` +
                        `"${existing?.name}" and "${tool.name}". Using "${existing?.name}".`);
                    this.stats.collisions++;
                    continue; // 保留第一个匹配
                }
                this.map.set(variant, tool);
            }
            this.stats.totalTools++;
            this.stats.totalVariants += variants.length;
        }
        console.log(`[ToolLookup] ✓ Built lookup map: ` +
            `${this.stats.totalTools} tools -> ${this.stats.totalVariants} variants ` +
            `(${this.map.size} unique mappings, ${this.stats.collisions} collisions)`);
    }
    /**
     * 生成工具名称的所有变体
     */
    generateVariants(name) {
        const variants = new Set();
        for (const strategy of NORMALIZATION_STRATEGIES) {
            if (!strategy.enabled)
                continue;
            const variant = strategy.normalize(name);
            variants.add(variant);
        }
        return Array.from(variants);
    }
    /**
     * 查找工具
     *
     * @param name LLM调用的工具名称（可能不准确）
     * @returns 匹配的工具，如果找不到返回undefined
     */
    find(name) {
        // 尝试所有规范化策略
        for (const strategy of NORMALIZATION_STRATEGIES) {
            if (!strategy.enabled)
                continue;
            const normalized = strategy.normalize(name);
            const tool = this.map.get(normalized);
            if (tool) {
                // 只在非精确匹配时打印日志
                if (strategy.name !== "exact") {
                    console.log(`[ToolLookup] 🔧 Fuzzy matched: "${name}" -> "${tool.name}" ` +
                        `(strategy: ${strategy.name})`);
                }
                return tool;
            }
        }
        return undefined;
    }
    /**
     * 获取统计信息
     */
    getStats() {
        return { ...this.stats };
    }
}
/**
 * 为工具数组添加模糊匹配能力
 *
 * 核心策略：
 * 1. 构建规范化名称映射表
 * 2. 劫持数组的find方法
 * 3. 在find中使用映射表进行模糊匹配
 *
 * @param tools 工具列表
 * @returns 增强后的工具列表（原地修改）
 */
export function patchToolArrayWithFuzzyMatching(tools) {
    if (tools.length === 0) {
        console.log(`[ToolInterceptor] No tools to patch (empty allowlist)`);
        return tools;
    }
    // 构建查找映射
    const lookupMap = new ToolLookupMap(tools);
    // 保存原始的find方法
    const originalFind = tools.find;
    /**
     * 劫持find方法
     *
     * Pi Agent Core调用: tools.find(t => t.name === toolCall.name)
     * 我们需要拦截这个调用，使用模糊匹配
     */
    // @ts-ignore - 允许重写find方法
    tools.find = function (predicate, thisArg) {
        // 策略1: 尝试原始查找（精确匹配）
        const exactResult = originalFind.call(this, predicate, thisArg);
        if (exactResult) {
            return exactResult;
        }
        // 策略2: 精确匹配失败，尝试模糊匹配
        // 
        // 问题：我们无法直接获取predicate中的toolCall.name
        // 解决：遍历所有可能的变体名称，构造假工具对象，测试predicate
        // 获取所有可能被查找的名称（从映射表中）
        const testedTools = new Set();
        // 遍历映射表中的所有变体
        for (const [variant, originalTool] of lookupMap['map'].entries()) {
            if (testedTools.has(originalTool))
                continue; // 避免重复测试同一个工具
            // 创建一个假的工具对象，name属性使用变体名称
            const mockTool = new Proxy(originalTool, {
                get(target, prop) {
                    if (prop === 'name') {
                        return variant; // 返回变体名称，而不是原始名称
                    }
                    return target[prop];
                }
            });
            try {
                // 测试predicate是否匹配这个变体
                if (predicate.call(thisArg, mockTool, -1, this)) {
                    console.log(`[ToolInterceptor] 🎯 Matched via variant: "${variant}" -> "${originalTool.name}"`);
                    return originalTool; // 返回原始工具对象
                }
            }
            catch (e) {
                // 忽略predicate执行错误
                // 这可能发生在predicate使用了复杂逻辑时
            }
            testedTools.add(originalTool);
        }
        // 策略3: 仍然找不到，返回undefined
        return undefined;
    };
    console.log(`[ToolInterceptor] ✓ Patched tool array with fuzzy matching`);
    return tools;
}
/**
 * 诊断工具：检查工具名称可能的问题
 */
export function diagnoseToolNames(tools) {
    console.log(`\n[ToolDiagnostics] Analyzing ${tools.length} tools...`);
    const issues = [];
    const seenNames = new Set();
    for (const tool of tools) {
        const name = tool.name;
        // 检查1: 重复名称
        if (seenNames.has(name)) {
            issues.push(`❌ Duplicate tool name: "${name}"`);
        }
        seenNames.add(name);
        // 检查2: 混用命名风格
        if (name.includes('-') && name.includes('_')) {
            issues.push(`⚠️  Mixed naming style: "${name}" (contains both - and _)`);
        }
        // 检查3: 大小写不一致
        if (name !== name.toLowerCase()) {
            issues.push(`⚠️  Non-lowercase name: "${name}"`);
        }
        // 检查4: 特殊字符
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            issues.push(`⚠️  Special characters in name: "${name}"`);
        }
    }
    if (issues.length === 0) {
        console.log(`[ToolDiagnostics] ✓ No issues found`);
    }
    else {
        console.log(`[ToolDiagnostics] Found ${issues.length} potential issues:`);
        issues.forEach(issue => console.log(`  ${issue}`));
    }
    console.log(`[ToolDiagnostics] Analysis complete\n`);
}
/**
 * 测试工具：模拟LLM调用
 */
export function testToolLookup(tools, testCases) {
    console.log(`\n[ToolTest] Testing ${testCases.length} tool name variants...`);
    for (const testName of testCases) {
        const found = tools.find((t) => t.name === testName);
        if (found) {
            console.log(`  ✓ "${testName}" -> "${found.name}"`);
        }
        else {
            console.log(`  ❌ "${testName}" -> NOT FOUND`);
        }
    }
    console.log(`[ToolTest] Test complete\n`);
}
