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
import { mockApplications } from "@/data/mock";
import { getApplicationReviewStatus, type ApplicationReviewStatus } from "@/data/extraction-store";
import { Eye, UserPlus, RotateCcw } from "lucide-react";

function reviewStatusLabel(s: ApplicationReviewStatus): string {
    if (s === "under_review") return "Under Review";
    if (s === "ready_for_review") return "Ready for Review";
    return "Reviewed";
}

function reviewStatusVariant(s: ApplicationReviewStatus): "safe" | "review" | "informational" {
    if (s === "reviewed") return "safe";
    if (s === "ready_for_review") return "review";
    return "informational";
}

function ApplicationsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const statusFilter = searchParams.get("status") ?? "all";
    const [search, setSearch] = useState("");
    const [confidenceMin, setConfidenceMin] = useState(0);
    const [confidenceMax, setConfidenceMax] = useState(100);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    const filtered = useMemo(() => {
        return mockApplications.filter((app) => {
            const reviewStatus = getApplicationReviewStatus(app.id);
            if (statusFilter !== "all" && reviewStatus !== statusFilter) return false;
            if (app.confidence < confidenceMin || app.confidence > confidenceMax) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                const haystack = `${app.id} ${app.supplier} ${app.applicantName} ${app.source}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [statusFilter, confidenceMin, confidenceMax, search]);

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
                            <label className="text-xs font-medium text-[var(--muted)]">Decision status</label>
                            <Select
                                value={statusFilter}
                                onChange={(e) =>
                                    router.push(e.target.value === "all" ? "/applications" : `/applications?status=${e.target.value}`)
                                }
                            >
                                <option value="all">All</option>
                                <option value="under_review">Under Review</option>
                                <option value="ready_for_review">Ready for Review</option>
                                <option value="reviewed">Reviewed</option>
                            </Select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-[var(--muted)]">Trust Score</label>
                            <div className="flex gap-2 items-center">
                                <Input type="number" min={0} max={100} value={confidenceMin} onChange={(e) => setConfidenceMin(Number(e.target.value) || 0)} className="w-20" />
                                <span className="text-[var(--muted)]">–</span>
                                <Input type="number" min={0} max={100} value={confidenceMax} onChange={(e) => setConfidenceMax(Number(e.target.value) || 100)} className="w-20" />
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
                            <label className="text-xs font-medium text-[var(--muted)]">Search</label>
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="NDC, supplier, applicant..."
                            />
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
                                <TableHead>Trust Score</TableHead>
                                <TableHead>Competency Level</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="w-[140px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((app) => {
                                const rs = getApplicationReviewStatus(app.id);
                                return (
                                    <TableRow
                                        key={app.id}
                                        className={
                                            rs === "reviewed"
                                                ? "bg-emerald-50/50"
                                                : rs === "ready_for_review"
                                                  ? "bg-amber-50/50"
                                                  : "bg-blue-50/50"
                                        }
                                    >
                                        <TableCell className="font-medium">{app.id}</TableCell>
                                        <TableCell>{app.supplier}</TableCell>
                                        <TableCell>{app.confidence}%</TableCell>
                                        <TableCell>{app.competencyLevel}</TableCell>
                                        <TableCell>
                                            <Badge variant={reviewStatusVariant(rs)}>{reviewStatusLabel(rs)}</Badge>
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
                                );
                            })}
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
