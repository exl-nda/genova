"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { createExtractionRule, listCategories, updateExtractionRule } from "@/data/extraction-store";
import { ExtractionRuleFormFields } from "../extraction-rule-form-shared";

export default function NewExtractionRulePage() {
  const categories = listCategories();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState("");
  const [prompt, setPrompt] = useState("");
  const [example, setExample] = useState("");
  const [specialInstruction, setSpecialInstruction] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);

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
    }
    setHasSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Extraction Rule</h1>
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
            hasSubmitted={hasSubmitted}
            updatedRuleText={updatedRuleText}
            onSubmit={handleSubmit}
            submitDisabled={!name.trim() || !categoryId}
            cancelSlot={
              <Link href="/rules" className={buttonVariants({ variant: "outline" })}>
                Cancel
              </Link>
            }
            testModalOpen={testModalOpen}
            setTestModalOpen={setTestModalOpen}
          />
        </CardContent>
      </Card>
    </div>
  );
}
