"use client";

import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

const kpiData = [
  { label: "Total Applications", value: "12,847", href: "/applications" },
  { label: "Auto Approval Rate", value: "68%", href: "/applications?status=auto_approved" },
  { label: "Manual Review Rate", value: "24%", href: "/applications?status=review_required" },
  { label: "Rejection Rate", value: "8%", href: "/applications?status=rejected" },
  { label: "Current Competency Level", value: "Highly Intelligent", href: "/competency" },
  { label: "Avg Confidence Score", value: "86%", href: "/ai-performance" },
];

const approvalTrendData = [
  { month: "Jan", rate: 62 },
  { month: "Feb", rate: 65 },
  { month: "Mar", rate: 66 },
  { month: "Apr", rate: 67 },
  { month: "May", rate: 68 },
  { month: "Jun", rate: 68 },
];

const confidenceDistribution = [
  { range: "90-100%", count: 4200, fill: "#16a34a" },
  { range: "80-90%", count: 3100, fill: "#ca8a04" },
  { range: "70-80%", count: 2500, fill: "#dc2626" },
  { range: "<70%", count: 1047, fill: "#991b1b" },
];

const alerts = [
  { type: "warning", title: "Competency Drop Warning", message: "Accuracy in 75-80% band increased in last 7 days." },
  { type: "warning", title: "Extraction overlap", message: "Multiple rules may apply to one or more fields; check field mapping." },
  { type: "alert", title: "High Override Rate Alert", message: "Human override rate above 15% this week." },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[var(--muted)] text-sm">Executive overview of system performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiData.map(({ label, value, href }) => (
          <Link key={label} href={href}>
            <Card className="cursor-pointer transition-colors hover:border-[var(--informational)]/50">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium text-[var(--muted)]">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="kpi-value">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Auto Approval Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={approvalTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip formatter={(v: number | undefined) => [v != null ? `${v}%` : "", "Rate"]} />
                  <Line type="monotone" dataKey="rate" stroke="var(--informational)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confidenceDistribution} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-[var(--border)]" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="range" width={55} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {confidenceDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Competency Score Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-[var(--muted)] text-sm">
              Chart: Competency score over time (mock)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rule Trigger Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-[var(--muted)] text-sm">
              Heatmap: Rules vs time (mock)
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {alerts.map((a) => (
              <li
                key={a.title}
                className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3"
              >
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-[var(--muted)] text-sm">{a.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
