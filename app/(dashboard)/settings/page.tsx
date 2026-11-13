"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FormField } from "@/components/shared/form-field";
import { firmUpdateSchema, LOGO_MAX_BYTES, LOGO_TYPES } from "@/lib/validation/firm";
import {
  ApiValidationError,
  fieldErrors,
  readApiEnvelope,
  type FieldErrors,
} from "@/lib/validation/form-errors";
import { isPlaceholder } from "@/lib/validation/common";
import type { Firm } from "@/types";

type FormState = {
  name: string;
  gstNumber: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  website: string;
  brandColor: string;
};

const DEFAULT_BRAND = "#E8A045";

function fromFirm(firm: Firm): FormState {
  return {
    name: firm.name ?? "",
    gstNumber: firm.gstNumber ?? "",
    // Placeholders like "—" from older sign-ups show as empty.
    phone: isPlaceholder(firm.phone) ? "" : (firm.phone ?? ""),
    email: firm.email ?? "",
    address: firm.address ?? "",
    city: firm.city ?? "",
    state: firm.state ?? "",
    website: firm.website ?? "",
    brandColor: firm.brandColor ?? DEFAULT_BRAND,
  };
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: firm, isLoading } = useQuery({
    queryKey: ["firm"],
    queryFn: async () => readApiEnvelope<Firm>(await fetch("/api/firm")),
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (firm) setForm(fromFirm(firm));
  }, [firm]);

  const set = (key: keyof FormState) => (value: string) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const saveFirm = useMutation({
    mutationFn: async (data: Partial<FormState> | { logo: null }) =>
      readApiEnvelope<Firm>(
        await fetch("/api/firm", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(["firm"], updated);
      queryClient.invalidateQueries({ queryKey: ["firm"] });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return readApiEnvelope<{ logo: string; firm: Firm }>(
        await fetch("/api/firm/logo", { method: "POST", body })
      );
    },
    onSuccess: ({ firm: updated }) => {
      queryClient.setQueryData(["firm"], updated);
      queryClient.invalidateQueries({ queryKey: ["firm"] });
    },
  });

  function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const parsed = firmUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      toast.error("Please fix the highlighted fields");
      return;
    }
    saveFirm.mutate(form, {
      onSuccess: () => {
        setErrors({});
        toast.success("Settings saved");
      },
      onError: (err) => {
        if (err instanceof ApiValidationError) setErrors(err.fieldErrors);
        toast.error(err instanceof Error ? err.message : "Couldn't save settings");
      },
    });
  }

  function handleLogoPicked(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!(LOGO_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Logo must be a PNG, SVG, JPEG or WebP image");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Logo must be 1 MB or smaller");
      return;
    }
    uploadLogo.mutate(file, {
      onSuccess: () => toast.success("Logo updated"),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Logo upload failed"),
    });
  }

  function handleRemoveLogo() {
    saveFirm.mutate(
      { logo: null },
      {
        onSuccess: () => toast.success("Logo removed"),
        onError: (err) => toast.error(err instanceof Error ? err.message : "Couldn't remove the logo"),
      }
    );
  }

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const describe = (key: keyof FormState) => (errors[key] ? `firm-${key}-msg` : undefined);
  const logoBusy = uploadLogo.isPending;

  return (
    <form className="space-y-6" onSubmit={handleSave} noValidate>
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your firm profile and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Firm Profile</CardTitle>
          <CardDescription>Your firm details appear on invoices and the client portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="firm-name" label="Firm Name" required error={errors.name}>
              <Input
                id="firm-name"
                placeholder="e.g. ArchStudio"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={describe("name")}
              />
            </FormField>
            <FormField id="firm-gstNumber" label="GSTIN" error={errors.gstNumber}>
              <Input
                id="firm-gstNumber"
                placeholder="29ABCDE1234F1Z5"
                value={form.gstNumber}
                maxLength={15}
                className="font-mono uppercase"
                onChange={(e) => set("gstNumber")(e.target.value.toUpperCase())}
                aria-invalid={!!errors.gstNumber}
                aria-describedby={describe("gstNumber")}
              />
            </FormField>
            <FormField id="firm-phone" label="Phone" error={errors.phone}>
              <Input
                id="firm-phone"
                placeholder="98765 43210"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set("phone")(e.target.value)}
                aria-invalid={!!errors.phone}
                aria-describedby={describe("phone")}
              />
            </FormField>
            <FormField id="firm-email" label="Email" required error={errors.email}>
              <Input
                id="firm-email"
                type="email"
                placeholder="firm@email.com"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={describe("email")}
              />
            </FormField>
            <FormField id="firm-address" label="Address" error={errors.address} className="sm:col-span-2">
              <Input
                id="firm-address"
                placeholder="Office address"
                value={form.address}
                onChange={(e) => set("address")(e.target.value)}
              />
            </FormField>
            <FormField id="firm-city" label="City" error={errors.city}>
              <Input
                id="firm-city"
                placeholder="Hubballi"
                value={form.city}
                onChange={(e) => set("city")(e.target.value)}
              />
            </FormField>
            <FormField
              id="firm-state"
              label="State"
              error={errors.state}
              hint="Decides CGST + SGST vs IGST on invoices."
            >
              <Input
                id="firm-state"
                placeholder="Karnataka"
                value={form.state}
                onChange={(e) => set("state")(e.target.value)}
                aria-describedby="firm-state-msg"
              />
            </FormField>
            <FormField id="firm-website" label="Website" error={errors.website} className="sm:col-span-2">
              <Input
                id="firm-website"
                placeholder="https://yourfirm.com"
                value={form.website}
                onChange={(e) => set("website")(e.target.value)}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Brand</CardTitle>
          <CardDescription>Shown on your client portal and invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <FormField id="firm-brandColor" label="Brand Colour" error={errors.brandColor}>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick brand colour"
                  value={/^#[0-9a-fA-F]{6}$/.test(form.brandColor) ? form.brandColor : DEFAULT_BRAND}
                  onChange={(e) => set("brandColor")(e.target.value.toUpperCase())}
                  className="h-10 w-10 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                />
                <Input
                  id="firm-brandColor"
                  value={form.brandColor}
                  onChange={(e) => set("brandColor")(e.target.value)}
                  className="w-32 font-mono text-xs"
                  aria-invalid={!!errors.brandColor}
                  aria-describedby={describe("brandColor")}
                />
              </div>
            </FormField>

            <div className="grid gap-2">
              <Label htmlFor="firm-logo">Logo</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/30">
                  {firm?.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote Blob URL, any host
                    <img src={firm.logo} alt="Firm logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageUp className="h-5 w-5 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={fileRef}
                    id="firm-logo"
                    type="file"
                    accept={LOGO_TYPES.join(",")}
                    className="sr-only"
                    onChange={(e) => handleLogoPicked(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoBusy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {logoBusy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ImageUp className="mr-1.5 h-4 w-4" />}
                    {firm?.logo ? "Replace" : "Upload logo"}
                  </Button>
                  {firm?.logo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={logoBusy || saveFirm.isPending}
                      onClick={handleRemoveLogo}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, SVG, JPEG or WebP, up to 1 MB. Invoices need PNG or JPEG: SVG logos show on the
                portal only.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex justify-end">
            <Button type="submit" disabled={saveFirm.isPending}>
              {saveFirm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
