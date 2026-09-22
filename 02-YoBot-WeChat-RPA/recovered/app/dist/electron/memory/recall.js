// Calibrated against the cosine distribution this embedding model actually
// produces, measured over 45 real query→memory pairs from production traces:
//
//   max 0.567   p90 0.551   median 0.504   min 0.464
//
// The previous 0.62 auto-admit bar was not merely strict, it was unreachable —
// no sample in the corpus came close, so `semantic_relevance` could never fire
// and every semantically relevant memory fell through to the gray zone. These
// values are provisional: they make both tiers reachable for this model, but a
// precision/recall optimum still needs a labelled regression set (design §6).
// Per-agent overrides go through profile.knowledgeMinScore, not new constants.
const DEFAULT_MIN_VECTOR_RELEVANCE = 0.48;
const DEFAULT_STRONG_VECTOR_RELEVANCE = 0.55;
const DEFAULT_MIN_LEXICAL_COVERAGE = 0.42;
const DEFAULT_MAX_RELEVANT = 3;
const DEFAULT_MAX_ALWAYS = 8;
const DEFAULT_MAX_CHARS = 2600;
// Standing context is small by nature (identity, tone, output rules). Reserving
// a slice keeps it from being crowded out, and capping it keeps a large pinned
// set from swallowing the whole budget.
const DEFAULT_MAX_ALWAYS_CHARS = 1200;
// Knowledge-base hits answer the question, so they need more room than the
// personal-memory tier and are budgeted separately from maxInjectedChars.
const DEFAULT_MAX_KNOWLEDGE = 5;
const DEFAULT_MAX_KNOWLEDGE_CHARS = 4000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Compacted query length below which a verbatim match is not strong evidence.
const MIN_EXACT_PHRASE_LENGTH = 6;
// Below this the judge is treated as undecided, and the candidate stays out.
const JUDGE_MIN_CONFIDENCE = 0.65;
// Language-level low-information terms. These are intentionally independent
// from memory paths, products and task types.
const STOP_TERMS = new Set([
    "这个", "那个", "什么", "怎么", "如何", "是否", "可以", "需要", "帮我", "一下",
    "一个", "现在", "进行", "相关", "问题", "内容", "事情", "东西", "我的", "你的",
    "the", "and", "for", "with", "from", "this", "that", "what", "how", "please",
]);
function normalizeText(text) {
    return (text || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/<!--yoko_memory_meta:[\s\S]*?-->/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function isStopTerm(term) {
    return STOP_TERMS.has(term) || term.length < 2;
}
/** Extract discriminative lexical units without relying on a domain dictionary. */
export function extractRecallTerms(text) {
    const normalized = normalizeText(text);
    const terms = [];
    for (const match of normalized.matchAll(/[a-z0-9][a-z0-9_.:/-]*/g)) {
        const term = match[0];
        if (!isStopTerm(term))
            terms.push(term);
    }
    for (const match of normalized.matchAll(/[\p{Script=Han}]+/gu)) {
        const segment = match[0];
        if (segment.length <= 3) {
            if (!isStopTerm(segment))
                terms.push(segment);
            continue;
        }
        // Trigrams carry more meaning; bigrams preserve recall for short queries.
        for (let i = 0; i <= segment.length - 3; i++) {
            const term = segment.slice(i, i + 3);
            if (!isStopTerm(term))
                terms.push(term);
        }
        for (let i = 0; i <= segment.length - 2; i++) {
            const term = segment.slice(i, i + 2);
            if (!isStopTerm(term))
                terms.push(term);
        }
    }
    return [...new Set(terms)];
}
function termWeight(term) {
    if (/^[a-z0-9]/.test(term))
        return Math.min(4, Math.max(2, term.length / 2));
    return term.length >= 3 ? 2 : 1;
}
/**
 * An identifier is discriminative because of its *shape*, never its length.
 *
 * Length alone is what made shared filesystem components ("administrator",
 * "downloads", "documents", "workspace") count as proof of relevance: they are
 * long, they appear in a large share of memories, and they say nothing about
 * whether a memory relates to the request. Any request carrying a Windows path
 * could therefore strong-admit unrelated memories at the highest score.
 *
 * Digits, an internal separator, or camelCase are structural properties a
 * generic word does not have, and they stay domain-agnostic — no product,
 * file-type or task-specific vocabulary is encoded here.
 */
function isDiscriminativeIdentifier(raw) {
    if (raw.length < 3)
        return false;
    if (/[0-9]/.test(raw))
        return true;
    if (/[A-Za-z0-9][_.:/-][A-Za-z0-9]/.test(raw))
        return true;
    return /[a-z][A-Z]/.test(raw);
}
/**
 * Only the leaf name (and its extension-stripped stem) can corroborate.
 *
 * Ancestor directories are organisational containers shared by every chunk
 * underneath them — `memory/users/<uid>/daily/…` would otherwise let a request
 * naming the user id strong-admit that user's entire memory set. The leaf is
 * the part that identifies the individual record.
 */
function pathLeafTokens(normalizedPath) {
    const segments = normalizedPath.split(/[\\/]+/).filter((segment) => segment.trim());
    const leaf = segments[segments.length - 1]?.trim();
    if (!leaf)
        return [];
    const stem = leaf.replace(/\.[a-z0-9]{1,8}$/, "");
    return stem && stem !== leaf ? [leaf, stem] : [leaf];
}
export function analyzeLexicalEvidence(query, text, path) {
    const normalizedQuery = normalizeText(query);
    const normalizedText = normalizeText(text || "");
    const normalizedPath = normalizeText(path || "");
    const normalizedTarget = normalizedPath ? `${normalizedText} ${normalizedPath}` : normalizedText;
    const leafTokens = pathLeafTokens(normalizedPath);
    const queryTerms = extractRecallTerms(query);
    const matchedTerms = queryTerms.filter((term) => normalizedTarget.includes(term));
    const textMatchedTerms = queryTerms.filter((term) => normalizedText.includes(term));
    const totalWeight = queryTerms.reduce((sum, term) => sum + termWeight(term), 0);
    const matchedWeight = matchedTerms.reduce((sum, term) => sum + termWeight(term), 0);
    const textMatchedWeight = textMatchedTerms.reduce((sum, term) => sum + termWeight(term), 0);
    // A verbatim hit only counts against the memory body. Very short queries are
    // excluded: "记忆系统" appearing somewhere in a long unrelated note is not
    // the same evidence as a full request being reproduced.
    const compactQuery = normalizedQuery.replace(/[^a-z0-9\p{Script=Han}]+/gu, "");
    const exactPhrase = compactQuery.length >= MIN_EXACT_PHRASE_LENGTH
        && normalizedText.replace(/\s+/g, "").includes(compactQuery);
    const rawIdentifiers = query.match(/[A-Za-z0-9][A-Za-z0-9_.:/-]{2,}/g) || [];
    const exactIdentifier = rawIdentifiers.some((identifier) => {
        if (!isDiscriminativeIdentifier(identifier))
            return false;
        const normalized = identifier.normalize("NFKC").toLowerCase();
        if (normalizedText.includes(normalized))
            return true;
        // The path may corroborate, but only via its leaf: a memory filed as
        // memory/daily/2026-03-21.md is legitimately "about" that date, while
        // matching a shared directory component proves nothing.
        return leafTokens.includes(normalized);
    });
    return {
        queryTerms,
        matchedTerms,
        textMatchedTerms,
        coverage: totalWeight > 0 ? matchedWeight / totalWeight : 0,
        textCoverage: totalWeight > 0 ? textMatchedWeight / totalWeight : 0,
        exactPhrase,
        exactIdentifier,
        longestMatchLength: textMatchedTerms.reduce((max, term) => Math.max(max, term.length), 0),
    };
}
/** Attach neutral retrieval signals to policy-selected memories (for example pinned rules). */
export function createPolicyCandidate(query, chunk) {
    const existing = chunk.recall;
    if (existing)
        return chunk;
    return {
        ...chunk,
        recall: {
            vectorRelevance: chunk.relevance,
            rrfScore: 0,
            candidateRankScore: 0,
            lexical: analyzeLexicalEvidence(query, chunk.text, chunk.path),
        },
    };
}
export function getRecallPolicy(candidate) {
    return candidate.meta.recallPolicy || "relevant";
}
function isMemoryActive(candidate, now = Date.now()) {
    const meta = candidate.meta;
    if (meta.supersededBy)
        return false;
    if (typeof meta.validFrom === "number" && meta.validFrom > now)
        return false;
    if (typeof meta.validUntil === "number" && meta.validUntil < now)
        return false;
    return true;
}
function isEpisodic(type) {
    return type === "session_summary";
}
export function hasContinuityIntent(query) {
    return /上次|之前|刚才|继续|接着|还记得|历史|过去|前面|原来|那个(?:文件|任务|项目)|last time|previous|earlier|continue|resume|history|remember/i.test(query);
}
function heuristicDecision(query, candidate, options) {
    const meta = candidate.meta;
    const policy = getRecallPolicy(candidate);
    const mode = options.mode;
    if (!isMemoryActive(candidate)) {
        return { candidate, verdict: "rejected", score: 0, reason: "inactive_or_superseded", decidedBy: "policy" };
    }
    if (mode === "automatic" && policy === "search_only") {
        return { candidate, verdict: "rejected", score: 0, reason: "search_only", decidedBy: "policy" };
    }
    if (mode === "automatic" && policy !== "always" && !meta.confirmedByUser && meta.confidence < 0.5) {
        return { candidate, verdict: "rejected", score: 0, reason: "unconfirmed_low_confidence", decidedBy: "policy" };
    }
    if (mode === "automatic" && policy === "always") {
        return { candidate, verdict: "admitted", score: 1, reason: "pinned_always", decidedBy: "policy" };
    }
    const lexical = candidate.recall.lexical;
    const vector = candidate.recall.vectorRelevance;
    const continuity = hasContinuityIntent(query);
    // Strong lexical evidence bypasses the gray zone entirely, so it must come
    // from the memory body. Path overlap stays in `coverage` where it can only
    // nudge ranking and weak signals.
    const strongLexical = lexical.exactPhrase
        || lexical.exactIdentifier
        || (lexical.textCoverage >= options.minLexicalCoverage
            && (lexical.textMatchedTerms.length >= 2 || lexical.longestMatchLength >= 4));
    const weakLexical = lexical.coverage >= 0.16 && lexical.matchedTerms.length > 0;
    const minVector = Math.max(0, Math.min(1, options.minVectorRelevance));
    const strongVector = Math.max(minVector, Math.min(1, options.strongVectorRelevance));
    const vectorStrong = typeof vector === "number" && vector >= strongVector;
    const vectorPass = typeof vector === "number" && vector >= minVector;
    const combinedPass = typeof vector === "number"
        && vector >= minVector
        && lexical.coverage >= 0.28
        && lexical.matchedTerms.length >= 2;
    let score = Math.max(vector || 0, lexical.coverage * 0.82);
    if (strongLexical)
        score = Math.max(score, lexical.exactIdentifier || lexical.exactPhrase ? 0.86 : 0.68);
    if (vectorPass && weakLexical)
        score = Math.min(1, score + 0.05);
    // Episodic memories are continuity-oriented, but strong semantic evidence
    // can still admit them without explicit continuity words.
    if (mode === "automatic" && isEpisodic(meta.memoryType) && !continuity) {
        if (!(strongLexical || (vectorStrong && weakLexical) || (typeof vector === "number" && vector >= strongVector + 0.04))) {
            const close = typeof vector === "number" && vector >= minVector - 0.04;
            return {
                candidate,
                verdict: close ? "ambiguous" : "rejected",
                score,
                reason: close ? "episodic_needs_semantic_judgment" : "episodic_without_continuity",
                decidedBy: "signals",
            };
        }
    }
    if (strongLexical || vectorStrong || combinedPass) {
        return {
            candidate,
            verdict: "admitted",
            score,
            reason: strongLexical ? "strong_lexical" : "semantic_relevance",
            decidedBy: "signals",
        };
    }
    // A medium vector score is useful for candidate generation, but is not
    // enough evidence for prompt injection on its own. Route it through the
    // independent semantic judge; if that judge is unavailable we fail closed.
    if (vectorPass) {
        return {
            candidate,
            verdict: "ambiguous",
            score,
            reason: "semantic_needs_judgment",
            decidedBy: "signals",
        };
    }
    const vectorNear = typeof vector === "number" && vector >= minVector - 0.05;
    const memoryDirected = continuity && (vectorNear || weakLexical);
    if (vectorNear || memoryDirected) {
        return {
            candidate,
            verdict: "ambiguous",
            score,
            reason: memoryDirected ? "continuity_gray_zone" : "semantic_gray_zone",
            decidedBy: "signals",
        };
    }
    // Explicit search may return a wider lexical result set, but rank alone is
    // still never treated as proof of relevance.
    if (mode === "explicit" && weakLexical && candidate.recall.keywordRelativeScore !== undefined
        && candidate.recall.keywordRelativeScore >= 0.7) {
        return {
            candidate,
            verdict: "admitted",
            score: Math.max(score, 0.5),
            reason: "explicit_search_lexical",
            decidedBy: "signals",
        };
    }
    return { candidate, verdict: "rejected", score, reason: "insufficient_query_relation", decidedBy: "signals" };
}
function requiredOptions(options) {
    const minVector = options.minVectorRelevance ?? DEFAULT_MIN_VECTOR_RELEVANCE;
    return {
        mode: options.mode ?? "automatic",
        minVectorRelevance: minVector,
        strongVectorRelevance: options.strongVectorRelevance
            ?? Math.max(DEFAULT_STRONG_VECTOR_RELEVANCE, minVector + 0.07),
        minLexicalCoverage: options.minLexicalCoverage ?? DEFAULT_MIN_LEXICAL_COVERAGE,
        maxRelevantMemories: options.maxRelevantMemories ?? DEFAULT_MAX_RELEVANT,
        maxAlwaysMemories: options.maxAlwaysMemories ?? DEFAULT_MAX_ALWAYS,
        maxInjectedChars: options.maxInjectedChars ?? DEFAULT_MAX_CHARS,
        maxAlwaysChars: options.maxAlwaysChars ?? DEFAULT_MAX_ALWAYS_CHARS,
        isKnowledgeCandidate: options.isKnowledgeCandidate ?? (() => false),
        maxKnowledgeMemories: options.maxKnowledgeMemories ?? DEFAULT_MAX_KNOWLEDGE,
        maxKnowledgeChars: options.maxKnowledgeChars ?? DEFAULT_MAX_KNOWLEDGE_CHARS,
    };
}
function capAdmitted(decisions, options) {
    const admitted = decisions.filter((d) => d.verdict === "admitted");
    const byScore = (a, b) => b.score - a.score;
    const always = admitted
        .filter((d) => getRecallPolicy(d.candidate) === "always")
        .sort(byScore)
        .slice(0, options.maxAlwaysMemories);
    // A knowledge base answers the question; personal memory colours how it is
    // answered. Sharing one 3-slot budget lets a couple of profile facts crowd
    // out the documents the user actually asked about.
    const knowledge = admitted
        .filter((d) => getRecallPolicy(d.candidate) !== "always" && options.isKnowledgeCandidate(d.candidate))
        .sort(byScore)
        .slice(0, options.maxKnowledgeMemories);
    const relevant = admitted
        .filter((d) => getRecallPolicy(d.candidate) !== "always" && !options.isKnowledgeCandidate(d.candidate))
        .sort(byScore)
        .slice(0, options.maxRelevantMemories);
    // The two tiers get separate budgets carved out of the same total. Sharing
    // one pool lets whichever tier sorts first starve the other: a few long
    // query hits would push out the user's identity/style rules, and a large
    // pinned set would leave no room for anything task-specific.
    const selected = new Set();
    const fill = (group, budget) => {
        let used = 0;
        for (const decision of group) {
            const id = decision.candidate.id;
            if (!id)
                continue;
            const nextChars = decision.candidate.text.length;
            // The highest-scoring entry of a tier always gets through, so a
            // single oversized memory cannot silently empty that tier.
            if (used > 0 && used + nextChars > budget)
                continue;
            selected.add(id);
            used += nextChars;
        }
        return used;
    };
    const alwaysChars = fill(always, Math.min(options.maxAlwaysChars, options.maxInjectedChars));
    const knowledgeChars = fill(knowledge, options.maxKnowledgeChars);
    fill(relevant, Math.max(0, options.maxInjectedChars - alwaysChars - knowledgeChars));
    return decisions.map((decision) => {
        if (decision.verdict !== "admitted")
            return decision;
        const id = decision.candidate.id || "";
        if (id && selected.has(id))
            return decision;
        return { ...decision, verdict: "rejected", reason: "context_budget" };
    });
}
export async function selectMemoriesForContext(query, candidates, options = {}) {
    const resolved = requiredOptions(options);
    let decisions = candidates.map((candidate) => heuristicDecision(query, candidate, resolved));
    const ambiguous = decisions
        .filter((decision) => decision.verdict === "ambiguous")
        .sort((a, b) => b.score - a.score);
    // The judge can only ever change an outcome by *admitting* something, and a
    // tier already filled by candidates with strong heuristic evidence should not
    // be reopened for gray-zone ones — so judging those buys nothing but latency.
    const tierHasRoom = (isKnowledge) => {
        const cap = isKnowledge ? resolved.maxKnowledgeMemories : resolved.maxRelevantMemories;
        const used = decisions.filter((d) => d.verdict === "admitted"
            && getRecallPolicy(d.candidate) !== "always"
            && resolved.isKnowledgeCandidate(d.candidate) === isKnowledge).length;
        return used < cap;
    };
    const worthJudging = ambiguous.filter((d) => tierHasRoom(resolved.isKnowledgeCandidate(d.candidate)));
    let judgeStats;
    if (options.judge && ambiguous.length > 0) {
        const startedAt = Date.now();
        let returned = 0, applied = 0, lowConfidence = 0, unmatched = 0;
        let outcome = worthJudging.length === 0 ? "skipped" : "ok";
        let error;
        if (worthJudging.length > 0) {
            try {
                const judged = await options.judge(query, worthJudging.map((d) => d.candidate));
                returned = judged.length;
                if (returned === 0)
                    outcome = "empty";
                const byId = new Map(judged.map((decision) => [decision.id, decision]));
                decisions = decisions.map((decision) => {
                    if (decision.verdict !== "ambiguous")
                        return decision;
                    const id = decision.candidate.id || "";
                    const result = byId.get(id);
                    if (!result) {
                        unmatched++;
                        return decision;
                    }
                    if (result.confidence < JUDGE_MIN_CONFIDENCE) {
                        lowConfidence++;
                        return decision;
                    }
                    applied++;
                    return {
                        ...decision,
                        verdict: result.relevant ? "admitted" : "rejected",
                        score: Math.max(decision.score, result.confidence),
                        reason: result.reason || (result.relevant ? "judge_relevant" : "judge_unrelated"),
                        decidedBy: "judge",
                    };
                });
            }
            catch (e) {
                outcome = "error";
                error = e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120);
                console.warn("[MemoryRecall] Relevance judge failed; keeping conservative decisions:", e);
            }
        }
        judgeStats = {
            invoked: worthJudging.length > 0,
            candidates: worthJudging.length,
            returned,
            applied,
            lowConfidence,
            unmatched,
            latencyMs: Date.now() - startedAt,
            outcome,
            ...(error ? { error } : {}),
        };
    }
    // Unresolved ambiguity is deliberately not injected. It remains observable
    // and available to explicit knowledge_search.
    decisions = capAdmitted(decisions, resolved);
    return {
        admitted: decisions.filter((d) => d.verdict === "admitted").map((d) => d.candidate),
        ambiguous: decisions.filter((d) => d.verdict === "ambiguous").map((d) => d.candidate),
        rejected: decisions.filter((d) => d.verdict === "rejected").map((d) => d.candidate),
        decisions,
        ...(judgeStats ? { judge: judgeStats } : {}),
    };
}
/**
 * Conservative post-answer attribution. A memory is grounded only when the
 * answer contains discriminative memory terms that were not already present in
 * the request. False negatives are acceptable; false positives would corrupt
 * lifecycle ranking.
 */
export function detectGroundedMemoryIds(query, response, injected) {
    const queryTerms = new Set(extractRecallTerms(query));
    const responseNormalized = normalizeText(response);
    const grounded = [];
    for (const memory of injected) {
        if (!memory.id)
            continue;
        // Standing context is injected by policy, not by a retrieval decision,
        // so "did the answer use it" answers no question we are asking: the user
        // decides whether a rule stays, not the lifecycle counter. Its wording is
        // also inherently generic ("代码"/"回答"/"注释"), which makes it collide
        // with almost any technical answer — observed crediting a coding-style
        // rule for an answer about session architecture.
        if (getRecallPolicy(memory) === "always")
            continue;
        const memoryOnlyTerms = extractRecallTerms(memory.text).filter((term) => !queryTerms.has(term));
        const matched = memoryOnlyTerms.filter((term) => responseNormalized.includes(term));
        const hasIdentifier = matched.some((term) => /^[a-z0-9]/.test(term) && /[0-9_.:/-]/.test(term));
        const weighted = matched.reduce((sum, term) => sum + termWeight(term), 0);
        if (hasIdentifier || matched.some((term) => term.length >= 4) || weighted >= 4) {
            grounded.push(memory.id);
        }
    }
    return grounded;
}
/** Stable support score for lifecycle tie-breaking; prompt injection is excluded. */
export function decayedGroundedSupport(meta, now = Date.now()) {
    const count = meta.groundedCount || 0;
    if (count <= 0 || !meta.lastGroundedAt)
        return 0;
    const age = Math.max(0, now - meta.lastGroundedAt);
    const halfLife = 90 * DAY_MS;
    return Math.log1p(count) * Math.exp(-Math.LN2 * age / halfLife);
}
