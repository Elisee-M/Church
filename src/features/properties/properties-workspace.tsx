"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  DoorOpen,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { Building, Space, SpaceStatus } from "@/types";
import {
  SPACE_CATEGORY_LABELS,
  SPACE_STATUS_LABELS,
} from "@/lib/constants";
import { formatCurrency, formatPercent, initials, cn } from "@/lib/utils";
import { updateSpaceStatus } from "@/lib/services";
import { useDatabase, usePageReady } from "@/hooks/use-database";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState, LoadingPanel } from "@/components/shared/states";
import { DataTable, type DataTableColumn } from "@/components/tables/data-table";
import { BuildingFormDialog } from "./building-form-dialog";
import { SpaceFormDialog } from "./space-form-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

type SpaceDialogState = { space?: Space; buildingId?: string } | null;
type BuildingDialogState = { building?: Building } | null;

export function PropertiesWorkspace() {
  const db = useDatabase();
  const ready = usePageReady();
  const [query, setQuery] = React.useState("");
  const [buildingFilter, setBuildingFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [spaceDialog, setSpaceDialog] = React.useState<SpaceDialogState>(null);
  const [buildingDialog, setBuildingDialog] = React.useState<BuildingDialogState>(null);
  const [selectedSpaceId, setSelectedSpaceId] = React.useState<string | null>(null);
  const selectedSpace = db.spaces.find((space) => space.id === selectedSpaceId);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return db.spaces.filter((space) => {
      const tenant = db.tenants.find((item) => item.id === space.tenantId);
      const matchesQuery =
        !needle ||
        `${space.code} ${space.name} ${space.description} ${tenant?.name ?? ""}`
          .toLowerCase()
          .includes(needle);
      return (
        matchesQuery &&
        (buildingFilter === "all" || space.buildingId === buildingFilter) &&
        (statusFilter === "all" || space.status === statusFilter) &&
        (categoryFilter === "all" || space.category === categoryFilter)
      );
    });
  }, [buildingFilter, categoryFilter, db.spaces, db.tenants, query, statusFilter]);

  const metrics = {
    total: db.spaces.length,
    occupied: db.spaces.filter((space) => space.status === "occupied").length,
    vacant: db.spaces.filter((space) => space.status === "vacant").length,
    potential: db.spaces.reduce((sum, space) => sum + space.monthlyRent, 0),
  };

  const columns: DataTableColumn<Space>[] = [
    {
      id: "space",
      header: "Space",
      sortValue: (space) => space.code,
      cell: (space) => (
        <div>
          <p className="text-[12.5px] font-medium">{space.name}</p>
          <p className="text-[10.5px] text-muted-foreground">{space.code}</p>
        </div>
      ),
    },
    {
      id: "building",
      header: "Building",
      sortValue: (space) => db.buildings.find((building) => building.id === space.buildingId)?.name ?? "",
      cell: (space) => {
        const building = db.buildings.find((item) => item.id === space.buildingId);
        const floor = db.floors.find((item) => item.id === space.floorId);
        return (
          <div>
            <p className="text-[11.5px]">{building?.name}</p>
            <p className="text-[10px] text-muted-foreground">{floor?.name}</p>
          </div>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      sortValue: (space) => space.category,
      cell: (space) => (
        <Badge variant="neutral" className="capitalize">
          {SPACE_CATEGORY_LABELS[space.category]}
        </Badge>
      ),
    },
    {
      id: "tenant",
      header: "Tenant",
      cell: (space) => {
        const tenant = db.tenants.find((item) => item.id === space.tenantId);
        return tenant ? (
          <span className="flex items-center gap-1.5 text-[11.5px]">
            <Avatar className="size-5">
              <AvatarFallback className="text-[8px]">{initials(tenant.name)}</AvatarFallback>
            </Avatar>
            {tenant.name}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Vacant</span>
        );
      },
    },
    {
      id: "rent",
      header: "Rent",
      align: "right",
      sortValue: (space) => space.monthlyRent,
      cell: (space) => <span className="text-[12px] font-semibold">{formatCurrency(space.monthlyRent)}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (space) => space.status,
      cell: (space) => (
        <StatusBadge status={space.status} label={SPACE_STATUS_LABELS[space.status]} />
      ),
    },
  ];

  if (!ready) {
    return (
      <>
        <PageHeader title="Properties" description="Loading the property portfolio…" />
        <LoadingPanel />
      </>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Properties"
        description="Manage buildings, floors, and rentable spaces across the church's portfolio."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setBuildingDialog({})}>
              <Building2 className="size-3.5" /> Add building
            </Button>
            <Button size="sm" onClick={() => setSpaceDialog({})}>
              <Plus className="size-3.5" /> Add space
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total spaces" value={metrics.total} hint={`${db.buildings.length} buildings`} icon={DoorOpen} tone="navy" />
        <StatCard label="Occupied" value={metrics.occupied} hint={formatPercent((metrics.occupied / Math.max(metrics.total, 1)) * 100) + " occupancy"} icon={Store} tone="success" />
        <StatCard label="Vacant" value={metrics.vacant} hint="Ready to lease" icon={Building2} tone="info" />
        <StatCard label="Monthly rent potential" value={formatCurrency(metrics.potential, true)} hint="Across all spaces" icon={SlidersHorizontal} tone="default" />
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold">Buildings overview</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Select a building card to filter spaces, or add spaces from the building menu.
          </p>
        </div>
        {buildingFilter !== "all" && (
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setBuildingFilter("all")}>
            Show all buildings
          </Button>
        )}
      </div>

      <div className="mt-2.5 grid gap-4 lg:grid-cols-3">
        {db.buildings.map((building) => {
          const spaces = db.spaces.filter((space) => space.buildingId === building.id);
          const occupied = spaces.filter((space) => space.status === "occupied").length;
          const rent = spaces.reduce((sum, space) => sum + space.monthlyRent, 0);
          const rate = spaces.length ? (occupied / spaces.length) * 100 : 0;
          return (
            <Card
              key={building.id}
              className={cn(
                "group relative overflow-hidden p-5 shadow-soft transition hover:shadow-card",
                buildingFilter === building.id && "border-primary/40 ring-1 ring-primary/10 dark:border-foreground/30",
              )}
            >
              <button
                className="absolute inset-0 z-0"
                onClick={() => setBuildingFilter((current) => (current === building.id ? "all" : building.id))}
                aria-label={`Filter by ${building.name}`}
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
                    {building.city} · {building.district}
                  </p>
                  <h3 className="mt-1 font-display text-[15px] font-semibold">{building.name}</h3>
                  <p className="mt-0.5 text-[10.5px] text-muted-foreground">{building.address}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-xs" className="relative z-10">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Building actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setBuildingFilter(building.id);
                        setSpaceDialog({ buildingId: building.id });
                      }}
                    >
                      <Plus /> Add space here
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBuildingDialog({ building })}>
                      <Pencil /> Edit building
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBuildingFilter(building.id)}>
                      <Search /> View spaces
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="relative mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected rent</p>
                  <p className="font-display text-lg font-semibold">{formatCurrency(rent, true)}</p>
                </div>
                <Badge variant="neutral">{building.floorsCount} floors</Badge>
              </div>
              <div className="relative mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
                  <span className="text-muted-foreground">
                    {occupied}/{spaces.length} spaces occupied
                  </span>
                  <span className="font-medium">{formatPercent(rate)}</span>
                </div>
                <Progress value={rate} className="h-1.5" />
              </div>
            </Card>
          );
        })}
        <button
          onClick={() => setBuildingDialog({})}
          className="flex min-h-[170px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-primary/30 hover:bg-card hover:text-foreground"
        >
          <Plus className="size-5" />
          <span className="text-[11.5px] font-medium">Add another building</span>
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold">Space inventory</h2>
          <p className="text-[10.5px] text-muted-foreground">
            Browse every rentable unit, update status, and open details to view history or the assigned tenant.
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-soft lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code, name or tenant…"
            className="h-8.5 bg-background pl-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger size="sm" className="h-8.5 w-full bg-background text-xs lg:w-[150px]">
              <SelectValue placeholder="Building" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All buildings</SelectItem>
              {db.buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger size="sm" className="h-8.5 w-full bg-background text-xs lg:w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(SPACE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger size="sm" className="h-8.5 w-full bg-background text-xs lg:w-[130px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(SPACE_CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="col-span-2 flex items-center gap-1 rounded-lg border border-border bg-background p-0.5 sm:col-span-1">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded-md transition",
                view === "grid" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded-md transition",
                view === "list" ? "bg-secondary text-foreground shadow-sm" : "text-muted-foreground",
              )}
              aria-label="List view"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          {filtered.length} space{filtered.length === 1 ? "" : "s"}
          {buildingFilter !== "all" && ` in ${db.buildings.find((building) => building.id === buildingFilter)?.name}`}
        </p>
        {(buildingFilter !== "all" || statusFilter !== "all" || categoryFilter !== "all" || query) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => {
              setBuildingFilter("all");
              setStatusFilter("all");
              setCategoryFilter("all");
              setQuery("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {view === "grid" ? (
        filtered.length === 0 ? (
          <div className="mt-3 rounded-xl border border-border bg-card shadow-soft">
            <EmptyState
              icon={DoorOpen}
              title="No spaces match these filters"
              description="Try a different building, status or search term."
              action={
                <Button variant="outline" size="sm" onClick={() => {
                  setBuildingFilter("all");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setQuery("");
                }}>
                  Clear filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((space) => {
              const building = db.buildings.find((item) => item.id === space.buildingId);
              const floor = db.floors.find((item) => item.id === space.floorId);
              const tenant = db.tenants.find((item) => item.id === space.tenantId);
              return (
                <Card key={space.id} className="group flex flex-col p-4 shadow-soft transition hover:border-primary/20 hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          space.status === "occupied"
                            ? "bg-success/10 text-success"
                            : space.status === "maintenance"
                              ? "bg-warning/10 text-warning"
                              : "bg-accent text-primary dark:bg-white/[0.06] dark:text-foreground",
                        )}
                      >
                        {space.status === "maintenance" ? <Wrench className="size-3.5" /> : <Store className="size-3.5" />}
                      </span>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {space.code}
                        </p>
                        <h3 className="max-w-[170px] truncate text-[13px] font-semibold">{space.name}</h3>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Space actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSpaceId(space.id)}>
                          <ArrowRight /> View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSpaceDialog({ space })}>
                          <Pencil /> Edit space
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="mt-3 text-[10.5px] text-muted-foreground">
                    {building?.name} · {floor?.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={space.status} label={SPACE_STATUS_LABELS[space.status]} />
                    <Badge variant="neutral">{SPACE_CATEGORY_LABELS[space.category]}</Badge>
                    <Badge variant="neutral">{space.sizeSqm} m²</Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Monthly rent</p>
                      <p className="text-[13px] font-semibold">{formatCurrency(space.monthlyRent)}</p>
                    </div>
                    {tenant ? (
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground transition hover:text-foreground"
                      >
                        <Avatar className="size-5">
                          <AvatarFallback className="text-[8px]">{initials(tenant.name)}</AvatarFallback>
                        </Avatar>
                        <span className="max-w-[90px] truncate">{tenant.name}</span>
                      </Link>
                    ) : (
                      <span className="text-[10px] italic text-muted-foreground">No tenant</span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedSpaceId(space.id)}
                    className="mt-3 flex items-center justify-center gap-1 rounded-md border border-border py-1.5 text-[10.5px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  >
                    Open space <ArrowRight className="size-3" />
                  </button>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <div className="mt-3">
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(space) => space.id}
            searchable={false}
            onRowClick={(space) => setSelectedSpaceId(space.id)}
            initialPageSize={10}
            emptyTitle="No spaces match these filters"
            emptyDescription="Try a different building, status or search term."
          />
        </div>
      )}

      {selectedSpace && (
        <Sheet open onOpenChange={(open) => !open && setSelectedSpaceId(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {selectedSpace.code}
                  </p>
                  <SheetTitle className="mt-1">{selectedSpace.name}</SheetTitle>
                  <SheetDescription>
                    {db.buildings.find((item) => item.id === selectedSpace.buildingId)?.name} ·{" "}
                    {db.floors.find((item) => item.id === selectedSpace.floorId)?.name}
                  </SheetDescription>
                </div>
                <StatusBadge status={selectedSpace.status} label={SPACE_STATUS_LABELS[selectedSpace.status]} />
              </div>
            </SheetHeader>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Monthly rent</p>
                  <p className="mt-0.5 text-[14px] font-semibold">{formatCurrency(selectedSpace.monthlyRent)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Size</p>
                  <p className="mt-0.5 text-[14px] font-semibold">{selectedSpace.sizeSqm} m²</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Category</p>
                  <p className="mt-0.5 text-[12px] font-semibold">{SPACE_CATEGORY_LABELS[selectedSpace.category]}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[9.5px] uppercase tracking-wide text-muted-foreground">Status</p>
                  <p className="mt-0.5 text-[12px] font-semibold">{SPACE_STATUS_LABELS[selectedSpace.status]}</p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Tenant
                </p>
                {selectedSpace.tenantId ? (
                  (() => {
                    const tenant = db.tenants.find((item) => item.id === selectedSpace.tenantId);
                    return tenant ? (
                      <Link
                        href={`/admin/tenants/${tenant.id}`}
                        className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:bg-muted/40"
                      >
                        <Avatar className="size-8">
                          <AvatarFallback className="text-[10px]">{initials(tenant.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">{tenant.name}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{tenant.email}</p>
                        </div>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                      </Link>
                    ) : null;
                  })()
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                    This space is currently unassigned.
                  </p>
                )}
              </div>

              {selectedSpace.description && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Description
                  </p>
                  <p className="text-[11.5px] leading-relaxed text-muted-foreground">{selectedSpace.description}</p>
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Features
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSpace.features.map((feature) => (
                    <Badge key={feature} variant="neutral">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Change status
                </p>
                <Select
                  value={selectedSpace.status}
                  onValueChange={(value) => {
                    updateSpaceStatus(selectedSpace.id, value as SpaceStatus);
                    toast.success("Space status updated", {
                      description: `${selectedSpace.code} is now ${value}.`,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPACE_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem
                        key={value}
                        value={value}
                        disabled={selectedSpace.status === "occupied" && value !== "occupied"}
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSpace.status === "occupied" && (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                    An occupied space is managed by its active agreement. Update or end the agreement to release it.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Space history
                </p>
                <ol className="space-y-3 border-l border-border pl-3.5">
                  {selectedSpace.history.slice(0, 5).map((entry) => (
                    <li key={entry.id} className="relative">
                      <span className="absolute -left-[19px] top-1 size-2 rounded-full bg-border ring-2 ring-card" />
                      <p className="text-[11px] font-medium">{entry.event}</p>
                      <p className="text-[10px] leading-relaxed text-muted-foreground">{entry.description}</p>
                      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-muted-foreground/60">
                        {entry.date}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedSpaceId(null)}>
                Close
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setSpaceDialog({ space: selectedSpace });
                  setSelectedSpaceId(null);
                }}
              >
                <Pencil className="size-3.5" /> Edit space
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {spaceDialog && (
        <SpaceFormDialog
          space={spaceDialog.space}
          defaultBuildingId={spaceDialog.buildingId}
          onClose={() => setSpaceDialog(null)}
        />
      )}
      {buildingDialog && (
        <BuildingFormDialog building={buildingDialog.building} onClose={() => setBuildingDialog(null)} />
      )}
    </div>
  );
}
