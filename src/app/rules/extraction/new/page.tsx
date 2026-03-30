"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  createExtractionRule,
  listCategories,
  updateExtractionRule,
  publishExtractionRuleVersion,
  setActiveRuleVersionId,
} from "@/data/extraction-store";
import { ExtractionRuleFormFields } from "../extraction-rule-form-shared";

export default function NewExtractionRulePage() {
  const router = useRouter();
  const categories = listCategories();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [prompt, setPrompt] = useState("");
  const [example, setExample] = useState("");
  const [specialInstruction, setSpecialInstruction] = useState("");
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);

  const categoryName = useMemo(
    () => categories.find((c) => c.id === categoryId)?.name ?? "",
    [categories, categoryId]
  );

  const handleSubmit = () => {
    if (!name.trim() || !categoryId) return;
    if (createdVersionId) {
      updateExtractionRule(createdVersionId, {
        name: name.trim(),
        categoryId,
        description: description.trim() || undefined,
        role: role.trim() || undefined,
        prompt: prompt.trim() || "—",
        specialInstruction: specialInstruction.trim() || undefined,
      });
    } else {
      const newRule = createExtractionRule({
        name: name.trim(),
        categoryId,
        description: description.trim() || undefined,
        role: role.trim() || undefined,
        prompt: prompt.trim() || "—",
        specialInstruction: specialInstruction.trim() || undefined,
      });
      setCreatedVersionId(newRule.id);
      setActiveRuleVersionId(newRule.ruleBaseId, newRule.id);
    }
  };

  const handlePublish = () => {
    if (!name.trim() || !categoryId) return;
    let versionId = createdVersionId;
    if (!versionId) {
      const newRule = createExtractionRule({
        name: name.trim(),
        categoryId,
        description: description.trim() || undefined,
        role: role.trim() || undefined,
        prompt: prompt.trim() || "—",
        specialInstruction: specialInstruction.trim() || undefined,
      });
      versionId = newRule.id;
      setCreatedVersionId(newRule.id);
      setActiveRuleVersionId(newRule.ruleBaseId, newRule.id);
    } else {
      updateExtractionRule(versionId, {
        name: name.trim(),
        categoryId,
        description: description.trim() || undefined,
        role: role.trim() || undefined,
        prompt: prompt.trim() || "—",
        specialInstruction: specialInstruction.trim() || undefined,
      });
    }
    publishExtractionRuleVersion(versionId);
    router.push("/rules?published=1");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Attribute Rule</h1>
          <p className="text-[var(--muted)] text-sm">{name.trim() || "Draft"}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExtractionRuleFormFields
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
            submitDisabled={!name.trim() || !categoryId}
            cancelSlot={
              <Link href="/rules" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            }
            fieldNameConfirmation
            testStepExtra={
              <Button type="button" onClick={handlePublish} disabled={!name.trim() || !categoryId}>
                Publish rule
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
