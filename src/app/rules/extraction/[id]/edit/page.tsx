"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Plus, Pin } from "lucide-react";
import {
  getExtractionRule,
  updateExtractionRule,
  createNewRuleVersion,
  listCategories,
  listVersionsForRule,
  publishExtractionRuleVersion,
  getActiveRuleVersionId,
  setActiveRuleVersionId,
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
  const fieldNameFromQuery = searchParams.get("fieldName");

  // Redirect versioned id (ER1-v1.0) to base edit with version query
  useEffect(() => {
    if (ruleBaseId?.includes("-v")) {
      const m = ruleBaseId.match(/^(.+)-v([\d.]+)$/);
      if (m) router.replace(`/rules/extraction/${m[1]}/edit?version=${m[2]}`);
    }
  }, [ruleBaseId, router]);

  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const [activeVersionNonce, setActiveVersionNonce] = useState(0);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [prompt, setPrompt] = useState("");
  const [example, setExample] = useState("");
  const [specialInstruction, setSpecialInstruction] = useState("");

  // Initialize / sync from URL query; otherwise keep user selection; default active or latest.
  useEffect(() => {
    const v = listVersionsForRule(ruleBaseId);
    if (v.length === 0) return;
    setSelectedVersionId((current) => {
      const fromQuery = versionFromQuery ? v.find((x) => x.version === versionFromQuery)?.id : undefined;
      if (fromQuery) return fromQuery;
      if (current && v.some((x) => x.id === current)) return current;
      const activeId = getActiveRuleVersionId(ruleBaseId);
      const activeOk = activeId && v.some((x) => x.id === activeId);
      const latest = v[v.length - 1]!.id;
      return activeOk ? activeId! : latest;
    });
  }, [ruleBaseId, versionFromQuery]);

  // Sync form when selected version changes
  const selectedRule = selectedVersionId ? getExtractionRule(selectedVersionId) : undefined;
  const isFieldNameOverride = Boolean(
    fieldNameFromQuery &&
    selectedRule &&
    fieldNameFromQuery.trim() &&
    fieldNameFromQuery.trim() !== selectedRule.name
  );
  useEffect(() => {
    if (selectedRule) {
      setName(fieldNameFromQuery?.trim() || selectedRule.name);
      setCategoryId(selectedRule.categoryId);
      setDescription(selectedRule.description ?? "");
      setRole(selectedRule.role ?? "");
      setPrompt(selectedRule.prompt);
      setExample("");
      setSpecialInstruction(selectedRule.specialInstruction ?? "");
    }
  }, [selectedRule, fieldNameFromQuery]);

  const categoryName = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name ?? "",
    [categories, categoryId]
  );

  const activeVersionId = useMemo(
    () => getActiveRuleVersionId(ruleBaseId),
    [ruleBaseId, activeVersionNonce, selectedVersionId]
  );

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
  };

  const handlePublish = () => {
    if (!selectedVersionId) return;
    publishExtractionRuleVersion(selectedVersionId);
    router.push("/rules?published=1");
  };

  const handleSetActiveVersion = () => {
    if (!selectedVersionId) return;
    setActiveRuleVersionId(ruleBaseId, selectedVersionId);
    setActiveVersionNonce((n) => n + 1);
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
          <p className="text-[var(--muted)] text-sm">{fieldNameFromQuery?.trim() || selectedRule?.name || ruleBaseId}</p>
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
                className="min-w-[8rem]"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version}
                    {v.isPublished ? " (published)" : ""}
                    {activeVersionId === v.id ? " (active)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddNewVersion} disabled={isFieldNameOverride}>
              <Plus className="h-4 w-4 mr-1" /> Add new version
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={handleSetActiveVersion} disabled={!selectedVersionId || isFieldNameOverride}>
              <Pin className="h-4 w-4 mr-1" /> Set active version
            </Button>
          </div>
          <p className="text-xs text-[var(--muted)] pt-1">
            The version selected above is loaded in the form. Use Set active version to mark which version is the working default for this rule.
          </p>
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
            onSubmit={handleSubmit}
            submitDisabled={!name.trim() || !categoryId || isFieldNameOverride}
            lockNameAndCategory
            testStepExtra={
              <Button type="button" onClick={handlePublish} disabled={!selectedVersionId || isFieldNameOverride}>
                Publish rule
              </Button>
            }
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
