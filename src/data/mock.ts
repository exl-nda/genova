export type DecisionStatus = "auto_approved" | "review_required" | "rejected";

/** Real-world suppliers used for HDA forms; kept in a const for future supplier-level stats. */
export const SUPPLIERS = [
  "McKesson",
  "AmerisourceBergen",
  "Cardinal Health",
  "Cencora",
  "Morris & Dickson",
] as const;
export type Supplier = (typeof SUPPLIERS)[number];

// Dosage types (used for metrics drill-down)
export const DOSAGE_TYPES = ["Tablets", "Injectables", "Capsules", "Liquids", "Topicals"] as const;
export type DosageType = (typeof DOSAGE_TYPES)[number];

export interface Application {
  id: string;
  applicantName: string;
  supplier: Supplier;
  /** Optional for metrics: filter by dosage type */
  dosageType?: DosageType;
  confidence: number;
  riskScore: number;
  competencyLevel: string;
  ruleFlagsCount: number;
  decisionStatus: DecisionStatus;
  source: string;
  timestamp: string;
}

export const mockApplications: Application[] = [
  { id: "NDC-001", applicantName: "Jane Smith", supplier: "McKesson", dosageType: "Tablets", confidence: 94, riskScore: 12, competencyLevel: "Highly Intelligent", ruleFlagsCount: 0, decisionStatus: "auto_approved", source: "Upload", timestamp: "2026-02-27T10:30:00Z" },
  { id: "NDC-002", applicantName: "John Doe", supplier: "AmerisourceBergen", dosageType: "Injectables", confidence: 78, riskScore: 35, competencyLevel: "Needs Training", ruleFlagsCount: 2, decisionStatus: "review_required", source: "API", timestamp: "2026-02-27T10:25:00Z" },
  { id: "NDC-003", applicantName: "Alice Brown", supplier: "Cardinal Health", dosageType: "Capsules", confidence: 88, riskScore: 22, competencyLevel: "Intelligent", ruleFlagsCount: 1, decisionStatus: "review_required", source: "Upload", timestamp: "2026-02-27T10:20:00Z" },
  { id: "NDC-004", applicantName: "Bob Wilson", supplier: "Cencora", dosageType: "Liquids", confidence: 65, riskScore: 72, competencyLevel: "Needs Training", ruleFlagsCount: 4, decisionStatus: "rejected", source: "Upload", timestamp: "2026-02-27T10:15:00Z" },
  { id: "NDC-005", applicantName: "Carol Lee", supplier: "Morris & Dickson", dosageType: "Topicals", confidence: 92, riskScore: 8, competencyLevel: "Highly Intelligent", ruleFlagsCount: 0, decisionStatus: "auto_approved", source: "API", timestamp: "2026-02-27T10:10:00Z" },
];

export interface CompetencyBand {
  accuracyMin: number;
  accuracyMax: number;
  label: string;
  autoApproval: "enabled" | "conditional" | "disabled";
}

export const defaultCompetencyBands: CompetencyBand[] = [
  { accuracyMin: 90, accuracyMax: 100, label: "Highly Intelligent", autoApproval: "enabled" },
  { accuracyMin: 80, accuracyMax: 90, label: "Intelligent", autoApproval: "conditional" },
  { accuracyMin: 75, accuracyMax: 80, label: "Needs Training", autoApproval: "disabled" },
];

