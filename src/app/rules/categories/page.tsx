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
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Pencil, Check, X } from "lucide-react";
import {
  listCategories,
  createCategory,
  updateCategory,
} from "@/data/extraction-store";
import type { RuleCategory } from "@/data/mock";

export default function RuleCategoriesPage() {
  const [categories, setCategories] = useState(listCategories());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");

  const startEdit = (c: RuleCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDesc(c.description ?? "");
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateCategory(editingId, { name: editName, description: editDesc || undefined });
    setCategories(listCategories());
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!addName.trim()) return;
    createCategory({ name: addName.trim(), description: addDesc.trim() || undefined });
    setCategories(listCategories());
    setShowAdd(false);
    setAddName("");
    setAddDesc("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rule Categories</h1>
          <p className="text-[var(--muted)] text-sm">Group extraction rules by category</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          {!showAdd && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add category
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {showAdd && (
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-[var(--border)]">
              <Input
                placeholder="Category name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="max-w-[200px]"
              />
              <Input
                placeholder="Description (optional)"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                className="max-w-[240px]"
              />
              <Button size="sm" onClick={handleAdd} disabled={!addName.trim()}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddName(""); setAddDesc(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    {editingId === c.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="max-w-[200px]"
                      />
                    ) : (
                      c.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === c.id ? (
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="max-w-[280px]"
                      />
                    ) : (
                      c.description ?? "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === c.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
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
