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

const CHART_LINE_COLORS = [
    "var(--informational)",
    "var(--safe)",
    "var(--review)",
    "hsl(280 50% 45%)",
    "hsl(25 80% 45%)",
    "hsl(200 60% 40%)",
    "hsl(340 55% 48%)",
    "hsl(160 45% 38%)",
];

function mergeAccuracySeries<K extends string>(
    keys: readonly K[],
    getSeries: (k: K) => { week: string; accuracy: number }[]
): { week: string; [key: string]: string | number }[] {
    const weeks = getSeries(keys[0]!).map((w) => w.week);
    return weeks.map((week) => {
        const row: { week: string; [key: string]: string | number } = { week };
        for (const k of keys) {
            const pt = getSeries(k).find((x) => x.week === week);
            row[k] = pt?.accuracy ?? 0;
        }
        return row;
    });
}

function addOthersSeries(
    rows: { week: string; [key: string]: string | number }[],
    keys: string[]
): { week: string; [key: string]: string | number }[] {
    return rows.map((row) => {
        const sum = keys.reduce((acc, key) => acc + Number(row[key] ?? 0), 0);
        const avg = keys.length ? sum / keys.length : 0;
        return { ...row, Others: Math.round(avg * 10) / 10 };
    });
}

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

function avgLatestAccuracy(values: { week: string; accuracy: number }[]): number {
    if (!values.length) return 0;
    const recent = values.slice(-2);
    return recent.reduce((sum, row) => sum + row.accuracy, 0) / recent.length;
}

