"use client";

import { useState, type FormEvent } from "react";
import { Plus, Search, Truck, Phone, MapPin, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeatureGate } from "@/components/feature-gate";
import type { VendorCategory } from "@/types";
import { usePlan } from "@/hooks/usePlan";
import { useVendors, useCreateVendor } from "@/hooks/useVendors";

const categories = [
  "ALL", "CONTRACTOR", "TILES", "STEEL", "WOOD", "GLASS",
  "ELECTRICAL", "PLUMBING", "PAINT", "HARDWARE", "FURNITURE", "LANDSCAPING", "OTHER",
];

const vendorFormCategories: VendorCategory[] = [
  "CONTRACTOR",
  "TILES",
  "STEEL",
  "WOOD",
  "GLASS",
  "ELECTRICAL",
  "PLUMBING",
  "PAINT",
  "HARDWARE",
  "FURNITURE",
  "LANDSCAPING",
  "OTHER",
];

export default function VendorsPage() {
  const { plan } = usePlan();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<VendorCategory>("CONTRACTOR");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [gst, setGst] = useState("");
  const { data: vendors, isLoading } = useVendors();
  const createVendor = useCreateVendor();

  const resetVendorForm = () => {
    setName("");
    setCategory("CONTRACTOR");
    setPhone("");
    setEmail("");
    setCity("");
    setGst("");
  };

  const handleAddVendor = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedPhone) return;
    createVendor.mutate(
      {
        name: trimmedName,
        category,
        phone: trimmedPhone,
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        gst: gst.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Vendor added");
          setAddVendorOpen(false);
          resetVendorForm();
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to add vendor");
        },
      }
    );
  };

  const vendorsList = vendors ?? [];

  const filtered = vendorsList.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "ALL" && v.category !== categoryFilter) return false;
    return true;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendorsList.length} vendors in your network
          </p>
        </div>
        <Button type="button" onClick={() => setAddVendorOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <Dialog open={addVendorOpen} onOpenChange={setAddVendorOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddVendor}>
            <DialogHeader>
              <DialogTitle>Add vendor</DialogTitle>
              <DialogDescription>Add a vendor to your network.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor-name">Name</Label>
                <Input
                  id="vendor-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor-category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as VendorCategory)}
                  required
                >
                  <SelectTrigger id="vendor-category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendorFormCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0) + cat.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor-phone">Phone</Label>
                <Input
                  id="vendor-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor-email">Email</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor-city">City</Label>
                <Input
                  id="vendor-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Hubbali"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vendor-gst">GST</Label>
                <Input
                  id="vendor-gst"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  placeholder="29XXXXX1234X1Z5"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddVendorOpen(false)}
                disabled={createVendor.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createVendor.isPending}>
                {createVendor.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding…
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat === "ALL" ? "All Categories" : cat.charAt(0) + cat.slice(1).toLowerCase()}
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
          <Card key={vendor.id} className="cursor-pointer transition-colors hover:border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium">{vendor.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-[10px]">
                    {vendor.category.charAt(0) + vendor.category.slice(1).toLowerCase()}
                  </Badge>
                </div>
                {vendor.rating && (
                  <div className="flex items-center gap-0.5 text-primary">
                    {Array.from({ length: vendor.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  +91 {vendor.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {vendor.city}
                </div>
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