// Competency by dosage type (tablets, injectables, etc.) — DOSAGE_TYPES moved up with Application
export const defaultCompetencyBandsByDosage: Record<DosageType, CompetencyBand[]> = {
  Tablets: [
    { accuracyMin: 92, accuracyMax: 100, label: "Highly Intelligent", autoApproval: "enabled" },
    { accuracyMin: 82, accuracyMax: 92, label: "Intelligent", autoApproval: "conditional" },
    { accuracyMin: 75, accuracyMax: 82, label: "Needs Training", autoApproval: "disabled" },
  ],
  Injectables: [
    { accuracyMin: 95, accuracyMax: 100, label: "Highly Intelligent", autoApproval: "enabled" },
    { accuracyMin: 88, accuracyMax: 95, label: "Intelligent", autoApproval: "conditional" },
    { accuracyMin: 80, accuracyMax: 88, label: "Needs Training", autoApproval: "disabled" },
  ],
  Capsules: [
    { accuracyMin: 90, accuracyMax: 100, label: "Highly Intelligent", autoApproval: "enabled" },
    { accuracyMin: 80, accuracyMax: 90, label: "Intelligent", autoApproval: "conditional" },
    { accuracyMin: 75, accuracyMax: 80, label: "Needs Training", autoApproval: "disabled" },
  ],
  Liquids: [
    { accuracyMin: 88, accuracyMax: 100, label: "Highly Intelligent", autoApproval: "enabled" },
    { accuracyMin: 78, accuracyMax: 88, label: "Intelligent", autoApproval: "conditional" },
    { accuracyMin: 70, accuracyMax: 78, label: "Needs Training", autoApproval: "disabled" },
  ],
  Topicals: [
    { accuracyMin: 90, accuracyMax: 100, label: "Highly Intelligent", autoApproval: "enabled" },
    { accuracyMin: 80, accuracyMax: 90, label: "Intelligent", autoApproval: "conditional" },
    { accuracyMin: 72, accuracyMax: 80, label: "Needs Training", autoApproval: "disabled" },
  ],
};

/** Accuracy-over-time series for metrics page: key = supplier or dosage type. */
export type MetricsDimension = "supplier" | "dosageType";

export const mockAccuracyOverTimeBySupplier: Record<Supplier, { week: string; accuracy: number }[]> = {
  McKesson: [
    { week: "W1", accuracy: 91 },
    { week: "W2", accuracy: 93 },
    { week: "W3", accuracy: 92 },
    { week: "W4", accuracy: 94 },
  ],
  AmerisourceBergen: [
    { week: "W1", accuracy: 76 },
    { week: "W2", accuracy: 78 },
    { week: "W3", accuracy: 79 },
    { week: "W4", accuracy: 80 },
  ],
  "Cardinal Health": [
    { week: "W1", accuracy: 85 },
    { week: "W2", accuracy: 86 },
    { week: "W3", accuracy: 88 },
    { week: "W4", accuracy: 87 },
  ],
  Cencora: [
    { week: "W1", accuracy: 62 },
    { week: "W2", accuracy: 64 },
    { week: "W3", accuracy: 65 },
    { week: "W4", accuracy: 66 },
  ],
  "Morris & Dickson": [
    { week: "W1", accuracy: 89 },
    { week: "W2", accuracy: 90 },
    { week: "W3", accuracy: 91 },
    { week: "W4", accuracy: 92 },
  ],
};

export const mockAccuracyOverTimeByDosage: Record<DosageType, { week: string; accuracy: number }[]> = {
  Tablets: [
    { week: "W1", accuracy: 88 },
    { week: "W2", accuracy: 90 },
    { week: "W3", accuracy: 91 },
    { week: "W4", accuracy: 92 },
  ],
  Injectables: [
    { week: "W1", accuracy: 82 },
    { week: "W2", accuracy: 84 },
    { week: "W3", accuracy: 85 },
    { week: "W4", accuracy: 86 },
  ],
  Capsules: [
    { week: "W1", accuracy: 86 },
    { week: "W2", accuracy: 87 },
    { week: "W3", accuracy: 88 },
    { week: "W4", accuracy: 89 },
  ],
  Liquids: [
    { week: "W1", accuracy: 79 },
    { week: "W2", accuracy: 81 },
    { week: "W3", accuracy: 82 },
    { week: "W4", accuracy: 83 },
  ],
  Topicals: [
    { week: "W1", accuracy: 90 },
    { week: "W2", accuracy: 91 },
    { week: "W3", accuracy: 91 },
    { week: "W4", accuracy: 92 },
  ],
};

