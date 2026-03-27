import type {
    RuleCategory,
    ExtractionRule,
    RuleFieldMapping,
    ExtractedField,
} from "./mock";
import {
    mockRuleFieldMappings,
    mockApplications,
    mockExtractedFields,
    buildInitialExtractedFieldsByApp,
    mockExtractionRules as initialRules,
    mockRuleCategories as initialCategories,
    defaultFieldRuleIds as initialDefaultFieldRuleIds,
    DOCUMENT_FIELD_KEYS,
} from "./mock";

// Mutable in-memory store (seeded from mocks)
let categories: RuleCategory[] = [...initialCategories];
let extractionRules: ExtractionRule[] = [...initialRules];
let mappings: RuleFieldMapping[] = [...mockRuleFieldMappings];
let extractedFieldsByApp: Record<string, ExtractedField[]> = buildInitialExtractedFieldsByApp();
let defaultFieldRuleIds: Record<string, string> = { ...initialDefaultFieldRuleIds };
let documentFieldKeys: string[] = [...DOCUMENT_FIELD_KEYS];

function ensureDefaultMappings() {
    const ruleById = Object.fromEntries(extractionRules.map((r) => [r.id, r]));
    for (const appId of mockApplications.map((a) => a.id)) {
        for (const fieldKey of DOCUMENT_FIELD_KEYS) {
            if (!getMapping(appId, fieldKey)) {
                const ruleId = defaultFieldRuleIds[fieldKey];
                if (ruleId && ruleById[ruleId]) mappings.push({ ruleId, fieldKey, applicationId: appId });
            }
        }
    }
}
ensureDefaultMappings();

export { DOCUMENT_FIELD_KEYS };

export function listDocumentFieldKeys(): string[] {
    return [...documentFieldKeys];
}

export function addDocumentFieldKey(fieldKey: string): void {
    const trimmed = fieldKey.trim();
    if (!trimmed) return;
    if (documentFieldKeys.includes(trimmed)) return;
    documentFieldKeys.unshift(trimmed);
}

export function renameDocumentFieldKey(oldKey: string, newKey: string): void {
    const from = oldKey.trim();
    const to = newKey.trim();
    if (!from || !to || from === to) return;
    if (documentFieldKeys.includes(to)) return;
    const idx = documentFieldKeys.findIndex((k) => k === from);
    if (idx === -1) return;
    documentFieldKeys[idx] = to;
    if (defaultFieldRuleIds[from] != null) {
        defaultFieldRuleIds[to] = defaultFieldRuleIds[from];
        delete defaultFieldRuleIds[from];
    }
}

export function deleteDocumentFieldKey(fieldKey: string): void {
    const trimmed = fieldKey.trim();
    if (!trimmed) return;
    documentFieldKeys = documentFieldKeys.filter((k) => k !== trimmed);
    delete defaultFieldRuleIds[trimmed];
}

// --- Categories ---
export function listCategories(): RuleCategory[] {
    return categories;
}

export function getCategory(id: string): RuleCategory | undefined {
    return categories.find((c) => c.id === id);
}

export function createCategory(data: { name: string; description?: string }): RuleCategory {
    const id = `cat-${Date.now()}`;
    const cat: RuleCategory = { id, name: data.name, description: data.description };
    categories.push(cat);
    return cat;
}

export function updateCategory(id: string, data: Partial<Pick<RuleCategory, "name" | "description">>): RuleCategory | undefined {
    const i = categories.findIndex((c) => c.id === id);
    if (i === -1) return undefined;
    categories[i] = { ...categories[i], ...data };
    return categories[i];
}

// --- Extraction rules ---
export function listExtractionRules(categoryId?: string): ExtractionRule[] {
    if (categoryId) return extractionRules.filter((r) => r.categoryId === categoryId);
    return extractionRules;
}

export function getExtractionRule(id: string): ExtractionRule | undefined {
    return extractionRules.find((r) => r.id === id);
}

function nextRuleBaseId(): string {
    const bases = new Set(extractionRules.map((r) => r.ruleBaseId));
    let n = 1;
    while (bases.has(`ER${n}`)) n++;
    return `ER${n}`;
}

