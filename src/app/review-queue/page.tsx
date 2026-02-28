"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockApplications, mockExtractedFields } from "@/data/mock";
import { FileText, Check, Clock, User, Lightbulb } from "lucide-react";

const queueItems = mockApplications.filter((a) => a.decisionStatus === "review_required");

export default function ReviewQueuePage() {
  const [selectedId, setSelectedId] = useState<string | null>(queueItems[0]?.id ?? null);
  const [editableValues, setEditableValues] = useState<Record<string, string>>(
    Object.fromEntries(mockExtractedFields.filter((f) => f.editable).map((f) => [f.field, f.value]))
  );

  const currentApp = queueItems.find((a) => a.id === selectedId) ?? queueItems[0];
  const fieldsWithEdits = mockExtractedFields.map((f) => ({
    ...f,
    value: f.editable ? (editableValues[f.field] ?? f.value) : f.value,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review Queue</h1>
        <p className="text-[var(--muted)] text-sm">Human-in-the-loop validation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Document */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Document
            </CardTitle>
            {currentApp && (
              <div className="flex items-center gap-2">
                <Badge variant="review">Priority: High</Badge>
                <span className="flex items-center gap-1 text-sm text-[var(--muted)]">
                  <Clock className="h-4 w-4" /> SLA: 2h 15m
                </span>
                <span className="flex items-center gap-1 text-sm text-[var(--muted)]">
                  <User className="h-4 w-4" /> Unassigned
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="aspect-[3/4] bg-[var(--sidebar)] rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--muted)]">
              Document preview — low confidence fields highlighted
            </div>
          </CardContent>
        </Card>

        {/* Right: Editable fields */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Editable Fields — Quick Edit</CardTitle>
              <div className="flex gap-2">
                <Button size="sm"><Check className="h-4 w-4 mr-1" />Bulk Approve</Button>
                <Button size="sm" variant="outline">Smart Suggestions</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldsWithEdits.map((f) => (
                    <TableRow
                      key={f.field}
                      className={f.confidence < 80 ? "bg-amber-50/70" : undefined}
                    >
                      <TableCell className="font-medium">{f.field}</TableCell>
                      <TableCell>
                        {f.editable ? (
                          <Input
                            value={editableValues[f.field] ?? f.value}
                            onChange={(e) => setEditableValues((prev) => ({ ...prev, [f.field]: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        ) : (
                          f.value
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={f.confidence >= 90 ? "safe" : f.confidence >= 75 ? "review" : "risk"}>
                          {f.confidence}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4" /> Smart Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted)]">Vendor ID format suggests value VND-8822. Accept suggestion?</p>
              <Button size="sm" variant="outline" className="mt-2">Apply</Button>
            </CardContent>
          </Card>

          <p className="text-xs text-[var(--muted)]">Keyboard: Enter to approve, Esc to skip. Low confidence fields highlighted in amber.</p>
        </div>
      </div>

      {/* Queue list */}
      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {queueItems.map((app) => (
              <Button
                key={app.id}
                variant={selectedId === app.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedId(app.id)}
              >
                {app.id}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