export default function DashboardPage() {
    const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
    const [selectedDosage, setSelectedDosage] = useState<string | null>(null);

    const supplierBars = useMemo(() => avgConfidenceBySupplier(), []);
    const dosageBars = useMemo(() => avgConfidenceByDosage(), []);

    const selectedSupplierLabel = selectedSupplier || "All";
    const selectedDosageLabel = selectedDosage || "All";
    const overallBySupplier = useMemo(() => {
        const weighted = supplierBars.reduce(
            (acc, supplier) => {
                const series = mockAccuracyOverTimeBySupplier[supplier.name as Supplier] ?? [];
                const latestAccuracy = avgLatestAccuracy(series);
                // Trust score blends extraction confidence with recent observed accuracy.
                const trustScore = supplier.avgConfidence * 0.7 + latestAccuracy * 0.3;
                return {
                    totalScore: acc.totalScore + trustScore * supplier.count,
                    totalCount: acc.totalCount + supplier.count,
                };
            },
            { totalScore: 0, totalCount: 0 }
        );
        if (!weighted.totalCount) return 0;
        return Math.round((weighted.totalScore / weighted.totalCount) * 10) / 10;
    }, [supplierBars]);

    const overallByDosage = useMemo(() => {
        const weighted = dosageBars.reduce(
            (acc, dosage) => {
                const series = mockAccuracyOverTimeByDosage[dosage.name as DosageType] ?? [];
                const latestAccuracy = avgLatestAccuracy(series);
                const trustScore = dosage.avgConfidence * 0.7 + latestAccuracy * 0.3;
                return {
                    totalScore: acc.totalScore + trustScore * dosage.count,
                    totalCount: acc.totalCount + dosage.count,
                };
            },
            { totalScore: 0, totalCount: 0 }
        );
        if (!weighted.totalCount) return 0;
        return Math.round((weighted.totalScore / weighted.totalCount) * 10) / 10;
    }, [dosageBars]);

    const overallAverage = useMemo(() => {
        const total = mockApplications.length;
        if (!total) return 0;
        // Keeps both Supplier and Dosage influence while weighting by dataset size.
        const score = (overallBySupplier * total + overallByDosage * total) / (total * 2);
        return Math.round(score * 10) / 10;
    }, [overallBySupplier, overallByDosage]);

    const supplierBarsWithOthers = useMemo(() => {
        const focus = selectedSupplier;
        const rest = supplierBars.filter((x) => (focus ? x.name !== focus : true));
        const others =
            rest.length > 0
                ? Math.round((rest.reduce((s, x) => s + x.avgConfidence, 0) / rest.length) * 10) / 10
                : 0;
        return [...supplierBars, { name: "Others", avgConfidence: others, count: rest.length }];
    }, [supplierBars, selectedSupplier]);

    const dosageBarsWithOthers = useMemo(() => {
        const focus = selectedDosage;
        const rest = dosageBars.filter((x) => (focus ? x.name !== focus : true));
        const others =
            rest.length > 0
                ? Math.round((rest.reduce((s, x) => s + x.avgConfidence, 0) / rest.length) * 10) / 10
                : 0;
        return [...dosageBars, { name: "Others", avgConfidence: others, count: rest.length }];
    }, [dosageBars, selectedDosage]);

    const supplierAccuracyMerged = useMemo(() => {
        const keys = SUPPLIERS as unknown as string[];
        const merged = mergeAccuracySeries(SUPPLIERS as unknown as Supplier[], (s) => mockAccuracyOverTimeBySupplier[s]);
        return addOthersSeries(merged, keys);
    }, []);

    const dosageAccuracyMerged = useMemo(() => {
        const keys = DOSAGE_TYPES as unknown as string[];
        const merged = mergeAccuracySeries(DOSAGE_TYPES as unknown as DosageType[], (d) => mockAccuracyOverTimeByDosage[d]);
        return addOthersSeries(merged, keys);
    }, []);

    const supplierLineOpacity = (name: string) => {
        if (!selectedSupplier) return 1;
        return name === selectedSupplier ? 1 : 0.35;
    };

    const dosageLineOpacity = (name: string) => {
        if (!selectedDosage) return 1;
        return name === selectedDosage ? 1 : 0.35;
    };

    const supplierSelectedAvg = useMemo(() => {
        if (!selectedSupplier) return null;
        if (selectedSupplier === "Others") {
            return supplierBarsWithOthers.find((x) => x.name === "Others")?.avgConfidence ?? 0;
        }
        const apps = mockApplications.filter((a) => a.supplier === selectedSupplier);
        if (!apps.length) return 0;
        const total = apps.reduce((s, a) => s + a.confidence, 0);
        return Math.round((total / apps.length) * 10) / 10;
    }, [selectedSupplier, supplierBarsWithOthers]);

    const dosageSelectedAvg = useMemo(() => {
        if (!selectedDosage) return null;
        if (selectedDosage === "Others") {
            return dosageBarsWithOthers.find((x) => x.name === "Others")?.avgConfidence ?? 0;
        }
        const apps = mockApplications.filter((a) => (a.dosageType ?? "Tablets") === selectedDosage);
        if (!apps.length) return 0;
        const total = apps.reduce((s, a) => s + a.confidence, 0);
        return Math.round((total / apps.length) * 10) / 10;
    }, [selectedDosage, dosageBarsWithOthers]);

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
                    <CardTitle>Trust Score</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-md border border-[var(--border)] bg-[var(--sidebar)]/30 px-4 py-3">
                        <p className="text-xs text-[var(--muted)]">Supplier</p>
                        <p className="text-2xl font-semibold">{overallBySupplier}%</p>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-[var(--sidebar)]/30 px-4 py-3">
                        <p className="text-xs text-[var(--muted)]">Dosage</p>
                        <p className="text-2xl font-semibold">{overallByDosage}%</p>
                    </div>
                    <div className="rounded-md border border-[var(--border)] bg-[var(--sidebar)]/30 px-4 py-3">
                        <p className="text-xs text-[var(--muted)]">Overall</p>
                        <p className="text-2xl font-semibold">{overallAverage}%</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>Trust Score by Supplier</CardTitle>
                            <Select
                                value={selectedSupplier ?? ""}
                                onChange={(e) => setSelectedSupplier(e.target.value || null)}
                                className="w-[180px]"
                            >
                                <option value="">All suppliers</option>
                                {(SUPPLIERS as unknown as string[]).map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                                <option value="Others">Others</option>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedSupplier && supplierSelectedAvg != null && (
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/30 px-4 py-3 text-center">
                                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Selected: {selectedSupplierLabel}
                                </p>
                                <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--informational)" }}>
                                    {supplierSelectedAvg}%
                                </p>
                            </div>
                        )}
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={supplierBarsWithOthers}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(v: number | undefined) => [`${v != null ? v : 0}%`, "Trust Score"]}
                                        labelFormatter={(label) => `${label}`}
                                    />
                                    <Bar dataKey="avgConfidence" name="Avg confidence" radius={[0, 4, 4, 0]} maxBarSize={32}>
                                        {supplierBarsWithOthers.map((entry) => (
                                            <Cell
                                                key={entry.name}
                                                fill={
                                                    selectedSupplier && entry.name === selectedSupplier
                                                        ? "var(--informational)"
                                                        : "var(--muted)"
                                                }
                                                opacity={selectedSupplier && entry.name !== selectedSupplier && entry.name !== "Others" ? 0.5 : 1}
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
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>Trust Score by Dosage Type</CardTitle>
                            <Select
                                value={selectedDosage ?? ""}
                                onChange={(e) => setSelectedDosage(e.target.value || null)}
                                className="w-[180px]"
                            >
                                <option value="">All dosage types</option>
                                {(DOSAGE_TYPES as unknown as string[]).map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                                <option value="Others">Others</option>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedDosage && dosageSelectedAvg != null && (
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/30 px-4 py-3 text-center">
                                <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                                    Selected: {selectedDosageLabel}
                                </p>
                                <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--informational)" }}>
                                    {dosageSelectedAvg}%
                                </p>
                            </div>
                        )}
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={dosageBarsWithOthers}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 24 }}
                                    layout="vertical"
                                >
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(v: number | undefined) => [`${v != null ? v : 0}%`, "Trust Score"]}
                                        labelFormatter={(label) => `${label}`}
                                    />
                                    <Bar dataKey="avgConfidence" name="Avg confidence" radius={[0, 4, 4, 0]} maxBarSize={32}>
                                        {dosageBarsWithOthers.map((entry) => (
                                            <Cell
                                                key={entry.name}
                                                fill={
                                                    selectedDosage && entry.name === selectedDosage
                                                        ? "var(--informational)"
                                                        : "var(--muted)"
                                                }
                                                opacity={
                                                    selectedDosage && entry.name !== selectedDosage
                                                        ? 0.5
                                                        : 1
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Intelligence mix for selection</CardTitle>
                        <p className="text-sm text-[var(--muted)]">
                            Competency band counts for the current supplier or dosage drill-down (or all).
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px]">
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
                                        {drillDownData.map((entry) => (
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
                </Card> */}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Accuracy over time (Supplier)</CardTitle>
                        <p className="text-sm text-[var(--muted)]">
                            Weekly accuracy trend for each supplier. Supplier drill-down selection is reflected here.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={supplierAccuracyMerged} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                                    <Tooltip formatter={(v: number | undefined) => [v != null ? `${v}%` : "", "Accuracy"]} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    {[...(SUPPLIERS as unknown as string[]), "Others"].map((name, i) => (
                                        <Line
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            name={name}
                                            stroke={CHART_LINE_COLORS[i % CHART_LINE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            strokeOpacity={supplierLineOpacity(name)}
                                            opacity={supplierLineOpacity(name)}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Accuracy over time (Dosage type)</CardTitle>
                        <p className="text-sm text-[var(--muted)]">
                            Weekly accuracy trend for each dosage type. Dosage drill-down selection is reflected here.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dosageAccuracyMerged} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                                    <Tooltip formatter={(v: number | undefined) => [v != null ? `${v}%` : "", "Accuracy"]} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    {[...(DOSAGE_TYPES as unknown as string[]), "Others"].map((name, i) => (
                                        <Line
                                            key={name}
                                            type="monotone"
                                            dataKey={name}
                                            name={name}
                                            stroke={CHART_LINE_COLORS[i % CHART_LINE_COLORS.length]}
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            strokeOpacity={dosageLineOpacity(name)}
                                            opacity={dosageLineOpacity(name)}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
