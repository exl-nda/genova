"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

type SmartPromptEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function SmartPromptEditor({ value, onChange, placeholder }: SmartPromptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const baselineRef = useRef(value ?? "");
  const isFocusedRef = useRef(false);
  const pendingCaretRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [trigger, setTrigger] = useState<"/" | "#" | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const keywords = useMemo(
    () => [
      "NDA",
      "PM",
      "505(b)(1)",
      "Generic Indicator",
      "Vendor ID",
      "Catalog Item",
      "Load TBA",
      "SVC LVL Catgy",
      "MCK-GPC",
      "DSCSA Exempt",
      "NRDC",
      "SRC",
      "Snowflake",
    ],
    []
  );

  const dictionary = useMemo(
    () =>
      new Set(
        [
          ...keywords,
          "Extract", "extract", "from", "the", "under", "section", "value", "if", "then",
          "and", "or", "with", "for", "field", "product", "information", "application",
          "type", "generic", "drug", "indicator", "vendor", "name", "id", "table", "always",
          "is", "not", "in", "to", "of", "on", "by", "review", "alert", "query", "dynamic",
        ].map((w) => w.toLowerCase())
      ),
    [keywords]
  );

  const suggestions = useMemo(() => {
    if (!query.trim()) return keywords.slice(0, 8);
    const q = query.toLowerCase();
    return keywords.filter((k) => k.toLowerCase().includes(q)).slice(0, 8);
  }, [keywords, query]);

  const keywordTokens = useMemo(() => {
    const set = new Set<string>();
    for (const phrase of keywords) {
      for (const token of phrase.split(/\s+/)) {
        if (token.trim()) set.add(token.toLowerCase());
      }
    }
    return set;
  }, [keywords]);

  const getWordKey = (token: string) =>
    token.replace(/^[^A-Za-z0-9(]+|[^A-Za-z0-9)]+$/g, "").toLowerCase();

  const buildCountMap = (input: string) => {
    const map = new Map<string, number>();
    const tokens = input.split(/\s+/).filter(Boolean).map(getWordKey).filter(Boolean);
    for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
    return map;
  };

  const renderDecoratedHtml = useCallback(
    (plain: string) => {
      const baselineCounts = buildCountMap(baselineRef.current || "");
      const remaining = new Map(baselineCounts);
      const parts = plain.split(/(\s+)/);
      return parts
        .map((part) => {
          if (/^\s+$/.test(part)) return part.replaceAll("\n", "<br/>");
          const safe = escapeHtml(part);
          const key = getWordKey(part);
          const left = remaining.get(key) ?? 0;
          const isChanged = key.length > 0 && left === 0;
          if (left > 0) remaining.set(key, left - 1);
          const isKeyword = keywordTokens.has(key);
          const alpha = /^[a-zA-Z]+$/.test(part);
          const isMisspelled = alpha && !dictionary.has(part.toLowerCase());

          if (isChanged && isKeyword) return `<strong>${safe}</strong>`;
          if (isChanged && isMisspelled) {
            return `<span style="text-decoration: underline; text-decoration-color: #ef4444; text-decoration-thickness: 2px;">${safe}</span>`;
          }
          return safe;
        })
        .join("");
    },
    [dictionary, keywordTokens]
  );

  const getCaretOffset = useCallback((root: HTMLElement): number => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return 0;
    const range = sel.getRangeAt(0).cloneRange();
    const pre = range.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  }, []);

  const setCaretOffset = useCallback((root: HTMLElement, offset: number) => {
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    let remaining = offset;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent ?? "";
      if (remaining <= text.length) {
        range.setStart(node, Math.max(0, remaining));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      remaining -= text.length;
      node = walker.nextNode();
    }
    range.selectNodeContents(root);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const syncFromExternalValue = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const shouldPreserveCaret = isFocusedRef.current;
    const caret = shouldPreserveCaret ? getCaretOffset(el) : 0;
    const html = renderDecoratedHtml(value || "");
    if (el.innerHTML !== html) {
      el.innerHTML = html || "";
      if (shouldPreserveCaret) setCaretOffset(el, caret);
    }
  }, [getCaretOffset, renderDecoratedHtml, setCaretOffset, value]);

  useEffect(() => {
    if (!isFocusedRef.current) baselineRef.current = value || "";
    syncFromExternalValue();
  }, [syncFromExternalValue, value]);

  const readPlainText = () => {
    const el = editorRef.current;
    if (!el) return "";
    return el.innerText.replace(/\u00A0/g, "");
  };

  const updateSuggestionState = () => {
    const sel = window.getSelection();
    const el = editorRef.current;
    if (!sel || !sel.rangeCount || !el) return;

    const text = readPlainText();
    const caret = getCaretOffset(el);
    const leftText = text.slice(0, Math.max(0, caret));
    const match = leftText.match(/(^|\s)([\/#])([^\s]*)$/);

    if (!match) {
      setShowSuggestions(false);
      setTrigger(null);
      setQuery("");
      return;
    }

    setTrigger(match[2] as "/" | "#");
    setQuery(match[3] ?? "");
    setShowSuggestions(true);
    setActiveIndex(0);

    const r = sel.getRangeAt(0).cloneRange();
    r.collapse(true);
    const rect = r.getBoundingClientRect();
    const hostRect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom - hostRect.top + 6,
      left: rect.left - hostRect.left,
    });
  };

  const applySuggestion = (word: string) => {
    const el = editorRef.current;
    const current = readPlainText();
    const caret = el ? getCaretOffset(el) : current.length;
    const left = current.slice(0, caret);
    const match = /(^|\s)[\/#][^\s]*$/.exec(left);
    if (!match) return;
    const replaceStart = match.index + (match[1] ? match[1].length : 0);
    const next = current.slice(0, replaceStart) + word + current.slice(caret);
    pendingCaretRef.current = replaceStart + word.length;

    onChange(next);
    setShowSuggestions(false);
    setTrigger(null);
    setQuery("");

    requestAnimationFrame(() => {
      syncFromExternalValue();
      if (editorRef.current) {
        editorRef.current.focus();
        if (pendingCaretRef.current != null) {
          setCaretOffset(editorRef.current, pendingCaretRef.current);
          pendingCaretRef.current = null;
        }
      }
    });
  };

  const onInput = () => {
    const next = readPlainText();
    onChange(next);
    requestAnimationFrame(() => {
      syncFromExternalValue();
      updateSuggestionState();
    });
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === "/" || e.key === "#") requestAnimationFrame(updateSuggestionState);
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applySuggestion(suggestions[activeIndex]);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onFocus={() => {
          isFocusedRef.current = true;
          baselineRef.current = value || "";
        }}
        onBlur={() => {
          isFocusedRef.current = false;
        }}
        onInput={onInput}
        onKeyUp={updateSuggestionState}
        onClick={updateSuggestionState}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm min-h-[120px] max-h-[280px] overflow-auto whitespace-pre-wrap break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20"
      />
      {(!value || value.length === 0) && (
        <div className="pointer-events-none absolute left-3 top-2 text-sm text-[var(--muted)]">
          {placeholder ?? ""}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute z-50 w-64 rounded-md border border-[var(--border)] bg-white shadow-md"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <div className="px-2 py-1 text-xs text-[var(--muted)] border-b border-[var(--border)]">
            {trigger} suggestions
          </div>
          {suggestions.map((s, idx) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(s);
              }}
              className={`block w-full text-left px-2 py-1 text-sm ${
                idx === activeIndex ? "bg-[var(--sidebar)] font-semibold" : "hover:bg-[var(--sidebar)]/60"
              }`}
            >
              <span className={idx === activeIndex ? "font-semibold" : "font-normal"}>{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [examples, setExamples] = useState<string[]>([""]);

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
      setExamples([""]);
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
            <SmartPromptEditor
              value={prompt}
              onChange={setPrompt}
              placeholder="e.g. Extract the applicant's full name from the document header."
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Examples</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setExamples((prev) => [...prev, ""])}
              >
                Add example
              </Button>
            </div>
            {examples.map((example, idx) => (
              <div key={`example-${idx}`} className="flex items-center gap-2">
                <Input
                  value={example}
                  onChange={(e) =>
                    setExamples((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))
                  }
                  placeholder={`Example ${idx + 1}`}
                />
                {examples.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setExamples((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
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
