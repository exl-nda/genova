"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, Suspense } from "react";
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
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockApplications, type Application, type DecisionStatus } from "@/data/mock";
import { Eye, UserPlus, RotateCcw } from "lucide-react";

function statusVariant(s: DecisionStatus): "safe" | "review" | "risk" {
    if (s === "auto_approved") return "safe";
    if (s === "review_required") return "review";
    return "risk";
}

function statusLabel(s: DecisionStatus): string {
    if (s === "auto_approved") return "Auto Approved";
    if (s === "review_required") return "Review Required";
    return "Rejected";
}

function ApplicationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get("status") ?? "all";
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(100);
    const [riskMin, setRiskMin] = useState(0);
    const [riskMax, setRiskMax] = useState(100);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [modelVersion, setModelVersion] = useState("all");

    const filtered = useMemo(() => {
        return mockApplications.filter((app) => {
            if (statusFilter !== "all" && app.decisionStatus !== statusFilter) return false;
            if (app.confidence < confidenceMin || app.confidence > confidenceMax) return false;
            if (app.riskScore < riskMin || app.riskScore > riskMax) return false;
            if (modelVersion !== "all" && app.source !== modelVersion) return false;
            return true;
        });
    }, [statusFilter, confidenceMin, confidenceMax, riskMin, riskMax, modelVersion]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">HDA Forms</h1>
                <p className="text-[var(--muted)] text-sm">Browse and filter processed HDA Forms</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Status</label>
                            <Select
                                value={statusFilter}
                                onChange={(e) => router.push(e.target.value === "all" ? "/applications" : `/applications?status=${e.target.value}`)}
                            >
                                <option value="all">All</option>
                                <option value="auto_approved">Auto Approved</option>
                                <option value="review_required">Review Required</option>
                                <option value="rejected">Rejected</option>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Confidence %</label>
                            <div className="flex gap-2 items-center">
                                <Input type="number" min={0} max={100} value={confidenceMin} onChange={(e) => setConfidenceMin(Number(e.target.value) || 0)} className="w-20" />
                                <span className="text-[var(--muted)]">–</span>
                                <Input type="number" min={0} max={100} value={confidenceMax} onChange={(e) => setConfidenceMax(Number(e.target.value) || 100)} className="w-20" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Risk Score</label>
                            <div className="flex gap-2 items-center">
                                <Input type="number" min={0} max={100} value={riskMin} onChange={(e) => setRiskMin(Number(e.target.value) || 0)} className="w-20" />
                                <span className="text-[var(--muted)]">–</span>
                                <Input type="number" min={0} max={100} value={riskMax} onChange={(e) => setRiskMax(Number(e.target.value) || 100)} className="w-20" />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Date From</label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Date To</label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Model Version</label>
                            <Select value={modelVersion} onChange={(e) => setModelVersion(e.target.value)}>
                                <option value="all">All</option>
                                <option value="Upload">Upload</option>
                                <option value="API">API</option>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>NDC</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Confidence %</TableHead>
                                <TableHead>Competency Level</TableHead>
                                <TableHead>Decision Status</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="w-[140px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((app) => (
                                <TableRow
                                    key={app.id}
                                    className={app.decisionStatus === "auto_approved" ? "bg-emerald-50/50" : app.decisionStatus === "review_required" ? "bg-amber-50/50" : "bg-red-50/50"}
                                >
                                    <TableCell className="font-medium">{app.id}</TableCell>
                                    <TableCell>{app.supplier}</TableCell>
                                    <TableCell>{app.confidence}%</TableCell>
                                    <TableCell>{app.competencyLevel}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(app.decisionStatus)}>{statusLabel(app.decisionStatus)}</Badge>
                                    </TableCell>
                                    <TableCell>{new Date(app.timestamp).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Link href={`/applications/${app.id}`} className={buttonVariants({ variant: "ghost", size: "icon" })} title="View Details"><Eye className="h-4 w-4" /></Link>
                                            <Button variant="ghost" size="icon" title="Assign Reviewer"><UserPlus className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" title="Reprocess"><RotateCcw className="h-4 w-4" /></Button>
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

export default function ApplicationsPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <ApplicationsContent />
        </Suspense>
    );
}
