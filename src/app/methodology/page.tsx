"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Score Methodology</h1>
        <p className="text-sm text-[var(--muted)]">
          Methodology details for extraction, confidence scoring, and human review workflows.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-[var(--muted)]">
          This section can be used to document the rule execution logic, trust score calculation, and review decision process.
        </CardContent>
      </Card>
    </div>
  );
}
