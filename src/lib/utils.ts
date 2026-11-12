import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const rwfFormatter = new Intl.NumberFormat("en-RW", {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

/** Rwandan Franc formatter. Kept intentionally explicit: "RWF 1,250,000". */
export function formatCurrency(amount: number, compact = false) {
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) {
      return `RWF ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `RWF ${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 1)}K`;
    }
  }
  return `RWF ${rwfFormatter.format(amount)}`;
}

export function formatNumber(value: number) {
  return rwfFormatter.format(value);
}

export function formatDate(value: string | Date, style: "short" | "long" | "month" = "short") {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : value;
  if (Number.isNaN(date.getTime())) return "—";
  if (style === "long") {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  }
  if (style === "month") {
    return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" }).format(date);
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits)}%`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function daysBetween(from: string | Date, to: string | Date) {
  const a = typeof from === "string" ? new Date(`${from}T00:00:00`) : from;
  const b = typeof to === "string" ? new Date(`${to}T00:00:00`) : to;
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000);
}

export function monthKey(date: string | Date) {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(
    new Date(year, month - 1, 1),
  );
}

export function generateReference(prefix: string) {
  const stamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${stamp}${random}`;
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
