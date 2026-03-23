"use client";

import { useState } from "react";
import { Plus, Search, Truck, Phone, MapPin, Star } from "lucide-react";
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

const categories = [
  "ALL", "CONTRACTOR", "TILES", "STEEL", "WOOD", "GLASS",
  "ELECTRICAL", "PLUMBING", "PAINT", "HARDWARE", "FURNITURE", "LANDSCAPING", "OTHER",
];

const mockVendors = [
  { id: "1", name: "Desai Tiles & Sanitary", category: "TILES", phone: "9876543230", city: "Hubbali", rating: 4, gst: "29ABCDE1234F1Z5" },
  { id: "2", name: "Hubli Steel Centre", category: "STEEL", phone: "9876543231", city: "Hubbali", rating: 5, gst: "29FGHIJ5678G1Z3" },
  { id: "3", name: "Prakash Contractors", category: "CONTRACTOR", phone: "9876543232", city: "Hubbali", rating: 4, gst: null },
  { id: "4", name: "Sri Ganesh Electricals", category: "ELECTRICAL", phone: "9876543233", city: "Dharwad", rating: 3, gst: "29KLMNO9012H1Z1" },
  { id: "5", name: "Karnataka Wood Works", category: "WOOD", phone: "9876543234", city: "Hubbali", rating: 5, gst: "29PQRST3456I1Z9" },
  { id: "6", name: "Mahalakshmi Paints", category: "PAINT", phone: "9876543235", city: "Hubbali", rating: 4, gst: null },
  { id: "7", name: "Reliable Plumbing", category: "PLUMBING", phone: "9876543236", city: "Hubbali", rating: 3, gst: null },
  { id: "8", name: "Modern Glass House", category: "GLASS", phone: "9876543237", city: "Belagavi", rating: 4, gst: "29UVWXY7890J1Z7" },
];

export default function VendorsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const filtered = mockVendors.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "ALL" && v.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mockVendors.length} vendors in your network
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Vendor
        </Button>
      </div>

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
  );
}
