"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { mockApplications } from "@/data/mock";
import {
    getExtractedFieldsForApplication,
    getExtractionRule,
    getFieldDecision,
    setFieldDecision,
    getApplicationFinalApproved,
    setApplicationFinalApproved,
    getApplicationReviewStatus,
    listCategories,
} from "@/data/extraction-store";
import type { ExtractedField } from "@/data/mock";
import { ArrowLeft, Check, Edit, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, X } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const PdfDocument = dynamic(async () => (await import("react-pdf")).Document, { ssr: false });
const PdfPage = dynamic(async () => (await import("react-pdf")).Page, { ssr: false });

const CONFIDENCE_THRESHOLD = 80;
const REMOTE_PDF_URL =
    "https://xiromed.com/usa/wp-content/uploads/sites/6/2020/08/Neostigmine-1mg-HDA-09-10-2020.pdf";
const REMOTE_PDF_PROXY_URL = `/api/pdf-proxy?url=${encodeURIComponent(REMOTE_PDF_URL)}`;
const PDF_FILES = [{ label: "Neostigmine-1mg-HDA-09-10-2020.pdf", value: REMOTE_PDF_PROXY_URL }];
const PDF_FALLBACK_WIDTH = 560;
const PDF_MIN_ZOOM = 0.75;
const PDF_MAX_ZOOM = 2;
const PDF_ZOOM_STEP = 0.1;
const timelineSteps = [
    { stage: "Extraction", time: "10:25:01", status: "completed" },
    { stage: "Rule Execution", time: "10:25:02", status: "completed" },
    { stage: "Model Decision", time: "10:25:03", status: "completed" },
    { stage: "Human Override", time: "—", status: "pending" },
];
const MOCK_HIGHLIGHT_BOXES: Array<{ x: number; y: number; w: number; h: number }> = [
    { x: 0.09, y: 0.13, w: 0.36, h: 0.045 },
    { x: 0.56, y: 0.13, w: 0.28, h: 0.045 },
    { x: 0.09, y: 0.22, w: 0.75, h: 0.045 },
    { x: 0.09, y: 0.31, w: 0.24, h: 0.045 },
    { x: 0.36, y: 0.31, w: 0.24, h: 0.045 },
    { x: 0.63, y: 0.31, w: 0.21, h: 0.045 },
    { x: 0.09, y: 0.4, w: 0.75, h: 0.055 },
];


