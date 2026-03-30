"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleCategory } from "@/data/mock";

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

const MOCK_HDA_SAMPLE = `PRODUCT INFORMATION
Company Name: Acme Pharma LLC
Vendor ID: VND-8821
Catalog Item: Yes
Load TBA: No

APPLICATION DETAILS
Application Type: NDA
505(b) Type: 505(b)(1)
FOR GENERIC DRUG PRODUCTS — AG: Not checked

DSCSA Exempt: Keyword 4
Temperature Range: Keyword 2
Controlled Substance: Keyword 3`;

export type ExtractionRuleFormFieldsProps = {
  categories: RuleCategory[];
  name: string;
  setName: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  example: string;
  setExample: (v: string) => void;
  specialInstruction: string;
  setSpecialInstruction: (v: string) => void;
  categoryName: string;
  hasSubmitted: boolean;
  updatedRuleText: string;
  onSubmit: () => void;
  submitDisabled: boolean;
  cancelSlot: ReactNode;
  testModalOpen: boolean;
  setTestModalOpen: (open: boolean) => void;
};

export function ExtractionRuleFormFields({
  categories,
  name,
  setName,
  categoryId,
  setCategoryId,
  description,
  setDescription,
  role,
  setRole,
  prompt,
  setPrompt,
  example,
  setExample,
  specialInstruction,
  setSpecialInstruction,
  categoryName,
  hasSubmitted,
  updatedRuleText,
  onSubmit,
  submitDisabled,
  cancelSlot,
  testModalOpen,
  setTestModalOpen,
}: ExtractionRuleFormFieldsProps) {
  useEffect(() => {
    if (!testModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTestModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [testModalOpen, setTestModalOpen]);

  return (
    <>
      <div className="space-y-4">
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
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <textarea
            value={role}
            onChange={(e) => setRole(e.target.value)}
            rows={3}
            placeholder="e.g. You are a data steward in a procurement department. Your job is to extract a field from the HDA for creating item master. Be specific."
            className={cn(
              "flex min-h-[72px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Guidelines</label>
          <SmartPromptEditor
            value={prompt}
            onChange={setPrompt}
            placeholder="e.g. Extract the applicant's full name from the document header."
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Example(s)</label>
          <Input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Example"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Special instruction</label>
          <Input
            value={specialInstruction}
            onChange={(e) => setSpecialInstruction(e.target.value)}
            placeholder="Any special instruction for extraction"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" onClick={onSubmit} disabled={submitDisabled}>
            Submit
          </Button>
          {cancelSlot}
        </div>

        {hasSubmitted && (
          <div className="space-y-3 pt-4 border-t border-[var(--border)]">
            <div>
              <label className="block text-sm font-medium mb-1">Updated rule</label>
              <div className="rounded-md border border-[var(--border)] bg-[var(--sidebar)]/40 px-3 py-2 text-sm whitespace-pre-wrap min-h-[80px] text-[var(--foreground)]">
                {updatedRuleText || "—"}
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={() => setTestModalOpen(true)}>
              Test your rule
            </Button>
          </div>
        )}
      </div>

      {testModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-rule-title"
          onClick={() => setTestModalOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h2 id="test-rule-title" className="text-lg font-semibold">
                Test your rule
              </h2>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="rounded-md p-1.5 hover:bg-[var(--sidebar)]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0 flex-1 overflow-hidden">
              <div className="border-b md:border-b-0 md:border-r border-[var(--border)] p-4 overflow-auto max-h-[60vh]">
                <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">HDA content</h3>
                <pre className="text-xs font-mono whitespace-pre-wrap text-[var(--foreground)] leading-relaxed">
                  {MOCK_HDA_SAMPLE}
                </pre>
              </div>
              <div className="p-4 overflow-auto max-h-[60vh]">
                <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">Label</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Field name:</span> {name.trim() || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Category:</span> {categoryName || "—"}
                  </p>
                  {description.trim() ? (
                    <p>
                      <span className="font-medium">Description:</span> {description.trim()}
                    </p>
                  ) : null}
                  {role.trim() ? (
                    <div>
                      <span className="font-medium">Role:</span>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--muted)]">{role.trim()}</p>
                    </div>
                  ) : null}
                  <div>
                    <span className="font-medium">Guidelines:</span>
                    <p className="mt-1 whitespace-pre-wrap">{prompt.trim() || "—"}</p>
                  </div>
                  {example.trim() ? (
                    <div>
                      <span className="font-medium">Example(s):</span>
                      <p className="mt-1 whitespace-pre-wrap">{example.trim()}</p>
                    </div>
                  ) : null}
                  {specialInstruction.trim() ? (
                    <div>
                      <span className="font-medium">Special instruction:</span>
                      <p className="mt-1 whitespace-pre-wrap">{specialInstruction.trim()}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