function parseVersion(version: string): [number, number] {
    const [major = 0, minor = 0] = version.split(".").map((s) => parseInt(s, 10) || 0);
    return [major, minor];
}

function nextVersionForBase(ruleBaseId: string): string {
    const versions = extractionRules
        .filter((r) => r.ruleBaseId === ruleBaseId)
        .map((r) => r.version);
    if (versions.length === 0) return "1.0";
    const [maxMajor, maxMinor] = versions.reduce(
        (max, v) => {
            const [a, b] = parseVersion(v);
            if (a > max[0]) return [a, b];
            if (a === max[0] && b > max[1]) return [a, b];
            return max;
        },
        [0, 0]
    );
    return `${maxMajor}.${maxMinor + 1}`;
}

function versionedRuleId(ruleBaseId: string, version: string): string {
    return `${ruleBaseId}-v${version}`;
}

export function createExtractionRule(data: {
    name: string;
    categoryId: string;
    description?: string;
    prompt: string;
}): ExtractionRule {
    const ruleBaseId = nextRuleBaseId();
    const version = "1.0";
    const id = versionedRuleId(ruleBaseId, version);
    const rule: ExtractionRule = {
        id,
        ruleBaseId,
        name: data.name,
        categoryId: data.categoryId,
        description: data.description,
        prompt: data.prompt,
        version,
        lastModified: new Date().toISOString().slice(0, 10),
    };
    extractionRules.push(rule);
    return rule;
}

/** Create a new version of an existing rule (used when editing from application detail). */
export function createNewRuleVersion(
    ruleBaseId: string,
    data: Partial<Pick<ExtractionRule, "name" | "description" | "prompt" | "lastEditedBy" | "lastEditedAt">>
): ExtractionRule {
    const existing = extractionRules.find((r) => r.ruleBaseId === ruleBaseId);
    if (!existing) throw new Error("Rule not found");
    const version = nextVersionForBase(ruleBaseId);
    const id = versionedRuleId(ruleBaseId, version);
    const rule: ExtractionRule = {
        id,
        ruleBaseId,
        name: data.name ?? existing.name,
        categoryId: existing.categoryId,
        description: data.description ?? existing.description,
        prompt: data.prompt ?? existing.prompt,
        version,
        lastModified: new Date().toISOString().slice(0, 10),
        lastEditedBy: data.lastEditedBy ?? "system",
        lastEditedAt: data.lastEditedAt ?? new Date().toISOString(),
    };
    extractionRules.push(rule);
    return rule;
}

export function updateExtractionRule(
    id: string,
    data: Partial<Pick<ExtractionRule, "name" | "categoryId" | "description" | "prompt">>
): ExtractionRule | undefined {
    const i = extractionRules.findIndex((r) => r.id === id);
    if (i === -1) return undefined;
    extractionRules[i] = {
        ...extractionRules[i],
        ...data,
        lastModified: new Date().toISOString().slice(0, 10),
    };
    return extractionRules[i];
}

export function listVersionsForRule(ruleBaseId: string): ExtractionRule[] {
    const list = extractionRules.filter((r) => r.ruleBaseId === ruleBaseId);
    list.sort((a, b) => {
        const [a1, a2] = parseVersion(a.version);
        const [b1, b2] = parseVersion(b.version);
        if (a1 !== b1) return a1 - b1;
        return a2 - b2;
    });
    return list;
}

export interface RuleBaseInfo {
    ruleBaseId: string;
    name: string;
    categoryId: string;
    versionCount: number;
    lastModified: string;
}

export function listRuleBases(): RuleBaseInfo[] {
    const byBase = new Map<string, ExtractionRule[]>();
    for (const r of extractionRules) {
        const list = byBase.get(r.ruleBaseId) ?? [];
        list.push(r);
        byBase.set(r.ruleBaseId, list);
    }
    const result = Array.from(byBase.entries()).map(([ruleBaseId, versions]) => {
        const sorted = [...versions].sort((a, b) => {
            const [a1, a2] = parseVersion(a.version);
            const [b1, b2] = parseVersion(b.version);
            if (a1 !== b1) return a1 - b1;
            return a2 - b2;
        });
        const first = sorted[0]!;
        const last = sorted[sorted.length - 1]!;
        return {
            ruleBaseId,
            name: first.name,
            categoryId: first.categoryId,
            versionCount: versions.length,
            lastModified: last.lastModified,
        };
    });
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
}

