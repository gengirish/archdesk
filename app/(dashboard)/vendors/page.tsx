"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Truck, Phone, MapPin, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeatureGate } from "@/components/feature-gate";
import type { Vendor } from "@/types";
import { usePlan } from "@/hooks/usePlan";
import { useVendors } from "@/hooks/useVendors";
import { StarDisplay } from "@/components/vendors/StarRating";
import { VendorFormDialog, vendorCategoryLabel } from "@/components/vendors/VendorFormDialog";
import { VENDOR_CATEGORIES } from "@/lib/validation/vendor";
import { phoneSearchDigits } from "@/lib/validation/common";

const categories = ["ALL", ...VENDOR_CATEGORIES];

export default function VendorsPage() {
  const { plan } = usePlan();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const { data: vendors, isLoading } = useVendors();

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (v: Vendor) => {
    setEditing(v);
    setDialogOpen(true);
  };

  const vendorsList = useMemo(() => vendors ?? [], [vendors]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = phoneSearchDigits(q);
    return vendorsList.filter((v) => {
      if (categoryFilter !== "ALL" && v.category !== categoryFilter) return false;
      if (!q) return true;
      if (v.name.toLowerCase().includes(q) || (v.city ?? "").toLowerCase().includes(q)) return true;
      return digits ? v.phone.replace(/\D/g, "").includes(digits) : false;
    });
  }, [vendorsList, search, categoryFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <FeatureGate feature="vendors" plan={plan}>
      <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-medium tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendorsList.length} vendors in your network
          </p>
        </div>
        <Button type="button" onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <VendorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} vendor={editing} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, city or phone…"
            aria-label="Search vendors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "ALL" ? "All Categories" : vendorCategoryLabel(cat)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/50 py-16">
          <Truck className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No vendors found</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((vendor) => (
          <Card
            key={vendor.id}
            role="button"
            tabIndex={0}
            aria-label={`Edit ${vendor.name}`}
            onClick={() => openEdit(vendor)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openEdit(vendor);
              }
            }}
            className="cursor-pointer transition-colors hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{vendor.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {vendorCategoryLabel(vendor.category)}
                  </Badge>
                </div>
                <StarDisplay rating={vendor.rating} className="shrink-0" />
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  +91 {vendor.phone}
                </div>
                {vendor.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                {vendor.city && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {vendor.city}
                  </div>
                )}
              </div>

              {vendor.gst && (
                <div className="mt-3 text-[10px] text-muted-foreground/70">
                  GST: {vendor.gst}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      </div>
    </FeatureGate>
  );
}
