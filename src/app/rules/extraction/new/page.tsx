"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { createExtractionRule } from "@/data/extraction-store";
import { listCategories } from "@/data/extraction-store";

export default function NewExtractionRulePage() {
  const router = useRouter();
  const categories = listCategories();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleSave = () => {
    if (!name.trim() || !categoryId) return;
    const newRule = createExtractionRule({
      name: name.trim(),
      categoryId,
      description: description.trim() || undefined,
      prompt: prompt.trim() || "—",
    });
    router.push(`/rules/extraction/${newRule.ruleBaseId}/edit`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rules" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New Extraction Rule</h1>
          <p className="text-[var(--muted)] text-sm">Natural language prompt for extracting a field value</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule details</CardTitle>
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
            <Select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              Create rule
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