export interface AuditEvent {
  id: string;
  applicationId: string;
  decisionType: string;
  modelVersion: string;
  ruleVersion: string;
  timestamp: string;
  stage: "extraction" | "rule_execution" | "model_decision" | "human_override";
  details: string;
}

export const mockAuditEvents: AuditEvent[] = [
  { id: "E1", applicationId: "NDC-001", decisionType: "Auto Approved", modelVersion: "v2.3", ruleVersion: "R1:2.1", timestamp: "2026-02-27T10:30:05Z", stage: "extraction", details: "Fields extracted" },
  { id: "E2", applicationId: "NDC-001", decisionType: "Auto Approved", modelVersion: "v2.3", ruleVersion: "R1:2.1", timestamp: "2026-02-27T10:30:06Z", stage: "rule_execution", details: "No rules triggered" },
  { id: "E3", applicationId: "NDC-001", decisionType: "Auto Approved", modelVersion: "v2.3", ruleVersion: "-", timestamp: "2026-02-27T10:30:07Z", stage: "model_decision", details: "Confidence 94%" },
  { id: "E4", applicationId: "NDC-002", decisionType: "Review Required", modelVersion: "v2.3", ruleVersion: "R2:1.0", timestamp: "2026-02-27T10:25:10Z", stage: "human_override", details: "Assigned to reviewer" },
];

// --- Extraction rules (field extraction, not business rules) ---

export interface RuleCategory {
  id: string;
  name: string;
  description?: string;
}

export interface ExtractionRule {
  id: string; // versioned id, e.g. "ER1-v1.0"
  ruleBaseId: string; // logical rule id, e.g. "ER1"
  name: string;
  categoryId: string;
  description?: string;
  prompt: string; // natural language prompt for extraction
  version: string; // e.g. "1.0", "1.1"
  lastModified: string;
}

export interface RuleFieldMapping {
  ruleId: string;
  fieldKey: string;
  applicationId: string;
}

export const mockRuleCategories: RuleCategory[] = [
  { id: "cat-generic", name: "Generic", description: "Generic rules for UAT" },
];

const CAT = "cat-generic";
const V = "1.0";
const LM = "2026-02-27";

function ruleVersionedId(baseId: string, version: string): string {
  return `${baseId}-v${version}`;
}

