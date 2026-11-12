"use client";

import { FileText } from "lucide-react";
import type { Invoice, Tenant } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDatabase } from "@/hooks/use-database";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export function RentalInvoiceDocument({
  invoice,
  tenant,
  className,
}: {
  invoice: Invoice;
  tenant?: Tenant;
  className?: string;
}) {
  const db = useDatabase();
  const organization = db.settings.organization;
  const balance = Math.max(invoice.amount - invoice.amountPaid, 0);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white text-[#0F172A] shadow-soft",
        className,
      )}
    >
      <div className="h-1.5 bg-[#142B4A]" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Logo className="h-9" />
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-slate-500">
              Rental invoice · not an EBM fiscal invoice
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Invoice</p>
            <p className="font-mono text-[13px] font-semibold">{invoice.number}</p>
            <p className="mt-1 text-[10px] text-slate-500">Issued {formatDate(invoice.issueDate)}</p>
            <p className="text-[10px] text-slate-500">Due {formatDate(invoice.dueDate)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">From</p>
            <p className="mt-1 text-[12px] font-semibold">{organization.legalName}</p>
            <p className="text-[10.5px] leading-relaxed text-slate-500">
              {organization.address}, {organization.city}
            </p>
            <p className="text-[10.5px] text-slate-500">TIN: {organization.tin}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">Billed to</p>
            <p className="mt-1 text-[12px] font-semibold">{tenant?.name ?? "Tenant"}</p>
            <p className="text-[10.5px] text-slate-500">{tenant?.email}</p>
            <p className="text-[10.5px] text-slate-500">{tenant?.phone}</p>
            {tenant?.tin && <p className="text-[10.5px] text-slate-500">TIN: {tenant.tin}</p>}
          </div>
        </div>

        <div className="mt-4">
          <div className="hidden grid-cols-[1fr_90px_120px] gap-3 border-b border-slate-200 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500 sm:grid">
            <span>Description</span>
            <span className="text-right">Period</span>
            <span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-slate-100">
            {invoice.lineItems.map((line) => (
              <div
                key={line.id}
                className="grid gap-1 py-2.5 sm:grid-cols-[1fr_90px_120px] sm:items-center sm:gap-3"
              >
                <span className="text-[11.5px] font-medium">{line.description}</span>
                <span className="text-[10px] text-slate-500 sm:text-right">
                  {formatDate(invoice.issueDate, "month")}
                </span>
                <span className="text-[11.5px] font-semibold sm:text-right">
                  {formatCurrency(line.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 ml-auto max-w-[260px] space-y-1.5 border-t border-slate-200 pt-3 text-[11px]">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Paid to date</span>
            <span className="text-[#16A34A]">{formatCurrency(invoice.amountPaid)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-[12.5px] font-semibold">
            <span>Balance due</span>
            <span>{formatCurrency(balance)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-3 border-t border-slate-200 pt-3">
          <p className="max-w-xs text-[9px] leading-relaxed text-slate-400">
            {db.settings.invoices.footerNote}
          </p>
          <p className="flex items-center gap-1 text-[9px] text-slate-400">
            <FileText className="size-3" /> Rental invoice · {invoice.number}
          </p>
        </div>
      </div>
    </div>
  );
}