/** Total mapping count for a rule (all versions of that base). */
export function listMappingsByRuleBase(ruleBaseId: string): RuleFieldMapping[] {
    const versionIds = new Set(extractionRules.filter((r) => r.ruleBaseId === ruleBaseId).map((r) => r.id));
    return mappings.filter((m) => versionIds.has(m.ruleId));
}

// --- Mappings ---
export function getMapping(applicationId: string, fieldKey: string): RuleFieldMapping | undefined {
    return mappings.find((m) => m.applicationId === applicationId && m.fieldKey === fieldKey);
}

/** Default field → rule mapping (used when no per-application override). */
export function getDefaultMapping(fieldKey: string): string | undefined {
    return defaultFieldRuleIds[fieldKey];
}

/** Set default rule for a document field. Affects new applications and any app without an override. */
export function setDefaultMapping(fieldKey: string, ruleId: string): void {
    defaultFieldRuleIds[fieldKey] = ruleId;
}

export function clearDefaultMapping(fieldKey: string): void {
    delete defaultFieldRuleIds[fieldKey];
}

export function setMapping(applicationId: string, fieldKey: string, ruleId: string): void {
    const i = mappings.findIndex((m) => m.applicationId === applicationId && m.fieldKey === fieldKey);
    const entry: RuleFieldMapping = { ruleId, fieldKey, applicationId };
    if (i >= 0) mappings[i] = entry;
    else mappings.push(entry);
}

export function listMappingsByRule(ruleId: string): RuleFieldMapping[] {
    return mappings.filter((m) => m.ruleId === ruleId);
}

// --- Per-application extracted fields ---
export function getExtractedFieldsForApplication(applicationId: string): ExtractedField[] {
    let fields = extractedFieldsByApp[applicationId];
    if (fields) return fields;
    // Fallback: clone mock and resolve rule names + version, then cache
    const ruleById = Object.fromEntries(extractionRules.map((r) => [r.id, r]));
    fields = mockExtractedFields.map((f) => {
        const mapping = getMapping(applicationId, f.field);
        const ruleId = mapping?.ruleId ?? getDefaultMapping(f.field) ?? undefined;
        const rule = ruleId ? ruleById[ruleId] : undefined;
        return {
            ...f,
            ruleId,
            ruleName: rule?.name ?? f.ruleName ?? "—",
            ruleVersion: rule?.version ?? f.ruleVersion,
        };
    });
    extractedFieldsByApp[applicationId] = fields;
    return fields;
}

export function updateExtractedFieldForApplication(
    applicationId: string,
    fieldKey: string,
    update: Partial<Pick<ExtractedField, "value" | "confidence" | "ruleId" | "ruleName" | "ruleVersion">>
): void {
    if (!extractedFieldsByApp[applicationId]) {
        extractedFieldsByApp[applicationId] = getExtractedFieldsForApplication(applicationId);
    }
    const arr = extractedFieldsByApp[applicationId];
    const i = arr.findIndex((f) => f.field === fieldKey);
    if (i === -1) return;
    arr[i] = { ...arr[i], ...update };
}

// --- Edit rule from application detail: create new version and map field to it ---
export function editRuleFromField(
    applicationId: string,
    fieldKey: string,
    currentRuleId: string,
    editedBy: string,
    edits: Partial<Pick<ExtractionRule, "name" | "description" | "prompt">>
): { newRule: ExtractionRule } {
    const current = getExtractionRule(currentRuleId);
    if (!current) throw new Error("Rule not found");
    const newRule = createNewRuleVersion(current.ruleBaseId, {
        name: edits.name ?? current.name,
        description: edits.description ?? current.description,
        prompt: edits.prompt ?? current.prompt,
        lastEditedBy: editedBy,
        lastEditedAt: new Date().toISOString(),
    });
    setMapping(applicationId, fieldKey, newRule.id);
    updateExtractedFieldForApplication(applicationId, fieldKey, {
        ruleId: newRule.id,
        ruleName: newRule.name,
        ruleVersion: newRule.version,
    });
    return { newRule };
}

