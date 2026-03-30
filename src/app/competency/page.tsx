"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import {
    defaultCompetencyBands,
    defaultCompetencyBandsByDosage,
    DOSAGE_TYPES,
    type DosageType,
} from "@/data/mock";

type CompetencyTab = "model" | "dosage";

export default function CompetencyModelPage() {
    const [activeTab, setActiveTab] = useState<CompetencyTab>("model");
    const bands = defaultCompetencyBands;
    const [selectedDosage, setSelectedDosage] = useState<DosageType>("Tablets");
    const bandsByDosage = defaultCompetencyBandsByDosage;

    const dosageBands = bandsByDosage[selectedDosage];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Competency</h1>
                    <p className="text-[var(--muted)] text-sm">Govern AI trust level via thresholds</p>
                </div>
            </div>

            <div className="border-b border-[var(--border)]">
                <nav className="flex gap-6" aria-label="Competency tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("model")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === "model"
                            ? "border-[var(--foreground)] text-[var(--foreground)]"
                            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                    >
                        Model
                    </button>
                    {/* <button
                        type="button"
                        onClick={() => setActiveTab("dosage")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === "dosage"
                            ? "border-[var(--foreground)] text-[var(--foreground)]"
                            : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                            }`}
                    >
                        Dosage
                    </button> */}
                </nav>
            </div>

            {activeTab === "model" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Threshold Table</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        <th className="text-left py-2 font-medium">Accuracy Range</th>
                                        <th className="text-left py-2 font-medium">Label</th>
                                        <th className="text-left py-2 font-medium">Auto Approval</th>
                                        <th className="text-left py-2 font-medium">Min %</th>
                                        <th className="text-left py-2 font-medium">Max %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bands.map((band, i) => (
                                        <tr key={i} className="border-b border-[var(--border)]">
                                            <td className="py-3">
                                                {band.accuracyMin}–{band.accuracyMax}%
                                            </td>
                                            <td className="py-3">
                                                <input
                                                    type="text"
                                                    value={band.label}
                                                    readOnly
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 w-40 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <select
                                                    value={band.autoApproval}
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                >
                                                    <option value="enabled">Enabled</option>
                                                    <option value="conditional">Conditional</option>
                                                    <option value="disabled">Disabled</option>
                                                </select>
                                            </td>
                                            <td className="py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={band.accuracyMin}
                                                    readOnly
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 w-16 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={band.accuracyMax}
                                                    readOnly
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 w-16 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === "dosage" && (
                <Card>
                    <CardHeader>
                        <CardTitle>Threshold Table</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4 flex items-center gap-3">
                            <label htmlFor="dosage-type" className="text-sm font-medium shrink-0">Dosage type</label>
                            <Select
                                id="dosage-type"
                                value={selectedDosage}
                                onChange={(e) => setSelectedDosage(e.target.value as DosageType)}
                                className="w-40 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                disabled
                            >
                                {DOSAGE_TYPES.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        <th className="text-left py-2 font-medium">Accuracy Range</th>
                                        <th className="text-left py-2 font-medium">Label</th>
                                        <th className="text-left py-2 font-medium">Auto Approval</th>
                                        <th className="text-left py-2 font-medium">Min %</th>
                                        <th className="text-left py-2 font-medium">Max %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dosageBands.map((band, i) => (
                                        <tr key={i} className="border-b border-[var(--border)]">
                                            <td className="py-3">
                                                {band.accuracyMin}–{band.accuracyMax}%
                                            </td>
                                            <td className="py-3">
                                                <input
                                                    type="text"
                                                    value={band.label}
                                                    readOnly
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 w-40 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <select
                                                    value={band.autoApproval}
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                >
                                                    <option value="enabled">Enabled</option>
                                                    <option value="conditional">Conditional</option>
                                                    <option value="disabled">Disabled</option>
                                                </select>
                                            </td>
                                            <td className="py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={band.accuracyMin}
                                                    readOnly
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 w-16 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={band.accuracyMax}
                                                    readOnly
                                                    disabled
                                                    className="border border-[var(--border)] rounded px-2 py-1 w-16 bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
