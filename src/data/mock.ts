export type DecisionStatus = "auto_approved" | "review_required" | "rejected";

/** Real-world suppliers used for HDA forms; kept in a const for future supplier-level stats. */
export const SUPPLIERS = [
  "Dr. Reddy's",
  "Cipla",
  "Sun Pharma",
  "Lupin",
  "Zydus",
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
  { id: "NDC-001", applicantName: "Jane Smith", supplier: "Dr. Reddy's", dosageType: "Tablets", confidence: 94, riskScore: 12, competencyLevel: "Highly Intelligent", ruleFlagsCount: 0, decisionStatus: "auto_approved", source: "Upload", timestamp: "2026-02-27T10:30:00Z" },
  { id: "NDC-002", applicantName: "John Doe", supplier: "Cipla", dosageType: "Injectables", confidence: 78, riskScore: 35, competencyLevel: "Needs Training", ruleFlagsCount: 2, decisionStatus: "review_required", source: "API", timestamp: "2026-02-27T10:25:00Z" },
  { id: "NDC-003", applicantName: "Alice Brown", supplier: "Sun Pharma", dosageType: "Capsules", confidence: 88, riskScore: 22, competencyLevel: "Intelligent", ruleFlagsCount: 1, decisionStatus: "review_required", source: "Upload", timestamp: "2026-02-27T10:20:00Z" },
  { id: "NDC-004", applicantName: "Bob Wilson", supplier: "Lupin", dosageType: "Liquids", confidence: 65, riskScore: 72, competencyLevel: "Needs Training", ruleFlagsCount: 4, decisionStatus: "rejected", source: "Upload", timestamp: "2026-02-27T10:15:00Z" },
  { id: "NDC-005", applicantName: "Carol Lee", supplier: "Zydus", dosageType: "Topicals", confidence: 92, riskScore: 8, competencyLevel: "Highly Intelligent", ruleFlagsCount: 0, decisionStatus: "auto_approved", source: "API", timestamp: "2026-02-27T10:10:00Z" },
];

// --- Emails (use case: email list with Process / Review / Push to SAP) ---
export type EmailStatus = "pending" | "processed" | "reviewed";

export interface EmailAttachment {
  id: string;
  name: string;
  /** For preview: placeholder type; real app would have URL or blob */
  type: string;
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  timestamp: string;
  status: EmailStatus;
  /** After "Process" is run (IDP simulation) */
  processed: boolean;
  /** User has opened Review; enables Push to SAP */
  reviewed: boolean;
  /** Digitized body as JSON (populated after process) */
  bodyJson?: Record<string, unknown>;
  attachments: EmailAttachment[];
}