export default function ApplicationDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [confidenceOverlay, setConfidenceOverlay] = useState(true);
    const [previewTab, setPreviewTab] = useState<"document" | "json">("document");
    const [expandedFieldKey, setExpandedFieldKey] = useState<string | null>(null);
    const [fields, setFields] = useState<ExtractedField[]>(() => getExtractedFieldsForApplication(id));
    const [pdfPageCount, setPdfPageCount] = useState<number>(0);
    const [pdfPageNumber, setPdfPageNumber] = useState(1);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfZoom, setPdfZoom] = useState(1);
    const [pdfFitWidth, setPdfFitWidth] = useState(PDF_FALLBACK_WIDTH);
    const [selectedPdfFile, setSelectedPdfFile] = useState(REMOTE_PDF_PROXY_URL);
    const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pdfViewportRef = useRef<HTMLDivElement>(null);
    const [hoveredFieldKey, setHoveredFieldKey] = useState<string | null>(null);

    const fieldToBox = Object.fromEntries(
        fields.slice(0, MOCK_HIGHLIGHT_BOXES.length).map((f, idx) => [f.field, MOCK_HIGHLIGHT_BOXES[idx]])
    );

    const hoveredField = hoveredFieldKey ? fields.find((f) => f.field === hoveredFieldKey) : null;
    const hoveredBox = hoveredFieldKey ? fieldToBox[hoveredFieldKey] : null;

    const [valueEditModal, setValueEditModal] = useState<{
        fieldKey: string;
        mode: "accept_ocr" | "use_kg" | "manual";
        selectedKgValue: string;
        manualValue: string;
        changeReason: "" | "Poor Image Quality" | "Graph Missing Data" | "Supplier Error";
    } | null>(null);
    const [finalApproveOpen, setFinalApproveOpen] = useState(false);
    const [viewCatalogRuleField, setViewCatalogRuleField] = useState<ExtractedField | null>(null);
    const [finalApproveNonce, setFinalApproveNonce] = useState(0);

    const categories = listCategories();
    const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);
    const reviewStatusLabel = useMemo(() => {
        const s = getApplicationReviewStatus(id);
        if (s === "under_review") return "Under-review";
        if (s === "ready_for_review") return "Ready for Review";
        return "Reviewed";
    }, [id, fields, finalApproveNonce]);
    const finalApproved = getApplicationFinalApproved(id);

    useEffect(() => {
        // Configure pdf.js worker on client only to avoid DOMMatrix runtime issues.
        void import("react-pdf").then(({ pdfjs }) => {
            pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
        });
    }, []);

    useEffect(() => {
        const el = pdfViewportRef.current;
        if (!el) return;
        const recalc = () => {
            // Account for container padding to avoid horizontal whitespace/overflow.
            const nextWidth = Math.max(240, Math.floor(el.clientWidth - 16));
            setPdfFitWidth(nextWidth);
        };
        recalc();
        const observer = new ResizeObserver(recalc);
        observer.observe(el);
        return () => observer.disconnect();
    }, [isDetailFullscreen, previewTab]);

    const app = mockApplications.find((a) => a.id === id);
    if (!app) {
        return (
            <div className="space-y-6">
                <p className="text-[var(--muted)]">Application not found.</p>
                <Link href="/applications" className={buttonVariants({ variant: "outline" })}>Back to Applications</Link>
            </div>
        );
    }

    const digitizedJson = {
        application: {
            id: app.id,
            applicantName: app.applicantName,
            decisionStatus: app.decisionStatus,
            timestamp: app.timestamp,
        },
        digitized_at: new Date().toISOString(),
        extracted_fields: fields.map((f) => ({
            field: f.field,
            value: f.value,
            confidence: f.confidence,
            rule: {
                id: f.ruleId ?? "—",
                name: f.ruleName ?? "—",
                version: f.ruleVersion ?? "—",
            },
        })),
    };

    const handleFieldApprove = (fieldKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (getFieldDecision(id, fieldKey) === "approved") return;
        setFieldDecision(id, fieldKey, "approved");
        setFields((prev) => [...prev]);
    };

    const allFieldsApproved = useMemo(
        () => fields.length > 0 && fields.every((f) => getFieldDecision(id, f.field) === "approved"),
        [fields, id]
    );

    const submitValueEdit = () => {
        if (!valueEditModal) return;

        const { fieldKey, mode, selectedKgValue, manualValue, changeReason } = valueEditModal;
        const field = fields.find((x) => x.field === fieldKey);
        if (!field) return;

        let nextValue = field.value;
        if (mode === "use_kg") nextValue = selectedKgValue || field.value;
        if (mode === "manual") nextValue = manualValue.trim() || field.value;

        const isChangingValue =
            (mode === "use_kg" && (selectedKgValue || field.value) !== field.value) ||
            (mode === "manual" && (manualValue.trim() || field.value) !== field.value);

        if (isChangingValue && !changeReason) {
            setError("Please select why you are changing this value.");
            return;
        }
        setFields((prev) =>
            prev.map((x) => (x.field === fieldKey ? { ...x, value: nextValue } : x))
        );
        setValueEditModal(null);
    };

    const knowledgeGraphValues: Record<string, string> = {
        "Catalog Item": "Yes",
        "Load TBA": "No",
        "Vendor Name": "Acme Pharma LLC",
        "Vendor ID": "VND-8821",
        "DC Table": "table 10 (RX)",
        "Individual DC": "8106 (NRDC)",
        "MNC": "None",
        "PUD (Always 1)": "1",
        "Generic Indicator": "NDA 505(b)(1)",
        "MCK-GPC": "1- Reg Generic Drug",
        "Pri-Ord-Item": "Yes",
        "SVC LVL Catgy": "G-Generic Item",
    };

    const extractedFieldsPanel = (
        <Card className={isDetailFullscreen ? "min-h-0" : undefined}>
            {!isDetailFullscreen && (
                <CardHeader>
                    <CardTitle>Extracted Fields</CardTitle>
                    <p className="text-sm text-[var(--muted)]">Click a row to expand and see rule details. Approve each field before final approval.</p>
                    {error && (
                        <p className="text-sm text-red-600" role="alert">{error}</p>
                    )}
                </CardHeader>
            )}
            <CardContent className={isDetailFullscreen ? "min-h-0 p-0" : "p-0"}>
                <div className={isDetailFullscreen ? "max-h-[calc(100vh-28px)] overflow-y-auto shadow-none" : "shadow-none"}>
                    <div className="sticky top-0 z-20 grid grid-cols-[36px_1.2fr_1.4fr_1fr_0.9fr_1.2fr_120px] border-b border-[var(--border)] bg-[var(--background)] text-xs font-medium text-[var(--muted)]">
                        <div className="px-4 py-3" aria-label="Expand" />
                        <div className="px-4 py-3">Field</div>
                        <div className="px-4 py-3">Extracted Value</div>
                        <div className="px-4 py-3">KG</div>
                        <div className="px-4 py-3">Trust Score</div>
                        <div className="px-4 py-3">Rule applied</div>
                        <div className="px-4 py-3">Actions</div>
                    </div>
                    <div className="text-xs">
                        {fields.map((f) => {
                            const isExpanded = expandedFieldKey === f.field;
                            const isLowConfidence = f.confidence < CONFIDENCE_THRESHOLD;
                            const decision = getFieldDecision(id, f.field);
                            return (
                                <React.Fragment key={f.field}>
                                    <div
                                        className={`grid grid-cols-[36px_1.2fr_1.4fr_1fr_0.9fr_1.2fr_120px] border-b border-[var(--border)] transition-colors hover:bg-[var(--sidebar)]/50 ${isLowConfidence ? "bg-amber-50/70" : ""} cursor-pointer`}
                                        onClick={() => setExpandedFieldKey((k) => (k === f.field ? null : f.field))}
                                        onMouseEnter={() => setHoveredFieldKey(f.field)}
                                        onMouseLeave={() => setHoveredFieldKey((k) => (k === f.field ? null : k))}
                                        onFocus={() => setHoveredFieldKey(f.field)}
                                        onBlur={() => setHoveredFieldKey((k) => (k === f.field ? null : k))}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                setExpandedFieldKey((k) => (k === f.field ? null : f.field));
                                            }
                                        }}
                                        aria-expanded={isExpanded}
                                        aria-label={`${f.field}, value ${f.value}, confidence ${f.confidence}%, rule ${f.ruleName ?? "—"}${f.ruleVersion ? ` v${f.ruleVersion}` : ""}. Click to ${isExpanded ? "collapse" : "expand"} details`}
                                    >
                                        <div className="px-4 py-4">
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </div>
                                        <div className="px-4 py-4 font-medium">{f.field}</div>
                                        <div className="px-4 py-4">{f.value}</div>
                                        <div className="px-4 py-4">{knowledgeGraphValues[f.field] ?? "—"}</div>
                                        <div className="px-4 py-4">
                                            <Badge variant={f.confidence >= 90 ? "safe" : f.confidence >= 75 ? "review" : "risk"}>
                                                {f.confidence}%
                                            </Badge>
                                        </div>
                                        <div className="px-4 py-4">{f.ruleName ? (f.ruleVersion ? `${f.ruleName} (v${f.ruleVersion})` : f.ruleName) : "—"}</div>
                                        <div className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon"
                                                    variant={decision === "approved" ? "default" : "outline"}
                                                    className="h-7 w-7"
                                                    disabled={decision === "approved"}
                                                    onClick={(e) => handleFieldApprove(f.field, e)}
                                                    aria-label={`Approve ${f.field}`}
                                                    title={decision === "approved" ? "Approved" : "Approve"}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="outline"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const kg = knowledgeGraphValues[f.field] ?? "";
                                                        setValueEditModal({
                                                            fieldKey: f.field,
                                                            mode: "accept_ocr",
                                                            selectedKgValue: kg,
                                                            manualValue: f.value,
                                                            changeReason: "",
                                                        });
                                                    }}
                                                    aria-label={`Edit ${f.field}`}
                                                    title="Edit value"
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="border-b border-[var(--border)] bg-[var(--sidebar)]/50 p-4">
                                            <div className="space-y-3 text-sm">
                                                <div><span className="font-medium">Field:</span> {f.field}</div>
                                                <div><span className="font-medium">Value:</span> {f.value}</div>
                                                <div><span className="font-medium">Confidence:</span> {f.confidence}%</div>
                                                <div>
                                                    <span className="font-medium">Rule:</span>{" "}
                                                    {f.ruleId ? (() => {
                                                        const r = getExtractionRule(f.ruleId!);
                                                        if (f.field === "Catalog Item") {
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    className="text-[var(--foreground)] underline cursor-pointer text-left"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setViewCatalogRuleField(f);
                                                                    }}
                                                                >
                                                                    {f.ruleName ?? f.ruleId}{f.ruleVersion ? ` (v${f.ruleVersion})` : ""}
                                                                </button>
                                                            );
                                                        }
                                                        const href = r ? `/rules/extraction/${r.ruleBaseId}/edit${r.version ? `?version=${r.version}` : ""}` : "#";
                                                        return (
                                                            <Link href={href} className="text-[var(--foreground)] underline">
                                                                {f.ruleName ?? f.ruleId}{f.ruleVersion ? ` (v${f.ruleVersion})` : ""}
                                                            </Link>
                                                        );
                                                    })() : (
                                                        f.ruleName ?? "—"
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 pt-2">
                                                    <Button
                                                        size="icon"
                                                        variant={decision === "approved" ? "default" : "outline"}
                                                        className="h-7 w-7"
                                                        disabled={decision === "approved"}
                                                        onClick={(e) => { e.stopPropagation(); handleFieldApprove(f.field, e); }}
                                                        aria-label={`Approve ${f.field}`}
                                                        title={decision === "approved" ? "Approved" : "Approve field"}
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className={isDetailFullscreen ? "fixed inset-0 z-40 bg-[var(--background)] p-3 overflow-hidden" : "space-y-6"}>
            {!isDetailFullscreen && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/applications" className={buttonVariants({ variant: "ghost", size: "icon" })}><ArrowLeft className="h-5 w-5" /></Link>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">{app.id}</h1>
                            <p className="text-[var(--muted)] text-sm">{app.applicantName} · {reviewStatusLabel}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {finalApproved ? (
                            <Button variant="default" disabled className="gap-2">
                                <Check className="h-4 w-4" /> Approved
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                disabled={!allFieldsApproved}
                                title={!allFieldsApproved ? "Approve every field in the table first" : undefined}
                                onClick={() => setFinalApproveOpen(true)}
                            >
                                <Check className="h-4 w-4 mr-2" />Approve
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className={isDetailFullscreen ? "grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[55%_45%]" : "grid grid-cols-1 gap-6 lg:grid-cols-[55%_45%]"}>
                {/* Left: Document viewer */}
                <Card className={isDetailFullscreen ? "h-full min-h-0 shadow-none" : "lg:sticky lg:top-6 self-start h-fit shadow-none"}>
                    <CardContent className={isDetailFullscreen ? "flex h-full min-h-0 flex-col p-3" : "min-h-0 p-3"}>
                        <div className="mb-3 flex flex-nowrap items-center gap-2 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--sidebar)] p-2">
                            <Select
                                value={selectedPdfFile}
                                onChange={(e) => {
                                    setSelectedPdfFile(e.target.value);
                                    setPdfError(null);
                                    setPdfPageNumber(1);
                                }}
                                className="h-8 !w-[160px] shrink-0 text-xs"
                                aria-label="File"
                            >
                                {PDF_FILES.map((file) => (
                                    <option key={file.value} value={file.value}>
                                        {file.label}
                                    </option>
                                ))}
                            </Select>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setPdfZoom((z) => Math.min(PDF_MAX_ZOOM, Number((z + PDF_ZOOM_STEP).toFixed(2))))}
                                    disabled={pdfZoom >= PDF_MAX_ZOOM}
                                    aria-label="Zoom in"
                                    title="Zoom in"
                                    className="h-8 w-8"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <span className=" text-center text-xs text-[var(--muted)]">
                                    {Math.round(pdfZoom * 100)}%
                                </span>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setPdfZoom((z) => Math.max(PDF_MIN_ZOOM, Number((z - PDF_ZOOM_STEP).toFixed(2))))}
                                    disabled={pdfZoom <= PDF_MIN_ZOOM}
                                    aria-label="Zoom out"
                                    title="Zoom out"
                                    className="h-8 w-8"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setPdfPageNumber((n) => Math.max(1, n - 1))}
                                    disabled={pdfPageNumber <= 1}
                                    aria-label="Previous page"
                                    title="Previous page"
                                    className="h-8 w-8"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className=" text-center text-xs text-[var(--muted)]">
                                    {pdfPageNumber}/{pdfPageCount || 0}
                                </span>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setPdfPageNumber((n) => Math.min(pdfPageCount, n + 1))}
                                    disabled={pdfPageCount === 0 || pdfPageNumber >= pdfPageCount}
                                    aria-label="Next page"
                                    title="Next page"
                                    className="h-8 w-8"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 shrink-0 px-2 text-xs"
                                onClick={() => setPreviewTab((tab) => (tab === "document" ? "json" : "document"))}
                                aria-label="Toggle document and json view"
                                title="Toggle document/json"
                            >
                                {previewTab === "document" ? "Document" : "JSON"}
                            </Button>
                            <label className="flex shrink-0 items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={confidenceOverlay}
                                    onChange={(e) => setConfidenceOverlay(e.target.checked)}
                                    disabled={previewTab !== "document"}
                                />
                                Overlay
                            </label>
                            <Button
                                variant="outline"
                                size="icon"
                                className="ml-auto h-8 w-8"
                                onClick={() => setIsDetailFullscreen((v) => !v)}
                                aria-label={isDetailFullscreen ? "Exit fullscreen detail view" : "Enter fullscreen detail view"}
                                title={isDetailFullscreen ? "Exit fullscreen" : "Fullscreen"}
                            >
                                {isDetailFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </Button>
                        </div>
                        {previewTab === "document" ? (
                            <div className={isDetailFullscreen ? "flex min-h-0 flex-1 flex-col rounded-lg border border-[var(--border)] bg-[var(--sidebar)] p-2" : "rounded-lg border border-[var(--border)] bg-[var(--sidebar)] p-2"}>
                                {pdfError && (
                                    <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700" role="alert">
                                        {pdfError}
                                    </p>
                                )}
                                <div
                                    ref={pdfViewportRef}
                                    className={isDetailFullscreen ? "flex-1 min-h-0 overflow-auto rounded-md border border-[var(--border)] bg-white p-2" : "overflow-auto rounded-md border border-[var(--border)] bg-white p-2"}
                                >
                                    <PdfDocument
                                        file={selectedPdfFile}
                                        loading={<p className="p-4 text-sm text-[var(--muted)]">Loading PDF…</p>}
                                        onLoadSuccess={({ numPages }) => {
                                            setPdfPageCount(numPages);
                                            setPdfPageNumber((n) => Math.min(Math.max(1, n), numPages));
                                            setPdfError(null);
                                        }}
                                        onLoadError={(err) => {
                                            setPdfError(`Unable to load PDF. Confirm the remote file is reachable and the proxy route can fetch it. (${err.message})`);
                                            setPdfPageCount(0);
                                        }}
                                    >
                                        <div className="relative inline-block">
                                            <PdfPage
                                                pageNumber={pdfPageNumber}
                                                width={Math.round(pdfFitWidth * pdfZoom)}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                            />
                                            {confidenceOverlay && pdfPageNumber === 1 && hoveredField && hoveredBox && (
                                                <div className="pointer-events-none absolute inset-0">
                                                    <div
                                                        className={`absolute rounded-sm border ${hoveredField.confidence < CONFIDENCE_THRESHOLD
                                                            ? "border-red-500 bg-red-500/20"
                                                            : "border-emerald-500 bg-emerald-500/20"
                                                            }`}
                                                        style={{
                                                            left: `${hoveredBox.x * 100}%`,
                                                            top: `${hoveredBox.y * 100}%`,
                                                            width: `${hoveredBox.w * 100}%`,
                                                            height: `${hoveredBox.h * 100}%`,
                                                        }}
                                                        title={`${hoveredField.field}: ${hoveredField.confidence}%`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </PdfDocument>
                                </div>
                            </div>
                        ) : (
                            <div className={isDetailFullscreen ? "flex-1 min-h-0 rounded-lg border border-[var(--border)] bg-[#282c34] overflow-auto" : "rounded-lg border border-[var(--border)] bg-[#282c34] overflow-auto max-h-[70vh]"}>
                                <SyntaxHighlighter
                                    language="json"
                                    style={oneDark}
                                    customStyle={{
                                        margin: 0,
                                        padding: "0.75rem 1rem",
                                        fontSize: "0.75rem",
                                        lineHeight: 1.5,
                                        background: "transparent",
                                    }}
                                    codeTagProps={{ style: { fontFamily: "ui-monospace, monospace" } }}
                                    showLineNumbers={false}
                                    PreTag="div"
                                >
                                    {JSON.stringify(digitizedJson, null, 2)}
                                </SyntaxHighlighter>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Structured data */}
                <div className={isDetailFullscreen ? "h-full min-h-0 space-y-3 overflow-y-auto pr-1" : "space-y-6"}>
                    {extractedFieldsPanel}

                    {!isDetailFullscreen && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Rule Evaluation Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-[var(--muted)]">Extraction rules applied. Low confidence fields flagged for review.</p>
                            </CardContent>
                        </Card>
                    )}

                    {!isDetailFullscreen && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Risk Model Explanation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-[var(--muted)]">Risk score 35 driven by low confidence on some extracted fields.</p>
                            </CardContent>
                        </Card>
                    )}

                    {!isDetailFullscreen && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Decision Trace Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {timelineSteps.map((s) => (
                                        <li key={s.stage} className="flex items-center gap-3 text-sm">
                                            <span className={`w-2 h-2 rounded-full ${s.status === "completed" ? "bg-[var(--safe)]" : "bg-[var(--border)]"}`} />
                                            <span className="font-medium">{s.stage}</span>
                                            <span className="text-[var(--muted)]">{s.time}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {valueEditModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--foreground)]/20 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="value-edit-title"
                    onClick={() => setValueEditModal(null)}
                >
                    <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <CardTitle id="value-edit-title">Edit field value</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-[var(--muted)]">
                                Field: <span className="font-medium">{valueEditModal.fieldKey}</span>
                            </p>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={valueEditModal.mode === "accept_ocr"}
                                    onChange={() =>
                                        setValueEditModal((m) => (m ? { ...m, mode: "accept_ocr" } : null))
                                    }
                                />
                                Accept OCR value
                            </label>

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={valueEditModal.mode === "use_kg"}
                                    onChange={() =>
                                        setValueEditModal((m) => (m ? { ...m, mode: "use_kg" } : null))
                                    }
                                />
                                Use Knowledge Graph value
                            </label>

                            {valueEditModal.mode === "use_kg" && (
                                <Select
                                    value={valueEditModal.selectedKgValue}
                                    onChange={(e) =>
                                        setValueEditModal((m) =>
                                            m ? { ...m, selectedKgValue: e.target.value } : null
                                        )
                                    }
                                    className="w-full"
                                >
                                    <option value={knowledgeGraphValues[valueEditModal.fieldKey] ?? ""}>
                                        {knowledgeGraphValues[valueEditModal.fieldKey] ?? "No suggestion"}
                                    </option>
                                </Select>
                            )}

                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={valueEditModal.mode === "manual"}
                                    onChange={() =>
                                        setValueEditModal((m) => (m ? { ...m, mode: "manual" } : null))
                                    }
                                />
                                Manually add value
                            </label>

                            {valueEditModal.mode === "manual" && (
                                <Input
                                    value={valueEditModal.manualValue}
                                    onChange={(e) =>
                                        setValueEditModal((m) =>
                                            m ? { ...m, manualValue: e.target.value } : null
                                        )
                                    }
                                    placeholder="Enter value"
                                />
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1">Why are you changing this?</label>
                                <Select
                                    value={valueEditModal.changeReason}
                                    onChange={(e) =>
                                        setValueEditModal((m) =>
                                            m ? { ...m, changeReason: e.target.value as "" | "Poor Image Quality" | "Graph Missing Data" | "Supplier Error" } : null
                                        )
                                    }
                                    className="w-full"
                                >
                                    <option value="">Select reason</option>
                                    <option value="Poor Image Quality">Poor Image Quality</option>
                                    <option value="Graph Missing Data">Graph Missing Data</option>
                                    <option value="Supplier Error">Supplier Error</option>
                                </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setValueEditModal(null)}>
                                    Cancel
                                </Button>
                                <Button onClick={submitValueEdit}>Save</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {finalApproveOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="final-approve-title"
                    onClick={() => setFinalApproveOpen(false)}
                >
                    <Card className="w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle id="final-approve-title">Confirm approval</CardTitle>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setFinalApproveOpen(false)} aria-label="Close">
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-[var(--muted)]">
                                Final approval for <span className="font-medium text-[var(--foreground)]">{app.id}</span>. This marks the form as reviewed after all fields are approved.
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setFinalApproveOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setApplicationFinalApproved(id, true);
                                        setFinalApproveNonce((n) => n + 1);
                                        setFinalApproveOpen(false);
                                    }}
                                >
                                    Confirm approval
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {viewCatalogRuleField && (() => {
                const rule = viewCatalogRuleField.ruleId ? getExtractionRule(viewCatalogRuleField.ruleId) : undefined;
                if (!rule) return null;
                const ro = "bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-90";
                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="catalog-rule-view-title"
                        onClick={() => setViewCatalogRuleField(null)}
                    >
                        <Card className="w-full max-w-lg my-8 shadow-lg" onClick={(e) => e.stopPropagation()}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle id="catalog-rule-view-title">Rule details (view only)</CardTitle>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setViewCatalogRuleField(null)} aria-label="Close">
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                                <p className="text-xs text-[var(--muted)]">Field: Catalog Item · v{rule.version}</p>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Field Name</label>
                                    <Input value={rule.name} disabled className={ro} readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Category</label>
                                    <Select value={rule.categoryId} disabled className={ro}>
                                        <option value={rule.categoryId}>{categoryById[rule.categoryId] ?? rule.categoryId}</option>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        value={rule.description ?? ""}
                                        disabled
                                        readOnly
                                        rows={3}
                                        className={cn("flex w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm", ro)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Role</label>
                                    <textarea
                                        value={rule.role ?? ""}
                                        disabled
                                        readOnly
                                        rows={3}
                                        className={cn("flex w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm", ro)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Guidelines</label>
                                    <textarea
                                        value={rule.prompt}
                                        disabled
                                        readOnly
                                        rows={5}
                                        className={cn("flex w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm font-mono text-xs", ro)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Example(s)</label>
                                    <textarea
                                        value="—"
                                        disabled
                                        readOnly
                                        rows={2}
                                        className={cn("flex w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm", ro)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Special instruction</label>
                                    <textarea
                                        value={rule.specialInstruction ?? ""}
                                        disabled
                                        readOnly
                                        rows={2}
                                        className={cn("flex w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm", ro)}
                                    />
                                </div>
                                <Button type="button" variant="outline" className="w-full" onClick={() => setViewCatalogRuleField(null)}>
                                    Close
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                );
            })()}
        </div>
    );
}
