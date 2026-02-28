"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

const fieldOptions = ["Applicant Name", "Date of Birth", "Document ID", "Amount", "Risk Score", "Confidence"];
const operatorOptions = ["equals", "not equals", "greater than", "less than", "contains", "in range"];
const actionOptions = ["Flag Risk", "Reject", "Send to Review", "Adjust Score"];

export default function RuleBuilderPage() {
    const [conditions, setConditions] = useState([{ field: "", operator: "", value: "" }]);
    const [action, setAction] = useState("Send to Review");
    const [logic, setLogic] = useState<"AND" | "OR">("AND");

    const addCondition = () => setConditions((c) => [...c, { field: "", operator: "", value: "" }]);
    const updateCondition = (i: number, key: string, value: string) => {
        setConditions((c) => c.map((x, j) => (j === i ? { ...x, [key]: value } : x)));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}><ArrowLeft className="h-5 w-5" /></Link>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Rule Builder</h1>
                    <p className="text-[var(--muted)] text-sm">Visual logic composer</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>IF conditions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {conditions.map((c, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                            {i > 0 && (
                                <Select value={logic} onChange={(e) => setLogic(e.target.value as "AND" | "OR")} className="w-20">
                                    <option value="AND">AND</option>
                                    <option value="OR">OR</option>
                                </Select>
                            )}
                            <Select
                                value={c.field}
                                onChange={(e) => updateCondition(i, "field", e.target.value)}
                                className="min-w-[140px]"
                            >
                                <option value="">Field</option>
                                {fieldOptions.map((f) => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </Select>
                            <Select
                                value={c.operator}
                                onChange={(e) => updateCondition(i, "operator", e.target.value)}
                                className="min-w-[120px]"
                            >
                                <option value="">Operator</option>
                                {operatorOptions.map((op) => (
                                    <option key={op} value={op}>{op}</option>
                                ))}
                            </Select>
                            <Input
                                placeholder="Value"
                                value={c.value}
                                onChange={(e) => updateCondition(i, "value", e.target.value)}
                                className="w-32"
                            />
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addCondition}>+ Add condition</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>THEN action</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={action} onChange={(e) => setAction(e.target.value)} className="max-w-xs">
                        {actionOptions.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </Select>
                </CardContent>
            </Card>

            <div className="flex gap-2">
                <Button>Simulate</Button>
                <Button variant="outline">Historical Impact Preview</Button>
                <Button variant="secondary">Version Compare</Button>
                <Button variant="outline">Publish</Button>
            </div>
        </div>
    );
}
