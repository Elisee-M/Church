"use client";

import { BadgeCheck, ReceiptText } from "lucide-react";
import type { Payment } from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { useDatabase } from "@/hooks/use-database";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export function PaymentReceiptDocument({
  payment,
  className,
}: {
  payment: Payment;
  className?: string;
}) {
  const db = useDatabase();
  const tenant = db.tenants.find((item) => item.id === payment.tenantId);
  const invoice = db.invoices.find((item) => item.id === payment.invoiceId);
  const reversed = payment.amount < 0;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-emerald-200 bg-white text-[#0F172A] shadow-soft",
        className,
      )}
    >
      <div className="h-1.5 bg-[#16A34A]" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Logo className="h-8" />
            <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-700">
              Payment receipt · not a fiscal invoice
            </p>
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ReceiptText className="size-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-lg bg-emerald-50/70 px-4 py-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-700">
              Amount {reversed ? "reversed" : "paid"}
            </p>
            <p className="mt-0.5 font-display text-[26px] font-semibold leading-none">
              {formatCurrency(Math.abs(payment.amount))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Receipt reference</p>
            <p className="font-mono text-[11px] font-semibold">{payment.reference}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-2.5 text-[10.5px] sm:grid-cols-2">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Paid by</p>
            <p className="mt-0.5 text-[11.5px] font-medium">{tenant?.name ?? "Tenant"}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">For invoice</p>
            <p className="mt-0.5 font-mono text-[11px] font-medium">{invoice?.number ?? "—"}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Payment method</p>
            <p className="mt-0.5 text-[11px] font-medium">{PAYMENT_METHOD_LABELS[payment.method]}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Payment date</p>
            <p className="mt-0.5 text-[11px] font-medium">{formatDate(payment.date)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-0.5 text-[11px] font-medium capitalize">{payment.status}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Verified by</p>
            <p className="mt-0.5 text-[11px] font-medium">
              {payment.verifiedBy ?? "Pending verification"}
              {payment.verifiedAt ? ` · ${formatDateTime(payment.verifiedAt)}` : ""}
            </p>
          </div>
          {payment.phone && (
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Mobile number</p>
              <p className="mt-0.5 text-[11px] font-medium">{payment.phone}</p>
            </div>
          )}
          {payment.bankName && (
            <div>
              <p className="text-[9px] uppercase tracking-wide text-slate-500">Bank</p>
              <p className="mt-0.5 text-[11px] font-medium">{payment.bankName}</p>
            </div>
          )}
        </div>

        {payment.notes && (
          <p className="mt-4 rounded-md border border-slate-200 px-3 py-2 text-[9.5px] leading-relaxed text-slate-500">
            {payment.notes}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5">
          <p className="text-[9px] text-slate-400">
            This receipt confirms a payment received by Genzura. It is not an EBM fiscal invoice.
          </p>
          {payment.verification === "verified" && (
            <span className="flex items-center gap-1 text-[9px] font-medium text-emerald-700">
              <BadgeCheck className="size-3" /> Verified
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
