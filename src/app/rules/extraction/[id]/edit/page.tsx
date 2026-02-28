"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import {
  getExtractionRule,
  updateExtractionRule,
  createNewRuleVersion,
  listCategories,
  listVersionsForRule,
} from "@/data/extraction-store";

export default function EditExtractionRulePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const ruleBaseId = params.id as string;
  const categories = listCategories();
  const versions = listVersionsForRule(ruleBaseId);
  const versionFromQuery = searchParams.get("version");

  // Redirect versioned id (ER1-v1.0) to base edit with version query
  useEffect(() => {
    if (ruleBaseId?.includes("-v")) {
      const m = ruleBaseId.match(/^(.+)-v([\d.]+)$/);
      if (m) router.replace(`/rules/extraction/${m[1]}/edit?version=${m[2]}`);
    }
  }, [ruleBaseId, router]);

  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");

  // Initialize selected version from query or first version
  useEffect(() => {
    if (versions.length === 0) return;
    const fromQuery = versionFromQuery
      ? versions.find((v) => v.version === versionFromQuery)?.id
      : undefined;
    setSelectedVersionId(fromQuery ?? versions[0]!.id);
  }, [ruleBaseId, versionFromQuery, versions]);

  // Sync form when selected version changes
  const selectedRule = selectedVersionId ? getExtractionRule(selectedVersionId) : undefined;
  useEffect(() => {
    if (selectedRule) {
      setName(selectedRule.name);
      setCategoryId(selectedRule.categoryId);
      setDescription(selectedRule.description ?? "");
      setPrompt(selectedRule.prompt);
    }
  }, [selectedRule]);

  const handleSave = () => {
    if (!selectedVersionId || !name.trim() || !categoryId) return;
    updateExtractionRule(selectedVersionId, {
      name: name.trim(),
      categoryId,
      description: description.trim() || undefined,
      prompt: prompt.trim() || "—",
    });
    router.push("/rules");
  };

  const handleAddNewVersion = () => {
    const newRule = createNewRuleVersion(ruleBaseId, {
      name: name.trim() || selectedRule?.name,
      description: (description.trim() || selectedRule?.description) || undefined,
      prompt: (prompt.trim() || selectedRule?.prompt) || "—",
    });
    setSelectedVersionId(newRule.id);
    setName(newRule.name);
    setCategoryId(newRule.categoryId);
    setDescription(newRule.description ?? "");
    setPrompt(newRule.prompt);
  };

  if (!ruleBaseId || ruleBaseId.includes("-v") || versions.length === 0) {
    return (
      <div className="space-y-6">
        <p className="text-[var(--muted)]">{ruleBaseId?.includes("-v") ? "Redirecting…" : "Rule not found."}</p>
        <Link href="/rules" className={buttonVariants({ variant: "outline" })}>
          Back to Rules
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Extraction Rule</h1>
          <p className="text-[var(--muted)] text-sm">{selectedRule?.name ?? ruleBaseId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule details</CardTitle>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium shrink-0">Version</label>
              <Select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="w-32"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddNewVersion}>
              <Plus className="h-4 w-4 mr-1" /> Add new version
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Applicant name from header"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prompt</label>
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Extract the applicant's full name from the document header."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!name.trim() || !categoryId}>
              Save changes
            </Button>
            <Link href="/rules" className={buttonVariants({ variant: "outline" })}>
              Cancel
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