export const mockExtractionRules: ExtractionRule[] = [
  { id: ruleVersionedId("ER1", V), ruleBaseId: "ER1", name: "Catalog Item", categoryId: CAT, prompt: "Static/ Always 'Yes'", version: V, lastModified: LM },
  { id: ruleVersionedId("ER2", V), ruleBaseId: "ER2", name: "Load TBA", categoryId: CAT, prompt: "Static/ Always 'No'", version: V, lastModified: LM },
  { id: ruleVersionedId("ER3", V), ruleBaseId: "ER3", name: "Vendor Name", categoryId: CAT, prompt: "Extracting From HDA=> Under 'Product Information' Section 'Company Name'", version: V, lastModified: LM },
  {
    id: ruleVersionedId("ER4", V),
    ruleBaseId: "ER4",
    name: "Vendor ID",
    categoryId: CAT,
    prompt: "Data is extracted from Snowflake using the provided query. Dynamic filters are added to the query based on data obtained from HDA—for example, DSCSA Exempt mapped to Keyword 4, Temperature Range mapped to Keyword 2, and Controlled Substance mapped to Keyword 3. Additionally, the first part of the vendor name is used as a dynamic input in the query to retrieve the required results. An alert is configured to be sent for PM review when multiple rows are returned, including all rows fetched from Snowflake, as suggested.",
    version: V,
    lastModified: LM,
  },
  { id: ruleVersionedId("ER5", V), ruleBaseId: "ER5", name: "DC Table", categoryId: CAT, prompt: "Static/Always 'table 10 (RX)'", version: V, lastModified: LM },
  {
    id: ruleVersionedId("ER6", V),
    ruleBaseId: "ER6",
    name: "Individual DC",
    categoryId: CAT,
    prompt: "Data is extracted from Snowflake using the provided query, with dynamic filters applied based on data obtained from HDA. Specifically, DSCSA Exempt is mapped to Keyword 4, Temperature Range to Keyword 2, and Controlled Substance to Keyword 3. Additionally, the first part of the vendor name is used as a dynamic input in the query to retrieve the relevant results. From the filtered output, if Keyword 2 is NRDC, the value is set to 8106 (NRDC); if Keyword 2 is SRC, the value is set to 8107 (SRC). An alert is generated for PM review if a supplier is associated with both NRDC/SRC and FDC.",
    version: V,
    lastModified: LM,
  },
  { id: ruleVersionedId("ER7", V), ruleBaseId: "ER7", name: "MNC", categoryId: CAT, prompt: "Static/None, For Phase-1", version: V, lastModified: LM },
  { id: ruleVersionedId("ER8", V), ruleBaseId: "ER8", name: "PUD (Always 1)", categoryId: CAT, prompt: "Static/Always 1", version: V, lastModified: LM },
  {
    id: ruleVersionedId("ER9", V),
    ruleBaseId: "ER9",
    name: "Generic Indicator",
    categoryId: CAT,
    prompt: "Provide information to load item, BUT also alert the PM that application type is not what we would expect it to be for a generic item: We occasionally need to load these application types, so we do not want to reject them outright. For example, Pfizer and Baxter often load NDAs (that are not AG or 505(b)(2)) as generics. If the bot rejects these cases based on their application type, but we still intend to load them as generics, we would have to process them manually since resubmitting through the bot would only result in a second rejection. Application types: NDA with 505(b)(1) listed in the NDA 505(b) Type box; NDA with nothing in 505(b) Type field and AG box is not checked under FOR GENERIC DRUG PRODUCTS; BLA; Med Device; Blank; Unapproved drug other; Anything else.",
    version: V,
    lastModified: LM,
  },
  { id: ruleVersionedId("ER10", V), ruleBaseId: "ER10", name: "MCK-GPC", categoryId: CAT, prompt: "Static/1- Reg Generic Drug", version: V, lastModified: LM },
  { id: ruleVersionedId("ER11", V), ruleBaseId: "ER11", name: "Pri-Ord-Item", categoryId: CAT, prompt: "Static/Yes, For Phase-1", version: V, lastModified: LM },
  {
    id: ruleVersionedId("ER12", V),
    ruleBaseId: "ER12",
    name: "SVC LVL Catgy",
    categoryId: CAT,
    prompt: "Extracting From HDA=> Under 'Product information' Section, 'Description', 'Proprietary Name (if Applicable) and Established Name'. Under 'Product Description Information' Section, 'Dosage Form'. Under 'Order Information' Section, 'What is NDC Selling Unit?'. Under 'Additional Product Information' Section 'Is the Product...'. If the 'Dosage Form/Description/Proprietary Name/Is the Product... contains Injection/Injectable, Vial, SDV, MDV, single dose vial, multidose vial, cartridge, bags, UD Cups, Syringe, PFS, Ampule, Ampul, IV Solution, piggyback then value will be 'H- Hospital Item' else 'G-Generic Item'",
    version: V,
    lastModified: LM,
  },
];

/** Document field keys used for extraction (used in field mapping UI). */
export const DOCUMENT_FIELD_KEYS = [
  "Catalog Item",
  "Load TBA",
  "Vendor Name",
  "Vendor ID",
  "DC Table",
  "Individual DC",
  "MNC",
  "PUD (Always 1)",
  "Generic Indicator",
  "MCK-GPC",
  "Pri-Ord-Item",
  "SVC LVL Catgy",
] as const;

// Default mappings: fieldKey -> versioned rule id (e.g. ER1-v1.0)
export const defaultFieldRuleIds: Record<string, string> = {
  "Catalog Item": "ER1-v1.0",
  "Load TBA": "ER2-v1.0",
  "Vendor Name": "ER3-v1.0",
  "Vendor ID": "ER4-v1.0",
  "DC Table": "ER5-v1.0",
  "Individual DC": "ER6-v1.0",
  MNC: "ER7-v1.0",
  "PUD (Always 1)": "ER8-v1.0",
  "Generic Indicator": "ER9-v1.0",
  "MCK-GPC": "ER10-v1.0",
  "Pri-Ord-Item": "ER11-v1.0",
  "SVC LVL Catgy": "ER12-v1.0",
};