// --- Per-field approve/reject (application detail) ---
type FieldDecision = "approved" | "rejected";
const fieldDecisions: Record<string, Record<string, FieldDecision>> = {};
const fieldDecisionReasons: Record<string, Record<string, string>> = {};

export function getFieldDecision(applicationId: string, fieldKey: string): FieldDecision | undefined {
    return fieldDecisions[applicationId]?.[fieldKey];
}

export function getFieldDecisionReason(applicationId: string, fieldKey: string): string | undefined {
    return fieldDecisionReasons[applicationId]?.[fieldKey];
}

export function setFieldDecision(applicationId: string, fieldKey: string, decision: FieldDecision, reason?: string): void {
    if (!fieldDecisions[applicationId]) fieldDecisions[applicationId] = {};
    fieldDecisions[applicationId][fieldKey] = decision;
    if (!fieldDecisionReasons[applicationId]) fieldDecisionReasons[applicationId] = {};
    if (decision === "rejected") {
        fieldDecisionReasons[applicationId][fieldKey] = (reason ?? "").trim();
    } else {
        delete fieldDecisionReasons[applicationId][fieldKey];
    }
}

// --- Rule performance (aggregate precision across applications) ---
export interface RulePerformanceStat {
    ruleBaseId: string;
    ruleName: string;
    /** Mean extraction confidence (0–100), used as precision proxy. */
    precision: number;
    /** Number of extractions (invocations) across all applications. */
    invocations: number;
}

export function getRulePerformanceStats(): RulePerformanceStat[] {
    const ruleById = Object.fromEntries(extractionRules.map((r) => [r.id, r]));
    const byBase: Record<string, { sumConf: number; count: number; name: string }> = {};
    for (const app of mockApplications) {
        const fields = getExtractedFieldsForApplication(app.id);
        for (const f of fields) {
            const ruleId = f.ruleId;
            const rule = ruleId ? ruleById[ruleId] : undefined;
            const baseId = rule?.ruleBaseId ?? "unknown";
            if (!byBase[baseId]) byBase[baseId] = { sumConf: 0, count: 0, name: rule?.name ?? f.ruleName ?? baseId };
            byBase[baseId].sumConf += f.confidence;
            byBase[baseId].count += 1;
        }
    }
    return extractionRules
        .filter((r, i, arr) => arr.findIndex((x) => x.ruleBaseId === r.ruleBaseId) === i)
        .map((r) => {
            const agg = byBase[r.ruleBaseId] ?? { sumConf: 0, count: 0, name: r.name };
            const precision = agg.count ? Math.round((agg.sumConf / agg.count) * 10) / 10 : 0;
            return {
                ruleBaseId: r.ruleBaseId,
                ruleName: agg.name,
                precision,
                invocations: agg.count,
            };
        })
        .filter((s) => s.invocations > 0)
        .sort((a, b) => b.precision - a.precision);
}

// --- Reprocess: mock re-extract value and confidence for one field ---
export function reprocessField(applicationId: string, fieldKey: string): ExtractedField {
    const mapping = getMapping(applicationId, fieldKey);
    const ruleId = mapping?.ruleId;
    const rule = ruleId ? getExtractionRule(ruleId) : undefined;
    // Mock: slight variation in value and confidence for POC
    const base = getExtractedFieldsForApplication(applicationId).find((f) => f.field === fieldKey);
    const baseValue = base?.value ?? "";
    const baseConf = base?.confidence ?? 75;
    const newConf = Math.min(99, Math.max(60, baseConf + Math.floor(Math.random() * 12) - 5));
    const newValue = baseValue; // keep same for mock, or could vary
    updateExtractedFieldForApplication(applicationId, fieldKey, { value: newValue, confidence: newConf });
    const updated = getExtractedFieldsForApplication(applicationId).find((f) => f.field === fieldKey)!;
    return updated;
}
