"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { mockApplications } from "@/data/mock";
import {
    getExtractedFieldsForApplication,
    getExtractionRule,
    listVersionsForRule,
    editRuleFromField,
    reprocessField,
    getFieldDecision,
    getFieldDecisionReason,
    setFieldDecision,
} from "@/data/extraction-store";
import type { ExtractedField } from "@/data/mock";
import { ArrowLeft, FileText, Check, X, Edit, MessageCircle, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

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
    const [editModal, setEditModal] = useState<{
        fieldKey: string;
        ruleId: string;
        ruleBaseId: string;
        ruleName: string;
        ruleVersion: string;
        name: string;
        description: string;
        prompt: string;
        previousConfidence: number;
        testOutput: { field: string; value: string; confidence: number;[key: string]: unknown } | null;
    } | null>(null);
    const [editModalTesting, setEditModalTesting] = useState(false);
    const [testSimulateMode, setTestSimulateMode] = useState<"positive" | "negative">("positive");
    const [reprocessingFieldKey, setReprocessingFieldKey] = useState<string | null>(null);
    const [pdfPageCount, setPdfPageCount] = useState<number>(0);
    const [pdfPageNumber, setPdfPageNumber] = useState(1);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [pdfZoom, setPdfZoom] = useState(1);
    const [pdfFitWidth, setPdfFitWidth] = useState(PDF_FALLBACK_WIDTH);
    const [selectedPdfFile, setSelectedPdfFile] = useState(REMOTE_PDF_PROXY_URL);
    const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);
    const [rejectModal, setRejectModal] = useState<{
        fieldKey: string;
        reason: string;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const editModalNameInputRef = useRef<HTMLInputElement>(null);
    const pdfViewportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editModal) {
            setError(null);
            editModalNameInputRef.current?.focus();
        }
    }, [editModal]);

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

    const refreshFields = useCallback(() => {
        setFields([...getExtractedFieldsForApplication(id)]);
    }, [id]);

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

    const openEditRule = (f: ExtractedField) => {
        const rule = f.ruleId ? getExtractionRule(f.ruleId) : undefined;
        if (!f.ruleId || !rule) return;
        setEditModal({
            fieldKey: f.field,
            ruleId: rule.id,
            ruleBaseId: rule.ruleBaseId,
            ruleName: rule.name,
            ruleVersion: rule.version,
            name: rule.name,
            description: rule.description ?? "",
            prompt: rule.prompt,
            previousConfidence: Number(f.confidence) || 0,
            testOutput: null,
        });
    };

    const saveEditRule = () => {
        if (!editModal) return;
        setError(null);
        try {
            editRuleFromField(id, editModal.fieldKey, editModal.ruleId, {
                name: editModal.name,
                description: editModal.description || undefined,
                prompt: editModal.prompt,
            });
            setEditModal(null);
            refreshFields();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save rule");
        }
    };

    const handleEditModalVersionChange = (versionedId: string) => {
        const rule = getExtractionRule(versionedId);
        if (!rule || !editModal) return;
        const currentField = fields.find((x) => x.field === editModal.fieldKey);
        setEditModal({
            ...editModal,
            ruleId: rule.id,
            ruleVersion: rule.version,
            name: rule.name,
            description: rule.description ?? "",
            prompt: rule.prompt,
            previousConfidence: Number(currentField?.confidence ?? editModal.previousConfidence) || 0,
            testOutput: null,
        });
    };

    const handleTestRule = () => {
        if (!editModal) return;
        setEditModalTesting(true);
        setError(null);
        const prev = Number(editModal.previousConfidence) || 0;
        const positive = testSimulateMode === "positive";
        setTimeout(() => {
            const delta = 8 + Math.floor(Math.random() * 10);
            const confidence = positive
                ? Math.min(99, prev + delta)
                : Math.max(0, prev - delta);
            const mockOutput = {
                field: editModal.fieldKey,
                value: "Extracted value (mock)",
                confidence,
                prompt_preview: editModal.prompt.slice(0, 80) + (editModal.prompt.length > 80 ? "…" : ""),
                timestamp: new Date().toISOString(),
            };
            setEditModal((m) => m ? { ...m, testOutput: mockOutput } : null);
            setEditModalTesting(false);
        }, 600);
    };

    const handleReprocess = (fieldKey: string) => {
        setError(null);
        setReprocessingFieldKey(fieldKey);
        try {
            reprocessField(id, fieldKey);
            refreshFields();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to reprocess field");
        } finally {
            setReprocessingFieldKey(null);
        }
    };

    const handleFieldApprove = (fieldKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFieldDecision(id, fieldKey, "approved");
        setFields((prev) => [...prev]);
    };

    const handleFieldReject = (fieldKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setRejectModal({
            fieldKey,
            reason: getFieldDecisionReason(id, fieldKey) ?? "",
        });
    };

    const submitFieldReject = (fieldKey: string, reason: string, editRuleAfterSubmit: boolean) => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            setError("Please provide a reason before rejecting the field.");
            return;
        }
        setError(null);
        setFieldDecision(id, fieldKey, "rejected", trimmedReason);
        setFields((prev) => [...prev]);
        setRejectModal(null);
        if (editRuleAfterSubmit) {
            const field = fields.find((f) => f.field === fieldKey);
            if (field) openEditRule(field);
        }
    };

    const extractedFieldsPanel = (
        <Card className={isDetailFullscreen ? "min-h-0" : undefined}>
            <CardHeader>
                <CardTitle>Extracted Fields</CardTitle>
                <p className="text-sm text-[var(--muted)]">Click a row to expand and see rule details. Low-confidence fields can be improved by editing the rule or reprocessing.</p>
                {error && (
                    <p className="text-sm text-red-600" role="alert">{error}</p>
                )}
            </CardHeader>
            <CardContent className={isDetailFullscreen ? "min-h-0 p-0" : "p-0"}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-9" aria-label="Expand" />
                            <TableHead>Field</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Rule applied</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((f) => {
                            const isExpanded = expandedFieldKey === f.field;
                            const isLowConfidence = f.confidence < CONFIDENCE_THRESHOLD;
                            const decision = getFieldDecision(id, f.field);
                            const decisionReason = getFieldDecisionReason(id, f.field);
                            return (
                                <React.Fragment key={f.field}>
                                    <TableRow
                                        key={f.field}
                                        className={isLowConfidence ? "bg-amber-50/70" : undefined}
                                        onClick={() => setExpandedFieldKey((k) => (k === f.field ? null : f.field))}
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
                                        <TableCell className="w-9">
                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </TableCell>
                                        <TableCell className="font-medium">{f.field}</TableCell>
                                        <TableCell>{f.value}</TableCell>
                                        <TableCell>
                                            <Badge variant={f.confidence >= 90 ? "safe" : f.confidence >= 75 ? "review" : "risk"}>
                                                {f.confidence}%
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{f.ruleName ? (f.ruleVersion ? `${f.ruleName} (v${f.ruleVersion})` : f.ruleName) : "—"}</TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="icon"
                                                    variant={decision === "approved" ? "default" : "outline"}
                                                    className="h-7 w-7"
                                                    onClick={(e) => handleFieldApprove(f.field, e)}
                                                    aria-label={`Approve ${f.field}`}
                                                    title="Approve"
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant={decision === "rejected" ? "destructive" : "outline"}
                                                    className="h-7 w-7"
                                                    onClick={(e) => handleFieldReject(f.field, e)}
                                                    aria-label={`Reject ${f.field}`}
                                                    title="Reject"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {isExpanded && (
                                        <TableRow key={`${f.field}-detail`}>
                                            <TableCell colSpan={6} className="bg-[var(--sidebar)]/50 p-4">
                                                <div className="space-y-3 text-sm">
                                                    <div><span className="font-medium">Field:</span> {f.field}</div>
                                                    <div><span className="font-medium">Value:</span> {f.value}</div>
                                                    <div><span className="font-medium">Confidence:</span> {f.confidence}%</div>
                                                    <div>
                                                        <span className="font-medium">Rule:</span>{" "}
                                                        {f.ruleId ? (() => {
                                                            const r = getExtractionRule(f.ruleId!);
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
                                                            onClick={(e) => { e.stopPropagation(); handleFieldApprove(f.field, e); }}
                                                            aria-label={`Approve ${f.field}`}
                                                            title="Approve field"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant={decision === "rejected" ? "destructive" : "outline"}
                                                            className="h-7 w-7"
                                                            onClick={(e) => { e.stopPropagation(); handleFieldReject(f.field, e); }}
                                                            aria-label={`Reject ${f.field}`}
                                                            title="Reject field"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                    {decision === "rejected" && decisionReason && (
                                                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                                                            <span className="font-medium">Rejection reason:</span> {decisionReason}
                                                        </div>
                                                    )}
                                                    {isLowConfidence && (
                                                        <div className="flex flex-wrap gap-2 pt-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => { e.stopPropagation(); openEditRule(f); }}
                                                                aria-label={`Edit rule for ${f.field}`}
                                                            >
                                                                <Edit className="h-3 w-3 mr-1" /> Edit rule
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={(e) => { e.stopPropagation(); handleReprocess(f.field); }}
                                                                disabled={reprocessingFieldKey === f.field}
                                                                aria-label={reprocessingFieldKey === f.field ? `Reprocessing ${f.field}` : `Reprocess ${f.field}`}
                                                            >
                                                                <RefreshCw className={`h-3 w-3 mr-1 ${reprocessingFieldKey === f.field ? "animate-spin" : ""}`} />
                                                                {reprocessingFieldKey === f.field ? "Reprocessing…" : "Reprocess field"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
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
                            <p className="text-[var(--muted)] text-sm">{app.applicantName} · {app.decisionStatus.replace("_", " ")}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="default"><Check className="h-4 w-4 mr-2" />Approve</Button>
                        <Button variant="destructive"><X className="h-4 w-4 mr-2" />Reject</Button>
                        <Button variant="outline"><Edit className="h-4 w-4 mr-2" />Override Decision</Button>
                        <Button variant="secondary"><MessageCircle className="h-4 w-4 mr-2" />Request Clarification</Button>
                    </div>
                </div>
            )}

            <div className={isDetailFullscreen ? "grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-2" : "grid grid-cols-1 lg:grid-cols-2 gap-6"}>
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
                                    <Document
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
                                            <Page
                                                pageNumber={pdfPageNumber}
                                                width={Math.round(pdfFitWidth * pdfZoom)}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                            />
                                            {confidenceOverlay && pdfPageNumber === 1 && (
                                                <div className="pointer-events-none absolute inset-0">
                                                    {fields.slice(0, MOCK_HIGHLIGHT_BOXES.length).map((f, idx) => {
                                                        const box = MOCK_HIGHLIGHT_BOXES[idx];
                                                        const isLow = f.confidence < CONFIDENCE_THRESHOLD;
                                                        const toneClass = isLow
                                                            ? "border-red-500 bg-red-500/20"
                                                            : "border-emerald-500 bg-emerald-500/20";
                                                        return (
                                                            <div
                                                                key={`${f.field}-overlay`}
                                                                className={`absolute rounded-sm border ${toneClass}`}
                                                                style={{
                                                                    left: `${box.x * 100}%`,
                                                                    top: `${box.y * 100}%`,
                                                                    width: `${box.w * 100}%`,
                                                                    height: `${box.h * 100}%`,
                                                                }}
                                                                title={`${f.field}: ${f.confidence}%`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </Document>
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

            {/* Edit rule modal: two columns — form + Test (left), JSON viewer + Save (right) */}
            {editModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--foreground)]/20 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-rule-title"
                    onKeyDown={(e) => e.key === "Escape" && setEditModal(null)}
                >
                    <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between shrink-0">
                            <CardTitle id="edit-rule-title">Edit rule for this field</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setEditModal(null)} aria-label="Close">×</Button>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            {/* Left column: version, form, Test */}
                            <div className="space-y-4 min-w-0">
                                <p className="text-sm text-[var(--muted)]">
                                    Run Test to see extraction output. Save creates a new version and maps it to this field only.
                                </p>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Version</label>
                                    <Select
                                        value={editModal.ruleId}
                                        onChange={(e) => handleEditModalVersionChange(e.target.value)}
                                        className="w-full"
                                    >
                                        {listVersionsForRule(editModal.ruleBaseId).map((v) => (
                                            <option key={v.id} value={v.id}>v{v.version}</option>
                                        ))}
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" htmlFor="edit-rule-name">Name</label>
                                    <Input
                                        id="edit-rule-name"
                                        ref={editModalNameInputRef}
                                        value={editModal.name}
                                        onChange={(e) => setEditModal((m) => m ? { ...m, name: e.target.value } : null)}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Description (optional)</label>
                                    <Input
                                        value={editModal.description}
                                        onChange={(e) => setEditModal((m) => m ? { ...m, description: e.target.value } : null)}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Prompt</label>
                                    <textarea
                                        value={editModal.prompt}
                                        onChange={(e) => setEditModal((m) => m ? { ...m, prompt: e.target.value } : null)}
                                        rows={6}
                                        className="flex w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm min-h-[120px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20"
                                        placeholder="e.g. Extract the applicant's full name from the document header."
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Button onClick={handleTestRule} disabled={editModalTesting}>
                                            {editModalTesting ? "Testing…" : "Test"}
                                        </Button>
                                        <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
                                    </div>
                                    <div className="flex items-center gap-2 ml-auto">
                                        <label className="text-sm text-[var(--muted)] shrink-0">Simulate:</label>
                                        <Select
                                            value={testSimulateMode}
                                            onChange={(e) => setTestSimulateMode(e.target.value as "positive" | "negative")}
                                            className="w-36"
                                            disabled={editModalTesting}
                                        >
                                            <option value="positive">Positive (improved)</option>
                                            <option value="negative">Negative (regression)</option>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            {/* Right column: Confidence comparison, JSON viewer, Save */}
                            <div className="flex flex-col min-h-0 min-w-0 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Confidence impact</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/30 p-4 text-center">
                                            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Before</p>
                                            <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color: "var(--foreground)" }}>
                                                {Number(editModal.previousConfidence) || 0}%
                                            </p>
                                            <p className="text-xs text-[var(--muted)] mt-0.5">current extraction</p>
                                        </div>
                                        <div className={`rounded-lg border p-4 text-center ${editModal.testOutput != null
                                            ? (Number(editModal.testOutput.confidence) || 0) >= (Number(editModal.previousConfidence) || 0)
                                                ? "border-[var(--safe)] bg-[var(--safe)]/10"
                                                : "border-red-500 bg-red-500/10"
                                            : "border-[var(--border)] bg-[var(--sidebar)]/30"
                                            }`}>
                                            <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">After</p>
                                            {editModal.testOutput != null ? (
                                                (() => {
                                                    const before = Number(editModal.previousConfidence) || 0;
                                                    const after = Number(editModal.testOutput.confidence) || 0;
                                                    const delta = after - before;
                                                    const isImprovement = delta >= 0;
                                                    return (
                                                        <>
                                                            <p className={`text-2xl font-bold mt-1 tabular-nums ${isImprovement ? "text-[var(--safe)]" : "text-red-500"}`}>
                                                                {after}%
                                                            </p>
                                                            <p className="text-xs mt-0.5">
                                                                <span className={isImprovement ? "text-[var(--safe)]" : "text-red-500"}>
                                                                    {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)} pts
                                                                </span>
                                                            </p>
                                                        </>
                                                    );
                                                })()
                                            ) : (
                                                <p className="text-sm text-[var(--muted)] mt-2">Run Test</p>
                                            )}
                                        </div>
                                    </div>
                                    {editModal.testOutput != null && (
                                        (() => {
                                            const beforeVal = Number(editModal.previousConfidence) || 0;
                                            const afterVal = Number(editModal.testOutput.confidence) || 0;
                                            const afterColor = afterVal >= beforeVal ? "var(--safe)" : "#ef4444";
                                            return (
                                                <div className="mt-3 h-[80px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart
                                                            data={[
                                                                { label: "Before", value: beforeVal, fill: "var(--muted)" },
                                                                { label: "After", value: afterVal, fill: afterColor },
                                                            ]}
                                                            margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                                                        >
                                                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={24} />
                                                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                                <Cell fill="var(--muted)" />
                                                                <Cell fill={afterColor} />
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <label className="block text-sm font-medium mb-1">Test output</label>
                                    <div className="flex-1 min-h-[180px] rounded-md border border-[var(--border)] bg-[#282c34] overflow-auto">
                                        {editModal.testOutput != null ? (
                                            <SyntaxHighlighter
                                                language="json"
                                                style={oneDark}
                                                customStyle={{
                                                    margin: 0,
                                                    padding: "0.75rem 1rem",
                                                    fontSize: "0.75rem",
                                                    lineHeight: 1.5,
                                                    background: "transparent",
                                                    minHeight: "100%",
                                                }}
                                                codeTagProps={{ style: { fontFamily: "ui-monospace, monospace" } }}
                                                showLineNumbers={false}
                                                PreTag="div"
                                            >
                                                {JSON.stringify(editModal.testOutput, null, 2)}
                                            </SyntaxHighlighter>
                                        ) : (
                                            <p className="text-sm text-gray-400 p-4">Run Test to see extraction output here.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end shrink-0">
                                    <Button
                                        onClick={saveEditRule}
                                        disabled={editModal.testOutput == null}
                                        title={editModal.testOutput == null ? "Run Test first to enable Save" : undefined}
                                    >
                                        Save (creates new version)
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {rejectModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--foreground)]/20 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reject-field-title"
                    onClick={() => setRejectModal(null)}
                >
                    <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <CardHeader>
                            <CardTitle id="reject-field-title">Reject field with reason</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-[var(--muted)]">
                                Please provide a reason for rejecting <span className="font-medium">{rejectModal.fieldKey}</span>.
                            </p>
                            <textarea
                                value={rejectModal.reason}
                                onChange={(e) =>
                                    setRejectModal((m) => (m ? { ...m, reason: e.target.value } : null))
                                }
                                rows={5}
                                placeholder="Describe why this extracted value is incorrect."
                                className="flex w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20"
                            />
                            <div className="flex flex-wrap gap-2 justify-end">
                                <Button variant="outline" onClick={() => setRejectModal(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => submitFieldReject(rejectModal.fieldKey, rejectModal.reason, true)}
                                >
                                    Submit and Edit Rule
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => submitFieldReject(rejectModal.fieldKey, rejectModal.reason, false)}
                                >
                                    Submit and Skip Rule Editing
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