export const mockRuleFieldMappings: RuleFieldMapping[] = [];

// --- ExtractedField (extended with rule reference) ---

export interface ExtractedField {
  field: string;
  value: string;
  confidence: number;
  editable: boolean;
  ruleId?: string; // versioned rule id, e.g. ER1-v1.0
  ruleName?: string;
  ruleVersion?: string; // e.g. "1.0"
}

export const mockExtractedFields: ExtractedField[] = [
  { field: "Catalog Item", value: "Yes", confidence: 100, editable: false, ruleId: "ER1-v1.0", ruleName: "Catalog Item", ruleVersion: "1.0" },
  { field: "Load TBA", value: "No", confidence: 100, editable: false, ruleId: "ER2-v1.0", ruleName: "Load TBA", ruleVersion: "1.0" },
  { field: "Vendor Name", value: "Acme Pharma", confidence: 94, editable: true, ruleId: "ER3-v1.0", ruleName: "Vendor Name", ruleVersion: "1.0" },
  { field: "Vendor ID", value: "VND-8821", confidence: 88, editable: false, ruleId: "ER4-v1.0", ruleName: "Vendor ID", ruleVersion: "1.0" },
  { field: "DC Table", value: "table 10 (RX)", confidence: 100, editable: false, ruleId: "ER5-v1.0", ruleName: "DC Table", ruleVersion: "1.0" },
  { field: "Individual DC", value: "8106 (NRDC)", confidence: 85, editable: false, ruleId: "ER6-v1.0", ruleName: "Individual DC", ruleVersion: "1.0" },
  { field: "MNC", value: "None", confidence: 100, editable: false, ruleId: "ER7-v1.0", ruleName: "MNC", ruleVersion: "1.0" },
  { field: "PUD (Always 1)", value: "1", confidence: 100, editable: false, ruleId: "ER8-v1.0", ruleName: "PUD (Always 1)", ruleVersion: "1.0" },
  { field: "Generic Indicator", value: "NDA 505(b)(1)", confidence: 78, editable: true, ruleId: "ER9-v1.0", ruleName: "Generic Indicator", ruleVersion: "1.0" },
  { field: "MCK-GPC", value: "1- Reg Generic Drug", confidence: 100, editable: false, ruleId: "ER10-v1.0", ruleName: "MCK-GPC", ruleVersion: "1.0" },
  { field: "Pri-Ord-Item", value: "Yes", confidence: 100, editable: false, ruleId: "ER11-v1.0", ruleName: "Pri-Ord-Item", ruleVersion: "1.0" },
  { field: "SVC LVL Catgy", value: "G-Generic Item", confidence: 92, editable: false, ruleId: "ER12-v1.0", ruleName: "SVC LVL Catgy", ruleVersion: "1.0" },
];

// Per-application extracted fields (keyed by applicationId). Seeded from mockExtractedFields + default mappings.
export function buildInitialExtractedFieldsByApp(): Record<string, ExtractedField[]> {
  const byApp: Record<string, ExtractedField[]> = {};
  const appIds = mockApplications.map((a) => a.id);
  const ruleById = Object.fromEntries(mockExtractionRules.map((r) => [r.id, r]));
  for (const appId of appIds) {
    byApp[appId] = mockExtractedFields.map((f) => {
      const ruleId = f.ruleId ?? defaultFieldRuleIds[f.field];
      const rule = ruleId ? ruleById[ruleId] : undefined;
      return {
        ...f,
        ruleId,
        ruleName: rule?.name ?? f.ruleName ?? "—",
        ruleVersion: rule?.version ?? f.ruleVersion,
      };
    });
  }
  return byApp;
}
