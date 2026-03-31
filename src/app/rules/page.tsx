"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listRuleBases, listCategories } from "@/data/extraction-store";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";

const RULE_NAME_FIELDS = [
  "Catalog Item",
  "Load TBA",
  "Vendor Name",
  "Vendor ID",
  "DC Table",
  "Individual DC",
  "MNC",
  "PUD (Always 1)",
  "Generic Indicator",
  "MCK-GPC",
  "Pri-Ord-Item",
  "SVC LVL Catgy",
  "Hospital Item",
  "Private Label Code",
  "Returnable",
  "Restrict Code",
  "DC Do Not Delete",
  "MICA",
  "INFOREM",
  "NDC",
  "WAC",
  "CT QTY",
  "CS QTY",
  "PALLET QTY",
  "MOQ",
  "MFG SIZE",
  "MFG UNIT",
  "OU",
  "SU",
  "EN (selling) Description",
  "ZZ (buying) Description",
  "SYNONYM",
];
const FALLBACK_CATEGORY_ID = "cat-generic";
const FALLBACK_LAST_MODIFIED = "2026-03-31";

function RulesListInner() {
  const searchParams = useSearchParams();
  const published = searchParams.get("published") === "1";

  const categories = listCategories();
  const ruleBases = listRuleBases();
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const fallbackEditRuleBaseId = ruleBases[0]?.ruleBaseId ?? "ER1";
    const expanded = RULE_NAME_FIELDS.map((fieldName, index) => {
      const base = ruleBases.find((r) => r.name === fieldName);
      return {
        ruleBaseId: base?.ruleBaseId ?? fallbackEditRuleBaseId,
        name: fieldName,
        categoryId: base?.categoryId ?? FALLBACK_CATEGORY_ID,
        currentVersion: base?.currentVersion ?? "1.0",
        versionCount: base?.versionCount ?? 1,
        lastModified: base?.lastModified ?? FALLBACK_LAST_MODIFIED,
        rowId: `row-${index + 1}`,
        lineage: `Lineage-${String(index + 1).padStart(3, "0")}`,
      };
    });
    const q = search.trim().toLowerCase();
    if (!q) return expanded;
    return expanded.filter(
      (r) =>
        r.lineage.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q)
    );
  }, [ruleBases, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rules Management</h1>
          <p className="text-[var(--muted)] text-sm">Extraction rules with natural language prompts and versions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/rules/extraction/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-2" /> New rule
          </Link>
        </div>
      </div>

      {published && (
        <p
          className="rounded-md border border-[var(--safe)] bg-[var(--safe)]/10 px-4 py-3 text-sm text-[var(--foreground)]"
          role="status"
        >
          Your Rule has been Published!
        </p>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search field by Lineage"
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current version</TableHead>
                <TableHead>Total versions</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.rowId}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{categoryById[r.categoryId] ?? "Generic"}</TableCell>
                  <TableCell>v{r.currentVersion}</TableCell>
                  <TableCell>{r.versionCount}</TableCell>
                  <TableCell>{r.lastModified}</TableCell>
                  <TableCell>
                    <Link href={`/rules/extraction/${r.ruleBaseId}/edit?fieldName=${encodeURIComponent(r.name)}`}>
                      <Button variant="ghost" size="sm" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RulesListPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[var(--muted)]">Loading…</div>}>
      <RulesListInner />
    </Suspense>
  );
}
