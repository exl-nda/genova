"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import {
  DOCUMENT_FIELD_KEYS,
  getDefaultMapping,
  setDefaultMapping,
  getExtractionRule,
  listRuleBases,
  listVersionsForRule,
} from "@/data/extraction-store";

export default function FieldMappingPage() {
  const ruleBases = listRuleBases();
  const [mappings, setMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      DOCUMENT_FIELD_KEYS.map((key) => [key, getDefaultMapping(key) ?? ""])
    )
  );
  const [saved, setSaved] = useState(false);

  const handleVersionChange = (fieldKey: string, versionedId: string) => {
    setMappings((prev) => ({ ...prev, [fieldKey]: versionedId }));
    setSaved(false);
  };

  const handleRuleChange = (fieldKey: string, ruleBaseId: string) => {
    const versions = listVersionsForRule(ruleBaseId);
    const firstId = versions[0]?.id ?? "";
    setMappings((prev) => ({ ...prev, [fieldKey]: firstId }));
    setSaved(false);
  };

  const handleSave = () => {
    DOCUMENT_FIELD_KEYS.forEach((fieldKey) => {
      const versionedId = mappings[fieldKey];
      if (versionedId) setDefaultMapping(fieldKey, versionedId);
    });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Field mapping</h1>
          <p className="text-[var(--muted)] text-sm">Assign rule and version to each document field (default for all applications)</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Document field → Rule + Version</CardTitle>
          <Button onClick={handleSave}>Save mapping</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document field</TableHead>
                <TableHead>Rule</TableHead>
                <TableHead>Version</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DOCUMENT_FIELD_KEYS.map((fieldKey) => {
                const versionedId = mappings[fieldKey] ?? "";
                const rule = versionedId ? getExtractionRule(versionedId) : undefined;
                const ruleBaseId = rule?.ruleBaseId ?? "";
                const versions = ruleBaseId ? listVersionsForRule(ruleBaseId) : [];
                return (
                  <TableRow key={fieldKey}>
                    <TableCell className="font-medium">{fieldKey}</TableCell>
                    <TableCell>
                      <Select
                        value={ruleBaseId}
                        onChange={(e) => handleRuleChange(fieldKey, e.target.value)}
                        className="min-w-[180px]"
                      >
                        <option value="">— Select rule —</option>
                        {ruleBases.map((r) => (
                          <option key={r.ruleBaseId} value={r.ruleBaseId}>
                            {r.name}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={versionedId}
                        onChange={(e) => handleVersionChange(fieldKey, e.target.value)}
                        className="min-w-[100px]"
                        disabled={!ruleBaseId}
                      >
                        <option value="">— Version —</option>
                        {versions.map((v) => (
                          <option key={v.id} value={v.id}>
                            v{v.version}
                          </option>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {saved && (
            <p className="text-sm text-[var(--safe)] px-6 py-2">Mapping saved.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
