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
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import {
  listDocumentFieldKeys,
  addDocumentFieldKey,
  renameDocumentFieldKey,
  deleteDocumentFieldKey,
  getDefaultMapping,
  setDefaultMapping,
  clearDefaultMapping,
  getExtractionRule,
  listRuleBases,
  listVersionsForRule,
} from "@/data/extraction-store";

export default function FieldMappingPage() {
  const ruleBases = listRuleBases();
  const [fieldKeys, setFieldKeys] = useState<string[]>(() => listDocumentFieldKeys());
  const [mappings, setMappings] = useState<Record<string, string>>(() =>
    Object.fromEntries(listDocumentFieldKeys().map((key) => [key, getDefaultMapping(key) ?? ""]))
  );
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [saved, setSaved] = useState(false);

  const refreshFieldKeys = () => setFieldKeys(listDocumentFieldKeys());

  const handleVersionChange = (fieldKey: string, versionedId: string) => {
    setMappings((prev) => ({ ...prev, [fieldKey]: versionedId }));
    setSaved(false);
  };

  const handleRuleChange = (fieldKey: string, ruleBaseId: string) => {
    if (!ruleBaseId) {
      setMappings((prev) => ({ ...prev, [fieldKey]: "" }));
      setSaved(false);
      return;
    }
    const versions = listVersionsForRule(ruleBaseId);
    const firstId = versions[0]?.id ?? "";
    setMappings((prev) => ({ ...prev, [fieldKey]: firstId }));
    setSaved(false);
  };

  const handleAddNewField = () => {
    const nextName = `New Field ${fieldKeys.length + 1}`;
    addDocumentFieldKey(nextName);
    setMappings((prev) => ({ ...prev, [nextName]: "" }));
    refreshFieldKeys();
    setEditingField(nextName);
    setEditingValue(nextName);
    setSaved(false);
  };

  const handleStartEdit = (fieldKey: string) => {
    setEditingField(fieldKey);
    setEditingValue(fieldKey);
  };

  const handleSaveFieldName = (oldKey: string) => {
    const next = editingValue.trim();
    if (!next) return;
    renameDocumentFieldKey(oldKey, next);
    setMappings((prev) => {
      const nextMappings = { ...prev };
      nextMappings[next] = nextMappings[oldKey] ?? "";
      delete nextMappings[oldKey];
      return nextMappings;
    });
    refreshFieldKeys();
    setEditingField(null);
    setSaved(false);
  };

  const handleDeleteField = (fieldKey: string) => {
    deleteDocumentFieldKey(fieldKey);
    setMappings((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
    refreshFieldKeys();
    setSaved(false);
  };

  const handleSave = () => {
    fieldKeys.forEach((fieldKey) => {
      const versionedId = mappings[fieldKey];
      if (versionedId) setDefaultMapping(fieldKey, versionedId);
      else clearDefaultMapping(fieldKey);
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAddNewField}>
              <Plus className="h-4 w-4 mr-1" /> Add New Field
            </Button>
            <Button onClick={handleSave}>Save mapping</Button>
          </div>
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
              {fieldKeys.map((fieldKey) => {
                const versionedId = mappings[fieldKey] ?? "";
                const rule = versionedId ? getExtractionRule(versionedId) : undefined;
                const ruleBaseId = rule?.ruleBaseId ?? "";
                const versions = ruleBaseId ? listVersionsForRule(ruleBaseId) : [];
                return (
                  <TableRow key={fieldKey}>
                    <TableCell className="font-medium">
                      {editingField === fieldKey ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="h-8 rounded-md border border-[var(--border)] px-2 text-sm"
                          />
                          <Button size="sm" onClick={() => handleSaveFieldName(fieldKey)}>Save</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{fieldKey}</span>
                          <div className="flex w-[72px] shrink-0 items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(fieldKey)} title="Edit field">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteField(fieldKey)} title="Delete field">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
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
                        <button
                          type="button"
                          className="text-xs text-[var(--muted)] underline"
                          onClick={() => handleRuleChange(fieldKey, "")}
                        >
                          Clear rule
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
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
                      </div>
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
