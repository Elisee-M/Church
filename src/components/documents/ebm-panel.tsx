"use client";

import { FileBadge, FileCheck2, Info } from "lucide-react";
import type { Invoice } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COPY: Record<Invoice["ebmStatus"], string> = {
  not_issued: "No reference recorded",
  reference_recorded: "Reference recorded",
  document_attached: "Reference + document attached",
};

export function EbmReferencePanel({
  invoice,
  onRecord,
  className,
}: {
  invoice: Invoice;
  onRecord?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-[#0F172A] dark:border-amber-500/20 dark:bg-amber-500/[0.06] dark:text-foreground",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <FileBadge className="size-4" />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold">EBM fiscal invoice reference</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{STATUS_COPY[invoice.ebmStatus]}</p>
          </div>
        </div>
        <Badge variant={invoice.ebmStatus === "not_issued" ? "neutral" : "info"}>
          {invoice.ebmStatus === "not_issued" ? "Not recorded" : "External"}
        </Badge>
      </div>

      {invoice.ebmReference ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 dark:border-amber-500/20 dark:bg-black/10">
          <FileCheck2 className="size-3.5 shrink-0 text-amber-600" />
          <p className="flex-1 font-mono text-[11px] font-medium">{invoice.ebmReference}</p>
          {invoice.ebmStatus === "document_attached" && (
            <span className="text-[9px] font-medium text-amber-700 dark:text-amber-300">PDF attached</span>
          )}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-amber-300 px-3 py-3 text-[10.5px] leading-relaxed text-muted-foreground dark:border-amber-500/25">
          No EBM reference has been recorded for this rental invoice. The fiscal invoice is issued in the
          church&apos;s EBM solution — Genzura only stores the reference and optional PDF.
        </p>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3 shrink-0" />
        This is not a generated fiscal invoice. Genzura never fabricates EBM numbers or documents.
      </div>

      {onRecord && (
        <Button variant="outline" size="sm" className="mt-3 h-7 w-full bg-white/70 text-[10.5px] dark:bg-transparent" onClick={onRecord}>
          {invoice.ebmReference ? "Update EBM reference" : "Record EBM reference"}
        </Button>
      )}
    </div>
  );
}
