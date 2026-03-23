"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Email } from "@/data/mock";
import { getEmails, getEmailById, processEmail, setEmailReviewed, subscribe } from "@/data/emails-store";
import { Eye, Play, RotateCcw, FileCheck, Send } from "lucide-react";

function statusVariant(status: Email["status"]) {
    if (status === "reviewed") return "safe";
    if (status === "processed") return "review";
    return "risk";
}

function statusLabel(status: Email["status"]) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function ApplicationsPage() {
    const router = useRouter();
    const [emails, setEmails] = useState<Email[]>(getEmails());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        const unsub = subscribe(() => setEmails(getEmails()));
        return unsub;
    }, []);

    const reviewedEmails = emails.filter((e) => e.reviewed);
    const selectedReviewed = reviewedEmails.filter((e) => selectedIds.has(e.id));

    const toggleSelect = (id: string) => {
        const email = getEmailById(id);
        if (!email?.reviewed) return;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedReviewed.length === reviewedEmails.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(reviewedEmails.map((e) => e.id)));
        }
    };

    const handleProcess = (id: string) => {
        setProcessingId(id);
        processEmail(id);
        setProcessingId(null);
    };

    const handleReview = (id: string) => {
        setEmailReviewed(id);
        router.push(`/applications/${id}`);
    };

    const handlePushToSAP = () => {
        if (selectedReviewed.length === 0) return;
        alert(`Push to SAP: ${selectedReviewed.length} email(s) selected. (Simulated.)`);
        setSelectedIds(new Set());
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>
                    <p className="text-[var(--muted)] text-sm">Process and review emails, then push to SAP</p>
                </div>
                <Button
                    variant="default"
                    disabled={selectedReviewed.length === 0}
                    onClick={handlePushToSAP}
                    title={selectedReviewed.length === 0 ? "Select reviewed emails to push" : undefined}
                >
                    <Send className="h-4 w-4 mr-2" />
                    Push to SAP
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    {reviewedEmails.length > 0 && (
                                        <input
                                            type="checkbox"
                                            checked={selectedReviewed.length === reviewedEmails.length}
                                            onChange={toggleSelectAll}
                                            aria-label="Select all reviewed"
                                        />
                                    )}
                                </TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Sender</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[180px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {emails.map((email) => (
                                <TableRow key={email.id}>
                                    <TableCell>
                                        {email.reviewed && (
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(email.id)}
                                                onChange={() => toggleSelect(email.id)}
                                                aria-label={`Select ${email.subject}`}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">{email.subject}</TableCell>
                                    <TableCell>{email.sender}</TableCell>
                                    <TableCell>{new Date(email.timestamp).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(email.status)}>{statusLabel(email.status)}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Link
                                                href={`/applications/${email.id}`}
                                                className={buttonVariants({ variant: "ghost", size: "icon" })}
                                                title="View details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleProcess(email.id)}
                                                disabled={processingId === email.id}
                                                title={email.processed ? "Reprocess" : "Process"}
                                            >
                                                {processingId === email.id ? (
                                                    "…"
                                                ) : email.processed ? (
                                                    <>
                                                        <RotateCcw className="h-4 w-4 mr-1" />
                                                        Reprocess
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="h-4 w-4 mr-1" />
                                                        Process
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={!email.processed}
                                                onClick={() => handleReview(email.id)}
                                                title={email.processed ? "Review" : "Process first to enable Review"}
                                            >
                                                <FileCheck className="h-4 w-4 mr-1" />
                                                Review
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
