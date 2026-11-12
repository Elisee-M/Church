"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, TableSkeleton } from "@/components/shared/states";

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right" | "center";
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (row: T) => string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
  actions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  loadingRows?: number;
  className?: string;
  tableClassName?: string;
  initialSort?: { id: string; direction: "asc" | "desc" };
};

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchable = true,
  searchPlaceholder = "Search…",
  getSearchText,
  initialPageSize = 8,
  pageSizeOptions = [8, 15, 25, 50],
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  emptyIcon,
  emptyAction,
  toolbar,
  actions,
  onRowClick,
  loading,
  loadingRows = 6,
  className,
  tableClassName,
  initialSort,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sort, setSort] = React.useState<{ id: string; direction: "asc" | "desc" } | null>(
    initialSort ?? null,
  );

  const filtered = React.useMemo(() => {
    if (!query.trim() || !getSearchText) return data;
    const needle = query.trim().toLowerCase();
    return data.filter((row) => getSearchText(row).toLowerCase().includes(needle));
  }, [data, getSearchText, query]);

  const sorted = React.useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((item) => item.id === sort.id);
    if (!column?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);
      const result =
        typeof aValue === "number" && typeof bValue === "number"
          ? aValue - bValue
          : String(aValue).localeCompare(String(bValue));
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const start = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, sorted.length);

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return;
    setSort((current) => {
      if (current?.id !== column.id) return { id: column.id, direction: "asc" };
      if (current.direction === "asc") return { id: column.id, direction: "desc" };
      return null;
    });
  };

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-soft", className)}>
      {(searchable || toolbar || actions) && (
        <div className="flex flex-col gap-3 border-b border-border/80 p-3.5 sm:flex-row sm:items-center">
          {searchable && getSearchText && (
            <div className="relative w-full sm:max-w-[280px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-8.5 bg-background pl-8 text-xs"
              />
            </div>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
          {actions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div>}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={loadingRows} columns={columns.length} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow className="bg-muted/35 hover:bg-muted/35">
              {columns.map((column) => {
                const active = sort?.id === column.id;
                return (
                  <TableHead
                    key={column.id}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.headerClassName,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        onClick={() => toggleSort(column)}
                        className={cn(
                          "inline-flex items-center gap-1 uppercase tracking-[0.07em] transition hover:text-foreground",
                          active && "text-foreground",
                          column.align === "right" && "flex-row-reverse",
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort?.direction === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter") onRowClick(row);
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && sorted.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-border/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
              <span className="font-medium text-foreground">{sorted.length}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">Rows</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger size="sm" className="h-7 w-[64px] bg-background text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={safePage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="min-w-[76px] text-center text-[11px] text-muted-foreground">
              Page <span className="font-medium text-foreground">{safePage}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            >
              <ChevronRight />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
