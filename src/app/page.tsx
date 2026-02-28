"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
    mockApplications,
    SUPPLIERS,
    DOSAGE_TYPES,
    mockAccuracyOverTimeBySupplier,
    mockAccuracyOverTimeByDosage,
    type Supplier,
    type DosageType,
} from "@/data/mock";
import { getRulePerformanceStats } from "@/data/extraction-store";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
} from "recharts";
import Link from "next/link";

const COMPETENCY_LABELS = ["Highly Intelligent", "Intelligent", "Needs Training"] as const;

type DimensionKind = "supplier" | "dosageType";

function avgConfidenceBySupplier(): { name: string; avgConfidence: number; count: number }[] {
    const bySupplier: Record<string, { sum: number; count: number }> = {};
    for (const app of mockApplications) {
        const s = app.supplier;
        if (!bySupplier[s]) bySupplier[s] = { sum: 0, count: 0 };
        bySupplier[s].sum += app.confidence;
        bySupplier[s].count += 1;
    }
    return (SUPPLIERS as unknown as string[]).map((name) => {
        const x = bySupplier[name] ?? { sum: 0, count: 0 };
        return {
            name,
            avgConfidence: x.count ? Math.round((x.sum / x.count) * 10) / 10 : 0,
            count: x.count,
        };
    });
}

function avgConfidenceByDosage(): { name: string; avgConfidence: number; count: number }[] {
    const byDosage: Record<string, { sum: number; count: number }> = {};
    for (const app of mockApplications) {
        const d = app.dosageType ?? "Tablets";
        if (!byDosage[d]) byDosage[d] = { sum: 0, count: 0 };
        byDosage[d].sum += app.confidence;
        byDosage[d].count += 1;
    }
    return (DOSAGE_TYPES as unknown as string[]).map((name) => {
        const x = byDosage[name] ?? { sum: 0, count: 0 };
        return {
            name,
            avgConfidence: x.count ? Math.round((x.sum / x.count) * 10) / 10 : 0,
            count: x.count,
        };
    });
}

function competencyCounts(
    dimension: DimensionKind,
    selected: string | null
): { label: string; count: number; fill: string }[] {
    let apps = mockApplications;
    if (selected) {
        if (dimension === "supplier") apps = apps.filter((a) => a.supplier === selected);
        else apps = apps.filter((a) => (a.dosageType ?? "Tablets") === selected);
    }
    const counts: Record<string, number> = {};
    for (const l of COMPETENCY_LABELS) counts[l] = 0;
    for (const app of apps) {
        const label = app.competencyLevel;
        if (COMPETENCY_LABELS.includes(label as (typeof COMPETENCY_LABELS)[number])) {
            counts[label] = (counts[label] ?? 0) + 1;
        } else {
            counts["Needs Training"] = (counts["Needs Training"] ?? 0) + 1;
        }
    }
    const colors: Record<string, string> = {
        "Highly Intelligent": "var(--safe)",
        Intelligent: "var(--informational)",
        "Needs Training": "var(--review)",
    };
    return COMPETENCY_LABELS.map((label) => ({
        label,
        count: counts[label] ?? 0,
        fill: colors[label] ?? "var(--muted)",
    }));
}

