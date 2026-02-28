"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle } from "lucide-react";

const confidenceDist = [
  { range: "90-100%", count: 4200, fill: "#16a34a" },
  { range: "80-90%", count: 3100, fill: "#ca8a04" },
  { range: "70-80%", count: 2500, fill: "#dc2626" },
  { range: "<70%", count: 1047, fill: "#991b1b" },
];

const decisionAccuracy = [
  { week: "W1", accuracy: 89 },
  { week: "W2", accuracy: 90 },
  { week: "W3", accuracy: 88 },
  { week: "W4", accuracy: 91 },
];

const metrics = [
  { label: "Precision", value: "0.92" },
  { label: "Recall", value: "0.88" },
  { label: "False Positive Rate", value: "0.05" },
  { label: "False Negative Rate", value: "0.12" },
];

export default function AIPerformancePage() {
  const [modelVersion, setModelVersion] = useState("v2.3");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Performance</h1>
          <p className="text-[var(--muted)] text-sm">Monitor model behavior</p>
        </div>
        <div className="flex gap-2">
          <Select value={modelVersion} onChange={(e) => setModelVersion(e.target.value)} className="w-32">
            <option value="v2.2">v2.2</option>
            <option value="v2.3">v2.3</option>
            <option value="v2.4">v2.4 (draft)</option>
          </Select>
          <Button variant="outline">Compare Models</Button>
          <Button>Trigger Retraining</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceDist} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="range" width={55} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {confidenceDist.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decision Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={decisionAccuracy}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `${v}%` : "", "Accuracy"]} />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--informational)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Drift Detection Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium text-sm">Confidence drift in 70-80% band</p>
              <p className="text-[var(--muted)] text-sm">Volume increased 8% vs last week. Consider retraining.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border border-[var(--border)] p-4">
                <p className="text-xs font-medium text-[var(--muted)]">{m.label}</p>
                <p className="kpi-value mt-1">{m.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
