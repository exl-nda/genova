"use client";

import Link from "next/link";
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
import {
  listRuleBases,
  listCategories,
  listMappingsByRuleBase,
} from "@/data/extraction-store";
import { buttonVariants } from "@/components/ui/button";
import { Plus, Pencil, FolderOpen, Link2 } from "lucide-react";

export default function RulesListPage() {
  const categories = listCategories();
  const ruleBases = listRuleBases();
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rules Management</h1>
          <p className="text-[var(--muted)] text-sm">Extraction rules with natural language prompts and versions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/rules/categories" className={buttonVariants({ variant: "outline" })}>
            <FolderOpen className="h-4 w-4 mr-2" /> Categories
          </Link>
          <Link href="/rules/mapping" className={buttonVariants({ variant: "outline" })}>
            <Link2 className="h-4 w-4 mr-2" /> Field mapping
          </Link>
          <Link href="/rules/extraction/new" className={buttonVariants()}>
            <Plus className="h-4 w-4 mr-2" /> New rule
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Versions</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead># Mappings</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ruleBases.map((r) => (
                <TableRow key={r.ruleBaseId}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{categoryById[r.categoryId] ?? r.categoryId}</TableCell>
                  <TableCell>{r.versionCount}</TableCell>
                  <TableCell>{r.lastModified}</TableCell>
                  <TableCell>{listMappingsByRuleBase(r.ruleBaseId).length}</TableCell>
                  <TableCell>
                    <Link href={`/rules/extraction/${r.ruleBaseId}/edit`}>
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