export default function DashboardPage() {
    const [dimension, setDimension] = useState<DimensionKind>("supplier");
    const [selectedValue, setSelectedValue] = useState<string | null>(null);

    const confidenceData = useMemo(
        () => (dimension === "supplier" ? avgConfidenceBySupplier() : avgConfidenceByDosage()),
        [dimension]
    );

    const options = dimension === "supplier" ? (SUPPLIERS as unknown as string[]) : (DOSAGE_TYPES as unknown as string[]);
    const selectedLabel = selectedValue || "All";

    const drillDownData = useMemo(
        () => competencyCounts(dimension, selectedValue),
        [dimension, selectedValue]
    );

    const accuracyOverTime = useMemo(() => {
        if (!selectedValue) return [];
        if (dimension === "supplier") {
            return mockAccuracyOverTimeBySupplier[selectedValue as Supplier] ?? [];
        }
        return mockAccuracyOverTimeByDosage[selectedValue as DosageType] ?? [];
    }, [dimension, selectedValue]);

    const weightedAvgConfidence = useMemo(() => {
        if (!selectedValue) {
            const total = mockApplications.reduce((s, a) => s + a.confidence, 0);
            return mockApplications.length ? Math.round((total / mockApplications.length) * 10) / 10 : 0;
        }
        let apps = mockApplications;
        if (dimension === "supplier") apps = apps.filter((a) => a.supplier === selectedValue);
        else apps = apps.filter((a) => (a.dosageType ?? "Tablets") === selectedValue);
        if (!apps.length) return 0;
        const total = apps.reduce((s, a) => s + a.confidence, 0);
        return Math.round((total / apps.length) * 10) / 10;
    }, [dimension, selectedValue]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                <p className="text-[var(--muted)] text-sm">
                    Confidence score weightage, NDS form intelligence drill-down, and accuracy over time
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dimension & selection</CardTitle>
                    <p className="text-sm text-[var(--muted)]">
                        Choose to view metrics by Supplier or Dosage Type, then optionally drill into one value.
                    </p>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">View by</span>
                        <Select
                            value={dimension}
                            onChange={(e) => {
                                setDimension(e.target.value as DimensionKind);
                                setSelectedValue(null);
                            }}
                            className="w-[160px]"
                        >
                            <option value="supplier">Supplier</option>
                            <option value="dosageType">Dosage Type</option>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Drill down</span>
                        <Select
                            value={selectedValue ?? ""}
                            onChange={(e) => setSelectedValue(e.target.value || null)}
                            className="w-[180px]"
                        >
                            <option value="">All</option>
                            {options.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </Select>
                    </div>
                    {(selectedValue || dimension) && (
                        <span className="text-sm text-[var(--muted)]">
                            Showing: <strong>{selectedLabel}</strong>
                        </span>
                    )}
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Weighted average confidence score</CardTitle>
                        <p className="text-sm text-[var(--muted)]">
                            {selectedValue
                                ? `Average confidence for ${selectedLabel}`
                                : `Average confidence by ${dimension === "supplier" ? "supplier" : "dosage type"}`}
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedValue && (
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/30 px-4 py-3 text-center">
                                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Selected: {selectedLabel}
                                </p>
                                <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--informational)" }}>
                                    {weightedAvgConfidence}%
                                </p>
                            </div>
                        )}
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={confidenceData}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(v: number | undefined) => [`${v != null ? v : 0}%`, "Avg confidence"]}
                                        labelFormatter={(label) => `${label}`}
                                    />
                                    <Bar dataKey="avgConfidence" name="Avg confidence" radius={[0, 4, 4, 0]} maxBarSize={32}>
                                        {confidenceData.map((entry, i) => (
                                            <Cell
                                                key={entry.name}
                                                fill={
                                                    selectedValue && entry.name === selectedValue
                                                        ? "var(--informational)"
                                                        : "var(--muted)"
                                                }
                                                opacity={selectedValue && entry.name !== selectedValue ? 0.5 : 1}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>NDS forms by intelligence level</CardTitle>
                        <p className="text-sm text-[var(--muted)]">
                            Count of forms in Highly Intelligent, Intelligent, Needs Training for{" "}
                            {selectedValue ? selectedLabel : "all"}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={drillDownData}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={56} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                                    <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Forms"]} />
                                    <Bar dataKey="count" name="NDS forms" radius={[4, 4, 0, 0]}>
                                        {drillDownData.map((entry, i) => (
                                            <Cell key={entry.label} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            {drillDownData.map((d) => (
                                <span key={d.label} className="flex items-center gap-1.5">
                                    <span
                                        className="inline-block h-3 w-3 rounded-full"
                                        style={{ backgroundColor: d.fill }}
                                    />
                                    {d.label}: {d.count}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Accuracy over time</CardTitle>
                    <p className="text-sm text-[var(--muted)]">
                        {selectedValue
                            ? `Accuracy trend for ${selectedLabel}`
                            : "Select a supplier or dosage type above to see accuracy over time."}
                    </p>
                </CardHeader>
                <CardContent>
                    {selectedValue && accuracyOverTime.length > 0 ? (
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={accuracyOverTime} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(v: number | undefined) => [v != null ? `${v}%` : "", "Accuracy"]}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="accuracy"
                                        name="Accuracy"
                                        stroke="var(--informational)"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
                            Select a {dimension === "supplier" ? "supplier" : "dosage type"} to view accuracy over time
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Extraction rule performance: top 5 by precision, bottom 5 underperforming */}
            <Card>
                <CardHeader>
                    <CardTitle>Extraction rule performance</CardTitle>
                    <p className="text-sm text-[var(--muted)]">
                        Precision = mean confidence across all extractions using that rule. Use this to prioritize high-value rules and review underperformers.
                    </p>
                </CardHeader>
                <CardContent>
                    <RulePerformanceTables />
                </CardContent>
            </Card>
        </div>
    );
}

function RulePerformanceTables() {
    const stats = getRulePerformanceStats();
    const top5 = stats.slice(0, 5);
    const bottom5 = stats.length > 5 ? stats.slice(-5).reverse() : [];

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                    Top 5 rules by precision
                </h3>
                <p className="text-xs text-[var(--muted)] mb-3">
                    Highest mean extraction confidence (precision)
                </p>
                {top5.length ? (
                    <ul className="space-y-2">
                        {top5.map((r, i) => (
                            <li
                                key={r.ruleBaseId}
                                className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--sidebar)]/30 px-3 py-2 text-sm"
                            >
                                <span className="font-medium truncate" title={r.ruleName}>
                                    {i + 1}. {r.ruleName}
                                </span>
                                <span className="shrink-0 tabular-nums text-[var(--safe)] font-medium">
                                    {r.precision}%
                                </span>
                                <Link
                                    href={`/rules/extraction/${r.ruleBaseId}/edit`}
                                    className="shrink-0 text-xs text-[var(--informational)] hover:underline"
                                >
                                    Edit
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-[var(--muted)]">No rule invocations yet.</p>
                )}
            </div>
            <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">
                    Bottom 5 underperforming rules
                </h3>
                <p className="text-xs text-[var(--muted)] mb-3">
                    Lowest precision — consider tuning or review
                </p>
                {bottom5.length ? (
                    <ul className="space-y-2">
                        {bottom5.map((r, i) => (
                            <li
                                key={r.ruleBaseId}
                                className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--sidebar)]/30 px-3 py-2 text-sm"
                            >
                                <span className="font-medium truncate" title={r.ruleName}>
                                    {i + 1}. {r.ruleName}
                                </span>
                                <span className="shrink-0 tabular-nums text-[var(--review)] font-medium">
                                    {r.precision}%
                                </span>
                                <Link
                                    href={`/rules/extraction/${r.ruleBaseId}/edit`}
                                    className="shrink-0 text-xs text-[var(--informational)] hover:underline"
                                >
                                    Edit
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-[var(--muted)]">
                        {stats.length <= 5 ? "Need more than 5 rules to show underperformers." : "No underperforming rules."}
                    </p>
                )}
            </div>
        </div>
    );
}
