"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { mockAuditEvents } from "@/data/mock";
import { FileDown } from "lucide-react";

export default function AuditLogsPage() {
  const [appId, setAppId] = useState("");
  const [decisionType, setDecisionType] = useState("all");
  const [modelVersion, setModelVersion] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = mockAuditEvents; // In real app would filter by state

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
          <p className="text-[var(--muted)] text-sm">Compliance & explainability</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileDown className="h-4 w-4 mr-2" />Export CSV</Button>
          <Button variant="outline">Export PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Application ID</label>
              <Input placeholder="e.g. APP-001" value={appId} onChange={(e) => setAppId(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Decision Type</label>
              <Select value={decisionType} onChange={(e) => setDecisionType(e.target.value)}>
                <option value="all">All</option>
                <option value="Auto Approved">Auto Approved</option>
                <option value="Review Required">Review Required</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Model Version</label>
              <Select value={modelVersion} onChange={(e) => setModelVersion(e.target.value)}>
                <option value="all">All</option>
                <option value="v2.3">v2.3</option>
                <option value="v2.2">v2.2</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Date From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--muted)]">Date To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline View</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[var(--muted)] mb-4">Extraction → Rule Execution → Model Decision → Human Override</p>
          <ul className="space-y-3">
            {filtered.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-4 rounded-lg border border-[var(--border)] p-3 text-sm"
              >
                <span className="font-mono text-[var(--muted)]">{e.timestamp}</span>
                <span className="font-medium">{e.applicationId}</span>
                <span className="capitalize rounded bg-[var(--sidebar)] px-2 py-0.5">{e.stage.replace("_", " ")}</span>
                <span className="text-[var(--muted)]">{e.decisionType}</span>
                <span className="text-[var(--muted)]">Model: {e.modelVersion}</span>
                <span className="text-[var(--muted)]">{e.details}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
