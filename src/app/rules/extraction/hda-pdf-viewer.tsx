"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export type HdaOption = {
  id: string;
  label: string;
  pdfProxyUrl: string;
  hdaText: string;
};

const REMOTE_PDF_URL =
  "https://xiromed.com/usa/wp-content/uploads/sites/6/2020/08/Neostigmine-1mg-HDA-09-10-2020.pdf";
const REMOTE_PDF_PROXY_URL = `/api/pdf-proxy?url=${encodeURIComponent(REMOTE_PDF_URL)}`;

const MOCK_HDA_TEXT_1 = `PRODUCT INFORMATION
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

const MOCK_HDA_TEXT_2 = `PRODUCT INFORMATION
Company Name: Global Pharma Inc.
Vendor ID: VND-1133
Catalog Item: No
Load TBA: Yes

APPLICATION DETAILS
Application Type: NDA
505(b) Type: —
FOR GENERIC DRUG PRODUCTS — AG: Checked

DSCSA Exempt: Keyword 1
Temperature Range: Keyword 5
Controlled Substance: Keyword 2`;

export const MOCK_HDA_OPTIONS: HdaOption[] = [
  {
    id: "hda-1",
    label: "Neostigmine-1mg (HDA 09-10-2020)",
    pdfProxyUrl: REMOTE_PDF_PROXY_URL,
    hdaText: MOCK_HDA_TEXT_1,
  },
  {
    id: "hda-2",
    label: "Neostigmine-1mg (Alt Label Variant)",
    pdfProxyUrl: REMOTE_PDF_PROXY_URL,
    hdaText: MOCK_HDA_TEXT_2,
  },
];

const PDF_FALLBACK_WIDTH = 560;
const PDF_MIN_ZOOM = 0.75;
const PDF_MAX_ZOOM = 2;
const PDF_ZOOM_STEP = 0.1;

const PdfDocument = dynamic(async () => (await import("react-pdf")).Document, { ssr: false });
const PdfPage = dynamic(async () => (await import("react-pdf")).Page, { ssr: false });

type HdaPdfViewerProps = {
  selectedId: string;
  onChange: (nextId: string) => void;
  options?: HdaOption[];
};

export function HdaPdfViewer({ selectedId, onChange, options = MOCK_HDA_OPTIONS }: HdaPdfViewerProps) {
  const selected = useMemo(() => options.find((o) => o.id === selectedId) ?? options[0], [options, selectedId]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [pdfFitWidth, setPdfFitWidth] = useState(PDF_FALLBACK_WIDTH);

  useEffect(() => {
    void import("react-pdf").then(({ pdfjs }) => {
      // Configure pdf.js worker on client only to avoid DOMMatrix runtime issues.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    });
  }, []);

  useEffect(() => {
    setPdfError(null);
    setPdfPageCount(0);
    setPdfPageNumber(1);
  }, [selected.id]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recalc = () => {
      const nextWidth = Math.max(240, Math.floor(el.clientWidth - 16));
      setPdfFitWidth(nextWidth);
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--sidebar)] p-2">
        <Select
          value={selected.id}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 !w-[240px] shrink-0 text-xs"
          aria-label="HDA Form / Label"
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Select>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPdfZoom((z) => Math.min(PDF_MAX_ZOOM, Number((z + PDF_ZOOM_STEP).toFixed(2))))}
            disabled={pdfZoom >= PDF_MAX_ZOOM}
            aria-label="Zoom in"
            title="Zoom in"
            className="h-8 w-8"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <span className="text-center text-xs text-[var(--muted)]">{Math.round(pdfZoom * 100)}%</span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPdfZoom((z) => Math.max(PDF_MIN_ZOOM, Number((z - PDF_ZOOM_STEP).toFixed(2))))}
            disabled={pdfZoom <= PDF_MIN_ZOOM}
            aria-label="Zoom out"
            title="Zoom out"
            className="h-8 w-8"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPdfPageNumber((n) => Math.max(1, n - 1))}
            disabled={pdfPageNumber <= 1}
            aria-label="Previous page"
            title="Previous page"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-center text-xs text-[var(--muted)]">
            {pdfPageNumber}/{pdfPageCount || 0}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setPdfPageNumber((n) => Math.min(pdfPageCount, n + 1))}
            disabled={pdfPageCount === 0 || pdfPageNumber >= pdfPageCount}
            aria-label="Next page"
            title="Next page"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {pdfError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700" role="alert">
          {pdfError}
        </p>
      )}

      <div ref={containerRef} className="min-h-[60vh] overflow-auto rounded-md border border-[var(--border)] bg-white p-2">
        <PdfDocument
          file={selected.pdfProxyUrl}
          loading={<p className="p-4 text-sm text-[var(--muted)]">Loading PDF…</p>}
          onLoadSuccess={({ numPages }) => {
            setPdfPageCount(numPages);
            setPdfPageNumber((n) => Math.min(Math.max(1, n), numPages));
            setPdfError(null);
          }}
          onLoadError={(err) => {
            setPdfError(
              `Unable to load PDF. Confirm the remote file is reachable and the proxy route can fetch it. (${err.message})`
            );
            setPdfPageCount(0);
          }}
        >
          <div className="flex justify-center">
            <PdfPage
              pageNumber={pdfPageNumber}
              width={Math.round(pdfFitWidth * pdfZoom)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        </PdfDocument>
      </div>
    </div>
  );
}

