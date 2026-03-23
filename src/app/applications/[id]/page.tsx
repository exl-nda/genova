"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { Select } from "@/components/ui/select";
import { getEmailById, subscribe } from "@/data/emails-store";
import {
    getExtractedFieldsForApplication,
    getFieldDecision,
    setFieldDecision,
} from "@/data/extraction-store";
import type { ExtractedField } from "@/data/mock";
import { EMAIL_EXTRACTED_FIELD_KEYS } from "@/data/mock";
import { ArrowLeft, FileText, Paperclip, Check, X } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const CONFIDENCE_THRESHOLD = 80;

export default function EmailDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [email, setEmail] = useState(() => getEmailById(id));
    const [previewTab, setPreviewTab] = useState<"json" | "attachments">("json");
    const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(() => {
        const e = getEmailById(id);
        const atts = e?.attachments ?? [];
        return atts[0]?.id ?? null;
    });
    const [fields, setFields] = useState<ExtractedField[]>(() =>
        getExtractedFieldsForApplication(id).filter((f) =>
            (EMAIL_EXTRACTED_FIELD_KEYS as readonly string[]).includes(f.field)
        )
    );

    useEffect(() => {
        const e = getEmailById(id);
        setEmail(e ?? undefined);
        setFields(
            getExtractedFieldsForApplication(id).filter((f) =>
                (EMAIL_EXTRACTED_FIELD_KEYS as readonly string[]).includes(f.field)
            )
        );
        const atts = e?.attachments ?? [];
        setSelectedAttachmentId(atts[0]?.id ?? null);
    }, [id]);

    useEffect(() => {
        const unsub = subscribe(() => setEmail(getEmailById(id)));
        return unsub;
    }, [id]);

    if (!email) {
        return (
            <div className="space-y-6">
                <p className="text-[var(--muted)]">Email not found.</p>
                <Link href="/applications" className={buttonVariants({ variant: "outline" })}>
                    Back to Emails
                </Link>
            </div>
        );
    }

    const digitizedJson = {
        email_id: email.id,
        subject: email.subject,
        sender: email.sender,
        timestamp: email.timestamp,
        body: email.bodyJson ?? { message: "Not yet digitized. Run Process on the list." },
        digitized_at: email.processed ? new Date().toISOString() : null,
    };

    const attachments = email.attachments ?? [];
    const selectedAttachment =
        attachments.find((a) => a.id === selectedAttachmentId) ?? attachments[0] ?? null;

    const handleFieldApprove = (fieldKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFieldDecision(id, fieldKey, "approved");
        setFields((prev) => [...prev]);
    };

    const handleFieldReject = (fieldKey: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFieldDecision(id, fieldKey, "rejected");
        setFields((prev) => [...prev]);
    };

    const avgConfidence =
        fields.length > 0
            ? Math.round(
                  (fields.reduce((acc, f) => acc + f.confidence, 0) / fields.length) * 10
              ) / 10
            : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/applications"
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">{email.subject}</h1>
                        <p className="text-[var(--muted)] text-sm">
                            {email.sender} · {new Date(email.timestamp).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Email body / Attachments */}
                <Card className="lg:sticky lg:top-6 self-start h-fit">
                    <CardHeader className="space-y-3">
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" /> Email content
                        </CardTitle>
                        <nav className="flex gap-4 border-b border-[var(--border)]" aria-label="Content tabs">
                            <button
                                type="button"
                                onClick={() => setPreviewTab("json")}
                                className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                    previewTab === "json"
                                        ? "border-[var(--foreground)] text-[var(--foreground)]"
                                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                JSON body
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab("attachments")}
                                className={`pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                    previewTab === "attachments"
                                        ? "border-[var(--foreground)] text-[var(--foreground)]"
                                        : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                                }`}
                            >
                                Attachments
                            </button>
                        </nav>
                    </CardHeader>
                    <CardContent className="min-h-0">
                        {previewTab === "json" && (
                            <div className="rounded-lg border border-[var(--border)] bg-[#282c34] overflow-auto max-h-[70vh]">
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
                        {previewTab === "attachments" && (
                            <div className="space-y-3">
                                {attachments.length === 0 ? (
                                    <p className="text-sm text-[var(--muted)]">No attachments.</p>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--muted)] mb-1">
                                                Select attachment
                                            </label>
                                            <Select
                                                value={selectedAttachment?.id ?? ""}
                                                onChange={(e) => setSelectedAttachmentId(e.target.value || null)}
                                            >
                                                {attachments.map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.name}
                                                    </option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div className="aspect-[3/4] bg-[var(--sidebar)] rounded-lg border border-[var(--border)] flex flex-col items-center justify-center text-[var(--muted)] p-4">
                                            <Paperclip className="h-10 w-10 mb-2" />
                                            <span className="text-sm font-medium">
                                                {selectedAttachment?.name ?? "—"}
                                            </span>
                                            <span className="text-xs mt-1">
                                                {selectedAttachment?.type ?? ""}
                                            </span>
                                            <span className="text-xs mt-2">Preview placeholder</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Extracted fields, confidence, approve/disapprove */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Extracted fields</CardTitle>
                            <p className="text-sm text-[var(--muted)]">
                                Confidence score:{" "}
                                <Badge variant={avgConfidence >= 90 ? "safe" : avgConfidence >= 75 ? "review" : "risk"}>
                                    {avgConfidence}%
                                </Badge>
                            </p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Field</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Confidence</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((f) => {
                                        const decision = getFieldDecision(id, f.field);
                                        const isLowConfidence = f.confidence < CONFIDENCE_THRESHOLD;
                                        return (
                                            <TableRow
                                                key={f.field}
                                                className={isLowConfidence ? "bg-amber-50/70" : undefined}
                                            >
                                                <TableCell className="font-medium">{f.field}</TableCell>
                                                <TableCell>{f.value}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            f.confidence >= 90
                                                                ? "safe"
                                                                : f.confidence >= 75
                                                                  ? "review"
                                                                  : "risk"
                                                        }
                                                    >
                                                        {f.confidence}%
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
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
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
