"use client";

import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RuleCategory } from "@/data/mock";
import { HdaPdfViewer, MOCK_HDA_OPTIONS } from "./hda-pdf-viewer";
import { X } from "lucide-react";

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
  onSubmit: () => void;
  submitDisabled: boolean;
  cancelSlot: ReactNode;
  /** When true, name and category cannot be changed (edit flow). */
  lockNameAndCategory?: boolean;
  /** Rendered below "Back to details" on the test step (e.g. Publish). */
  testStepExtra?: ReactNode;
  /** New rule: require explicit confirmation of the field name (blur + before test step). */
  fieldNameConfirmation?: boolean;
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
  onSubmit,
  submitDisabled,
  cancelSlot,
  lockNameAndCategory = false,
  testStepExtra,
  fieldNameConfirmation = false,
}: ExtractionRuleFormFieldsProps) {
  const [stepIndex, setStepIndex] = useState<0 | 1>(0);
  const [selectedHdaId, setSelectedHdaId] = useState<string>(MOCK_HDA_OPTIONS[0]?.id ?? "");
  const [fieldNameModalOpen, setFieldNameModalOpen] = useState(false);
  const fieldNameInputRef = useRef<HTMLInputElement>(null);
  const confirmedFieldNameRef = useRef<string>("");
  const advanceAfterFieldNameConfirmRef = useRef(false);

  const openFieldNameConfirm = useCallback((advanceAfter: boolean) => {
    advanceAfterFieldNameConfirmRef.current = advanceAfter;
    setFieldNameModalOpen(true);
  }, []);

  const confirmFieldName = useCallback(() => {
    confirmedFieldNameRef.current = name.trim();
    setFieldNameModalOpen(false);
    if (advanceAfterFieldNameConfirmRef.current) {
      advanceAfterFieldNameConfirmRef.current = false;
      onSubmit();
      setStepIndex(1);
    }
  }, [name, onSubmit]);

  const dismissFieldNameModal = useCallback(() => {
    advanceAfterFieldNameConfirmRef.current = false;
    setFieldNameModalOpen(false);
    requestAnimationFrame(() => fieldNameInputRef.current?.focus());
  }, []);

  const tryGoToTestStep = useCallback(() => {
    if (!fieldNameConfirmation || lockNameAndCategory) {
      onSubmit();
      setStepIndex(1);
      return;
    }
    const t = name.trim();
    if (!t) return;
    if (t !== confirmedFieldNameRef.current) {
      openFieldNameConfirm(true);
      return;
    }
    onSubmit();
    setStepIndex(1);
  }, [fieldNameConfirmation, lockNameAndCategory, name, onSubmit, openFieldNameConfirm]);

  const handleFieldNameBlur = useCallback(() => {
    if (!fieldNameConfirmation || lockNameAndCategory) return;
    const t = name.trim();
    if (!t || t === confirmedFieldNameRef.current) return;
    openFieldNameConfirm(false);
  }, [fieldNameConfirmation, lockNameAndCategory, name, openFieldNameConfirm]);

  useEffect(() => {
    if (!fieldNameModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissFieldNameModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fieldNameModalOpen, dismissFieldNameModal]);
  const selectedHda = useMemo(() => {
    return MOCK_HDA_OPTIONS.find((o) => o.id === selectedHdaId) ?? MOCK_HDA_OPTIONS[0];
  }, [selectedHdaId]);

  function RuleLabelPreview() {
    return (
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-medium">Field name:</span> {name.trim() || "—"}
        </p>
        <p>
          <span className="font-medium">Category:</span> {categoryName || "—"}
        </p>
        {description.trim() ? (
          <p>
            <span className="font-medium">Description:</span>{" "}
            <span className="whitespace-pre-wrap">{description.trim()}</span>
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
    );
  }

  const stepHeader = (
    <div className="flex items-center gap-6 text-sm">
      <div className={`flex items-center gap-2 ${stepIndex === 0 ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
        <span className="rounded-md border border-[var(--border)] bg-[var(--sidebar)]/20 px-2 py-0.5 text-xs">1</span>
        Details
      </div>
      <div className={`flex items-center gap-2 ${stepIndex === 1 ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
        <span className="rounded-md border border-[var(--border)] bg-[var(--sidebar)]/20 px-2 py-0.5 text-xs">2</span>
        Test
      </div>
    </div>
  );

  return (
    <>
      {stepHeader}

      <div className="mt-4">
        {stepIndex === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Field Name</label>
                <Input
                  ref={fieldNameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleFieldNameBlur}
                  placeholder="e.g. Applicant name from header"
                  disabled={lockNameAndCategory}
                  className={lockNameAndCategory ? "bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80" : undefined}
                />
                {fieldNameConfirmation && !lockNameAndCategory ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    You will be asked to confirm this attribute name when you leave the field or continue to testing.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <Select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={lockNameAndCategory}
                  className={lockNameAndCategory ? "bg-[var(--sidebar)] text-[var(--muted)] cursor-not-allowed opacity-80" : undefined}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Short description"
                  className={cn(
                    "flex min-h-[72px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
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
                <SmartPromptEditor value={prompt} onChange={setPrompt} placeholder="e.g. Extract the applicant's full name from the document header." />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Example(s)</label>
                <textarea
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  rows={3}
                  placeholder="Example"
                  className={cn(
                    "flex min-h-[72px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Special instruction</label>
                <textarea
                  value={specialInstruction}
                  onChange={(e) => setSpecialInstruction(e.target.value)}
                  rows={3}
                  placeholder="Any special instruction for extraction"
                  className={cn(
                    "flex min-h-[72px] w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  )}
                />
              </div>

            </div>

            <div className="lg:sticky lg:top-6 self-start space-y-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/20 p-4 overflow-hidden">
                <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">Live label preview</h3>
                <RuleLabelPreview />
              </div>

              <div className="flex flex-col gap-2">
                <Button type="button" onClick={tryGoToTestStep} disabled={submitDisabled}>
                  Move to next step to test it
                </Button>
                {cancelSlot}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/20 p-3 lg:sticky lg:top-6 self-start">
              <HdaPdfViewer selectedId={selectedHdaId} onChange={setSelectedHdaId} />
            </div>

            <div className="lg:sticky lg:top-6 self-start space-y-3">
              <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--sidebar)]/20 p-4 overflow-hidden">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">
                    HDA content ({selectedHda?.label ?? "—"})
                  </h3>
                  <pre className="text-xs font-mono whitespace-pre-wrap text-[var(--foreground)] leading-relaxed rounded-md border border-[var(--border)] bg-white p-3">
                    {selectedHda?.hdaText ?? "—"}
                  </pre>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 text-[var(--muted)]">Label</h3>
                  <div className="rounded-lg border border-[var(--border)] bg-white p-3">
                    <RuleLabelPreview />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" onClick={() => setStepIndex(0)}>
                  Back to details
                </Button>
                {testStepExtra}
                {cancelSlot}
              </div>
            </div>
          </div>
        )}
      </div>

      {fieldNameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-name-confirm-title"
          onClick={dismissFieldNameModal}
        >
          <Card className="w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle id="field-name-confirm-title" className="text-lg">
                Confirm field name
              </CardTitle>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={dismissFieldNameModal} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted)]">
                Use this attribute rule name?
              </p>
              <p className="mt-3 rounded-md border border-[var(--border)] bg-[var(--sidebar)]/40 px-3 py-2 text-sm font-medium">
                {name.trim() || "—"}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)]">
              <Button type="button" variant="outline" onClick={dismissFieldNameModal}>
                Edit name
              </Button>
              <Button type="button" onClick={confirmFieldName}>
                Confirm
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}
