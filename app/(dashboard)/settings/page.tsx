"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data: firm, isLoading } = useQuery({
    queryKey: ["firm"],
    queryFn: async () => {
      const res = await fetch("/api/firm");
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to load firm");
      return json.data;
    },
  });

  const [firmName, setFirmName] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Hubbali");
  const [website, setWebsite] = useState("");
  const [brandColor, setBrandColor] = useState("#E8A045");

  useEffect(() => {
    if (firm) {
      setFirmName(firm.name ?? "");
      setGstNumber(firm.gstNumber ?? "");
      setPhone(firm.phone ?? "");
      setEmail(firm.email ?? "");
      setAddress(firm.address ?? "");
      setCity(firm.city ?? "Hubbali");
      setWebsite(firm.website ?? "");
      setBrandColor(firm.brandColor ?? "#E8A045");
    }
  }, [firm]);

  const saveFirm = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/firm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to save");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["firm"] });
    },
  });

  function handleSave() {
    saveFirm.mutate(
      { name: firmName, gstNumber, phone, email, address, city, website, brandColor },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (err) => toast.error(err.message || "Failed to save"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your firm profile and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Firm Profile</CardTitle>
          <CardDescription>Your firm details appear on invoices and client portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Firm Name</Label>
              <Input placeholder="e.g. ArchStudio" value={firmName} onChange={(e) => setFirmName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input placeholder="29XXXXX1234X1Z5" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="firm@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input placeholder="Office address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input placeholder="Hubbali" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="https://yourfirm.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saveFirm.isPending}>
              {saveFirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Brand</CardTitle>
          <CardDescription>Customize the look of your client portal and invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand Color</Label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md" style={{ backgroundColor: brandColor }} />
                <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-32 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="relative flex h-10 items-center rounded-md border border-dashed border-border px-3 text-xs text-muted-foreground">
                {firm?.logo ? (
                  <img src={firm.logo} alt="Firm logo" className="h-6 w-6 rounded object-cover" />
                ) : (
                  "Upload your firm logo (PNG, SVG)"
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