export const mockEmails: Email[] = [
  { id: "email-1", subject: "Contract renewal Q1 2026", sender: "vendor@acme.com", timestamp: "2026-03-01T09:00:00Z", status: "pending", processed: false, reviewed: false, attachments: [{ id: "att-1", name: "contract.pdf", type: "application/pdf" }, { id: "att-2", name: "terms.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }] },
  { id: "email-2", subject: "NDC pricing update", sender: "pricing@pharma.com", timestamp: "2026-03-01T10:15:00Z", status: "processed", processed: true, reviewed: false, bodyJson: { from: "pricing@pharma.com", subject: "NDC pricing update", paragraphs: ["Please find attached the updated NDC list and pricing."] }, attachments: [{ id: "att-3", name: "ndc_list.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }] },
  { id: "email-3", subject: "Customer DEA verification", sender: "compliance@dist.com", timestamp: "2026-03-01T11:30:00Z", status: "reviewed", processed: true, reviewed: true, bodyJson: { from: "compliance@dist.com", subject: "Customer DEA verification", paragraphs: ["Attached are the DEA and HIN verification documents."] }, attachments: [] },
  { id: "email-4", subject: "Valid from/to dates confirmation", sender: "orders@supplier.com", timestamp: "2026-02-28T14:00:00Z", status: "pending", processed: false, reviewed: false, attachments: [{ id: "att-4", name: "dates.pdf", type: "application/pdf" }] },
  { id: "email-5", subject: "HIN and contract validity", sender: "support@partner.com", timestamp: "2026-02-28T16:45:00Z", status: "processed", processed: true, reviewed: false, bodyJson: { from: "support@partner.com", subject: "HIN and contract validity", paragraphs: [] }, attachments: [{ id: "att-5", name: "hin_form.pdf", type: "application/pdf" }] },
];

/** Extracted fields shown for emails (detail right column). */
export const EMAIL_EXTRACTED_FIELD_KEYS = [
  "Contract Valid from",
  "Contract Valid to",
  "NDC",
  "price",
  "Customer DEA",
  "HIN",
  "Customer Valid from date",
  "Customer valid to date",
] as const;

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
  "Dr. Reddy's": [
    { week: "W1", accuracy: 91 },
    { week: "W2", accuracy: 93 },
    { week: "W3", accuracy: 92 },
    { week: "W4", accuracy: 94 },
  ],
  Cipla: [
    { week: "W1", accuracy: 76 },
    { week: "W2", accuracy: 78 },
    { week: "W3", accuracy: 79 },
    { week: "W4", accuracy: 80 },
  ],
  "Sun Pharma": [
    { week: "W1", accuracy: 85 },
    { week: "W2", accuracy: 86 },
    { week: "W3", accuracy: 88 },
    { week: "W4", accuracy: 87 },
  ],
  Lupin: [
    { week: "W1", accuracy: 62 },
    { week: "W2", accuracy: 64 },
    { week: "W3", accuracy: 65 },
    { week: "W4", accuracy: 66 },
  ],
  Zydus: [
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

// --- Metrics mock data (throughput, funnel, queue, rejection, trends) ---

/** Forms processed per week for throughput. */
export const mockWeeklyVolume: { week: string; count: number }[] = [
  { week: "W1", count: 42 },
  { week: "W2", count: 48 },
  { week: "W3", count: 51 },
  { week: "W4", count: 55 },
];

/** Average time from submission to decision (minutes). */
export const MOCK_AVG_TIME_TO_DECISION_MIN = 4.2;

/** Review queue: backlog and SLA. */
export const mockReviewQueueStats = {
  backlogCount: 7,
  avgHoursInQueue: 2.4,
  slaBreachCount: 1,
  slaThresholdHours: 4,
};

/** Rejection reason code per application (for rejected only). */
export const mockRejectionReasons: Record<string, string> = {
  "NDC-004": "High risk score; multiple rule flags",
};

/** Confidence distribution over time: share of extractions in each band. */
export const mockConfidenceDistributionOverTime: { week: string; high: number; mid: number; low: number }[] = [
  { week: "W1", high: 62, mid: 24, low: 14 },
  { week: "W2", high: 65, mid: 23, low: 12 },
  { week: "W3", high: 66, mid: 22, low: 12 },
  { week: "W4", high: 68, mid: 21, low: 11 },
];

/** Week-over-week change for key metrics (current vs previous week). */
export const mockWoWMetrics = {
  approvalRate: { current: 42, previous: 38, label: "Auto-approval rate (%)" },
  accuracy: { current: 89, previous: 87, label: "Accuracy (%)" },
  avgConfidence: { current: 83.4, previous: 81.2, label: "Avg confidence (%)" },
};

/** Applications that have at least one audit event (for audit readiness). */
export const mockApplicationsWithAuditTrace = new Set(["NDC-001", "NDC-002"]);

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

/** Template for email extracted fields (detail right column). */
export const mockEmailExtractedFields: ExtractedField[] = [
  { field: "Contract Valid from", value: "2026-01-01", confidence: 92, editable: true },
  { field: "Contract Valid to", value: "2027-12-31", confidence: 88, editable: true },
  { field: "NDC", value: "12345-678-90", confidence: 95, editable: false },
  { field: "price", value: "42.50", confidence: 91, editable: true },
  { field: "Customer DEA", value: "AB1234567", confidence: 89, editable: false },
  { field: "HIN", value: "HIN987654", confidence: 87, editable: false },
  { field: "Customer Valid from date", value: "2026-02-01", confidence: 90, editable: true },
  { field: "Customer valid to date", value: "2027-01-31", confidence: 85, editable: true },
];

// Per-application extracted fields (keyed by applicationId). Seeded from mockExtractedFields + default mappings. Emails use mockEmailExtractedFields.
export function buildInitialExtractedFieldsByApp(): Record<string, ExtractedField[]> {
  const byApp: Record<string, ExtractedField[]> = {};
  const ruleById = Object.fromEntries(mockExtractionRules.map((r) => [r.id, r]));
  for (const app of mockApplications) {
    byApp[app.id] = mockExtractedFields.map((f) => {
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
  for (const email of mockEmails) {
    byApp[email.id] = mockEmailExtractedFields.map((f) => ({ ...f }));
  }
  return byApp;
}
