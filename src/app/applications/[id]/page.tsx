"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    DOCUMENT_FIELD_KEYS,
} from "@/data/extraction-store";
import type { ExtractedField } from "@/data/mock";
import { ArrowLeft, FileText, Check, X, Edit, MessageCircle, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

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

type SmartPromptEditorProps = {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
};

function escapeHtml(input: string): string {
    return input
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function SmartPromptEditor({ value, onChange, placeholder }: SmartPromptEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const baselineRef = useRef(value ?? "");
    const isFocusedRef = useRef(false);
    const [query, setQuery] = useState("");
    const [trigger, setTrigger] = useState<"/" | "#" | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
    const pendingCaretRef = useRef<number | null>(null);

    const keywords = useMemo(
        () => [
            "NDA",
            "PM",
            "505(b)(1)",
            "Generic Indicator",
            "Vendor ID",
            "Catalog Item",
            "Load TBA",
            "SVC LVL Catgy",
            "MCK-GPC",
            "DSCSA Exempt",
            "NRDC",
            "SRC",
            "Snowflake",
        ],
        []
    );

    const dictionary = useMemo(
        () =>
            new Set(
                [
                    ...keywords,
                    "Extract", "extract", "from", "the", "under", "section", "value", "if", "then",
                    "and", "or", "with", "for", "field", "product", "information", "application",
                    "type", "generic", "drug", "indicator", "vendor", "name", "id", "table", "always",
                    "is", "not", "in", "to", "of", "on", "by", "review", "alert", "query", "dynamic",
                ].map((w) => w.toLowerCase())
            ),
        [keywords]
    );

    const suggestions = useMemo(() => {
        if (!query.trim()) return keywords.slice(0, 8);
        const q = query.toLowerCase();
        return keywords.filter((k) => k.toLowerCase().includes(q)).slice(0, 8);
    }, [keywords, query]);

    const keywordTokens = useMemo(() => {
        const set = new Set<string>();
        for (const phrase of keywords) {
            for (const token of phrase.split(/\s+/)) {
                if (token.trim()) set.add(token.toLowerCase());
            }
        }
        return set;
    }, [keywords]);

    const getWordKey = (token: string) =>
        token
            .replace(/^[^A-Za-z0-9(]+|[^A-Za-z0-9)]+$/g, "")
            .toLowerCase();

    const buildCountMap = (input: string) => {
        const map = new Map<string, number>();
        const tokens = input.split(/\s+/).filter(Boolean).map(getWordKey).filter(Boolean);
        for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
        return map;
    };

    const renderDecoratedHtml = useCallback(
        (plain: string) => {
            const baselineCounts = buildCountMap(baselineRef.current || "");
            const remaining = new Map(baselineCounts);
            const parts = plain.split(/(\s+)/);
            return parts
                .map((part) => {
                    if (/^\s+$/.test(part)) return part.replaceAll("\n", "<br/>");
                    const safe = escapeHtml(part);
                    const key = getWordKey(part);
                    const left = remaining.get(key) ?? 0;
                    const isChanged = key.length > 0 && left === 0;
                    if (left > 0) remaining.set(key, left - 1);
                    const isKeyword = keywordTokens.has(key);
                    const alpha = /^[a-zA-Z]+$/.test(part);
                    const isMisspelled = alpha && !dictionary.has(part.toLowerCase());

                    if (isChanged && isKeyword) return `<strong>${safe}</strong>`;
                    if (isChanged && isMisspelled) {
                        return `<span style="text-decoration: underline; text-decoration-color: #ef4444; text-decoration-thickness: 2px;">${safe}</span>`;
                    }
                    return safe;
                })
                .join("");
        },
        [dictionary, keywordTokens]
    );

    const getCaretOffset = useCallback((root: HTMLElement): number => {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return 0;
        const range = sel.getRangeAt(0).cloneRange();
        const pre = range.cloneRange();
        pre.selectNodeContents(root);
        pre.setEnd(range.endContainer, range.endOffset);
        return pre.toString().length;
    }, []);

    const setCaretOffset = useCallback((root: HTMLElement, offset: number) => {
        const selection = window.getSelection();
        if (!selection) return;
        const range = document.createRange();
        let remaining = offset;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
            const text = node.textContent ?? "";
            if (remaining <= text.length) {
                range.setStart(node, Math.max(0, remaining));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            }
            remaining -= text.length;
            node = walker.nextNode();
        }
        range.selectNodeContents(root);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }, []);

    const syncFromExternalValue = useCallback(() => {
        const el = editorRef.current;
        if (!el) return;
        const shouldPreserveCaret = isFocusedRef.current;
        const caret = shouldPreserveCaret ? getCaretOffset(el) : 0;
        const html = renderDecoratedHtml(value || "");
        if (el.innerHTML !== html) {
            el.innerHTML = html || "";
            if (shouldPreserveCaret) setCaretOffset(el, caret);
        }
    }, [getCaretOffset, renderDecoratedHtml, setCaretOffset, value]);

    useEffect(() => {
        if (!isFocusedRef.current) {
            baselineRef.current = value || "";
        }
        syncFromExternalValue();
    }, [syncFromExternalValue]);

    const readPlainText = () => {
        const el = editorRef.current;
        if (!el) return "";
        return el.innerText.replace(/\u00A0/g, "");
    };

    const updateSuggestionState = () => {
        const sel = window.getSelection();
        const el = editorRef.current;
        if (!sel || !sel.rangeCount || !el) return;

        const text = readPlainText();
        const caret = getCaretOffset(el);
        const leftText = text.slice(0, Math.max(0, caret));
        const match = leftText.match(/(^|\s)([\/#])([^\s]*)$/);

        if (!match) {
            setShowSuggestions(false);
            setTrigger(null);
            setQuery("");
            return;
        }

        const foundTrigger = match[2] as "/" | "#";
        const nextQuery = match[3] ?? "";
        setTrigger(foundTrigger);
        setQuery(nextQuery);
        setShowSuggestions(true);
        setActiveIndex(0);

        const r = sel.getRangeAt(0).cloneRange();
        r.collapse(true);
        const rect = r.getBoundingClientRect();
        const hostRect = el.getBoundingClientRect();
        setMenuPos({
            top: rect.bottom - hostRect.top + 6,
            left: rect.left - hostRect.left,
        });
    };

    const applySuggestion = (word: string) => {
        const el = editorRef.current;
        const current = readPlainText();
        const caret = el ? getCaretOffset(el) : current.length;
        const left = current.slice(0, caret);
        const match = /(^|\s)[\/#][^\s]*$/.exec(left);
        if (!match) return;
        const replaceStart = match.index + (match[1] ? match[1].length : 0);
        const next = current.slice(0, replaceStart) + word + current.slice(caret);
        pendingCaretRef.current = replaceStart + word.length;

        onChange(next);
        setShowSuggestions(false);
        setTrigger(null);
        setQuery("");

        requestAnimationFrame(() => {
            syncFromExternalValue();
            if (editorRef.current) {
                editorRef.current.focus();
                if (pendingCaretRef.current != null) {
                    setCaretOffset(editorRef.current, pendingCaretRef.current);
                    pendingCaretRef.current = null;
                }
            }
        });
    };

    const onInput = () => {
        const next = readPlainText();
        onChange(next);
        requestAnimationFrame(() => {
            syncFromExternalValue();
            updateSuggestionState();
        });
    };

    const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (e.key === "/" || e.key === "#") {
            requestAnimationFrame(updateSuggestionState);
        }
        if (!showSuggestions || suggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
            return;
        }
        if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            applySuggestion(suggestions[activeIndex]);
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setShowSuggestions(false);
        }
    };

    return (
        <div className="relative">
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onFocus={() => {
                    isFocusedRef.current = true;
                    baselineRef.current = value || "";
                }}
                onBlur={() => {
                    isFocusedRef.current = false;
                }}
                onInput={onInput}
                onKeyUp={updateSuggestionState}
                onClick={updateSuggestionState}
                onKeyDown={onKeyDown}
                className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm min-h-[120px] max-h-[280px] overflow-auto whitespace-pre-wrap break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20"
                data-placeholder={placeholder ?? ""}
            />
            {(!value || value.length === 0) && (
                <div className="pointer-events-none absolute left-3 top-2 text-sm text-[var(--muted)]">
                    {placeholder ?? ""}
                </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
                <div
                    className="absolute z-50 w-64 rounded-md border border-[var(--border)] bg-white shadow-md"
                    style={{ top: menuPos.top, left: menuPos.left }}
                >
                    <div className="px-2 py-1 text-xs text-[var(--muted)] border-b border-[var(--border)]">
                        {trigger} suggestions
                    </div>
                    {suggestions.map((s, idx) => (
                        <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                applySuggestion(s);
                            }}
                            className={`block w-full text-left px-2 py-1 text-sm ${idx === activeIndex ? "bg-[var(--sidebar)] font-semibold" : "hover:bg-[var(--sidebar)]/60"
                                }`}
                        >
                            <span className={idx === activeIndex ? "font-semibold" : "font-normal"}>{s}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

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
        fieldName: string;
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

    useEffect(() => {
        if (editModal) {
            setError(null);
            editModalNameInputRef.current?.focus();
        }
    }, [editModal]);

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
            fieldName: f.field,
        });
    };

    const saveEditRule = () => {
        if (!editModal) return;
        if (!DOCUMENT_FIELD_KEYS.includes(editModal.fieldName as (typeof DOCUMENT_FIELD_KEYS)[number])) {
            setError("Invalid field name. Please choose a valid document field.");
            return;
        }
        setError(null);
        try {
            editRuleFromField(id, editModal.fieldKey, editModal.ruleId, "Divya Shukla", {
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
    const isEditFieldNameValid =
        !editModal || DOCUMENT_FIELD_KEYS.includes(editModal.fieldName as (typeof DOCUMENT_FIELD_KEYS)[number]);

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
                    <p className="text-sm text-[var(--muted)]">Click a row to expand and see rule details. Low-confidence fields can be improved by editing the rule or reprocessing.</p>
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
                            const decisionReason = getFieldDecisionReason(id, f.field);
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
                                                    onClick={(e) => handleFieldApprove(f.field, e)}
                                                    aria-label={`Approve ${f.field}`}
                                                    title="Approve"
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

            {/* Edit rule modal: three columns — form, output, graph */}
            {editModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--foreground)]/20 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="edit-rule-title"
                    onKeyDown={(e) => e.key === "Escape" && setEditModal(null)}
                >
                    <Card className="w-full max-w-7xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between shrink-0">
                            <CardTitle id="edit-rule-title">Edit rule for this field</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setEditModal(null)} aria-label="Close">×</Button>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 xl:grid-cols-3 gap-6 pb-6">
                            {/* Column 1: version + form */}
                            <div className="space-y-4 min-w-0 min-h-0 overflow-y-auto pr-1">
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
                                    <p className="mt-1 text-xs text-[var(--muted)]">
                                        Last edited by {getExtractionRule(editModal.ruleId)?.lastEditedBy ?? "—"} on{" "}
                                        {getExtractionRule(editModal.ruleId)?.lastEditedAt
                                            ? new Date(getExtractionRule(editModal.ruleId)!.lastEditedAt!).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" htmlFor="edit-field-name">Field name</label>
                                    <Input
                                        id="edit-field-name"
                                        value={editModal.fieldName}
                                        onChange={(e) => setEditModal((m) => m ? { ...m, fieldName: e.target.value } : null)}
                                        className={isEditFieldNameValid ? "w-full" : "w-full border-red-500 ring-1 ring-red-500"}
                                    />
                                    {!isEditFieldNameValid && (
                                        <p className="mt-1 text-xs text-red-600">Field name is invalid.</p>
                                    )}
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
                                    <SmartPromptEditor
                                        value={editModal.prompt}
                                        onChange={(next) => setEditModal((m) => (m ? { ...m, prompt: next } : null))}
                                        placeholder="e.g. Extract the applicant's full name from the document header."
                                    />
                                </div>
                            </div>
                            {/* Column 2: Test output */}
                            <div className="flex flex-col min-h-0 min-w-0 space-y-4 overflow-y-auto pr-1">
                                <label className="block text-sm font-medium mb-1">Test output</label>
                                <div className="flex-1 min-h-[260px] rounded-md border border-[var(--border)] bg-[#282c34] overflow-auto">
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
                            {/* Column 3: Confidence comparison + graph */}
                            <div className="flex flex-col min-h-0 min-w-0 space-y-4">
                                <div className="shrink-0">
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
                                </div>
                                <div className="mt-auto flex-1 min-h-[260px] rounded-md border border-[var(--border)] bg-[var(--sidebar)]/30 p-3">
                                    {editModal.testOutput != null ? (
                                        (() => {
                                            const beforeVal = Number(editModal.previousConfidence) || 0;
                                            const afterVal = Number(editModal.testOutput.confidence) || 0;
                                            const afterColor = afterVal >= beforeVal ? "var(--safe)" : "#ef4444";
                                            return (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={[
                                                            { label: "Before", value: beforeVal, fill: "var(--muted)" },
                                                            { label: "After", value: afterVal, fill: afterColor },
                                                        ]}
                                                        margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                                                    >
                                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={26} />
                                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                            <Cell fill="var(--muted)" />
                                                            <Cell fill={afterColor} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            );
                                        })()
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
                                            Run Test to visualize confidence change.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="shrink-0 border-t border-[var(--border)] bg-[var(--card)] px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Button onClick={handleTestRule} disabled={editModalTesting}>
                                    {editModalTesting ? "Testing…" : "Test"}
                                </Button>
                                <label className="text-sm text-[var(--muted)] shrink-0">Simulate:</label>
                                <Select
                                    value={testSimulateMode}
                                    onChange={(e) => setTestSimulateMode(e.target.value as "positive" | "negative")}
                                    className="w-44"
                                    disabled={editModalTesting}
                                >
                                    <option value="positive">Positive (improved)</option>
                                    <option value="negative">Negative (regression)</option>
                                </Select>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" onClick={() => setEditModal(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={saveEditRule}
                                    disabled={editModal.testOutput == null}
                                    title={editModal.testOutput == null ? "Run Test first to enable Save" : undefined}
                                >
                                    Save (creates new version)
                                </Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}
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
