"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  FileBadge,
  FileText,
  FolderOpen,
  ReceiptText,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { AppDocument, DocumentType, Invoice, Payment } from "@/types";

import { formatDate } from "@/lib/utils";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { useCurrentTenantId } from "@/hooks/use-current-tenant";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState, LoadingPanel } from "@/components/shared/states";
import { RentalInvoiceDocument } from "@/components/documents/rental-invoice";
import { PaymentReceiptDocument } from "@/components/documents/payment-receipt";
import { EbmReferencePanel } from "@/components/documents/ebm-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DOC_META: Record<DocumentType, { label: string; icon: typeof FileText; tone: string; note: string }> = {
  rental_invoice: {
    label: "Rental invoice",
    icon: FileText,
    tone: "bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground",
    note: "Issued by Genzura for rent due.",
  },
  payment_receipt: {
    label: "Payment receipt",
    icon: ReceiptText,
    tone: "bg-success/10 text-success",
    note: "Confirms money received.",
  },
  ebm_invoice: {
    label: "EBM fiscal reference",
    icon: FileBadge,
    tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    note: "Issued externally — reference stored only.",
  },
  agreement: {
    label: "Agreement",
    icon: ScrollText,
    tone: "bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground",
    note: "Rental agreement summary.",
  },
};

export function TenantDocuments() {
  const db = useDatabase();
  const ready = usePageReady();
  const [preview, setPreview] = React.useState<
    | { kind: "invoice"; invoice: Invoice }
    | { kind: "receipt"; payment: Payment }
    | { kind: "ebm"; invoice: Invoice }
    | null
  >(null);
  const tenantId = useCurrentTenantId();
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const documents = db.documents
    .filter((document) => document.tenantId === tenantId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!ready) {
    return (
      <>
        <PageHeader title="My documents" description="Loading your documents…" />
        <LoadingPanel />
      </>
    );
  }

  const openDocument = (document: AppDocument) => {
    if (document.type === "rental_invoice") {
      const invoice = db.invoices.find((item) => item.id === (document.invoiceId ?? document.relatedId));
      if (invoice) setPreview({ kind: "invoice", invoice });
      return;
    }
    if (document.type === "payment_receipt") {
      const payment = db.payments.find((item) => item.id === (document.paymentId ?? document.relatedId));
      if (payment) setPreview({ kind: "receipt", payment });
      return;
    }
    if (document.type === "ebm_invoice") {
      const invoice = db.invoices.find((item) => item.id === (document.invoiceId ?? document.relatedId));
      if (invoice) setPreview({ kind: "ebm", invoice });
      return;
    }
    toast.message("Agreement document", {
      description: "Agreement PDFs are available from the property team. A summary is shown under My rentals.",
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="My documents"
        description="Invoices, receipts and fiscal references related to your rental. Each document type is kept separate."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/tenant/rentals">
              View agreements <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { type: "rental_invoice" as const, count: documents.filter((d) => d.type === "rental_invoice").length },
          { type: "payment_receipt" as const, count: documents.filter((d) => d.type === "payment_receipt").length },
          { type: "ebm_invoice" as const, count: documents.filter((d) => d.type === "ebm_invoice").length },
        ].map((item) => {
          const meta = DOC_META[item.type];
          return (
            <div key={item.type} className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
              <div className="flex items-center gap-2.5">
                <span className={`flex size-8 items-center justify-center rounded-lg ${meta.tone}`}>
                  <meta.icon className="size-3.5" />
                </span>
                <div>
                  <p className="text-[11.5px] font-medium">{meta.label}s</p>
                  <p className="text-[10px] text-muted-foreground">{item.count} on file</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SectionCard
        title="Document library"
        description="Only documents related to your account are shown"
        action={<Badge variant="neutral">{documents.length} files</Badge>}
      >
        {documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents yet"
            description="Invoices, receipts and agreement documents will appear here as they are issued."
          />
        ) : (
          <div className="divide-y divide-border/70">
            {documents.map((document) => {
              const meta = DOC_META[document.type];
              return (
                <div key={document.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                    <meta.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[12px] font-medium">{document.name}</p>
                      <Badge variant="neutral" className="h-4 px-1.5 text-[9px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDate(document.date)} · {document.fileSize} · {document.mime} · {meta.note}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => openDocument(document)}>
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() =>
                        toast.message("Download prepared", {
                          description: `Download for ${document.name} is not available yet.`,
                        })
                      }
                    >
                      <Download className="size-3.5" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="mt-4 rounded-xl border border-border bg-card px-4 py-3 shadow-soft">
        <div className="flex items-start gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <div>
            <p className="text-[11.5px] font-semibold">Document types are kept distinct</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
              Rental invoices show what you owe. Payment receipts confirm money received. EBM fiscal
              references are issued externally and are never generated inside Genzura.
            </p>
          </div>
        </div>
      </div>

      {preview?.kind === "invoice" && (
        <Dialog open onOpenChange={(open) => !open && setPreview(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Rental invoice</DialogTitle>
              <DialogDescription>{preview.invoice.number} · rental invoice document</DialogDescription>
            </DialogHeader>
            <RentalInvoiceDocument invoice={preview.invoice} tenant={tenant} />
          </DialogContent>
        </Dialog>
      )}

      {preview?.kind === "receipt" && (
        <Dialog open onOpenChange={(open) => !open && setPreview(null)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto p-0 sm:max-w-lg">
            <div className="p-4 pb-0">
              <DialogHeader>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogDescription>{preview.payment.reference}</DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-4">
              <PaymentReceiptDocument payment={preview.payment} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {preview?.kind === "ebm" && (
        <Dialog open onOpenChange={(open) => !open && setPreview(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>EBM fiscal reference</DialogTitle>
              <DialogDescription>
                {preview.invoice.number} · issued externally by the fiscal system
              </DialogDescription>
            </DialogHeader>
            <EbmReferencePanel invoice={preview.invoice} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
