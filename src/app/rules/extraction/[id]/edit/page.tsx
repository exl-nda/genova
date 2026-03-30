"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import {
  getExtractionRule,
  updateExtractionRule,
  createNewRuleVersion,
  listCategories,
  listVersionsForRule,
} from "@/data/extraction-store";
import { ExtractionRuleFormFields } from "../../extraction-rule-form-shared";

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
  const [role, setRole] = useState("");
  const [prompt, setPrompt] = useState("");
  const [example, setExample] = useState("");
  const [specialInstruction, setSpecialInstruction] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

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
    setHasSubmitted(false);
  }, [selectedVersionId]);

  useEffect(() => {
    if (selectedRule) {
      setName(selectedRule.name);
      setCategoryId(selectedRule.categoryId);
      setDescription(selectedRule.description ?? "");
      setRole(selectedRule.role ?? "");
      setPrompt(selectedRule.prompt);
      setExample("");
      setSpecialInstruction(selectedRule.specialInstruction ?? "");
    }
  }, [selectedRule]);

  const categoryName = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name ?? "",
    [categories, categoryId]
  );

  const updatedRuleText = useMemo(() => {
    const lines: string[] = [];
    if (name.trim()) lines.push(`Name: ${name.trim()}`);
    if (categoryName) lines.push(`Category: ${categoryName}`);
    if (description.trim()) lines.push(`Description: ${description.trim()}`);
    if (role.trim()) lines.push(`Role:\n${role.trim()}`);
    if (prompt.trim()) lines.push(`Guidelines:\n${prompt.trim()}`);
    if (example.trim()) lines.push(`Example(s):\n${example.trim()}`);
    if (specialInstruction.trim()) lines.push(`Special instruction:\n${specialInstruction.trim()}`);
    return lines.join("\n\n");
  }, [name, categoryName, description, role, prompt, example, specialInstruction]);

  const handleSubmit = () => {
    if (!selectedVersionId || !name.trim() || !categoryId) return;
    updateExtractionRule(selectedVersionId, {
      name: name.trim(),
      categoryId,
      description: description.trim() || undefined,
      role: role.trim() || undefined,
      prompt: prompt.trim() || "—",
      specialInstruction: specialInstruction.trim() || undefined,
    });
    setHasSubmitted(true);
  };

  const handleAddNewVersion = () => {
    const newRule = createNewRuleVersion(ruleBaseId, {
      name: name.trim() || selectedRule?.name,
      description: (description.trim() || selectedRule?.description) || undefined,
      role: (role.trim() || selectedRule?.role) || undefined,
      prompt: (prompt.trim() || selectedRule?.prompt) || "—",
      specialInstruction: (specialInstruction.trim() || selectedRule?.specialInstruction) || undefined,
    });
    setSelectedVersionId(newRule.id);
    setName(newRule.name);
    setCategoryId(newRule.categoryId);
    setDescription(newRule.description ?? "");
    setRole(newRule.role ?? "");
    setPrompt(newRule.prompt);
    setSpecialInstruction(newRule.specialInstruction ?? "");
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
        <CardContent>
          <ExtractionRuleFormFields
            key={selectedVersionId}
            categories={categories}
            name={name}
            setName={setName}
            categoryId={categoryId}
            setCategoryId={setCategoryId}
            description={description}
            setDescription={setDescription}
            role={role}
            setRole={setRole}
            prompt={prompt}
            setPrompt={setPrompt}
            example={example}
            setExample={setExample}
            specialInstruction={specialInstruction}
            setSpecialInstruction={setSpecialInstruction}
            categoryName={categoryName}
            hasSubmitted={hasSubmitted}
            updatedRuleText={updatedRuleText}
            onSubmit={handleSubmit}
            submitDisabled={!name.trim() || !categoryId}
            cancelSlot={
              <Link href="/rules" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
